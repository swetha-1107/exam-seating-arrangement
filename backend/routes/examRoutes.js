const express = require('express');
const router = express.Router();
const {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  getMyExams,
  importTimetable,
} = require('../controllers/examController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/my-exams', protect, authorizeRoles('student', 'admin'), getMyExams);

router.post('/import-timetable', protect, authorizeRoles('admin'), importTimetable);
router.post('/import-timetable-csv', protect, authorizeRoles('admin'), importTimetable);

router.route('/')
  .get(protect, getExams)
  .post(protect, authorizeRoles('admin'), createExam);

router.route('/:id')
  .get(protect, getExamById)
  .put(protect, authorizeRoles('admin'), updateExam)
  .delete(protect, authorizeRoles('admin'), deleteExam);

module.exports = router;
