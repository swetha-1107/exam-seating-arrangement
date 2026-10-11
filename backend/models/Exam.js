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
    slotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSlot',
    },
    paperId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamPaper',
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
      type: String, // YYYY-MM-DD or DD.MM.YYYY
      required: [true, 'Exam Date is required'],
    },
    session: {
      type: String,
      default: 'FN',
    },
    startTime: {
      type: String,
      required: [true, 'Start Time is required'],
    },
    endTime: {
      type: String,
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
