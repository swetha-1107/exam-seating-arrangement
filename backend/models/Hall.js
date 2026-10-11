const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema(
  {
    hallNumber: {
      type: String,
      required: [true, 'Hall Number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    building: {
      type: String,
      required: [true, 'Building is required'],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      default: 1,
    },
    rows: {
      type: Number,
      required: [true, 'Number of Rows is required'],
      min: [1, 'Rows must be at least 1'],
    },
    columns: {
      type: Number,
      required: [true, 'Number of Columns is required'],
      min: [1, 'Columns must be at least 1'],
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-calculate capacity before saving if rows and columns are provided
hallSchema.pre('save', function (next) {
  if (this.rows && this.columns) {
    this.capacity = this.rows * this.columns;
  }
  next();
});

module.exports = mongoose.model('Hall', hallSchema);
