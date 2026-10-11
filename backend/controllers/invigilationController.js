const invigilationService = require('../services/invigilationService');
const Invigilation = require('../models/Invigilation');
const Faculty = require('../models/Faculty');

// @desc    Pre-Assignment Analysis for a slot
// @route   GET /api/invigilation/analyze-slot/:slotId
// @access  Private (Admin)
const analyzeSlotInvigilation = async (req, res) => {
  try {
    const { slotId } = req.params;
    const analysis = await invigilationService.analyzeSlotInvigilation(slotId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Auto Assign Invigilators for a slot
// @route   POST /api/invigilation/assign-slot/:slotId
// @access  Private (Admin)
const autoAssignSlotInvigilators = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await invigilationService.autoAssignSlotInvigilators(slotId);
    res.status(201).json({
      message: `Successfully assigned ${result.totalAssigned} invigilator(s) based on faculty availability constraints.`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all invigilation duties (filterable by slotId, examId, facultyId, date)
// @route   GET /api/invigilation
// @access  Private
const getInvigilationDuties = async (req, res) => {
  try {
    const { slotId, examId, facultyId, date } = req.query;
    let query = {};

    if (slotId) {
      query.$or = [{ slot: slotId }, { examId: slotId }];
    } else if (examId) {
      query.$or = [{ examId: examId }, { slot: examId }];
    }

    if (facultyId) {
      query.$or = [{ faculty: facultyId }, { facultyId: facultyId }];
    }

    let duties = await Invigilation.find(query)
      .populate('slot')
      .populate('examId')
      .populate('faculty')
      .populate('facultyId')
      .populate('hall')
      .populate('hallId')
      .sort({ assignedAt: -1 });

    if (date) {
      duties = duties.filter(
        (d) =>
          d.examDate === date ||
          (d.slot && d.slot.date === date) ||
          (d.examId && d.examId.examDate === date)
      );
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

    const duties = await Invigilation.find({
      $or: [{ faculty: faculty._id }, { facultyId: faculty._id }],
    })
      .populate('slot')
      .populate('examId')
      .populate('hall')
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

// Legacy backward compatibility
const analyzeInvigilation = async (req, res) => {
  try {
    const { examId } = req.params;
    const analysis = await invigilationService.analyzeInvigilationRequirements(examId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

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

module.exports = {
  analyzeSlotInvigilation,
  autoAssignSlotInvigilators,
  getInvigilationDuties,
  getMyDuties,
  deleteInvigilationDuty,
  // Legacy
  analyzeInvigilation,
  autoAssignInvigilators,
};
