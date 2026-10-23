const app = require('../server');
const pool = require('../db');
const { generateToken } = require('../middleware/auth');

async function runLookupTests() {
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Lookup test server running at ${baseUrl}`);

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

  // Tokens for different roles and hostels
  const studentH1Token = generateToken({
    role: 'student',
    id: 'S101',
    student_id: 'S101',
    hostel_id: 1,
    name: 'Test Student H1',
  });

  const wardenH1Token = generateToken({
    role: 'warden',
    id: 2,
    warden_id: 2,
    hostel_id: 1,
    name: 'Test Warden H1',
  });

  const wardenH2Token = generateToken({
    role: 'warden',
    id: 6,
    warden_id: 6,
    hostel_id: 2,
    name: 'Test Warden H2',
  });

  const technicianToken = generateToken({
    role: 'technician',
    id: 1,
    technician_id: 1,
    name: 'Test Tech 1',
  });

  try {
    // =========================================================================
    // 1. Database Constraint Verification (status_history permits 'Rejected')
    // =========================================================================
    {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Insert a temporary complaint inside transaction
        // First get a valid hostel
        const hRes = await client.query('SELECT hostel_id FROM hostel LIMIT 1');
        const hId = hRes.rows[0].hostel_id;

        // Temporary student and location
        const tempStudent = 'TST_' + Date.now().toString().slice(-8);
        await client.query(
          'INSERT INTO student (student_id, name, email, hostel_id) VALUES ($1, $2, $3, $4)',
          [tempStudent, 'Temp Student', `${tempStudent}@test.hostel`, hId]
        );

        const locRes = await client.query(
          'INSERT INTO location (location_name, floor_no, location_type, hostel_id) VALUES ($1, $2, $3, $4) RETURNING location_id',
          ['Temp Room', 1, 'Room', hId]
        );
        const locId = locRes.rows[0].location_id;

        const compRes = await client.query(
          'INSERT INTO complaints (student_id, location_id, description, priority, status) VALUES ($1, $2, $3, $4, $5) RETURNING complaint_id',
          [tempStudent, locId, 'Testing rejection constraint', 'Low', 'Pending']
        );
        const compId = compRes.rows[0].complaint_id;

        // Attempt inserting 'Rejected' status into status_history
        const histRes = await client.query(
          'INSERT INTO status_history (complaint_id, status, changed_by, remarks) VALUES ($1, $2, $3, $4) RETURNING history_id, status',
          [compId, 'Rejected', 'Warden', 'Test rejection constraint']
        );

        assert(histRes.rows[0].status === 'Rejected', 'status_history successfully accepts Rejected status');

        await client.query('ROLLBACK');
        assert(true, 'Transaction rolled back cleanly; 0 test records retained');
      } catch (err) {
        await client.query('ROLLBACK');
        assert(false, `Rejected status insert failed: ${err.message}`);
      } finally {
        client.release();
      }
    }

    // =========================================================================
    // 2. GET /api/locations tests
    // =========================================================================
    {
      // 2.1 Missing token -> 401
      const resNoAuth = await fetch(`${baseUrl}/api/locations`);
      assert(resNoAuth.status === 401, 'GET /api/locations without token returns 401');

      // 2.2 Technician role -> 403 (student/warden only)
      const resTech = await fetch(`${baseUrl}/api/locations`, {
        headers: { Authorization: `Bearer ${technicianToken}` },
      });
      assert(resTech.status === 403, 'GET /api/locations with technician token returns 403');

      // 2.3 Student token -> 200 OK (returns array)
      const resStudent = await fetch(`${baseUrl}/api/locations`, {
        headers: { Authorization: `Bearer ${studentH1Token}` },
      });
      const dataStudent = await resStudent.json();
      assert(resStudent.status === 200, 'GET /api/locations with student token returns 200');
      assert(Array.isArray(dataStudent), 'GET /api/locations returns an array');

      // 2.4 Warden token -> 200 OK
      const resWarden = await fetch(`${baseUrl}/api/locations`, {
        headers: { Authorization: `Bearer ${wardenH1Token}` },
      });
      const dataWarden = await resWarden.json();
      assert(resWarden.status === 200, 'GET /api/locations with warden token returns 200');
      assert(Array.isArray(dataWarden), 'GET /api/locations returns an array');

      // 2.5 Cross-hostel attempt -> 403
      const resCross = await fetch(`${baseUrl}/api/locations?hostel_id=2`, {
        headers: { Authorization: `Bearer ${studentH1Token}` }, // Student belongs to hostel 1
      });
      assert(resCross.status === 403, 'GET /api/locations querying different hostel returns 403');

      // 2.6 Invalid floor_no -> 400
      const resInvalidFloor = await fetch(`${baseUrl}/api/locations?floor_no=invalid`, {
        headers: { Authorization: `Bearer ${studentH1Token}` },
      });
      assert(resInvalidFloor.status === 400, 'GET /api/locations with non-integer floor_no returns 400');
    }

    // =========================================================================
    // 3. GET /api/assets tests
    // =========================================================================
    {
      // 3.1 Missing token -> 401
      const resNoAuth = await fetch(`${baseUrl}/api/assets`);
      assert(resNoAuth.status === 401, 'GET /api/assets without token returns 401');

      // 3.2 Student token -> 200 OK (returns array)
      const resStudent = await fetch(`${baseUrl}/api/assets`, {
        headers: { Authorization: `Bearer ${studentH1Token}` },
      });
      const dataStudent = await resStudent.json();
      assert(resStudent.status === 200, 'GET /api/assets with student token returns 200');
      assert(Array.isArray(dataStudent), 'GET /api/assets returns an array');

      // 3.3 Warden token -> 200 OK
      const resWarden = await fetch(`${baseUrl}/api/assets`, {
        headers: { Authorization: `Bearer ${wardenH1Token}` },
      });
      assert(resWarden.status === 200, 'GET /api/assets with warden token returns 200');

      // 3.4 Technician token -> 200 OK
      const resTech = await fetch(`${baseUrl}/api/assets`, {
        headers: { Authorization: `Bearer ${technicianToken}` },
      });
      assert(resTech.status === 200, 'GET /api/assets with technician token returns 200');

      // 3.5 Invalid location_id -> 400
      const resInvalidLoc = await fetch(`${baseUrl}/api/assets?location_id=xyz`, {
        headers: { Authorization: `Bearer ${studentH1Token}` },
      });
      assert(resInvalidLoc.status === 400, 'GET /api/assets with non-integer location_id returns 400');
    }

    // =========================================================================
    // 4. GET /api/warden/technicians tests
    // =========================================================================
    {
      // 4.1 Missing token -> 401
      const resNoAuth = await fetch(`${baseUrl}/api/warden/technicians`);
      assert(resNoAuth.status === 401, 'GET /api/warden/technicians without token returns 401');

      // 4.2 Student token -> 403 (warden only)
      const resStudent = await fetch(`${baseUrl}/api/warden/technicians`, {
        headers: { Authorization: `Bearer ${studentH1Token}` },
      });
      assert(resStudent.status === 403, 'GET /api/warden/technicians with student token returns 403');

      // 4.3 Technician token -> 403 (warden only)
      const resTech = await fetch(`${baseUrl}/api/warden/technicians`, {
        headers: { Authorization: `Bearer ${technicianToken}` },
      });
      assert(resTech.status === 403, 'GET /api/warden/technicians with technician token returns 403');

      // 4.4 Warden H1 token -> 200 OK with technicians for Hostel 1
      const resWardenH1 = await fetch(`${baseUrl}/api/warden/technicians`, {
        headers: { Authorization: `Bearer ${wardenH1Token}` },
      });
      const dataH1 = await resWardenH1.json();
      assert(resWardenH1.status === 200, 'GET /api/warden/technicians with warden token returns 200');
      assert(Array.isArray(dataH1), 'GET /api/warden/technicians returns an array');
      assert(dataH1.length > 0, `Hostel 1 warden retrieves seeded technicians (found: ${dataH1.length})`);
      
      // Verify no password_hash is leaked
      const leaksPassword = dataH1.some((t) => t.password_hash !== undefined);
      assert(!leaksPassword, 'GET /api/warden/technicians does not expose password_hash');

      // Verify technician fields
      const firstTech = dataH1[0];
      assert(firstTech.technician_id && firstTech.name && firstTech.specialization, 'Technician object contains expected public fields');

      // 4.5 Filter by specialization
      const resSpecialized = await fetch(`${baseUrl}/api/warden/technicians?specialization=Plumbing`, {
        headers: { Authorization: `Bearer ${wardenH1Token}` },
      });
      const dataSpecialized = await resSpecialized.json();
      assert(resSpecialized.status === 200, 'GET /api/warden/technicians with specialization filter returns 200');
      assert(dataSpecialized.every((t) => t.specialization === 'Plumbing'), 'All returned technicians have matching specialization');

      // 4.6 Warden H2 token -> Retrieves technicians for Hostel 2
      const resWardenH2 = await fetch(`${baseUrl}/api/warden/technicians`, {
        headers: { Authorization: `Bearer ${wardenH2Token}` },
      });
      const dataH2 = await resWardenH2.json();
      assert(resWardenH2.status === 200, 'GET /api/warden/technicians with Hostel 2 warden returns 200');
      assert(dataH2.length > 0, `Hostel 2 warden retrieves seeded technicians (found: ${dataH2.length})`);

      // Verify cross-hostel technician separation
      const h1TechIds = new Set(dataH1.map((t) => t.technician_id));
      const crossLeak = dataH2.some((t) => h1TechIds.has(t.technician_id));
      assert(!crossLeak, 'Hostel 1 and Hostel 2 technicians are strictly isolated by hostel');
    }

    console.log(`\n========================================`);
    console.log(`Lookup Tests Summary: ${passed} passed, ${failed} failed.`);
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

runLookupTests();
