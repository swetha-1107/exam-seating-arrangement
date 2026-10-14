const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema(
  {
    hallCode: {
      type: String,
      required: [true, 'Hall Code is required (e.g. LH1002)'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    // Backwards compatibility alias
    hallNumber: {
      type: String,
      uppercase: true,
      trim: true,
    },
    block: {
      type: String,
      required: [true, 'Block is required (MAIN, CIVIL, MECH)'],
      enum: ['MAIN', 'CIVIL', 'MECH'],
      default: 'MAIN',
      trim: true,
      uppercase: true,
    },
    // Backwards compatibility alias
    building: {
      type: String,
      trim: true,
    },
    floor: {
      type: String,
      required: [true, 'Floor is required (GROUND, FIRST, SECOND, THIRD, SIXTH)'],
      enum: ['GROUND', 'FIRST', 'SECOND', 'THIRD', 'SIXTH', 0, 1, 2, 3, 4, 5, 6],
      default: 'GROUND',
    },
    benchRows: {
      type: Number,
      required: [true, 'Number of Bench Rows is required'],
      min: [1, 'Must have at least 1 bench row'],
      default: 3,
    },
    // Backwards compatibility alias
    rows: {
      type: Number,
    },
    benchColumns: {
      type: Number,
      required: [true, 'Number of Bench Columns is required'],
      min: [1, 'Must have at least 1 bench column'],
      default: 5,
    },
    // Backwards compatibility alias
    columns: {
      type: Number,
    },
    seatsPerBench: {
      type: Number,
      default: 2, // College seats TWO students per bench (L, R)
      min: [1, 'Must have at least 1 seat per bench'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    usableCapacity: {
      type: Number,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 1,
    },
    // Backwards compatibility alias
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-calculate capacity and keep aliases in sync
hallSchema.pre('save', function (next) {
  if (this.hallCode && !this.hallNumber) this.hallNumber = this.hallCode;
  if (this.hallNumber && !this.hallCode) this.hallCode = this.hallNumber;
  if (this.block && !this.building) this.building = this.block;
  if (this.building && !this.block) this.block = this.building;

  if (this.benchRows && !this.rows) this.rows = this.benchRows;
  if (this.rows && !this.benchRows) this.benchRows = this.rows;
  if (this.benchColumns && !this.columns) this.columns = this.benchColumns;
  if (this.columns && !this.benchColumns) this.benchColumns = this.columns;

  const spb = this.seatsPerBench || 2;
  const computed = this.benchRows * this.benchColumns * spb;
  this.capacity = this.usableCapacity ? this.usableCapacity : computed;

  if (this.isActive !== undefined) this.isAvailable = this.isActive;
  if (this.isAvailable !== undefined) this.isActive = this.isAvailable;

  next();
});

module.exports = mongoose.model('Hall', hallSchema);
