const app = require('../server');
const pool = require('../db');
const { generateToken } = require('../middleware/auth');

async function runStage3Tests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Stage 3 test server running at ${baseUrl}`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // Tokens
  const studentH1Token = generateToken({
    role: 'student',
    id: 'S101',
    student_id: 'S101',
    hostel_id: 1,
    name: 'Alice Student',
  });

  const wardenH1Token = generateToken({
    role: 'warden',
    id: 2,
    warden_id: 2,
    hostel_id: 1,
    name: 'Vikram Shetty',
  });

  const wardenH2Token = generateToken({
    role: 'warden',
    id: 6,
    warden_id: 6,
    hostel_id: 2,
    name: 'Arjun Nair',
  });

  const technicianToken = generateToken({
    role: 'technician',
    id: 1,
    technician_id: 1,
    name: 'Test Technician',
  });

  try {
    // =========================================================================
    // 1. Student Priority Restriction Tests (POST /api/complaints)
    // =========================================================================
    {
      // 1.1 Student attempting to self-assign 'Urgent' returns 400
      const urgentRes = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentH1Token}`,
        },
        body: JSON.stringify({
          student_id: 'S101',
          location_id: 1,
          description: 'Attempting to self-escalate to Urgent',
          priority: 'Urgent',
        }),
      });
      const urgentBody = await urgentRes.json();
      assert(urgentRes.status === 400, 'Student self-assigning Urgent returns 400');
      assert(urgentBody.error && urgentBody.error.includes('Urgent'), 'Error explains Urgent is reserved for admin review');

      // 1.2 Student submitting invalid priority returns 400
      const invalidRes = await fetch(`${baseUrl}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentH1Token}`,
        },
        body: JSON.stringify({
          student_id: 'S101',
          location_id: 1,
          description: 'Invalid priority string',
          priority: 'CriticalEmergency',
        }),
      });
      assert(invalidRes.status === 400, 'Student submitting arbitrary priority returns 400');
    }

    // =========================================================================
    // 2. Complaint Rejection Tests (PATCH /api/warden/complaints/:id/reject)
    // =========================================================================
    {
      // 2.1 Unauthenticated call returns 401
      const noAuthRes = await fetch(`${baseUrl}/api/warden/complaints/1/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Duplicate complaint' }),
      });
      assert(noAuthRes.status === 401, 'Rejection without token returns 401');

      // 2.2 Student attempting to reject returns 403
      const studentRes = await fetch(`${baseUrl}/api/warden/complaints/1/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentH1Token}`,
        },
        body: JSON.stringify({ reason: 'Student trying to reject' }),
      });
      assert(studentRes.status === 403, 'Student attempting rejection returns 403');

      // 2.3 Technician attempting to reject returns 403
      const techRes = await fetch(`${baseUrl}/api/warden/complaints/1/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${technicianToken}`,
        },
        body: JSON.stringify({ reason: 'Technician trying to reject' }),
      });
      assert(techRes.status === 403, 'Technician attempting rejection returns 403');

      // 2.4 Invalid complaint ID format returns 400
      const badIdRes = await fetch(`${baseUrl}/api/warden/complaints/not-a-number/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({ reason: 'Valid reason here' }),
      });
      assert(badIdRes.status === 400, 'Rejection with non-numeric ID returns 400');

      // 2.5 Non-existent complaint returns 404
      const nonExistentRes = await fetch(`${baseUrl}/api/warden/complaints/999999/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({ reason: 'Complaint does not exist' }),
      });
      assert(nonExistentRes.status === 404, 'Rejection of non-existent complaint returns 404');

      // 2.6 Missing or empty reason returns 400
      const emptyReasonRes = await fetch(`${baseUrl}/api/warden/complaints/1/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({ reason: '   ' }),
      });
      assert(emptyReasonRes.status === 400, 'Rejection with empty reason returns 400');

      // 2.7 Reason too short (< 5 chars) returns 400
      const shortReasonRes = await fetch(`${baseUrl}/api/warden/complaints/1/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({ reason: 'No' }),
      });
      assert(shortReasonRes.status === 400, 'Rejection with reason under 5 chars returns 400');
    }

    // =========================================================================
    // 3. Rejection Lifecycle, Atomicity & Cross-Hostel Isolation (Inside Transaction)
    // =========================================================================
    {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Setup temporary hostel, location, student, and complaints
        const hRes = await client.query('SELECT hostel_id FROM hostel LIMIT 2');
        const h1Id = hRes.rows[0].hostel_id; // Hostel 1
        const h2Id = hRes.rows[1].hostel_id; // Hostel 2

        const tempStudentH1 = 'STU_H1_' + Date.now().toString().slice(-8);
        await client.query(
          'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, $4)',
          [tempStudentH1, 'Student H1', `${tempStudentH1}@test.com`, h1Id]
        );

        const loc1Res = await client.query(
          'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, $2, $3, $4) RETURNING location_id',
          ['Room H1', 1, 'Room', h1Id]
        );
        const loc1Id = loc1Res.rows[0].location_id;

        // Complaint in Hostel 1
        const comp1Res = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING complaint_id`,
          [tempStudentH1, loc1Id, 'Complaint to be rejected', 'Medium', 'Pending']
        );
        const comp1Id = comp1Res.rows[0].complaint_id;

        // Complaint already Resolved in Hostel 1
        const compResolvedRes = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING complaint_id`,
          [tempStudentH1, loc1Id, 'Resolved complaint', 'Low', 'Resolved']
        );
        const compResolvedId = compResolvedRes.rows[0].complaint_id;

        // Complaint in Hostel 2
        const loc2Res = await client.query(
          'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, $2, $3, $4) RETURNING location_id',
          ['Room H2', 1, 'Room', h2Id]
        );
        const loc2Id = loc2Res.rows[0].location_id;

        const tempStudentH2 = 'STU_H2_' + Date.now().toString().slice(-8);
        await client.query(
          'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, $4)',
          [tempStudentH2, 'Student H2', `${tempStudentH2}@test.com`, h2Id]
        );

        const comp2Res = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING complaint_id`,
          [tempStudentH2, loc2Id, 'Hostel 2 complaint', 'High', 'Pending']
        );
        const comp2Id = comp2Res.rows[0].complaint_id;

        await client.query('COMMIT'); // Commit setup so HTTP server can read it

        // 3.1 Cross-hostel rejection attempt: Warden 2 (hostel 1) attempting to reject Hostel 2 complaint
        const crossRejectRes = await fetch(`${baseUrl}/api/warden/complaints/${comp2Id}/reject`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wardenH1Token}`,
          },
          body: JSON.stringify({ reason: 'Attempting cross-hostel rejection' }),
        });
        assert(crossRejectRes.status === 403, 'Warden attempting to reject complaint from another hostel returns 403');

        // 3.2 Attempting to reject an already Resolved complaint returns 400
        const resolvedRejectRes = await fetch(`${baseUrl}/api/warden/complaints/${compResolvedId}/reject`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wardenH1Token}`,
          },
          body: JSON.stringify({ reason: 'Cannot reject resolved' }),
        });
        assert(resolvedRejectRes.status === 400, 'Rejecting an already Resolved complaint returns 400');

        // 3.3 Successful rejection by authorized warden
        const validRejectRes = await fetch(`${baseUrl}/api/warden/complaints/${comp1Id}/reject`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wardenH1Token}`,
          },
          body: JSON.stringify({ reason: 'Duplicate complaint already logged by roommate' }),
        });
        const validRejectBody = await validRejectRes.json();
        assert(validRejectRes.status === 200, 'Warden successfully rejects complaint (200)');
        assert(validRejectBody.status === 'Rejected', 'Complaint status is updated to Rejected');
        assert(validRejectBody.status_history && validRejectBody.status_history.status === 'Rejected', 'status_history record has status Rejected');
        assert(validRejectBody.status_history.remarks === 'Duplicate complaint already logged by roommate', 'status_history remarks match provided rejection reason');

        // 3.4 Attempting to reject an already Rejected complaint returns 400
        const alreadyRejectedRes = await fetch(`${baseUrl}/api/warden/complaints/${comp1Id}/reject`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${wardenH1Token}`,
          },
          body: JSON.stringify({ reason: 'Trying to reject again' }),
        });
        assert(alreadyRejectedRes.status === 400, 'Rejecting an already Rejected complaint returns 400');

        // Clean up temporary test records
        await client.query('DELETE FROM status_history WHERE complaint_id IN ($1, $2, $3)', [comp1Id, compResolvedId, comp2Id]);
        await client.query('DELETE FROM complaints WHERE complaint_id IN ($1, $2, $3)', [comp1Id, compResolvedId, comp2Id]);
        await client.query('DELETE FROM location WHERE location_id IN ($1, $2)', [loc1Id, loc2Id]);
        await client.query('DELETE FROM student WHERE student_id IN ($1, $2)', [tempStudentH1, tempStudentH2]);
      } finally {
        client.release();
      }
    }

    // =========================================================================
    // 4. Priority Queue Ordering Tests (GET /api/warden/complaints)
    // =========================================================================
    {
      const client = await pool.connect();
      try {
        // Create 4 complaints with different priorities and dates
        const hId = 1;
        const tempStudent = 'STU_SORT_' + Date.now().toString().slice(-8);
        await client.query(
          'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, $4)',
          [tempStudent, 'Sort Student', `${tempStudent}@test.com`, hId]
        );

        const locRes = await client.query(
          'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, $2, $3, $4) RETURNING location_id',
          ['Sort Room', 1, 'Room', hId]
        );
        const locId = locRes.rows[0].location_id;

        // Insert in scrambled order: Low (oldest), Urgent (newer), High (newest), Medium (middle)
        const cLow = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status, complaint_date)
           VALUES ($1, $2, 'Low complaint', 'Low', 'Pending', NOW() - INTERVAL '4 hours')
           RETURNING complaint_id`,
          [tempStudent, locId]
        );

        const cMedium = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status, complaint_date)
           VALUES ($1, $2, 'Medium complaint', 'Medium', 'Pending', NOW() - INTERVAL '3 hours')
           RETURNING complaint_id`,
          [tempStudent, locId]
        );

        const cHigh = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status, complaint_date)
           VALUES ($1, $2, 'High complaint', 'High', 'Pending', NOW() - INTERVAL '2 hours')
           RETURNING complaint_id`,
          [tempStudent, locId]
        );

        const cUrgentOld = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status, complaint_date)
           VALUES ($1, $2, 'Urgent older complaint', 'Urgent', 'Pending', NOW() - INTERVAL '1 hour')
           RETURNING complaint_id`,
          [tempStudent, locId]
        );

        const cUrgentNew = await client.query(
          `INSERT INTO complaints (student_id, location_id, description, priority, status, complaint_date)
           VALUES ($1, $2, 'Urgent newer complaint', 'Urgent', 'Pending', NOW())
           RETURNING complaint_id`,
          [tempStudent, locId]
        );

        // Fetch warden complaints list
        const wardenQueueRes = await fetch(`${baseUrl}/api/warden/complaints`, {
          headers: { Authorization: `Bearer ${wardenH1Token}` },
        });
        const queue = await wardenQueueRes.json();
        assert(wardenQueueRes.status === 200, 'Warden queue returns 200');

        // Extract priority order of the inserted test complaints
        const testIds = [
          cUrgentOld.rows[0].complaint_id,
          cUrgentNew.rows[0].complaint_id,
          cHigh.rows[0].complaint_id,
          cMedium.rows[0].complaint_id,
          cLow.rows[0].complaint_id,
        ];

        const filteredQueue = queue.filter((c) => testIds.includes(c.complaint_id));
        const prioritiesInOrder = filteredQueue.map((c) => c.priority);

        assert(
          prioritiesInOrder[0] === 'Urgent' &&
          prioritiesInOrder[1] === 'Urgent' &&
          prioritiesInOrder[2] === 'High' &&
          prioritiesInOrder[3] === 'Medium' &&
          prioritiesInOrder[4] === 'Low',
          `Queue is strictly sorted by priority (Urgent -> High -> Medium -> Low). Received: ${prioritiesInOrder.join(', ')}`
        );

        // Verify oldest Urgent appears before newer Urgent
        assert(
          filteredQueue[0].complaint_id === cUrgentOld.rows[0].complaint_id &&
          filteredQueue[1].complaint_id === cUrgentNew.rows[0].complaint_id,
          'Within the same priority tier, older complaints appear first (oldest first ordering)'
        );
      } finally {
        // Guaranteed clean up of test data
        try {
          await client.query("DELETE FROM complaints WHERE student_id LIKE 'STU_SORT_%'");
          await client.query("DELETE FROM location WHERE location_name LIKE 'Sort Room%'");
          await client.query("DELETE FROM student WHERE student_id LIKE 'STU_SORT_%'");
        } catch (_) {}
        client.release();
      }
    }

    console.log(`\n========================================`);
    console.log(`Stage 3 Tests Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);

    server.close();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Unexpected test error:', err);
    server.close();
    process.exit(1);
  }
}

runStage3Tests();
