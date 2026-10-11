const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const ExamRegistration = require('../models/ExamRegistration');
const { doIntervalsOverlap, formatDateStr } = require('../utils/conflictChecker');

// @desc    Get all exams with search & filter
// @route   GET /api/exams
// @access  Private
const getExams = async (req, res) => {
  try {
    const { search, department, date, session } = req.query;
    let query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { examName: searchRegex },
        { examCode: searchRegex },
        { department: searchRegex },
      ];
    }

    if (department && department !== 'ALL') {
      query.$or = [
        { department: department.toUpperCase() },
        { department: 'ALL' },
      ];
    }

    if (date) {
      query.examDate = date;
    }

    if (session) {
      query.session = session;
    }

    const exams = await Exam.find(query)
      .populate('subjectId')
      .populate('departments', 'code name')
      .sort({ examDate: 1, startTime: 1 });

    // Attach actual registered students, seated students and assigned invigilators
    const enrichedExams = await Promise.all(
      exams.map(async (exam) => {
        const studentCount = await SeatingPlan.countDocuments({ examId: exam._id });
        const invigilatorCount = await Invigilation.countDocuments({ examId: exam._id });
        const regCount = await ExamRegistration.countDocuments({ examId: exam._id });

        return {
          ...exam.toObject(),
          seatedCount: studentCount,
          studentCount: regCount > 0 ? regCount : (studentCount > 0 ? studentCount : exam.registeredStudentsCount),
          invigilatorCount,
          hasSeating: studentCount > 0,
        };
      })
    );

    res.json(enrichedExams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single exam by ID
// @route   GET /api/exams/:id
// @access  Private
const getExamById = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id)
      .populate('subjectId')
      .populate('departments', 'code name');

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }
    const studentCount = await SeatingPlan.countDocuments({ examId: exam._id });
    const invigilatorCount = await Invigilation.countDocuments({ examId: exam._id });
    const regCount = await ExamRegistration.countDocuments({ examId: exam._id });

    res.json({
      ...exam.toObject(),
      seatedCount: studentCount,
      studentCount: regCount > 0 ? regCount : studentCount,
      invigilatorCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create exam
// @route   POST /api/exams
// @access  Private (Admin)
const createExam = async (req, res) => {
  try {
    const {
      examName,
      examCode,
      subjectId,
      examDate,
      session = 'FN',
      startTime,
      endTime,
      department,
      departments,
      semester,
      registeredStudentsCount,
    } = req.body;

    if (!examDate || !startTime || !endTime || !semester) {
      return res.status(400).json({ message: 'Please provide exam date, start time, end time, and semester' });
    }

    let finalName = examName;
    let finalCode = examCode;
    let linkedDepartments = departments || [];

    if (subjectId) {
      const subject = await Subject.findById(subjectId).populate('departments');
      if (subject) {
        if (!finalName) finalName = subject.subjectName;
        if (!finalCode) finalCode = subject.subjectCode;
        if (linkedDepartments.length === 0 && subject.departments) {
          linkedDepartments = subject.departments.map((d) => d._id);
        }
      }
    }

    if (!finalName) {
      return res.status(400).json({ message: 'Exam Name is required' });
    }

    const formattedDate = formatDateStr(examDate);

    // Validate that endTime > startTime
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (endH * 60 + endM <= startH * 60 + startM) {
      return res.status(400).json({ message: 'End time must be after start time' });
    }

    // Timetable Conflict Check:
    // Ensure the same department and semester doesn't have 2 distinct exams scheduled at overlapping times!
    const deptUpper = (department || 'ALL').trim().toUpperCase();
    const semNum = Number(semester);

    const existingDeptExams = await Exam.find({
      examDate: formattedDate,
      department: deptUpper,
      semester: semNum,
    });

    for (const ex of existingDeptExams) {
      if (doIntervalsOverlap(startTime, endTime, ex.startTime, ex.endTime)) {
        return res.status(400).json({
          message: `Timetable conflict: Department ${deptUpper} (Semester ${semNum}) already has examination '${ex.examName}' (${ex.examCode || ''}) scheduled from ${ex.startTime} to ${ex.endTime} on ${formattedDate}.`,
        });
      }
    }

    const exam = await Exam.create({
      examName: finalName.trim(),
      examCode: (finalCode || `EX${Date.now().toString().slice(-4)}`).trim().toUpperCase(),
      subjectId: subjectId || null,
      examDate: formattedDate,
      session: session.toUpperCase(),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      department: deptUpper,
      departments: linkedDepartments,
      semester: semNum,
      registeredStudentsCount: Number(registeredStudentsCount) || 0,
    });

    // Auto-register eligible students if available
    let targetYear = Math.ceil(semNum / 2);
    let studentsToRegister = [];
    if (deptUpper !== 'ALL') {
      studentsToRegister = await Student.find({ department: deptUpper, year: targetYear });
    } else if (linkedDepartments.length > 0) {
      const depts = await Department.find({ _id: { $in: linkedDepartments } });
      const codes = depts.map((d) => d.code);
      studentsToRegister = await Student.find({ department: { $in: codes }, year: targetYear });
    }

    if (studentsToRegister.length > 0) {
      for (const st of studentsToRegister) {
        await ExamRegistration.create({
          studentId: st._id,
          examId: exam._id,
          subjectId: subjectId || null,
          isEligible: true,
        }).catch(() => {});
      }
      exam.registeredStudentsCount = studentsToRegister.length;
      await exam.save();
    }

    res.status(201).json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update exam
// @route   PUT /api/exams/:id
// @access  Private (Admin)
const updateExam = async (req, res) => {
  try {
    const {
      examName,
      examCode,
      subjectId,
      examDate,
      session,
      startTime,
      endTime,
      department,
      departments,
      semester,
      status,
      registeredStudentsCount,
    } = req.body;

    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    if (examName) exam.examName = examName.trim();
    if (examCode) exam.examCode = examCode.trim().toUpperCase();
    if (subjectId !== undefined) exam.subjectId = subjectId || null;
    if (examDate) exam.examDate = formatDateStr(examDate);
    if (session) exam.session = session.toUpperCase();
    if (startTime) exam.startTime = startTime.trim();
    if (endTime) exam.endTime = endTime.trim();
    if (department) exam.department = department.trim().toUpperCase();
    if (departments) exam.departments = departments;
    if (semester) exam.semester = Number(semester);
    if (status) exam.status = status;
    if (registeredStudentsCount !== undefined) {
      exam.registeredStudentsCount = Number(registeredStudentsCount);
    }

    await exam.save();
    res.json(exam);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete exam
// @route   DELETE /api/exams/:id
// @access  Private (Admin)
const deleteExam = async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    await SeatingPlan.deleteMany({ examId: exam._id });
    await Invigilation.deleteMany({ examId: exam._id });
    await ExamRegistration.deleteMany({ examId: exam._id });
    await Exam.findByIdAndDelete(req.params.id);

    res.json({ message: `Exam '${exam.examName}' and all associated seat plans, duty records, and registrations deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
};
