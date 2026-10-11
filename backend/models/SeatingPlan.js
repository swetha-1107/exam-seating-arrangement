const mongoose = require('mongoose');

const seatingPlanSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
    },
    row: {
      type: Number,
      required: true,
    },
    column: {
      type: Number,
      required: true,
    },
    examDate: {
      type: String,
      required: true,
    },
    session: {
      type: String,
      enum: ['FN', 'AN'],
      default: 'FN',
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Prevent duplicate seat assignments for the same student in the same examination
seatingPlanSchema.index({ examId: 1, studentId: 1 }, { unique: true });

// Prevent assigning two students to the exact same physical desk in a hall during the same exam session
seatingPlanSchema.index({ hallId: 1, seatNumber: 1, examDate: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('SeatingPlan', seatingPlanSchema);
