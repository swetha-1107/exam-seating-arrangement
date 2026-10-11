const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, 'Course Code is required (e.g. 2311CSC501J)'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    // Backwards compatibility alias
    subjectCode: {
      type: String,
      trim: true,
      uppercase: true,
    },
    courseName: {
      type: String,
      required: [true, 'Course Name is required'],
      trim: true,
    },
    // Backwards compatibility alias
    subjectName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ['core', 'elective', 'open-elective', 'common'],
      default: 'core',
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
    },
    departments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
        required: true,
      },
    ],
    isCommonPaper: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Keep aliases in sync
subjectSchema.pre('save', function (next) {
  if (this.courseCode && !this.subjectCode) this.subjectCode = this.courseCode;
  if (this.subjectCode && !this.courseCode) this.courseCode = this.subjectCode;
  if (this.courseName && !this.subjectName) this.subjectName = this.courseName;
  if (this.subjectName && !this.courseName) this.courseName = this.subjectName;
  if (this.type === 'common' || (this.departments && this.departments.length > 1)) {
    this.isCommonPaper = true;
  }
  next();
});

module.exports = mongoose.model('Subject', subjectSchema);
