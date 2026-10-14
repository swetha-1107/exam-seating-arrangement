const seatingService = require('../services/seatingService');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const SeatingPlan = require('../models/SeatingPlan');
const Exam = require('../models/Exam');
const Student = require('../models/Student');

// @desc    List all Exam Slots with papers and seating status
// @route   GET /api/seating/slots
// @access  Private
const listSlots = async (req, res) => {
  try {
    const { seriesId } = req.query;
    const filter = seriesId ? { series: seriesId } : {};
    const slots = await ExamSlot.find(filter)
      .populate('series')
      .sort({ date: 1, startTime: 1 });

    const enriched = await Promise.all(
      slots.map(async (slot) => {
        const papers = await ExamPaper.find({ slot: slot._id })
          .populate('course')
          .populate('programmes.programme');

        const seatCount = await SeatingPlan.countDocuments({ slot: slot._id });
        const distinctHalls = await SeatingPlan.distinct('hall', { slot: slot._id });

        return {
          _id: slot._id,
          series: slot.series,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          notes: slot.notes,
          seatingStatus: slot.seatingStatus || 'NOT_GENERATED',
          reuseStatus: slot.reuseStatus || '',
          selectionExplanations: slot.selectionExplanations || [],
          status: slot.status,
          papersCount: papers.length,
          papers: papers.map((p) => {
            const courseCode = p.course?.courseCode || p.course?.subjectCode || p.courseCode || '';
            const courseName = p.course?.courseName || p.course?.subjectName || p.courseName || '';
            const displayName = courseCode && courseName ? `${courseCode} – ${courseName}` : (courseCode || courseName || 'Paper');
            return {
              _id: p._id,
              courseCode,
              courseName,
              displayName,
              type: p.type,
              programmes: p.programmes.map((pr) => pr.programme?.code || pr.departmentCode || pr.programme?.name),
            };
          }),
          seatCount,
          hallsCount: distinctHalls.length,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pre-Generation Analysis of constraints & halls for a slot
// @route   GET /api/seating/analyze-slot/:slotId
// @access  Private (Admin)
const analyzeSlotSeating = async (req, res) => {
  try {
    const { slotId } = req.params;
    const analysis = await seatingService.analyzeSlotRequirements(slotId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Generate Seating Plan for a slot
// @route   POST /api/seating/generate-slot/:slotId
// @access  Private (Admin)
const generateSlotSeating = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await seatingService.generateSlotSeatingPlan(slotId, req.body);
    res.status(201).json({
      message: `Successfully generated seating plan for ${result.totalAllocated} students across ${result.hallsUsed} hall(s).`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Publish Seating Plan for a slot
// @route   POST /api/seating/publish-slot/:slotId
// @access  Private (Admin)
const publishSlotSeating = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await seatingService.publishSlotSeatingPlan(slotId);
    res.json({
      message: `Seating plan published (${result.publishedSeats} seats). Students can now view their seating details.`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get Seating Plan for a slot
// @route   GET /api/seating/slot/:slotId
// @access  Private
const getSlotSeating = async (req, res) => {
  try {
    const { slotId } = req.params;
    const data = await seatingService.getSlotSeatingPlan(slotId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Clear Seating Plan for a slot
// @route   DELETE /api/seating/slot/:slotId
// @access  Private (Admin)
const clearSlotSeating = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await seatingService.clearSlotSeatingPlan(slotId);
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
    const data = await seatingService.getMySeating(req.user);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Evaluate multi-day base plan reuse for a slot
// @route   GET /api/seating/evaluate-reuse/:slotId
// @access  Private (Admin)
const evaluateSlotReuse = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await seatingService.evaluateSlotReuseStatus(slotId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Re-plan seating for a specific slot override
// @route   POST /api/seating/replan-slot/:slotId
// @access  Private (Admin)
const replanSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const result = await seatingService.replanSlotSeating(slotId, req.body);
    res.status(201).json({
      message: result.message,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Legacy backward-compatibility endpoints
const analyzeSeating = async (req, res) => {
  try {
    const { examId } = req.params;
    const analysis = await seatingService.analyzeExamRequirements(examId);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const generateSeatingPlan = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await seatingService.generateSeatingPlan(examId, req.body);
    res.status(201).json({
      message: `Successfully generated seating plan for ${result.totalAllocated} students across ${result.hallsUsed} hall(s).`,
      result,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getSeatingByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const data = await seatingService.getSeatingByExam(examId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const clearSeatingByExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const result = await seatingService.clearSeatingPlan(examId);
    res.json({ message: `Seating plan cleared (${result.deletedCount} seats removed).` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listSlots,
  analyzeSlotSeating,
  generateSlotSeating,
  publishSlotSeating,
  getSlotSeating,
  clearSlotSeating,
  getMySeating,
  evaluateSlotReuse,
  replanSlot,
  // Legacy
  analyzeSeating,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingByExam,
};
