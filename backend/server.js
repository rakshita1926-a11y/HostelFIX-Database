require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');

const complaintsRouter = require('./routes/complaints');
const { router: wardenRouter } = require('./routes/warden');
const technicianRouter = require('./routes/technician');
const authRouter = require('./routes/auth');
const locationsRouter = require('./routes/locations');
const assetsRouter = require('./routes/assets');
const wardenTechniciansRouter = require('./routes/wardenTechnicians');

const app = express();
const PORT = process.env.PORT || 5000;

// Configure CORS for frontend access
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

// Fallback to standard local development origins if not explicitly configured
if (allowedOrigins.length === 0) {
  allowedOrigins.push(
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  );
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman, internal health checks)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS policy rejection: Origin '${origin}' is not authorized.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/warden/complaints', wardenRouter);
app.use('/api/warden/technicians', wardenTechniciansRouter);
app.use('/api/technician/assignments', technicianRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/assets', assetsRouter);

// Health check endpoint verifying database connectivity with SELECT 1
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT 1 AS status');
    if (result && result.rows) {
      return res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(500).json({
      status: 'error',
      database: 'unexpected_response',
      message: 'Health check query returned unexpected result.',
    });
  } catch (err) {
    // Log safe error message on server side; do not expose internal error/credentials to client
    console.error('Database connection error during health check:', err.message);
    return res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database health check failed.',
    });
  }
});

// Generic 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler
app.use((err, req, res, next) => {
  if (err && err.message && err.message.includes('CORS policy rejection')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('Unhandled server error:', err.message);
  return res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`HostelFix backend running on port ${PORT}`);
  });
}

module.exports = app;
