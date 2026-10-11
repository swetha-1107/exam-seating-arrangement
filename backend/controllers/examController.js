const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const { doIntervalsOverlap, formatDateStr } = require('../utils/conflictChecker');

/**
 * Dynamically count applicable students from Student collection based on department and year
 */
const getApplicableStudentCount = async (exam) => {
  const targetYear = exam.semester ? Math.ceil(exam.semester / 2) : null;
  const deptCodes = new Set();
  const deptIds = new Set();

  if (exam.department && exam.department !== 'ALL' && exam.department !== 'COMMON') {
    deptCodes.add(exam.department.toUpperCase());
  }

  if (exam.departments && exam.departments.length > 0) {
    for (const d of exam.departments) {
      if (d && d._id) {
        deptIds.add(d._id.toString());
        if (d.code) deptCodes.add(d.code.toUpperCase());
      } else if (d) {
        deptIds.add(d.toString());
      }
    }
  }

  if (deptIds.size > 0 && deptCodes.size === 0) {
    const found = await Department.find({ _id: { $in: Array.from(deptIds) } });
    found.forEach((f) => deptCodes.add(f.code.toUpperCase()));
  }

  let query = {};
  if (deptCodes.size > 0 || deptIds.size > 0) {
    const orCond = [];
    if (deptCodes.size > 0) orCond.push({ department: { $in: Array.from(deptCodes) } });
    if (deptIds.size > 0) orCond.push({ departmentId: { $in: Array.from(deptIds) } });
    query.$or = orCond;
  }

  if (targetYear) {
    const countWithYear = await Student.countDocuments({ ...query, year: targetYear });
    if (countWithYear > 0) return countWithYear;
  }

  const countWithoutYear = await Student.countDocuments(query);
  if (countWithoutYear > 0) return countWithoutYear;

  return exam.registeredStudentsCount || 0;
};

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

    // Enrich with dynamic counts
    const enrichedExams = await Promise.all(
      exams.map(async (exam) => {
        const seatedCount = await SeatingPlan.countDocuments({ examId: exam._id });
        const invigilatorCount = await Invigilation.countDocuments({ examId: exam._id });
        const applicableCount = await getApplicableStudentCount(exam);

        return {
          ...exam.toObject(),
          seatedCount,
          studentCount: applicableCount > 0 ? applicableCount : (seatedCount > 0 ? seatedCount : exam.registeredStudentsCount),
          invigilatorCount,
          hasSeating: seatedCount > 0,
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

    const seatedCount = await SeatingPlan.countDocuments({ examId: exam._id });
    const invigilatorCount = await Invigilation.countDocuments({ examId: exam._id });
    const applicableCount = await getApplicableStudentCount(exam);

    res.json({
      ...exam.toObject(),
      seatedCount,
      studentCount: applicableCount > 0 ? applicableCount : seatedCount,
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
    });

    // Automatically count applicable students from Student collection
    const applicableCount = await getApplicableStudentCount(exam);
    exam.registeredStudentsCount = applicableCount;
    await exam.save();

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
    } else {
      exam.registeredStudentsCount = await getApplicableStudentCount(exam);
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
    await Exam.findByIdAndDelete(req.params.id);

    res.json({ message: `Exam '${exam.examName}' and all associated seat plans and duty records deleted successfully.` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get examinations for authenticated student based on their department & semester
// @route   GET /api/exams/my-exams
// @access  Private (Student)
const getMyExams = async (req, res) => {
  try {
    const student = await Student.findOne({
      $or: [
        { userId: req.user._id },
        { registerNumber: req.user.referenceId },
        { email: req.user.email },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not linked to user account' });
    }

    // Identify department ObjectIds
    const depts = await Department.find({ code: student.department });
    const deptIds = depts.map((d) => d._id);

    // Query exams for student's department or common
    const exams = await Exam.find({
      $or: [
        { department: student.department },
        { departments: { $in: deptIds } },
        { department: 'ALL' },
      ],
    })
      .populate('subjectId')
      .populate('departments', 'code name')
      .sort({ examDate: 1, startTime: 1 });

    // Filter by semester corresponding to student's academic year (e.g. year 3 -> semester 5 or 6)
    const minSem = (student.year - 1) * 2 + 1;
    const maxSem = student.year * 2;
    const studentExams = exams.filter((e) => !e.semester || (e.semester >= minSem && e.semester <= maxSem));
    const finalExamsList = studentExams.length > 0 ? studentExams : exams;

    // Attach student's allocated seat if generated
    const plans = await SeatingPlan.find({ studentId: student._id }).populate('hallId');

    const enriched = finalExamsList.map((exam) => {
      const plan = plans.find((p) => p.examId.toString() === exam._id.toString());
      return {
        _id: exam._id,
        examId: exam,
        subjectId: exam.subjectId,
        isSeated: !!plan,
        seatNumber: plan?.seatNumber || null,
        hall: plan?.hallId || null,
        isEligible: true,
      };
    });

    res.json({
      student,
      exams: enriched,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

// @desc    Import Timetable via raw CSV text or JSON array
// @route   POST /api/exams/import-timetable or POST /api/exams/import-timetable-csv
// @access  Private (Admin)
const importTimetable = async (req, res) => {
  const ExamSlot = require('../models/ExamSlot');
  const ExamPaper = require('../models/ExamPaper');
  const ExamSeries = require('../models/ExamSeries');

  try {
    let rawList = req.body.exams;

    if (req.body.csvText) {
      const parsed = parseCSV(req.body.csvText);
      rawList = parsed.map((row) => ({
        date: row.date || row.examdate,
        startTime: row.starttime || row.start_time || row.time,
        endTime: row.endtime || row.end_time,
        courseCode: row.coursecode || row.subjectcode || row.code,
        courseName: row.coursename || row.subjectname || row.name,
        programmes: row.programmes || row.departments || row.dept || row.programme,
        paperType: row.papertype || row.type || 'core',
        semester: row.semester || row.sem || 5,
        seriesCode: row.series || row.seriescode || 'CAT-2',
      }));
    }

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ message: 'Please provide valid timetable rows or CSV text' });
    }

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];

    // Ensure default ExamSeries exists
    let series = await ExamSeries.findOne({ code: 'CAT-2' });
    if (!series) {
      series = await ExamSeries.create({
        name: 'Continuous Assessment Test II',
        code: 'CAT-2',
        academicYear: '2026-2027',
        term: 'ODD',
        semesterScope: [5],
      });
    }

    for (const item of rawList) {
      const date = (item.date || '').toString().trim();
      const startTime = (item.startTime || '').toString().trim();
      const endTime = (item.endTime || '').toString().trim();
      const courseCode = (item.courseCode || '').toString().trim().toUpperCase();
      const courseName = (item.courseName || courseCode).toString().trim();

      if (!date || !startTime || !endTime || !courseCode) {
        skippedCount++;
        continue;
      }

      try {
        // 1. Find or create Subject
        let subject = await Subject.findOne({
          $or: [{ courseCode: courseCode }, { code: courseCode }],
        });
        const paperType = (item.paperType || 'core').toString().trim().toLowerCase();
        if (!subject) {
          subject = await Subject.create({
            code: courseCode,
            courseCode: courseCode,
            name: courseName,
            courseName: courseName,
            type: paperType,
            semester: Number(item.semester) || 5,
          });
        }

        // 2. Find or create ExamSlot
        let slot = await ExamSlot.findOne({
          date,
          startTime,
          endTime,
        });
        if (!slot) {
          slot = await ExamSlot.create({
            series: series._id,
            date,
            startTime,
            endTime,
            notes: `${courseCode} - ${courseName}`,
            seatingStatus: 'NOT_GENERATED',
          });
        }

        // 3. Resolve programmes
        let progCodes = [];
        if (Array.isArray(item.programmes)) {
          progCodes = item.programmes.map((p) => p.trim().toUpperCase()).filter(Boolean);
        } else if (typeof item.programmes === 'string') {
          progCodes = item.programmes.split(/[,;/]/).map((p) => p.trim().toUpperCase()).filter(Boolean);
        }

        const deptDocs = await Department.find({ code: { $in: progCodes } });
        const programmes = deptDocs.map((d) => ({
          programme: d._id,
          semester: Number(item.semester) || 5,
          departmentCode: d.code,
        }));

        // 4. Find or create ExamPaper
        let paper = await ExamPaper.findOne({
          slot: slot._id,
          $or: [{ course: subject._id }, { courseCode: courseCode }],
        });
        if (!paper) {
          paper = await ExamPaper.create({
            slot: slot._id,
            course: subject._id,
            courseCode: subject.courseCode,
            courseName: subject.courseName,
            programmes,
            type: paperType,
          });
        } else {
          paper.programmes = programmes;
          paper.type = paperType;
          await paper.save();
        }

        // 5. Also sync Exam document for backwards compatibility
        let exam = await Exam.findOne({
          examDate: date,
          startTime,
          $or: [{ subjectId: subject._id }, { examCode: courseCode }],
        });
        if (!exam) {
          await Exam.create({
            examName: courseName,
            examCode: courseCode,
            subjectId: subject._id,
            department: progCodes.length === 1 ? progCodes[0] : 'ALL',
            departments: deptDocs.map((d) => d._id),
            semester: Number(item.semester) || 5,
            examDate: date,
            startTime,
            endTime,
            slotId: slot._id,
            paperId: paper._id,
          });
        }

        addedCount++;
      } catch (err) {
        errors.push(`${courseCode}: ${err.message}`);
        skippedCount++;
      }
    }

    res.json({
      message: `Timetable import completed: ${addedCount} scheduled/updated, ${skippedCount} skipped.`,
      addedCount,
      skippedCount,
      errors: errors.slice(0, 5),
    });
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
  getMyExams,
  importTimetable,
};
