const seatingService = require('../services/seatingService');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const Exam = require('../models/Exam');
const Hall = require('../models/Hall');

// @desc    Pre-Generation Analysis of constraints & halls
// @route   GET /api/seating/analyze/:examId
// @access  Private (Admin)
const analyzeSeating = async (req, res) => {
  try {
    const { examId } = req.params;
    const analysis = await seatingService.analyzeExamRequirements(examId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Generate Seating Plan (System auto-allocates halls & seats)
// @route   POST /api/seating/generate/:examId
// @access  Private (Admin)
const generateSeatingPlan = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await seatingService.generateSeatingPlan(examId);
    res.status(201).json({
      message: `Successfully generated seating plan for ${result.totalAllocated} students across ${result.hallsUsed} hall(s).`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Seating Plan for an Exam (Grouped by Hall with layout)
// @route   GET /api/seating/:examId
// @access  Private
const getSeatingByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await seatingService.getSeatingByExam(examId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear seating plan for an exam
// @route   DELETE /api/seating/:examId
// @access  Private (Admin)
const clearSeatingByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await seatingService.clearSeatingPlan(examId);
    res.json({ message: `Seating plan cleared (${result.deletedCount} seats removed).` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Authenticated Student's Own Examination Seating
// @route   GET /api/seating/my-seating
// @access  Private (Student)
const getMySeating = async (req, res) => {
  try {
    // Look up student by userId or referenceId or email
    let student = await Student.findOne({
      $or: [
        { userId: req.user._id },
        { registerNumber: req.user.referenceId },
        { email: req.user.email },
      ],
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found for this account' });
    }

    // Find all seating allocations for this student
    const plans = await SeatingPlan.find({ studentId: student._id })
      .populate('examId')
      .populate('hallId')
      .sort({ generatedAt: -1 });

    if (plans.length === 0) {
      return res.json({
        student,
        activeAssignment: null,
        allAssignments: [],
        hallLayout: null,
      });
    }

    // For the active plan, fetch all occupied seats in that hall so student can see the desk matrix
    const activePlan = plans[0];
    const allHallSeats = await SeatingPlan.find({
      examId: activePlan.examId._id,
      hallId: activePlan.hallId._id,
    })
      .populate('studentId')
      .select('seatNumber row column studentId');

    res.json({
      student,
      activeAssignment: {
        exam: activePlan.examId,
        hall: activePlan.hallId,
        seatNumber: activePlan.seatNumber,
        row: activePlan.row,
        column: activePlan.column,
      },
      allAssignments: plans.map((sp) => ({
        exam: sp.examId,
        hall: sp.hallId,
        seatNumber: sp.seatNumber,
        row: sp.row,
        column: sp.column,
      })),
      hallLayout: {
        hall: activePlan.hallId,
        occupiedSeats: allHallSeats.map((s) => ({
          seatNumber: s.seatNumber,
          row: s.row,
          column: s.column,
          isCurrentStudent: s.studentId?._id?.toString() === student._id.toString(),
          registerNumber: s.studentId?.registerNumber,
          department: s.studentId?.department,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  analyzeSeating,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingByExam,
  getMySeating,
};
