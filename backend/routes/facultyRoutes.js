const express = require('express');
const router = express.Router();
const {
  getFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getMyAvailability,
  setMyAvailability,
  deleteMyAvailability,
  getAdminAvailabilityOverview,
} = require('../controllers/facultyController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Faculty Availability Routes
router.get('/availability/admin-overview', protect, authorizeRoles('admin'), getAdminAvailabilityOverview);
router.get('/availability/me', protect, authorizeRoles('faculty', 'admin'), getMyAvailability);
router.post('/availability', protect, authorizeRoles('faculty', 'admin'), setMyAvailability);
router.post('/availability/me', protect, authorizeRoles('faculty', 'admin'), setMyAvailability);
router.delete('/availability/:id', protect, authorizeRoles('faculty', 'admin'), deleteMyAvailability);
router.delete('/availability/me/:id', protect, authorizeRoles('faculty', 'admin'), deleteMyAvailability);

// CRUD Routes
router.route('/')
  .get(protect, getFaculty)
  .post(protect, authorizeRoles('admin'), createFaculty);

router.route('/:id')
  .get(protect, getFacultyById)
  .put(protect, authorizeRoles('admin'), updateFaculty)
  .delete(protect, authorizeRoles('admin'), deleteFaculty);

module.exports = router;
