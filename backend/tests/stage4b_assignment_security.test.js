const app = require('../server');
const pool = require('../db');
const { generateToken } = require('../middleware/auth');

async function runStage4BTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Stage 4B test server running at ${baseUrl}`);

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

  // Tokens for Hostel 1 and Hostel 2 wardens
  const wardenH1Token = generateToken({
    role: 'warden',
    id: 1,
    warden_id: 1,
    hostel_id: 1,
    name: 'Ananya Rao',
  });

  const wardenH2Token = generateToken({
    role: 'warden',
    id: 6,
    warden_id: 6,
    hostel_id: 2,
    name: 'Arjun Nair',
  });

  const studentH1Token = generateToken({
    role: 'student',
    id: 'S101',
    student_id: 'S101',
    hostel_id: 1,
    name: 'Alice Student',
  });

  const client = await pool.connect();
  const createdComplaintIds = [];
  let tempStudentH1 = null;
  let tempLocationH1 = null;
  let tempStudentH2 = null;
  let tempLocationH2 = null;

  try {
    // -------------------------------------------------------------------------
    // Setup: Retrieve real technicians from DB for Hostel 1 and Hostel 2
    // -------------------------------------------------------------------------
    const techH1Res = await client.query(`
      SELECT t.technician_id, t.name, w.hostel_id
      FROM technician t
      JOIN warden w ON t.warden_id = w.warden_id
      WHERE w.hostel_id = 1
      LIMIT 1
    `);
    assert(techH1Res.rows.length > 0, 'Found seeded technician belonging to Hostel 1');
    const techH1 = techH1Res.rows[0];

    const techH2Res = await client.query(`
      SELECT t.technician_id, t.name, w.hostel_id
      FROM technician t
      JOIN warden w ON t.warden_id = w.warden_id
      WHERE w.hostel_id = 2
      LIMIT 1
    `);
    assert(techH2Res.rows.length > 0, 'Found seeded technician belonging to Hostel 2');
    const techH2 = techH2Res.rows[0];

    // Create temporary test records in NeonDB with committed transaction
    // so the independent HTTP server connection can read them
    await client.query('BEGIN');

    tempStudentH1 = 'STU4B_H1_' + Date.now().toString().slice(-8);
    await client.query(
      'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, 1)',
      [tempStudentH1, 'Test Student H1', `${tempStudentH1}@test.local`]
    );

    const locH1Res = await client.query(
      'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, 1, $2, 1) RETURNING location_id',
      ['Stage4B_Loc_H1', 'Room']
    );
    tempLocationH1 = locH1Res.rows[0].location_id;

    tempStudentH2 = 'STU4B_H2_' + Date.now().toString().slice(-8);
    await client.query(
      'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, 2)',
      [tempStudentH2, 'Test Student H2', `${tempStudentH2}@test.local`]
    );

    const locH2Res = await client.query(
      'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, 1, $2, 2) RETURNING location_id',
      ['Stage4B_Loc_H2', 'Room']
    );
    tempLocationH2 = locH2Res.rows[0].location_id;

    // 1. Pending complaint in Hostel 1
    const compPendingRes = await client.query(`
      INSERT INTO complaints (student_id, location_id, description, priority, status)
      VALUES ($1, $2, 'Pending complaint for valid assignment', 'Medium', 'Pending')
      RETURNING complaint_id
    `, [tempStudentH1, tempLocationH1]);
    const compPendingId = compPendingRes.rows[0].complaint_id;
    createdComplaintIds.push(compPendingId);

    // 2. Complaint in Hostel 1 to test cross-hostel technician rejection
    const compCrossTechRes = await client.query(`
      INSERT INTO complaints (student_id, location_id, description, priority, status)
      VALUES ($1, $2, 'Complaint for cross-tech assignment test', 'High', 'Pending')
      RETURNING complaint_id
    `, [tempStudentH1, tempLocationH1]);
    const compCrossTechId = compCrossTechRes.rows[0].complaint_id;
    createdComplaintIds.push(compCrossTechId);

    // 3. Rejected complaint in Hostel 1
    const compRejectedRes = await client.query(`
      INSERT INTO complaints (student_id, location_id, description, priority, status)
      VALUES ($1, $2, 'Already rejected complaint', 'Low', 'Rejected')
      RETURNING complaint_id
    `, [tempStudentH1, tempLocationH1]);
    const compRejectedId = compRejectedRes.rows[0].complaint_id;
    createdComplaintIds.push(compRejectedId);

    // 4. Resolved complaint in Hostel 1
    const compResolvedRes = await client.query(`
      INSERT INTO complaints (student_id, location_id, description, priority, status)
      VALUES ($1, $2, 'Already resolved complaint', 'Low', 'Resolved')
      RETURNING complaint_id
    `, [tempStudentH1, tempLocationH1]);
    const compResolvedId = compResolvedRes.rows[0].complaint_id;
    createdComplaintIds.push(compResolvedId);

    // 5. Complaint in Hostel 2 (for cross-hostel warden assignment test)
    const compH2Res = await client.query(`
      INSERT INTO complaints (student_id, location_id, description, priority, status)
      VALUES ($1, $2, 'Hostel 2 complaint', 'Medium', 'Pending')
      RETURNING complaint_id
    `, [tempStudentH2, tempLocationH2]);
    const compH2Id = compH2Res.rows[0].complaint_id;
    createdComplaintIds.push(compH2Id);

    await client.query('COMMIT');

    // =========================================================================
    // Test 1: Successful assignment to a technician in the warden's own hostel
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compPendingId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
          remarks: 'Assigning to electrical technician in Hostel 1',
        }),
      });

      const body = await res.json();
      assert(res.status === 200, 'Warden successfully assigns complaint to technician in own hostel (200)');
      assert(body.status === 'Assigned', 'Complaint status updated to Assigned');
      assert(body.assignment && body.assignment.technician_id === techH1.technician_id, 'Assignment references correct technician');
      assert(body.status_history && body.status_history.status === 'Assigned', 'Status history logged with status Assigned');
    }

    // =========================================================================
    // Test 2: Rejection of a cross-hostel technician assignment (403)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compCrossTechId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`, // Warden 1 belongs to Hostel 1
        },
        body: JSON.stringify({
          technician_id: techH2.technician_id, // Tech belongs to Hostel 2
          remarks: 'Attempting cross-hostel assignment',
        }),
      });

      const body = await res.json();
      assert(res.status === 403, 'Assigning technician from another hostel returns 403 Forbidden');
      assert(body.error && body.error.includes('another hostel'), 'Error clarifies cross-hostel technician restriction');

      // Verify DB state: complaint must remain Pending, 0 assignments created, 0 status_history added
      const compCheck = await client.query('SELECT status FROM complaints WHERE complaint_id = $1', [compCrossTechId]);
      assert(compCheck.rows[0].status === 'Pending', 'Complaint remains in Pending status after rejected cross-hostel assignment');

      const assignCheck = await client.query('SELECT COUNT(*)::int AS count FROM assignment WHERE complaint_id = $1', [compCrossTechId]);
      assert(assignCheck.rows[0].count === 0, 'No assignment record created in DB after failed cross-hostel attempt');

      const histCheck = await client.query('SELECT COUNT(*)::int AS count FROM status_history WHERE complaint_id = $1', [compCrossTechId]);
      assert(histCheck.rows[0].count === 0, 'No status_history record created in DB after failed cross-hostel attempt');
    }

    // =========================================================================
    // Test 3: Rejection of assignment attempt for a complaint already 'Rejected' (400)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compRejectedId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
          remarks: 'Attempting to assign rejected complaint',
        }),
      });

      const body = await res.json();
      assert(res.status === 400, 'Assigning an already Rejected complaint returns 400 Bad Request');
      assert(body.error && body.error.includes('Rejected'), 'Error message clarifies complaint is already Rejected');

      // Verify DB state: complaint remains Rejected, no assignment created
      const compCheck = await client.query('SELECT status FROM complaints WHERE complaint_id = $1', [compRejectedId]);
      assert(compCheck.rows[0].status === 'Rejected', 'Complaint remains in Rejected status after failed assignment attempt');

      const assignCheck = await client.query('SELECT COUNT(*)::int AS count FROM assignment WHERE complaint_id = $1', [compRejectedId]);
      assert(assignCheck.rows[0].count === 0, 'No assignment record created for Rejected complaint');
    }

    // =========================================================================
    // Test 4: Preservation of existing assignment rules (Resolved complaint -> 400)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compResolvedId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
        }),
      });

      assert(res.status === 400, 'Assigning an already Resolved complaint returns 400 Bad Request');
      const compCheck = await client.query('SELECT status FROM complaints WHERE complaint_id = $1', [compResolvedId]);
      assert(compCheck.rows[0].status === 'Resolved', 'Resolved complaint remains Resolved');
    }

    // =========================================================================
    // Test 5: Cross-hostel complaint access rejection (403)
    // =========================================================================
    {
      // Warden 1 (Hostel 1) attempting to assign complaint belonging to Hostel 2
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compH2Id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
        }),
      });

      assert(res.status === 403, 'Warden assigning complaint belonging to another hostel returns 403 Forbidden');
    }

    // =========================================================================
    // Test 6: Non-existent technician rejection (400)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compCrossTechId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`,
        },
        body: JSON.stringify({
          technician_id: 999999,
        }),
      });

      assert(res.status === 400, 'Assigning non-existent technician returns 400 Bad Request');
    }

    // =========================================================================
    // Test 7: Unauthorized role attempting assignment (403)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compCrossTechId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentH1Token}`,
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
        }),
      });

      assert(res.status === 403, 'Student attempting assignment returns 403 Forbidden');
    }

    // =========================================================================
    // Test 8: Client-supplied mismatched warden_id is rejected (403)
    // =========================================================================
    {
      const res = await fetch(`${baseUrl}/api/warden/complaints/${compCrossTechId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${wardenH1Token}`, // Authenticated as warden 1
        },
        body: JSON.stringify({
          technician_id: techH1.technician_id,
          warden_id: 999, // Imposter warden_id
        }),
      });

      assert(res.status === 403, 'Warden supplying mismatched warden_id returns 403 Forbidden');
    }

    // =========================================================================
    // Test 9: Complete cleanup and database consistency confirmation
    // =========================================================================
    {
      // Clean up all created test records
      if (createdComplaintIds.length > 0) {
        await client.query('DELETE FROM status_history WHERE complaint_id = ANY($1)', [createdComplaintIds]);
        await client.query('DELETE FROM assignment WHERE complaint_id = ANY($1)', [createdComplaintIds]);
        await client.query('DELETE FROM complaints WHERE complaint_id = ANY($1)', [createdComplaintIds]);
      }
      if (tempLocationH1 || tempLocationH2) {
        await client.query('DELETE FROM location WHERE location_id IN ($1, $2)', [tempLocationH1, tempLocationH2]);
      }
      if (tempStudentH1 || tempStudentH2) {
        await client.query('DELETE FROM student WHERE student_id IN ($1, $2)', [tempStudentH1, tempStudentH2]);
      }

      // Check database state
      const compCount = await client.query('SELECT COUNT(*)::int AS count FROM complaints');
      const assignCount = await client.query('SELECT COUNT(*)::int AS count FROM assignment');
      const histCount = await client.query('SELECT COUNT(*)::int AS count FROM status_history');

      assert(compCount.rows[0].count === 0, 'Complaints table has 0 test records retained after cleanup');
      assert(assignCount.rows[0].count === 0, 'Assignment table has 0 test records retained after cleanup');
      assert(histCount.rows[0].count === 0, 'Status history table has 0 test records retained after cleanup');
    }

    console.log(`\n========================================`);
    console.log(`Stage 4B Tests Summary: ${passed} passed, ${failed} failed.`);
    console.log(`========================================\n`);

    server.close();
    client.release();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Stage 4B Test Suite Error:', err.message);
    try {
      if (createdComplaintIds.length > 0) {
        await client.query('DELETE FROM status_history WHERE complaint_id = ANY($1)', [createdComplaintIds]);
        await client.query('DELETE FROM assignment WHERE complaint_id = ANY($1)', [createdComplaintIds]);
        await client.query('DELETE FROM complaints WHERE complaint_id = ANY($1)', [createdComplaintIds]);
      }
      if (tempLocationH1 || tempLocationH2) {
        await client.query('DELETE FROM location WHERE location_id IN ($1, $2)', [tempLocationH1, tempLocationH2]);
      }
      if (tempStudentH1 || tempStudentH2) {
        await client.query('DELETE FROM student WHERE student_id IN ($1, $2)', [tempStudentH1, tempStudentH2]);
      }
    } catch (_) {}
    server.close();
    client.release();
    process.exit(1);
  }
}

runStage4BTests();
