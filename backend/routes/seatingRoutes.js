const express = require('express');
const router = express.Router();
const {
  listSlots,
  analyzeSlotSeating,
  generateSlotSeating,
  publishSlotSeating,
  getSlotSeating,
  clearSlotSeating,
  getMySeating,
  evaluateSlotReuse,
  replanSlot,
  // Legacy
  analyzeSeating,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingByExam,
} = require('../controllers/seatingController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Student-only view: authenticated student sees only their own seating!
router.get('/my-seating', protect, authorizeRoles('student', 'admin'), getMySeating);

// Slot-based seating endpoints
router.get('/slots', protect, listSlots);
router.get('/analyze-slot/:slotId', protect, authorizeRoles('admin'), analyzeSlotSeating);
router.get('/evaluate-reuse/:slotId', protect, authorizeRoles('admin'), evaluateSlotReuse);
router.post('/generate-slot/:slotId', protect, authorizeRoles('admin'), generateSlotSeating);
router.post('/replan-slot/:slotId', protect, authorizeRoles('admin'), replanSlot);
router.post('/publish-slot/:slotId', protect, authorizeRoles('admin'), publishSlotSeating);
router.get('/slot/:slotId', protect, getSlotSeating);
router.delete('/slot/:slotId', protect, authorizeRoles('admin'), clearSlotSeating);

// Legacy exam-based endpoints
router.get('/analyze/:examId', protect, authorizeRoles('admin'), analyzeSeating);
router.post('/generate/:examId', protect, authorizeRoles('admin'), generateSeatingPlan);
router.delete('/:examId', protect, authorizeRoles('admin'), clearSeatingByExam);
router.get('/:examId', protect, getSeatingByExam);

module.exports = router;
