const mongoose = require('mongoose');

const examPaperSchema = new mongoose.Schema(
  {
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSlot',
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      trim: true,
    },
    programmes: [
      {
        programme: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Department',
          required: true,
        },
        semester: {
          type: Number,
          required: true,
          default: 5,
        },
        departmentCode: {
          type: String,
          trim: true,
          uppercase: true,
        },
      },
    ],
    type: {
      type: String,
      enum: ['core', 'elective', 'open-elective', 'common'],
      default: 'core',
    },
    applicableStudentsCount: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// One paper per course per slot
examPaperSchema.index({ slot: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('ExamPaper', examPaperSchema);
