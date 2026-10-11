const ExamRegistration = require('../models/ExamRegistration');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

// @desc    Get exam registrations
// @route   GET /api/registrations
// @access  Private
const getRegistrations = async (req, res) => {
  try {
    const { examId, studentId, department } = req.query;
    let query = {};

    if (examId) query.examId = examId;
    if (studentId) query.studentId = studentId;

    let registrations = await ExamRegistration.find(query)
      .populate('studentId', 'registerNumber name department year section email')
      .populate('examId', 'examName examCode examDate session startTime endTime semester')
      .populate('subjectId', 'subjectCode subjectName semester')
      .sort({ createdAt: -1 });

    if (department && department !== 'ALL') {
      registrations = registrations.filter(
        (r) => r.studentId && r.studentId.department === department.toUpperCase()
      );
    }

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a single student to an exam
// @route   POST /api/registrations
// @access  Private (Admin)
const registerStudent = async (req, res) => {
  try {
    const { studentId, examId, subjectId } = req.body;

    if (!studentId || !examId) {
      return res.status(400).json({ message: 'studentId and examId are required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Check duplicate
    const existing = await ExamRegistration.findOne({ studentId, examId });
    if (existing) {
      return res.status(400).json({ message: 'Student is already registered for this examination' });
    }

    const registration = await ExamRegistration.create({
      studentId,
      examId,
      subjectId: subjectId || exam.subjectId,
      isEligible: true,
    });

    // Update count on Exam
    const count = await ExamRegistration.countDocuments({ examId });
    exam.registeredStudentsCount = count;
    await exam.save();

    const populated = await ExamRegistration.findById(registration._id)
      .populate('studentId', 'registerNumber name department year section')
      .populate('examId', 'examName examCode examDate session');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Bulk register eligible students to an exam by department/year
// @route   POST /api/registrations/bulk
// @access  Private (Admin)
const bulkRegisterStudents = async (req, res) => {
  try {
    const { examId, department, year } = req.body;

    if (!examId) {
      return res.status(400).json({ message: 'examId is required' });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    let studentFilter = {};
    if (department && department !== 'ALL') {
      studentFilter.department = department.toUpperCase();
    }
    if (year) {
      studentFilter.year = Number(year);
    } else if (exam.semester) {
      // By default map semester to year (e.g. sem 5/6 -> year 3)
      studentFilter.year = Math.ceil(exam.semester / 2);
    }

    const students = await Student.find(studentFilter);
    if (students.length === 0) {
      return res.status(400).json({
        message: `No matching students found for Department: ${department || 'ALL'}, Year: ${studentFilter.year || 'Any'}`,
      });
    }

    let newlyRegistered = 0;
    let alreadyRegistered = 0;

    for (const student of students) {
      const exists = await ExamRegistration.findOne({
        studentId: student._id,
        examId: exam._id,
      });

      if (!exists) {
        await ExamRegistration.create({
          studentId: student._id,
          examId: exam._id,
          subjectId: exam.subjectId,
          isEligible: true,
        });
        newlyRegistered++;
      } else {
        alreadyRegistered++;
      }
    }

    const totalCount = await ExamRegistration.countDocuments({ examId: exam._id });
    exam.registeredStudentsCount = totalCount;
    await exam.save();

    res.json({
      message: `Registration complete: ${newlyRegistered} student(s) newly registered, ${alreadyRegistered} already registered.`,
      newlyRegistered,
      alreadyRegistered,
      totalCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete registration
// @route   DELETE /api/registrations/:id
// @access  Private (Admin)
const deleteRegistration = async (req, res) => {
  try {
    const registration = await ExamRegistration.findById(req.params.id);
    if (!registration) {
      return res.status(404).json({ message: 'Registration record not found' });
    }

    const examId = registration.examId;
    await ExamRegistration.findByIdAndDelete(req.params.id);

    // Update count on exam
    const count = await ExamRegistration.countDocuments({ examId });
    await Exam.findByIdAndUpdate(examId, { registeredStudentsCount: count });

    res.json({ message: 'Registration removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get examinations for authenticated student
// @route   GET /api/registrations/my-exams
// @access  Private (Student)
const getMyRegistrations = async (req, res) => {
  try {
    const student = await Student.findOne({
      $or: [{ userId: req.user._id }, { registerNumber: req.user.referenceId }, { email: req.user.email }],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not linked to user account' });
    }

    const registrations = await ExamRegistration.find({ studentId: student._id })
      .populate('examId')
      .populate('subjectId')
      .sort({ 'examId.examDate': 1 });

    res.json({
      student,
      registrations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getRegistrations,
  registerStudent,
  bulkRegisterStudents,
  deleteRegistration,
  getMyRegistrations,
};
