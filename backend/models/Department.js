const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Programme / Department code is required (e.g. IT, CSE, ECE)'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Programme name is required'],
      trim: true,
    },
    degree: {
      type: String,
      enum: ['B.Tech.', 'B.E.', 'M.E.', 'M.Tech.', 'MBA', 'MCA'],
      default: 'B.Tech.',
    },
    preferredBlock: {
      type: String,
      enum: ['MAIN', 'CIVIL', 'MECH'],
      default: 'MAIN',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
