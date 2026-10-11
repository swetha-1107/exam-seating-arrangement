const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const { doExamsOverlap } = require('../utils/conflictChecker');

/**
 * Pre-Assignment Analysis: analyzes invigilation constraints,
 * checks faculty availability, timetable clashes, and determines readiness.
 */
const analyzeInvigilationRequirements = async (examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) {
    throw new Error('Examination not found');
  }

  // 1. Find all distinct halls utilized in the seating plan for this exam
  const distinctHallIds = await SeatingPlan.distinct('hallId', { examId: exam._id });
  const halls = await Hall.find({ _id: { $in: distinctHallIds } });
  const invigilatorsRequired = halls.length;

  if (invigilatorsRequired === 0) {
    return {
      exam,
      hallsCount: 0,
      invigilatorsRequired: 0,
      canAssign: false,
      statusText: 'CANNOT ASSIGN',
      warnings: ['No seating plan has been generated for this examination yet. Generate the seating plan first.'],
      eligibleFaculty: [],
    };
  }

  // 2. Fetch all active faculty
  const allActiveFaculty = await Faculty.find({ isActive: true });

  // 3. Check Explicit Availability Records for this date & time
  // Query FacultyAvailability for date and overlapping time interval
  const availabilityRecords = await FacultyAvailability.find({
    date: exam.examDate,
  });

  const explicitlyUnavailableIds = new Set();
  const explicitlyAvailableIds = new Set();

  availabilityRecords.forEach((rec) => {
    // Check if slot overlaps with exam
    if (rec.status === 'Not Available') {
      explicitlyUnavailableIds.add(rec.facultyId.toString());
    } else if (rec.status === 'Available') {
      explicitlyAvailableIds.add(rec.facultyId.toString());
    }
  });

  // 4. Timetable & Multiple Duty Conflict Check:
  // Find all other exams overlapping in date & time
  const otherExams = await Exam.find({
    _id: { $ne: exam._id },
    examDate: exam.examDate,
  });
  const overlappingExams = otherExams.filter((other) => doExamsOverlap(exam, other));
  const overlappingExamIds = overlappingExams.map((e) => e._id);

  // Find faculty already booked for overlapping exams
  const busyDuties = await Invigilation.find({
    examId: { $in: overlappingExamIds },
  }).populate('facultyId').populate('examId');

  const busyFacultyIds = new Set(busyDuties.map((d) => d.facultyId?._id?.toString()));

  // 5. Filter for genuinely eligible faculty:
  // Must be active, NOT explicitly marked 'Not Available', and NOT busy in an overlapping duty
  const eligibleFaculty = allActiveFaculty.filter((f) => {
    const fId = f._id.toString();
    if (explicitlyUnavailableIds.has(fId)) return false;
    if (busyFacultyIds.has(fId)) return false;
    return true;
  });

  // 6. Warnings & Readiness
  const warnings = [];
  let canAssign = true;

  if (eligibleFaculty.length < invigilatorsRequired) {
    canAssign = false;
    warnings.push(
      `Insufficient faculty available. Required: ${invigilatorsRequired} invigilator(s) for ${halls.length} hall(s), but only ${eligibleFaculty.length} eligible faculty available.`
    );
  }

  if (explicitlyUnavailableIds.size > 0) {
    warnings.push(
      `${explicitlyUnavailableIds.size} faculty member(s) marked 'Not Available' for this examination date.`
    );
  }

  if (busyFacultyIds.size > 0) {
    warnings.push(
      `${busyFacultyIds.size} faculty member(s) already assigned to overlapping examination supervision duties.`
    );
  }

  return {
    exam,
    halls,
    hallsCount: halls.length,
    invigilatorsRequired,
    totalActiveFaculty: allActiveFaculty.length,
    eligibleFacultyCount: eligibleFaculty.length,
    unavailableFacultyCount: explicitlyUnavailableIds.size,
    alreadyAssignedFacultyCount: busyFacultyIds.size,
    eligibleFaculty,
    canAssign,
    statusText: canAssign ? 'READY TO ASSIGN' : 'CANNOT ASSIGN',
    warnings,
  };
};

/**
 * Automatic Invigilator Assignment:
 * System assigns 1 eligible, non-conflicting faculty per hall based on availability & timetable constraints.
 */
const autoAssignInvigilators = async (examId) => {
  const analysis = await analyzeInvigilationRequirements(examId);

  if (!analysis.canAssign) {
    const errorMsg = analysis.warnings.join(' ') || 'Cannot assign invigilators due to availability or timetable conflicts.';
    throw new Error(errorMsg);
  }

  const { exam, halls, eligibleFaculty } = analysis;

  // Clear previous assignments for THIS exam to allow seamless re-assignment
  await Invigilation.deleteMany({ examId: exam._id });

  const assignments = [];
  for (let i = 0; i < halls.length; i++) {
    const assignedFaculty = eligibleFaculty[i];
    assignments.push({
      examId: exam._id,
      hallId: halls[i]._id,
      facultyId: assignedFaculty._id,
      examDate: exam.examDate,
      session: exam.session || 'FN',
      assignedAt: new Date(),
    });
  }

  await Invigilation.insertMany(assignments);

  // Return populated assignments
  const populated = await Invigilation.find({ examId: exam._id })
    .populate('facultyId')
    .populate('hallId')
    .populate('examId');

  return {
    exam,
    totalAssigned: assignments.length,
    assignments: populated,
  };
};

module.exports = {
  analyzeInvigilationRequirements,
  autoAssignInvigilators,
};
