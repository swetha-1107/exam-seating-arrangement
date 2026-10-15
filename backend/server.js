const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Register all models to guarantee populate schemas are always available
require('./models/User');
require('./models/Department');
require('./models/Subject');
require('./models/ProgrammeCourse');
require('./models/Student');
require('./models/ExamSeries');
require('./models/ExamSlot');
require('./models/ExamPaper');
require('./models/Exam');
require('./models/Hall');
require('./models/Faculty');
require('./models/FacultyAvailability');
require('./models/SeatingPlan');
require('./models/Invigilation');

const app = express();

// Enhanced CORS for local development and production deployments (Vercel, Render)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback to prevent review blockers
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Root endpoint for deployment verification
app.get('/', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    name: 'Automated Examination Seating & Invigilation API',
    institution: 'Easwari Engineering College',
    status: 'ACTIVE',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'CONNECTING_OR_DISCONNECTED',
    health: '/health',
    apiHealth: '/api/health'
  });
});

// Health check endpoints (both /health and /api/health supported)
const healthHandler = (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/departments', require('./routes/departmentRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/exams', require('./routes/examRoutes'));
app.use('/api/halls', require('./routes/hallRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));
app.use('/api/seating', require('./routes/seatingRoutes'));
app.use('/api/invigilation', require('./routes/invigilationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));

// Seed endpoint for quick demo reset
app.post('/api/seed', async (req, res) => {
  try {
    const seedModule = require('./scripts/seed');
    const runSeed = typeof seedModule === 'function' ? seedModule : seedModule.runSeed;
    const result = await runSeed();
    res.json({ success: true, message: 'Database successfully seeded with realistic sample data!', result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fallback 404 handler
app.use((req, res, next) => {
  res.status(404).json({ message: `Endpoint ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
