const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: [true, 'Exam Name is required'],
      trim: true,
    },
    examCode: {
      type: String,
      required: [true, 'Exam Code is required'],
      trim: true,
      uppercase: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    department: {
      type: String,
      trim: true,
      uppercase: true,
      default: 'ALL',
    },
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    examDate: {
      type: String, // YYYY-MM-DD
      required: [true, 'Exam Date is required'],
    },
    session: {
      type: String,
      enum: ['FN', 'AN'],
      default: 'FN',
    },
    startTime: {
      type: String, // HH:mm format, e.g. "10:00"
      required: [true, 'Start Time is required'],
    },
    endTime: {
      type: String, // HH:mm format, e.g. "13:00"
      required: [true, 'End Time is required'],
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    registeredStudentsCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);
