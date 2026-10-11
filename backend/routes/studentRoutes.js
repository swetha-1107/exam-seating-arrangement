const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
} = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getStudents)
  .post(protect, authorizeRoles('admin'), createStudent);

router.post('/bulk', protect, authorizeRoles('admin'), bulkUploadStudents);
router.post('/import-csv', protect, authorizeRoles('admin'), bulkUploadStudents);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorizeRoles('admin'), updateStudent)
  .delete(protect, authorizeRoles('admin'), deleteStudent);

module.exports = router;
