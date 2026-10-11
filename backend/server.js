const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Examination Management API is running' });
});

// Seed endpoint for quick demo reset from UI
app.post('/api/seed', async (req, res) => {
  try {
    const { runSeed } = require('./scripts/seed');
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

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
