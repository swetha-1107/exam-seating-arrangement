const Student = require('../models/Student');
const Exam = require('../models/Exam');
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
    const totalExams = await Exam.countDocuments();
    const totalHalls = await Hall.countDocuments();
    const totalFaculty = await Faculty.countDocuments();

    // Upcoming exams: examDate >= today's date string YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingExamsList = await Exam.find({
      examDate: { $gte: todayStr },
      status: { $ne: 'Cancelled' },
    })
      .sort({ examDate: 1, startTime: 1 })
      .limit(6);

    const upcomingExamsCount = await Exam.countDocuments({
      examDate: { $gte: todayStr },
      status: { $ne: 'Cancelled' },
    });

    // Occupied halls: distinct halls assigned in seating plans
    const occupiedHallsDistinct = await SeatingPlan.distinct('hallId');
    const occupiedHallsCount = occupiedHallsDistinct.length;

    // Faculty Availability Status List (for the live dashboard widget)
    const activeFaculty = await Faculty.find({ isActive: true }).sort({ name: 1 });
    const todayAvailability = await FacultyAvailability.find({
      date: { $gte: todayStr },
    });
    const activeDuties = await Invigilation.find().populate('examId');

    const facultyStatusList = activeFaculty.map((f) => {
      const records = todayAvailability.filter((r) => r.facultyId.toString() === f._id.toString());
      const duties = activeDuties.filter((d) => d.facultyId.toString() === f._id.toString());

      let status = 'Available';
      let badgeType = 'available'; // 'available' (green), 'unavailable' (red), 'assigned' (yellow)

      if (records.some((r) => r.status === 'Not Available')) {
        status = 'Not Available';
        badgeType = 'unavailable';
      } else if (duties.length > 0) {
        status = 'Already Assigned';
        badgeType = 'assigned';
      }

      return {
        _id: f._id,
        name: f.name,
        facultyId: f.facultyId,
        department: f.department,
        status,
        badgeType,
        assignedHalls: duties.map((d) => d.hallId).length,
      };
    });

    // Recent activities
    const recentSeating = await SeatingPlan.find()
      .populate('examId', 'examName examCode examDate')
      .populate('hallId', 'hallNumber')
      .sort({ createdAt: -1 })
      .limit(6);

    const recentInvigilation = await Invigilation.find()
      .populate('examId', 'examName examCode examDate')
      .populate('facultyId', 'name facultyId')
      .populate('hallId', 'hallNumber')
      .sort({ createdAt: -1 })
      .limit(6);

    const activities = [];
    const seenExamSeating = new Set();
    recentSeating.forEach((s) => {
      if (s.examId && !seenExamSeating.has(s.examId._id.toString())) {
        seenExamSeating.add(s.examId._id.toString());
        activities.push({
          id: `seat-${s._id}`,
          type: 'seating',
          title: `Seating Plan Generated`,
          description: `Seating generated for ${s.examId.examName} (${s.examId.examCode || ''})`,
          timestamp: s.createdAt,
        });
      }
    });

    recentInvigilation.forEach((inv) => {
      if (inv.examId && inv.facultyId && inv.hallId) {
        activities.push({
          id: `inv-${inv._id}`,
          type: 'invigilation',
          title: `Invigilator Assigned`,
          description: `${inv.facultyId.name} (${inv.facultyId.facultyId}) assigned to Hall ${inv.hallId.hallNumber} for ${inv.examId.examName}`,
          timestamp: inv.createdAt,
        });
      }
    });

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      counts: {
        totalStudents,
        totalExams,
        totalHalls,
        totalFaculty,
        upcomingExams: upcomingExamsCount,
        occupiedHalls: occupiedHallsCount,
      },
      upcomingExams: upcomingExamsList,
      facultyAvailability: facultyStatusList,
      recentActivities: activities.slice(0, 6),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDashboardStats };
