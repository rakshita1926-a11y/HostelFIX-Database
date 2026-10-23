const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Enforce authentication on all location routes
router.use(authenticateToken);

/**
 * GET /api/locations
 * Retrieve locations scoped to the caller's hostel.
 * Allowed roles: student, warden.
 * Optional query filters: floor_no, location_type
 */
router.get('/', async (req, res) => {
  try {
    // 1. Role verification and hostel isolation
    if (!req.user || !['student', 'warden'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: allowed roles are student and warden' });
    }

    const userHostelId = req.user.hostel_id;
    if (!userHostelId) {
      return res.status(403).json({ error: 'Access denied: no assigned hostel found in authentication token' });
    }

    const { floor_no, location_type, hostel_id } = req.query;
    const conditions = [];
    const values = [];

    // If hostel_id query parameter is provided, it must match user's assigned hostel
    if (hostel_id !== undefined && hostel_id !== null) {
      const parsedQueryHostel = parseInt(hostel_id, 10);
      if (isNaN(parsedQueryHostel) || parsedQueryHostel !== userHostelId) {
        return res.status(403).json({ error: 'Access denied: cannot query locations for another hostel' });
      }
    }

    // Always enforce caller's hostel boundary
    values.push(userHostelId);
    conditions.push(`l.hostel_id = $${values.length}`);

    // Optional floor_no filter
    if (floor_no !== undefined && floor_no !== null && floor_no !== '') {
      const parsedFloor = parseInt(floor_no, 10);
      if (isNaN(parsedFloor)) {
        return res.status(400).json({ error: 'floor_no must be an integer' });
      }
      values.push(parsedFloor);
      conditions.push(`l.floor_no = $${values.length}`);
    }

    // Optional location_type filter
    if (location_type && typeof location_type === 'string' && location_type.trim()) {
      values.push(location_type.trim());
      conditions.push(`l.location_type = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const query = `
      SELECT 
        l.location_id,
        l.location_name,
        l.floor_no,
        l.location_type,
        l.hostel_id,
        h.name AS hostel_name,
        h.block AS hostel_block
      FROM location l
      JOIN hostel h ON l.hostel_id = h.hostel_id
      ${whereClause}
      ORDER BY l.floor_no ASC, l.location_name ASC
    `;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching locations:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve locations' });
  }
});

module.exports = router;
