const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const Invigilation = require('../models/Invigilation');
const User = require('../models/User');

// @desc    Get all faculty
// @route   GET /api/faculty
// @access  Private
const getFaculty = async (req, res) => {
  try {
    const { search, department, available } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { facultyId: searchRegex },
        { email: searchRegex },
      ];
    }

    if (department && department !== 'ALL') {
      query.department = department.toUpperCase();
    }

    if (available !== undefined && available !== '') {
      query.isActive = available === 'true';
    }

    const facultyList = await Faculty.find(query).sort({ facultyId: 1 });
    res.json(facultyList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single faculty
// @route   GET /api/faculty/:id
// @access  Private
const getFacultyById = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new faculty (Admin)
// @route   POST /api/faculty
// @access  Private (Admin)
const createFaculty = async (req, res) => {
  try {
    const { facultyId, name, department, email, phone, isActive = true } = req.body;

    if (!facultyId || !name || !department || !email) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const cleanFacultyId = facultyId.trim().toUpperCase();
    const existing = await Faculty.findOne({ facultyId: cleanFacultyId });
    if (existing) {
      return res.status(400).json({ message: `Faculty ID ${cleanFacultyId} already exists.` });
    }

    // Create or sync User account
    let user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      user = await User.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: 'password123',
        role: 'faculty',
        referenceId: cleanFacultyId,
      });
    }

    const faculty = await Faculty.create({
      userId: user._id,
      facultyId: cleanFacultyId,
      name: name.trim(),
      department: department.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      phone: (phone || '9876543210').trim(),
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private (Admin)
const updateFaculty = async (req, res) => {
  try {
    const { facultyId, name, department, email, phone, isActive } = req.body;
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    if (facultyId) {
      const cleanFacultyId = facultyId.trim().toUpperCase();
      if (cleanFacultyId !== faculty.facultyId) {
        const conflict = await Faculty.findOne({ facultyId: cleanFacultyId });
        if (conflict) {
          return res.status(400).json({ message: `Faculty ID ${cleanFacultyId} already exists.` });
        }
        faculty.facultyId = cleanFacultyId;
        // Sync user referenceId
        await User.findByIdAndUpdate(faculty.userId, { referenceId: cleanFacultyId });
      }
    }

    if (name) {
      faculty.name = name.trim();
      await User.findByIdAndUpdate(faculty.userId, { name: faculty.name });
    }
    if (department) faculty.department = department.trim().toUpperCase();
    if (email) {
      faculty.email = email.trim().toLowerCase();
      await User.findByIdAndUpdate(faculty.userId, { email: faculty.email });
    }
    if (phone) faculty.phone = phone.trim();
    if (isActive !== undefined) faculty.isActive = isActive;

    const updatedFaculty = await faculty.save();
    res.json(updatedFaculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private (Admin)
const deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    await Invigilation.deleteMany({ facultyId: faculty._id });
    await FacultyAvailability.deleteMany({ facultyId: faculty._id });
    if (faculty.userId) {
      await User.findByIdAndDelete(faculty.userId);
    }

    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ message: 'Faculty removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Availability for Logged-In Faculty
// @route   GET /api/faculty/availability/me
// @access  Private (Faculty)
const getMyAvailability = async (req, res) => {
  try {
    let faculty = await Faculty.findOne({
      $or: [{ userId: req.user._id }, { email: req.user.email }, { facultyId: req.user.referenceId }],
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty profile not found for this account' });
    }

    const availabilities = await FacultyAvailability.find({ facultyId: faculty._id })
      .sort({ date: 1, startTime: 1 });

    res.json({
      faculty,
      availabilities,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add / Update Availability slot for Logged-In Faculty
// @route   POST /api/faculty/availability
// @access  Private (Faculty)
const setMyAvailability = async (req, res) => {
  try {
    const { date, startTime, endTime, status, notes } = req.body;

    if (!date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Please provide date, start time, and end time' });
    }

    let faculty = await Faculty.findOne({
      $or: [{ userId: req.user._id }, { email: req.user.email }, { facultyId: req.user.referenceId }],
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty profile not found' });
    }

    // Upsert availability for this slot
    const updated = await FacultyAvailability.findOneAndUpdate(
      {
        facultyId: faculty._id,
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
      },
      {
        status: status || 'Available',
        notes: (notes || '').trim(),
      },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Availability updated successfully',
      availability: updated,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete Availability slot for Logged-In Faculty
// @route   DELETE /api/faculty/availability/:id
// @access  Private (Faculty)
const deleteMyAvailability = async (req, res) => {
  try {
    await FacultyAvailability.findByIdAndDelete(req.params.id);
    res.json({ message: 'Availability slot removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Faculty Availability Overview (For Admin Dashboard & Management)
// @route   GET /api/faculty/availability/admin-overview
// @access  Private (Admin)
const getAdminAvailabilityOverview = async (req, res) => {
  try {
    const { date } = req.query;
    const facultyList = await Faculty.find({ isActive: true }).sort({ name: 1 });

    // Find all availability records (optionally filtered by date)
    let availQuery = {};
    if (date) availQuery.date = date;
    const records = await FacultyAvailability.find(availQuery);

    // Find all assigned duties
    const duties = await Invigilation.find().populate('examId');

    const overview = facultyList.map((f) => {
      const fRecords = records.filter((r) => r.facultyId.toString() === f._id.toString());
      const fDuties = duties.filter((d) => d.facultyId.toString() === f._id.toString());

      // Determine general status
      let currentStatus = 'Available';
      if (fRecords.some((r) => r.status === 'Not Available')) {
        currentStatus = 'Not Available';
      } else if (fDuties.length > 0) {
        currentStatus = 'Already Assigned';
      }

      return {
        _id: f._id,
        name: f.name,
        facultyId: f.facultyId,
        department: f.department,
        email: f.email,
        phone: f.phone,
        status: currentStatus,
        slots: fRecords,
        assignedDutiesCount: fDuties.length,
      };
    });

    res.json(overview);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getMyAvailability,
  setMyAvailability,
  deleteMyAvailability,
  getAdminAvailabilityOverview,
};
