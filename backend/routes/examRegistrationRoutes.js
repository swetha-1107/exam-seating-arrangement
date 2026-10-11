const express = require('express');
const router = express.Router();
const {
  getRegistrations,
  registerStudent,
  bulkRegisterStudents,
  deleteRegistration,
  getMyRegistrations,
} = require('../controllers/examRegistrationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/my-exams', protect, authorizeRoles('student', 'admin'), getMyRegistrations);
router.get('/', protect, getRegistrations);
router.post('/', protect, authorizeRoles('admin'), registerStudent);
router.post('/bulk', protect, authorizeRoles('admin'), bulkRegisterStudents);
router.delete('/:id', protect, authorizeRoles('admin'), deleteRegistration);

module.exports = router;
