const mongoose = require('mongoose');

const examSlotSchema = new mongoose.Schema(
  {
    series: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSeries',
    },
    date: {
      type: String, // YYYY-MM-DD or DD.MM.YYYY
      required: [true, 'Exam slot date is required'],
      trim: true,
    },
    startTime: {
      type: String, // e.g. "14:00" or "2.00 PM"
      required: [true, 'Start time is required'],
      trim: true,
    },
    endTime: {
      type: String, // e.g. "15:30" or "3.30 PM"
      required: [true, 'End time is required'],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    seatingStatus: {
      type: String,
      enum: ['NOT_GENERATED', 'DRAFT', 'PUBLISHED'],
      default: 'NOT_GENERATED',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

examSlotSchema.index({ date: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('ExamSlot', examSlotSchema);
