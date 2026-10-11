const express = require('express');
const router = express.Router();
const {
  analyzeInvigilation,
  autoAssignInvigilators,
  getInvigilationDuties,
  getMyDuties,
  deleteInvigilationDuty,
} = require('../controllers/invigilationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Faculty-only view of their personal duties
router.get('/my-duties', protect, authorizeRoles('faculty', 'admin'), getMyDuties);

// Admin-only analysis and auto-assignment
router.get('/analyze/:examId', protect, authorizeRoles('admin'), analyzeInvigilation);
router.post('/auto-assign/:examId', protect, authorizeRoles('admin'), autoAssignInvigilators);

// View duties & deletion
router.get('/', protect, getInvigilationDuties);
router.delete('/:id', protect, authorizeRoles('admin'), deleteInvigilationDuty);

module.exports = router;
