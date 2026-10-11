const Student = require('../models/Student');
const Department = require('../models/Department');
const Exam = require('../models/Exam');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');

// @desc    Get Admin Dashboard Stats dynamically from MongoDB
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalProgrammes = await Department.countDocuments({ isActive: true });
    const totalHalls = await Hall.countDocuments({ isActive: true });
    const totalFaculty = await Faculty.countDocuments({ isActive: true });
    const totalExams = await Exam.countDocuments();
    const totalSlots = await ExamSlot.countDocuments();

    // Fetch upcoming slots
    const allSlots = await ExamSlot.find()
      .populate('series')
      .sort({ date: 1, startTime: 1 });

    const enrichedSlots = await Promise.all(
      allSlots.map(async (slot) => {
        const papers = await ExamPaper.find({ slot: slot._id })
          .populate('course')
          .populate('programmes.programme');

        const seatCount = await SeatingPlan.countDocuments({ slot: slot._id });
        const hallsCount = (await SeatingPlan.distinct('hall', { slot: slot._id })).length;

        return {
          _id: slot._id,
          series: slot.series,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          notes: slot.notes,
          seatingStatus: slot.seatingStatus || 'NOT_GENERATED',
          status: slot.status,
          papersCount: papers.length,
          papers: papers.map((p) => ({
            courseCode: p.course?.courseCode || p.courseCode,
            courseName: p.course?.courseName || p.courseName,
            type: p.type,
            programmes: p.programmes.map((pr) => pr.programme?.code || pr.departmentCode),
          })),
          seatCount,
          hallsCount,
        };
      })
    );

    const nextSlot = enrichedSlots.length > 0 ? enrichedSlots[0] : null;

    // Faculty Availability Status List (for real faculty availability overview)
    const todayStr = new Date().toISOString().split('T')[0];
    const activeFaculty = await Faculty.find({ isActive: true }).sort({ name: 1 });
    const todayAvailability = await FacultyAvailability.find({
      date: { $gte: todayStr },
    });
    const activeDuties = await Invigilation.find().populate('slot');

    const facultyStatusList = activeFaculty.map((f) => {
      const records = todayAvailability.filter((r) => r.facultyId?.toString() === f._id.toString());
      const duties = activeDuties.filter((d) => (d.faculty || d.facultyId)?.toString() === f._id.toString());

      let status = 'Available';
      let badgeType = 'available';

      if (records.some((r) => r.status === 'Not Available')) {
        status = 'Not Available';
        badgeType = 'unavailable';
      } else if (duties.length > 0) {
        status = 'Assigned';
        badgeType = 'assigned';
      }

      return {
        _id: f._id,
        name: f.name,
        facultyId: f.facultyId,
        department: f.department,
        status,
        badgeType,
        assignedDuties: duties.length,
      };
    });

    res.json({
      counts: {
        totalStudents,
        totalProgrammes: totalProgrammes || 8,
        totalHalls,
        totalFaculty,
        totalExams,
        totalSlots,
      },
      nextSlot,
      upcomingSlots: enrichedSlots,
      facultyAvailability: facultyStatusList,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats };
