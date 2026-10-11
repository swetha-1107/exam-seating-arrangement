const Hall = require('../models/Hall');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');

// @desc    Get all halls
// @route   GET /api/halls
// @access  Private
const getHalls = async (req, res) => {
  try {
    const { search, available } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { hallNumber: searchRegex },
        { building: searchRegex },
      ];
    }

    if (available !== undefined && available !== '') {
      query.isAvailable = available === 'true';
    }

    const halls = await Hall.find(query).sort({ hallNumber: 1 });
    res.json(halls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single hall
// @route   GET /api/halls/:id
// @access  Private
const getHallById = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id);
    if (!hall) {
      return res.status(404).json({ message: 'Hall not found' });
    }
    res.json(hall);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new hall
// @route   POST /api/halls
// @access  Private (Admin)
const createHall = async (req, res) => {
  try {
    const { hallNumber, building, floor, rows, columns, capacity, isAvailable } = req.body;

    if (!hallNumber || !building || !rows || !columns) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const cleanHallNumber = hallNumber.trim().toUpperCase();
    const existing = await Hall.findOne({ hallNumber: cleanHallNumber });
    if (existing) {
      return res.status(400).json({ message: `Hall ${cleanHallNumber} already exists.` });
    }

    const numRows = Number(rows);
    const numCols = Number(columns);
    const calculatedCapacity = Number(capacity) || (numRows * numCols);

    const hall = await Hall.create({
      hallNumber: cleanHallNumber,
      building: building.trim(),
      floor: Number(floor) || 1,
      rows: numRows,
      columns: numCols,
      capacity: calculatedCapacity,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
    });

    res.status(201).json(hall);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update hall
// @route   PUT /api/halls/:id
// @access  Private (Admin)
const updateHall = async (req, res) => {
  try {
    const { hallNumber, building, floor, rows, columns, capacity, isAvailable } = req.body;
    const hall = await Hall.findById(req.params.id);

    if (!hall) {
      return res.status(404).json({ message: 'Hall not found' });
    }

    if (hallNumber) {
      const cleanHallNumber = hallNumber.trim().toUpperCase();
      if (cleanHallNumber !== hall.hallNumber) {
        const conflict = await Hall.findOne({ hallNumber: cleanHallNumber });
        if (conflict) {
          return res.status(400).json({ message: `Hall ${cleanHallNumber} already exists.` });
        }
        hall.hallNumber = cleanHallNumber;
      }
    }

    if (building) hall.building = building.trim();
    if (floor !== undefined) hall.floor = Number(floor);
    if (rows !== undefined) hall.rows = Number(rows);
    if (columns !== undefined) hall.columns = Number(columns);

    if (rows !== undefined && columns !== undefined) {
      hall.capacity = hall.rows * hall.columns;
    } else if (capacity !== undefined) {
      hall.capacity = Number(capacity);
    }

    if (isAvailable !== undefined) hall.isAvailable = isAvailable;

    const updatedHall = await hall.save();
    res.json(updatedHall);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete hall
// @route   DELETE /api/halls/:id
// @access  Private (Admin)
const deleteHall = async (req, res) => {
  try {
    const hall = await Hall.findById(req.params.id);
    if (!hall) {
      return res.status(404).json({ message: 'Hall not found' });
    }

    // Clean up seating and invigilation assigned to this hall
    await SeatingPlan.deleteMany({ hallId: hall._id });
    await Invigilation.deleteMany({ hallId: hall._id });

    await Hall.findByIdAndDelete(req.params.id);
    res.json({ message: 'Hall removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getHalls,
  getHallById,
  createHall,
  updateHall,
  deleteHall,
};
