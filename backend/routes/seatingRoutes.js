const express = require('express');
const router = express.Router();
const {
  analyzeSeating,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingByExam,
  getMySeating,
} = require('../controllers/seatingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Student-only view: authenticated student sees only their own seating!
router.get('/my-seating', protect, authorizeRoles('student', 'admin'), getMySeating);

// Admin-only analysis, generation, and clearance
router.get('/analyze/:examId', protect, authorizeRoles('admin'), analyzeSeating);
router.post('/generate/:examId', protect, authorizeRoles('admin'), generateSeatingPlan);
router.delete('/:examId', protect, authorizeRoles('admin'), clearSeatingByExam);

// View seating for an exam
router.get('/:examId', protect, getSeatingByExam);

module.exports = router;
