const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Enforce authentication and warden role
router.use(authenticateToken);
router.use(requireRole('warden'));

/**
 * GET /api/warden/technicians
 * Retrieve technicians assigned to the warden's hostel.
 * Never exposes password_hash or credentials.
 * Optional query filters: specialization
 */
router.get('/', async (req, res) => {
  try {
    const wardenHostelId = req.user && req.user.hostel_id;
    if (!wardenHostelId) {
      return res.status(403).json({ error: 'Access denied: warden has no assigned hostel' });
    }

    const { specialization } = req.query;
    const conditions = [];
    const values = [];

    // Strictly scope technicians to wardens in the caller's hostel
    values.push(wardenHostelId);
    conditions.push(`w.hostel_id = $${values.length}`);

    // Optional specialization filter
    if (specialization && typeof specialization === 'string' && specialization.trim()) {
      values.push(specialization.trim());
      conditions.push(`t.specialization = $${values.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    // Note: NEVER select t.password_hash or w.password_hash
    const query = `
      SELECT 
        t.technician_id,
        t.name,
        t.phone,
        t.specialization,
        t.warden_id,
        w.name AS supervising_warden_name,
        w.hostel_id
      FROM technician t
      JOIN warden w ON t.warden_id = w.warden_id
      ${whereClause}
      ORDER BY t.name ASC
    `;

    const result = await pool.query(query, values);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching warden technicians:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve technicians' });
  }
});

module.exports = router;
