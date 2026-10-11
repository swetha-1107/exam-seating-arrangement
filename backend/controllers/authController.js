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
// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, registerNumber, identifier, password, role } = req.body;
    const loginInput = (identifier || registerNumber || email || '').trim();

    if (!loginInput || !password) {
      return res.status(400).json({ message: 'Please provide Register Number or Email, and Password' });
    }

    // Match by email, referenceId (12-digit Reg No / Faculty ID), or name
    const user = await User.findOne({
      $or: [
        { email: loginInput.toLowerCase() },
        { referenceId: loginInput.toUpperCase() },
        { name: loginInput },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid Register Number or Email' });
    }

    // Role check if provided
    if (role && user.role !== role.toLowerCase()) {
      return res.status(401).json({
        message: `Account found, but role mismatch. This account is registered as '${user.role.toUpperCase()}', not '${role.toUpperCase()}'.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid password' });
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
      programme,
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
    const prog = (programme || department || 'IT').toUpperCase().trim();

    // Generate compliant 12-digit register number if none supplied
    const defaultRegNo = `310624${prog === 'CSE' ? '104' : prog === 'AIDS' ? '243' : prog === 'ECE' ? '106' : '205'}${Date.now().toString().slice(-3)}`;
    const finalRegNo = (registerNumber || defaultRegNo).toUpperCase().trim();

    // Create User record
    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRole,
      referenceId: assignedRole === 'student' ? finalRegNo : (facultyId || '').toUpperCase().trim(),
    });

    // Create linked Student or Faculty profile
    let profile = null;
    if (assignedRole === 'student') {
      user.referenceId = finalRegNo;
      await user.save();

      const studentYear = Number(year) || 3;
      const studentSemester = studentYear * 2 - 1;

      profile = await Student.create({
        userId: user._id,
        registerNumber: finalRegNo,
        name: user.name,
        email: cleanEmail,
        programme: prog,
        department: prog,
        year: studentYear,
        semester: studentSemester,
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
        department: prog,
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
