const invigilationService = require('../services/invigilationService');
const Invigilation = require('../models/Invigilation');
const Faculty = require('../models/Faculty');

// @desc    Pre-Assignment Analysis of faculty availability and conflicts
// @route   GET /api/invigilation/analyze/:examId
// @access  Private (Admin)
const analyzeInvigilation = async (req, res) => {
  try {
    const { examId } = req.params;
    const analysis = await invigilationService.analyzeInvigilationRequirements(examId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Auto Assign Invigilators based on availability & timetable constraints
// @route   POST /api/invigilation/auto-assign/:examId
// @access  Private (Admin)
const autoAssignInvigilators = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await invigilationService.autoAssignInvigilators(examId);
    res.status(201).json({
      message: `Successfully assigned ${result.totalAssigned} invigilator(s) based on faculty availability constraints.`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all invigilation duties (filterable by exam, date, faculty)
// @route   GET /api/invigilation
// @access  Private
const getInvigilationDuties = async (req, res) => {
  try {
    const { examId, facultyId, date } = req.query;
    let query = {};

    if (examId) query.examId = examId;
    if (facultyId) query.facultyId = facultyId;

    let duties = await Invigilation.find(query)
      .populate('examId')
      .populate('facultyId')
      .populate('hallId')
      .sort({ assignedAt: -1 });

    if (date) {
      duties = duties.filter((d) => d.examId && d.examId.examDate === date);
    }

    res.json(duties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get duties for Logged-In Faculty
// @route   GET /api/invigilation/my-duties
// @access  Private (Faculty)
const getMyDuties = async (req, res) => {
  try {
    let faculty = await Faculty.findOne({
      $or: [{ userId: req.user._id }, { email: req.user.email }, { facultyId: req.user.referenceId }],
    });

    if (!faculty) {
      return res.status(404).json({ message: 'Faculty profile not linked to this account.' });
    }

    const duties = await Invigilation.find({ facultyId: faculty._id })
      .populate('examId')
      .populate('hallId')
      .sort({ assignedAt: -1 });

    res.json({
      faculty,
      totalDuties: duties.length,
      duties,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete/Unassign an invigilation duty
// @route   DELETE /api/invigilation/:id
// @access  Private (Admin)
const deleteInvigilationDuty = async (req, res) => {
  try {
    const duty = await Invigilation.findById(req.params.id);
    if (!duty) {
      return res.status(404).json({ message: 'Duty assignment not found' });
    }

    await Invigilation.findByIdAndDelete(req.params.id);
    res.json({ message: 'Duty unassigned successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzeInvigilation,
  autoAssignInvigilators,
  getInvigilationDuties,
  getMyDuties,
  deleteInvigilationDuty,
};
