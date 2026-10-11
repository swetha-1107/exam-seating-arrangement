const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'supersecretjwtkey_exam_seating_system_2026',
    { expiresIn: '30d' }
  );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const cleanInput = email.trim();

    // Match by email or referenceId (Reg No / Faculty ID)
    const user = await User.findOne({
      $or: [
        { email: cleanInput.toLowerCase() },
        { referenceId: cleanInput.toUpperCase() },
        { name: cleanInput },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials or user not found' });
    }

    // Role check if provided
    if (role && user.role !== role.toLowerCase()) {
      return res.status(401).json({
        message: `Account found, but role mismatch. This account is registered as '${user.role.toUpperCase()}', not '${role.toUpperCase()}'.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Retrieve linked profile details
    let profile = null;
    if (user.role === 'student') {
      profile = await Student.findOne({
        $or: [{ userId: user._id }, { registerNumber: user.referenceId }, { email: user.email }],
      });
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({
        $or: [{ userId: user._id }, { facultyId: user.referenceId }, { email: user.email }],
      });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      referenceId: user.referenceId,
      profile,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register user (Student or Faculty self-registration)
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'student',
      registerNumber,
      facultyId,
      department,
      year,
      section,
      phone,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const userExists = await User.findOne({ email: cleanEmail });
    if (userExists) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const assignedRole = role.toLowerCase();
    let referenceId = '';

    // Create User record
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRole,
      referenceId: assignedRole === 'student' ? (registerNumber || '').toUpperCase().trim() : (facultyId || '').toUpperCase().trim(),
    });

    // Create linked Student or Faculty profile
    let profile = null;
    if (assignedRole === 'student') {
      const reg = (registerNumber || `23${(department || 'IT').toUpperCase()}${Date.now().toString().slice(-4)}`).toUpperCase().trim();
      user.referenceId = reg;
      await user.save();

      profile = await Student.create({
        userId: user._id,
        registerNumber: reg,
        name: user.name,
        email: cleanEmail,
        department: (department || 'IT').toUpperCase().trim(),
        year: Number(year) || 3,
        section: (section || 'A').toUpperCase().trim(),
      });
    } else if (assignedRole === 'faculty') {
      const facId = (facultyId || `FAC${Date.now().toString().slice(-3)}`).toUpperCase().trim();
      user.referenceId = facId;
      await user.save();

      profile = await Faculty.create({
        userId: user._id,
        facultyId: facId,
        name: user.name,
        email: cleanEmail,
        department: (department || 'IT').toUpperCase().trim(),
        phone: (phone || '9876543210').trim(),
        isActive: true,
      });
    }

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      referenceId: user.referenceId,
      profile,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let profile = null;

    if (user.role === 'student') {
      profile = await Student.findOne({
        $or: [{ userId: user._id }, { registerNumber: user.referenceId }, { email: user.email }],
      });
    } else if (user.role === 'faculty') {
      profile = await Faculty.findOne({
        $or: [{ userId: user._id }, { facultyId: user.referenceId }, { email: user.email }],
      });
    }

    res.json({
      ...user.toObject(),
      profile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { login, register, getMe };
