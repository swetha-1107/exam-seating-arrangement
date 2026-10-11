const mongoose = require('mongoose');

const seatingPlanSchema = new mongoose.Schema(
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
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamPaper',
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    // Backwards compatibility alias
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
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
    benchRow: {
      type: Number,
      required: true,
    },
    benchColumn: {
      type: Number,
      required: true,
    },
    side: {
      type: String,
      enum: ['L', 'R'],
      required: true,
    },
    seatLabel: {
      type: String, // e.g. "A1-L", "A1-R"
      required: true,
      trim: true,
    },
    // Backwards compatibility alias
    seatNumber: {
      type: String,
      trim: true,
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
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED'],
      default: 'DRAFT',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Keep aliases in sync
seatingPlanSchema.pre('save', function (next) {
  if (this.slot && !this.examId) this.examId = this.slot;
  if (this.examId && !this.slot) this.slot = this.examId;
  if (this.student && !this.studentId) this.studentId = this.student;
  if (this.studentId && !this.student) this.student = this.studentId;
  if (this.hall && !this.hallId) this.hallId = this.hall;
  if (this.hallId && !this.hall) this.hall = this.hallId;
  if (this.seatLabel && !this.seatNumber) this.seatNumber = this.seatLabel;
  if (this.seatNumber && !this.seatLabel) this.seatLabel = this.seatNumber;
  next();
});

// A student can never get two seats in the same exam slot
seatingPlanSchema.index({ slot: 1, student: 1 }, { unique: true });

// A seat in a hall can never be allocated twice in the same exam slot
seatingPlanSchema.index({ slot: 1, hall: 1, seatLabel: 1 }, { unique: true });

module.exports = mongoose.model('SeatingPlan', seatingPlanSchema);
