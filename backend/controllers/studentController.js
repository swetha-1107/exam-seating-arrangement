const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const User = require('../models/User');

// @desc    Get all students with search & filter
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    const { search, department, year } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { registerNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    if (department && department !== 'ALL') {
      query.department = department.toUpperCase();
    }

    if (year && year !== 'ALL') {
      query.year = Number(year);
    }

    const students = await Student.find(query).sort({ registerNumber: 1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Private
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new student
// @route   POST /api/students
// @access  Private (Admin)
const createStudent = async (req, res) => {
  try {
    const { registerNumber, name, department, year, section, email } = req.body;

    if (!registerNumber || !name || !department || !year || !email) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const existingStudent = await Student.findOne({ registerNumber: cleanRegNo });
    if (existingStudent) {
      return res.status(400).json({ message: `Student with Register Number ${cleanRegNo} already exists.` });
    }

    const student = await Student.create({
      registerNumber: cleanRegNo,
      name: name.trim(),
      department: department.trim().toUpperCase(),
      year: Number(year),
      section: (section || 'A').trim().toUpperCase(),
      email: email.trim().toLowerCase(),
    });

    // Also create or sync student user account if it doesn't exist
    const existingUser = await User.findOne({ email: student.email });
    if (!existingUser) {
      await User.create({
        name: student.name,
        email: student.email,
        password: 'password123', // default student password
        role: 'student',
        referenceId: student.registerNumber,
      });
    }

    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin)
const updateStudent = async (req, res) => {
  try {
    const { registerNumber, name, department, year, section, email } = req.body;
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (registerNumber) {
      const cleanRegNo = registerNumber.trim().toUpperCase();
      if (cleanRegNo !== student.registerNumber) {
        const conflict = await Student.findOne({ registerNumber: cleanRegNo });
        if (conflict) {
          return res.status(400).json({ message: `Register number ${cleanRegNo} is already in use.` });
        }
        student.registerNumber = cleanRegNo;
      }
    }

    if (name) student.name = name.trim();
    if (department) student.department = department.trim().toUpperCase();
    if (year) student.year = Number(year);
    if (section) student.section = section.trim().toUpperCase();
    if (email) student.email = email.trim().toLowerCase();

    const updatedStudent = await student.save();
    res.json(updatedStudent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Clean up any seating plans referencing this student
    await SeatingPlan.deleteMany({ studentId: student._id });

    // Remove user account if tied to this student
    await User.deleteMany({
      $or: [
        { referenceId: student.registerNumber },
        { email: student.email },
      ],
    });

    await Student.findByIdAndDelete(req.params.id);
    res.json({ message: 'Student removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk upload students (via JSON array or CSV parsed array)
// @route   POST /api/students/bulk
// @access  Private (Admin)
const bulkUploadStudents = async (req, res) => {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: 'Please provide a valid list of students' });
    }

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const item of students) {
      if (!item.registerNumber || !item.name) {
        skippedCount++;
        continue;
      }

      const regNo = item.registerNumber.toString().trim().toUpperCase();
      const existing = await Student.findOne({ registerNumber: regNo });
      if (existing) {
        skippedCount++;
        continue;
      }

      try {
        const newStudent = await Student.create({
          registerNumber: regNo,
          name: item.name.toString().trim(),
          department: (item.department || 'GENERAL').toString().trim().toUpperCase(),
          year: Number(item.year) || 1,
          section: (item.section || 'A').toString().trim().toUpperCase(),
          email: (item.email || `${regNo.toLowerCase()}@college.edu`).toString().trim().toLowerCase(),
        });

        // Also create user account
        await User.create({
          name: newStudent.name,
          email: newStudent.email,
          password: 'password123',
          role: 'student',
          referenceId: newStudent.registerNumber,
        });

        addedCount++;
      } catch (err) {
        errors.push(`${regNo}: ${err.message}`);
        skippedCount++;
      }
    }

    res.json({
      message: `Bulk import completed: ${addedCount} added, ${skippedCount} skipped.`,
      addedCount,
      skippedCount,
      errors: errors.slice(0, 5),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
};
