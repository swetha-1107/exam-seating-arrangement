const mongoose = require('mongoose');

const programmeCourseSchema = new mongoose.Schema(
  {
    programme: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 8,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

programmeCourseSchema.index({ programme: 1, semester: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('ProgrammeCourse', programmeCourseSchema);
