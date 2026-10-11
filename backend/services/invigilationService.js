const ExamSeries = require('../models/ExamSeries');
const ExamSlot = require('../models/ExamSlot');
const Exam = require('../models/Exam');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const { resolveSlot } = require('./seatingService');
const { doIntervalsOverlap } = require('../utils/conflictChecker');

/**
 * Pre-Assignment Analysis for an Exam Slot:
 * Analyzes invigilation constraints, checks faculty availability, timetable clashes,
 * fair duty count, and determines readiness.
 */
const analyzeSlotInvigilation = async (slotOrExamId) => {
  const slot = await resolveSlot(slotOrExamId);
  if (!slot) throw new Error('Exam slot not found');

  // 1. Find all distinct halls utilized in the seating plan for this slot
  const distinctHallIds = await SeatingPlan.distinct('hall', { slot: slot._id });
  const halls = await Hall.find({ _id: { $in: distinctHallIds } });
  const invigilatorsRequired = halls.length;

  if (invigilatorsRequired === 0) {
    return {
      slot,
      halls: [],
      hallsCount: 0,
      invigilatorsRequired: 0,
      canAssign: false,
      statusText: 'CANNOT ASSIGN',
      warnings: ['No seating plan has been generated for this examination slot yet. Generate the seating plan first.'],
      eligibleFaculty: [],
    };
  }

  // 2. Fetch all active faculty
  const allActiveFaculty = await Faculty.find({ isActive: true });

  // 3. Check explicit availability declarations for this date & slot time
  const availabilityRecords = await FacultyAvailability.find({ date: slot.date });
  const explicitlyUnavailableIds = new Set();

  availabilityRecords.forEach((rec) => {
    if (rec.status === 'Not Available') {
      if (doIntervalsOverlap(slot.startTime, slot.endTime, rec.startTime, rec.endTime)) {
        explicitlyUnavailableIds.add(rec.facultyId.toString());
      }
    }
  });

  // 4. Timetable & Multiple Duty Conflict Check:
  // Find other slots overlapping in date and time
  const otherSlots = await ExamSlot.find({
    _id: { $ne: slot._id },
    date: slot.date,
  });
  const overlappingSlots = otherSlots.filter((os) =>
    doIntervalsOverlap(slot.startTime, slot.endTime, os.startTime, os.endTime)
  );
  const overlappingSlotIds = overlappingSlots.map((s) => s._id);

  // Find faculty already booked for overlapping slots
  const busyDuties = await Invigilation.find({
    slot: { $in: overlappingSlotIds },
  });
  const busyFacultyIds = new Set(busyDuties.map((d) => (d.faculty || d.facultyId).toString()));

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
    const missing = invigilatorsRequired - eligibleFaculty.length;
    warnings.push(
      `Faculty shortage: ${invigilatorsRequired} invigilators required for ${halls.length} hall(s), but only ${eligibleFaculty.length} eligible faculty available (${missing} missing).`
    );
  }

  if (explicitlyUnavailableIds.size > 0) {
    warnings.push(
      `${explicitlyUnavailableIds.size} faculty member(s) declared 'Not Available' for this time interval.`
    );
  }

  if (busyFacultyIds.size > 0) {
    warnings.push(
      `${busyFacultyIds.size} faculty member(s) already assigned to overlapping examination supervision duties.`
    );
  }

  return {
    slot,
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
 * Automatic Invigilator Assignment per Slot:
 * Assigns 1 eligible, non-conflicting faculty per hall with fair duty spreading.
 */
const autoAssignSlotInvigilators = async (slotOrExamId) => {
  const analysis = await analyzeSlotInvigilation(slotOrExamId);

  if (!analysis.canAssign) {
    const errorMsg = analysis.warnings.join(' ') || 'Cannot assign invigilators due to faculty shortage or timetable conflicts.';
    throw new Error(errorMsg);
  }

  const { slot, halls, eligibleFaculty } = analysis;

  // Clear previous assignments for THIS slot to allow seamless re-assignment
  await Invigilation.deleteMany({ slot: slot._id });

  // Fair duty spreading: count how many duties each faculty member has across the series
  const facultyDutyCounts = await Invigilation.aggregate([
    { $group: { _id: '$faculty', count: { $sum: 1 } } },
  ]);
  const dutyCountMap = new Map();
  facultyDutyCounts.forEach((dc) => dutyCountMap.set(dc._id.toString(), dc.count));

  // Sort eligible faculty by least duties assigned
  eligibleFaculty.sort((a, b) => {
    const countA = dutyCountMap.get(a._id.toString()) || 0;
    const countB = dutyCountMap.get(b._id.toString()) || 0;
    return countA - countB;
  });

  const assignments = [];
  for (let i = 0; i < halls.length; i++) {
    const assignedFaculty = eligibleFaculty[i];
    assignments.push({
      slot: slot._id,
      examId: slot._id,
      hall: halls[i]._id,
      hallId: halls[i]._id,
      faculty: assignedFaculty._id,
      facultyId: assignedFaculty._id,
      examDate: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      assignedAt: new Date(),
    });
  }

  await Invigilation.insertMany(assignments);

  const populated = await Invigilation.find({ slot: slot._id })
    .populate('faculty')
    .populate('hall')
    .populate('slot');

  return {
    slot,
    totalAssigned: assignments.length,
    assignments: populated,
  };
};

// Backwards-compatibility wrappers
const analyzeInvigilationRequirements = async (examId) => {
  return analyzeSlotInvigilation(examId);
};

const autoAssignInvigilators = async (examId) => {
  return autoAssignSlotInvigilators(examId);
};

module.exports = {
  analyzeSlotInvigilation,
  autoAssignSlotInvigilators,
  analyzeInvigilationRequirements,
  autoAssignInvigilators,
};
