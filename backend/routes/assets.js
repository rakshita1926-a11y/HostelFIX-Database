const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Enforce authentication on all asset routes
router.use(authenticateToken);

/**
 * GET /api/assets
 * Retrieve assets with optional filtering.
 * Enforces hostel-based isolation for students and wardens.
 * Optional query filters: location_id, asset_type, status
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user || !['student', 'warden', 'technician'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied: invalid role' });
    }

    const { location_id, asset_type, status } = req.query;
    const conditions = [];
    const values = [];

    // Enforce hostel scoping for students and wardens
    if (['student', 'warden'].includes(req.user.role)) {
      const userHostelId = req.user.hostel_id;
      if (!userHostelId) {
        return res.status(403).json({ error: 'Access denied: no assigned hostel found in authentication token' });
      }
      values.push(userHostelId);
      conditions.push(`l.hostel_id = $${values.length}`);
    }

    // Optional location_id filter
    if (location_id !== undefined && location_id !== null && location_id !== '') {
      const parsedLocId = parseInt(location_id, 10);
      if (isNaN(parsedLocId)) {
        return res.status(400).json({ error: 'location_id must be an integer' });
      }

      // If student/warden, check cross-hostel access
      if (['student', 'warden'].includes(req.user.role)) {
        const locCheck = await pool.query('SELECT hostel_id FROM location WHERE location_id = $1', [parsedLocId]);
        if (locCheck.rows.length > 0 && locCheck.rows[0].hostel_id !== req.user.hostel_id) {
          return res.status(403).json({ error: 'Access denied: specified location belongs to another hostel' });
        }
      }

      values.push(parsedLocId);
      conditions.push(`a.location_id = $${values.length}`);
    }

    // Optional asset_type filter
    if (asset_type && typeof asset_type === 'string' && asset_type.trim()) {
      values.push(asset_type.trim());
      conditions.push(`a.asset_type = $${values.length}`);
    }

    // Optional status filter
    if (status && typeof status === 'string' && status.trim()) {
      values.push(status.trim());
      conditions.push(`a.status = $${values.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        a.asset_id,
        a.asset_name,
        a.asset_type,
        a.status,
        a.location_id,
        l.location_name,
        l.floor_no,
        l.location_type,
        l.hostel_id
      FROM asset a
      LEFT JOIN location l ON a.location_id = l.location_id
      ${whereClause}
      ORDER BY a.asset_name ASC
    `;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching assets:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve assets' });
  }
});

module.exports = router;
