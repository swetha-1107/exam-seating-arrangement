const express = require('express');
const router = express.Router();
const {
  getHalls,
  getHallById,
  createHall,
  updateHall,
  deleteHall,
} = require('../controllers/hallController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getHalls)
  .post(protect, authorizeRoles('admin'), createHall);

router.route('/:id')
  .get(protect, getHallById)
  .put(protect, authorizeRoles('admin'), updateHall)
  .delete(protect, authorizeRoles('admin'), deleteHall);

module.exports = router;
