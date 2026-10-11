const Subject = require('../models/Subject');

// @desc    Get all subjects, with optional filtering by department
// @route   GET /api/subjects
// @access  Private
const getSubjects = async (req, res) => {
  try {
    const { departmentId, semester, search } = req.query;
    let query = {};

    if (departmentId) {
      query.departments = departmentId;
    }

    if (semester) {
      query.semester = Number(semester);
    }

    if (search) {
      query.$or = [
        { subjectCode: { $regex: search, $options: 'i' } },
        { subjectName: { $regex: search, $options: 'i' } },
      ];
    }

    const subjects = await Subject.find(query)
      .populate('departments', 'code name')
      .sort({ semester: 1, subjectCode: 1 });

    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create subject
// @route   POST /api/subjects
// @access  Private (Admin)
const createSubject = async (req, res) => {
  try {
    const { subjectCode, subjectName, semester, departments, isCommonPaper } = req.body;

    if (!subjectCode || !subjectName || !semester) {
      return res.status(400).json({ message: 'Subject Code, Name, and Semester are required' });
    }

    const cleanCode = subjectCode.trim().toUpperCase();
    const existing = await Subject.findOne({ subjectCode: cleanCode });
    if (existing) {
      return res.status(400).json({ message: `Subject code '${cleanCode}' already exists` });
    }

    const deptArray = Array.isArray(departments) ? departments : departments ? [departments] : [];

    const subject = await Subject.create({
      subjectCode: cleanCode,
      subjectName: subjectName.trim(),
      semester: Number(semester),
      departments: deptArray,
      isCommonPaper: !!isCommonPaper || deptArray.length > 1,
      isActive: true,
    });

    const populated = await Subject.findById(subject._id).populate('departments', 'code name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update subject
// @route   PUT /api/subjects/:id
// @access  Private (Admin)
const updateSubject = async (req, res) => {
  try {
    const { subjectCode, subjectName, semester, departments, isCommonPaper, isActive } = req.body;
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    if (subjectCode) subject.subjectCode = subjectCode.trim().toUpperCase();
    if (subjectName) subject.subjectName = subjectName.trim();
    if (semester) subject.semester = Number(semester);
    if (departments) {
      subject.departments = Array.isArray(departments) ? departments : [departments];
    }
    if (typeof isCommonPaper === 'boolean') subject.isCommonPaper = isCommonPaper;
    if (typeof isActive === 'boolean') subject.isActive = isActive;

    await subject.save();
    const populated = await Subject.findById(subject._id).populate('departments', 'code name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete subject
// @route   DELETE /api/subjects/:id
// @access  Private (Admin)
const deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }

    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: `Subject '${subject.subjectCode}' deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
};
