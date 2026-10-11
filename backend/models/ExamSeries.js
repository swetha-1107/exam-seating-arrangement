const mongoose = require('mongoose');

const examSeriesSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Exam Series name is required (e.g. CONTINUOUS ASSESSMENT TEST II)'],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'CAT II',
    },
    academicYear: {
      type: String,
      required: [true, 'Academic Year is required (e.g. 2026-2027)'],
      trim: true,
    },
    term: {
      type: String,
      enum: ['Odd', 'Even', 'ODD', 'EVEN'],
      default: 'Odd',
    },
    semesterScope: [
      {
        type: Number,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ExamSeries', examSeriesSchema);
