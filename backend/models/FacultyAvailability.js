const mongoose = require('mongoose');

const facultyAvailabilitySchema = new mongoose.Schema(
  {
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD
      required: [true, 'Date is required'],
    },
    startTime: {
      type: String, // HH:mm
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // HH:mm
      required: [true, 'End time is required'],
    },
    status: {
      type: String,
      enum: ['Available', 'Not Available'],
      default: 'Available',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

// Compound index to ensure 1 status per faculty per date/time slot
facultyAvailabilitySchema.index(
  { facultyId: 1, date: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = mongoose.model('FacultyAvailability', facultyAvailabilitySchema);
