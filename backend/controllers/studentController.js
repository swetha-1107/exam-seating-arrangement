const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const User = require('../models/User');
const Department = require('../models/Department');

const parseCSV = (text) => {
  if (!text || typeof text !== 'string') return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length < 2) return [];

  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    values.push(current.trim());
    return values;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.length === 0 || vals.every((v) => v === '')) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] !== undefined ? vals[idx] : '';
    });
    rows.push(obj);
  }
  return rows;
};

// @desc    Get all students with search & filter
// @route   GET /api/students
// @access  Private
const getStudents = async (req, res) => {
  try {
    const { search, department, programme, year, semester } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { registerNumber: searchRegex },
        { email: searchRegex },
      ];
    }

    const prog = programme || department;
    if (prog && prog !== 'ALL') {
      query.$or = [{ programme: prog.toUpperCase() }, { department: prog.toUpperCase() }];
    }

    if (year && year !== 'ALL') {
      query.year = Number(year);
    }

    if (semester && semester !== 'ALL') {
      query.semester = Number(semester);
    }

    const students = await Student.find(query)
      .populate('programmeId')
      .sort({ registerNumber: 1 });
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
    const student = await Student.findById(req.params.id).populate('programmeId');
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
    const { registerNumber, name, programme, department, year, semester, section, email, electiveCourses } = req.body;

    const progCode = (programme || department || '').trim().toUpperCase();
    if (!registerNumber || !name || !progCode || !email) {
      return res.status(400).json({ message: 'Please provide Register Number, Name, Programme, and Email' });
    }

    const cleanRegNo = registerNumber.trim().toUpperCase();
    const existingStudent = await Student.findOne({ registerNumber: cleanRegNo });
    if (existingStudent) {
      return res.status(400).json({ message: `Student with Register Number ${cleanRegNo} already exists.` });
    }

    const deptDoc = await Department.findOne({ code: progCode });

    const calcYear = year ? Number(year) : (semester ? Math.ceil(Number(semester) / 2) : 3);
    const calcSem = semester ? Number(semester) : (calcYear * 2 - 1);

    const electives = Array.isArray(electiveCourses)
      ? electiveCourses.map((e) => e.trim().toUpperCase()).filter(Boolean)
      : typeof electiveCourses === 'string'
      ? electiveCourses.split(/[,;]/).map((e) => e.trim().toUpperCase()).filter(Boolean)
      : [];

    const student = await Student.create({
      registerNumber: cleanRegNo,
      name: name.trim(),
      programme: progCode,
      department: progCode,
      programmeId: deptDoc?._id,
      departmentId: deptDoc?._id,
      year: calcYear,
      semester: calcSem,
      section: (section || 'A').trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      electiveCourses: electives,
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
    const { registerNumber, name, programme, department, year, semester, section, email, electiveCourses } = req.body;
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

    const progCode = (programme || department);
    if (progCode) {
      student.programme = progCode.trim().toUpperCase();
      student.department = progCode.trim().toUpperCase();
      const deptDoc = await Department.findOne({ code: student.programme });
      if (deptDoc) {
        student.programmeId = deptDoc._id;
        student.departmentId = deptDoc._id;
      }
    }

    if (name) student.name = name.trim();
    if (year) student.year = Number(year);
    if (semester) student.semester = Number(semester);
    if (section) student.section = section.trim().toUpperCase();
    if (email) student.email = email.trim().toLowerCase();

    if (electiveCourses !== undefined) {
      student.electiveCourses = Array.isArray(electiveCourses)
        ? electiveCourses.map((e) => e.trim().toUpperCase()).filter(Boolean)
        : typeof electiveCourses === 'string'
        ? electiveCourses.split(/[,;]/).map((e) => e.trim().toUpperCase()).filter(Boolean)
        : [];
    }

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
    await SeatingPlan.deleteMany({
      $or: [{ studentId: student._id }, { student: student._id }],
    });

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

// @desc    Bulk upload / CSV import students
// @route   POST /api/students/bulk or POST /api/students/import-csv
// @access  Private (Admin)
const bulkUploadStudents = async (req, res) => {
  try {
    let rawList = req.body.students;

    if (req.body.csvText) {
      const parsed = parseCSV(req.body.csvText);
      rawList = parsed.map((row) => ({
        registerNumber: row.registernumber || row.regno || row.rollnumber || row.registerno,
        name: row.name || row.studentname,
        email: row.email,
        programme: row.programme || row.department || row.dept || 'IT',
        department: row.programme || row.department || row.dept || 'IT',
        year: row.year,
        semester: row.semester || row.sem,
        section: row.section || row.sec || 'A',
        electiveCourses: row.electivecourses || row.electives || row.electivecourse || '',
      }));
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ message: 'Please provide a valid list of students or CSV content' });
    }

    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors = [];

    const allDepts = await Department.find();
    const deptMap = new Map();
    allDepts.forEach((d) => deptMap.set(d.code.toUpperCase(), d._id));

    for (const item of rawList) {
      const regNo = (item.registerNumber || item.regNo || '').toString().trim().toUpperCase();
      const name = (item.name || '').toString().trim();

      if (!regNo || !name) {
        skippedCount++;
        continue;
      }

      const progCode = (item.programme || item.department || 'IT').toString().trim().toUpperCase();
      const deptId = deptMap.get(progCode);

      const year = Number(item.year) || (item.semester ? Math.ceil(Number(item.semester) / 2) : 3);
      const semester = Number(item.semester) || (year * 2 - 1);
      const email = (item.email || `${regNo.toLowerCase()}@easwari.edu`).toString().trim().toLowerCase();

      let electives = [];
      if (Array.isArray(item.electiveCourses)) {
        electives = item.electiveCourses.map((e) => e.trim().toUpperCase()).filter(Boolean);
      } else if (typeof item.electiveCourses === 'string' && item.electiveCourses.length > 0) {
        electives = item.electiveCourses.split(/[,;]/).map((e) => e.trim().toUpperCase()).filter(Boolean);
      }

      try {
        let student = await Student.findOne({ registerNumber: regNo });
        if (student) {
          student.name = name;
          student.programme = progCode;
          student.department = progCode;
          student.programmeId = deptId || student.programmeId;
          student.departmentId = deptId || student.departmentId;
          student.year = year;
          student.semester = semester;
          student.section = (item.section || student.section || 'A').toString().trim().toUpperCase();
          student.email = email;
          if (electives.length > 0) {
            student.electiveCourses = electives;
          }
          await student.save();
          updatedCount++;
        } else {
          student = await Student.create({
            registerNumber: regNo,
            name,
            programme: progCode,
            department: progCode,
            programmeId: deptId,
            departmentId: deptId,
            year,
            semester,
            section: (item.section || 'A').toString().trim().toUpperCase(),
            email,
            electiveCourses: electives,
          });

          // Sync user account
          const existingUser = await User.findOne({ email });
          if (!existingUser) {
            await User.create({
              name: student.name,
              email: student.email,
              password: 'password123',
              role: 'student',
              referenceId: student.registerNumber,
            });
          }
          addedCount++;
        }
      } catch (err) {
        errors.push(`${regNo}: ${err.message}`);
        skippedCount++;
      }
    }

    res.json({
      message: `Bulk import completed: ${addedCount} added, ${updatedCount} updated, ${skippedCount} skipped.`,
      addedCount,
      updatedCount,
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
