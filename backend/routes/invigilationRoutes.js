const express = require('express');
const router = express.Router();
const {
  analyzeSlotInvigilation,
  autoAssignSlotInvigilators,
  getInvigilationDuties,
  getMyDuties,
  deleteInvigilationDuty,
  // Legacy
  analyzeInvigilation,
  autoAssignInvigilators,
} = require('../controllers/invigilationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Faculty-only view of their personal duties
router.get('/my-duties', protect, authorizeRoles('faculty', 'admin'), getMyDuties);

// Slot-based invigilation endpoints
router.get('/analyze-slot/:slotId', protect, authorizeRoles('admin'), analyzeSlotInvigilation);
router.post('/assign-slot/:slotId', protect, authorizeRoles('admin'), autoAssignSlotInvigilators);

// Legacy exam-based endpoints
router.get('/analyze/:examId', protect, authorizeRoles('admin'), analyzeInvigilation);
router.post('/auto-assign/:examId', protect, authorizeRoles('admin'), autoAssignInvigilators);

// View duties & deletion
router.get('/', protect, getInvigilationDuties);
router.delete('/:id', protect, authorizeRoles('admin'), deleteInvigilationDuty);

module.exports = router;
