const express = require('express');
const router = express.Router();
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/', protect, getSubjects);
router.post('/', protect, authorizeRoles('admin'), createSubject);
router.put('/:id', protect, authorizeRoles('admin'), updateSubject);
router.delete('/:id', protect, authorizeRoles('admin'), deleteSubject);

module.exports = router;
