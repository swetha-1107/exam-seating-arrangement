const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registerNumber: {
      type: String,
      required: [true, 'Register Number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Student Name is required'],
      trim: true,
    },
    programme: {
      type: String,
      required: [true, 'Programme is required (e.g. IT, CSE, ECE)'],
      trim: true,
      uppercase: true,
    },
    // Backwards compatibility alias
    department: {
      type: String,
      trim: true,
      uppercase: true,
    },
    programmeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 1,
      max: 4,
      default: 3,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: 1,
      max: 8,
      default: 5,
    },
    section: {
      type: String,
      required: [true, 'Section is required'],
      trim: true,
      uppercase: true,
      default: 'A',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    electiveCourses: [
      {
        type: String,
        trim: true,
        uppercase: true,
      },
    ],
  },
  { timestamps: true }
);

studentSchema.pre('validate', function (next) {
  if (this.programme && !this.department) this.department = this.programme;
  if (this.department && !this.programme) this.programme = this.department;
  if (this.programmeId && !this.departmentId) this.departmentId = this.programmeId;
  if (this.departmentId && !this.programmeId) this.programmeId = this.departmentId;
  if (this.semester && !this.year) {
    this.year = Math.ceil(this.semester / 2);
  }
  if (!this.semester && this.year) {
    this.semester = this.year * 2 - 1;
  }
  next();
});

module.exports = mongoose.model('Student', studentSchema);
