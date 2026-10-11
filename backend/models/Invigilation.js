const mongoose = require('mongoose');

const invigilationSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: true,
    },
    examDate: {
      type: String,
    },
    session: {
      type: String,
      enum: ['FN', 'AN'],
      default: 'FN',
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// One faculty per hall for an exam
invigilationSchema.index({ examId: 1, hallId: 1 }, { unique: true });

// Prevent a faculty member from being assigned to multiple duties/halls during the same session
invigilationSchema.index({ facultyId: 1, examDate: 1, session: 1 }, { unique: true });

module.exports = mongoose.model('Invigilation', invigilationSchema);
