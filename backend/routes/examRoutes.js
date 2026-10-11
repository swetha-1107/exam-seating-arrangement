const express = require('express');
const router = express.Router();
const {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
} = require('../controllers/examController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getExams)
  .post(protect, authorizeRoles('admin'), createExam);

router.route('/:id')
  .get(protect, getExamById)
  .put(protect, authorizeRoles('admin'), updateExam)
  .delete(protect, authorizeRoles('admin'), deleteExam);

module.exports = router;
