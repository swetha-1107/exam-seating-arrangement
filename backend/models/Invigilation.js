const mongoose = require('mongoose');

const invigilationSchema = new mongoose.Schema(
  {
    slot: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSlot',
      required: true,
    },
    // Backwards compatibility alias
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamSlot',
    },
    hall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      required: true,
    },
    // Backwards compatibility alias
    hallId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true,
    },
    // Backwards compatibility alias
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    examDate: {
      type: String,
    },
    startTime: {
      type: String,
    },
    endTime: {
      type: String,
    },
    session: {
      type: String,
    },
    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

invigilationSchema.pre('save', function (next) {
  if (this.slot && !this.examId) this.examId = this.slot;
  if (this.examId && !this.slot) this.slot = this.examId;
  if (this.hall && !this.hallId) this.hallId = this.hall;
  if (this.hallId && !this.hall) this.hall = this.hallId;
  if (this.faculty && !this.facultyId) this.facultyId = this.faculty;
  if (this.facultyId && !this.faculty) this.faculty = this.facultyId;
  next();
});

// One faculty per hall in a slot
invigilationSchema.index({ slot: 1, hall: 1 }, { unique: true });

// A faculty cannot be assigned to two halls in the same slot
invigilationSchema.index({ slot: 1, faculty: 1 }, { unique: true });

module.exports = mongoose.model('Invigilation', invigilationSchema);
