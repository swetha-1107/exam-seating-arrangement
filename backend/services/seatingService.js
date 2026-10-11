const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Hall = require('../models/Hall');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const ExamRegistration = require('../models/ExamRegistration');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const Invigilation = require('../models/Invigilation');
const { doIntervalsOverlap } = require('../utils/conflictChecker');

// Row letter generator (0 -> 'A', 25 -> 'Z', 26 -> 'AA', etc.)
const getRowLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

/**
 * Fetch students genuinely registered and eligible for an examination.
 * Prioritizes ExamRegistration collection.
 */
const getEligibleStudents = async (exam) => {
  // 1. Query ExamRegistration collection for this specific exam
  const registrations = await ExamRegistration.find({
    examId: exam._id,
    isEligible: true,
  }).populate('studentId');

  const validRegisteredStudents = registrations
    .map((r) => r.studentId)
    .filter((s) => s != null);

  if (validRegisteredStudents.length > 0) {
    return validRegisteredStudents;
  }

  // 2. Fallback if no explicit registrations exist yet:
  // Match students belonging to the exam's department and semester
  let query = {};
  if (exam.department && exam.department !== 'ALL' && exam.department !== 'COMMON') {
    query.department = exam.department.toUpperCase();
    if (exam.semester) {
      query.year = Math.ceil(exam.semester / 2);
    }
  } else if (exam.semester) {
    query.year = Math.ceil(exam.semester / 2);
  }

  let students = await Student.find(query).sort({ registerNumber: 1 });

  // Absolute fallback: all students if query was empty
  if (students.length === 0) {
    students = await Student.find().sort({ registerNumber: 1 });
  }

  return students;
};

/**
 * Pre-Generation Readiness Analysis:
 * Analyzes room capacity, detects time overlap conflicts, supports mixed-department
 * hall sharing, and determines exact readiness.
 */
const analyzeExamRequirements = async (examId) => {
  const exam = await Exam.findById(examId).populate('subjectId').populate('departments');
  if (!exam) {
    throw new Error('Examination record not found');
  }

  const eligibleStudents = await getEligibleStudents(exam);
  const requiredSeats = eligibleStudents.length;

  // 1. Fetch all active halls
  const allHalls = await Hall.find({ isAvailable: true }).sort({ capacity: -1, hallNumber: 1 });

  // 2. Identify seat occupancies from overlapping examinations on the same date and time interval
  // In our college rules, students from different departments CAN share the same hall!
  // A seat is only unavailable if that specific desk in that hall is already taken during that time slot.
  const allOverlappingPlans = await SeatingPlan.find({
    examDate: exam.examDate,
    examId: { $ne: exam._id },
  }).populate('examId', 'examName examCode startTime endTime department');

  const occupiedSeatsByHall = {}; // hallId -> Set of occupied seatNumbers
  const conflictingExamsByHall = {}; // hallId -> array of other exam names sharing this hall

  allOverlappingPlans.forEach((plan) => {
    const planStartTime = plan.startTime || plan.examId?.startTime || '10:00';
    const planEndTime = plan.endTime || plan.examId?.endTime || '13:00';

    if (doIntervalsOverlap(exam.startTime, exam.endTime, planStartTime, planEndTime)) {
      const hId = plan.hallId.toString();
      if (!occupiedSeatsByHall[hId]) {
        occupiedSeatsByHall[hId] = new Set();
        conflictingExamsByHall[hId] = new Set();
      }
      occupiedSeatsByHall[hId].add(plan.seatNumber);
      if (plan.examId?.examName) {
        conflictingExamsByHall[hId].add(`${plan.examId.examName} (${plan.examId.department || 'Shared'})`);
      }
    }
  });

  // 3. Calculate remaining available seats per hall
  const hallAvailabilityDetails = allHalls.map((hall) => {
    const totalCap = hall.capacity || (hall.rows * hall.columns);
    const takenSeats = occupiedSeatsByHall[hall._id.toString()] || new Set();
    const remainingCap = Math.max(0, totalCap - takenSeats.size);
    const sharedWith = Array.from(conflictingExamsByHall[hall._id.toString()] || []);

    return {
      hall,
      totalCapacity: totalCap,
      occupiedSeatsCount: takenSeats.size,
      remainingCapacity: remainingCap,
      takenSeatNumbers: takenSeats,
      sharedWith,
      canUse: remainingCap > 0,
    };
  });

  const availableHalls = hallAvailabilityDetails.filter((h) => h.canUse);
  const totalAvailableCapacity = availableHalls.reduce((sum, h) => sum + h.remainingCapacity, 0);

  // 4. Select minimum required halls to seat the eligible candidate count
  let cumulativeSeats = 0;
  const selectedHalls = [];

  for (const hInfo of availableHalls) {
    selectedHalls.push(hInfo);
    cumulativeSeats += hInfo.remainingCapacity;
    if (cumulativeSeats >= requiredSeats) {
      break;
    }
  }

  // 5. Check faculty readiness for the required halls
  const invigilatorsRequired = selectedHalls.length;
  const activeFaculty = await Faculty.find({ isActive: true });

  const availabilityRecords = await FacultyAvailability.find({
    date: exam.examDate,
  });

  const unavailableFacultyIds = new Set();
  availabilityRecords.forEach((rec) => {
    if (rec.status === 'Not Available') {
      unavailableFacultyIds.add(rec.facultyId.toString());
    }
  });

  // Exclude faculty with overlapping duties
  const activeDuties = await Invigilation.find({ examDate: exam.examDate }).populate('examId');
  const busyFacultyIds = new Set();
  activeDuties.forEach((duty) => {
    const dStart = duty.examId?.startTime || '10:00';
    const dEnd = duty.examId?.endTime || '13:00';
    if (doIntervalsOverlap(exam.startTime, exam.endTime, dStart, dEnd)) {
      busyFacultyIds.add(duty.facultyId.toString());
    }
  });

  const eligibleFaculty = activeFaculty.filter((f) => {
    const fId = f._id.toString();
    return !unavailableFacultyIds.has(fId) && !busyFacultyIds.has(fId);
  });

  // 6. Diagnostic warnings and readiness status
  const warnings = [];
  let canGenerate = true;

  if (requiredSeats === 0) {
    canGenerate = false;
    warnings.push('No registered eligible students found for this examination.');
  }

  if (availableHalls.length === 0) {
    canGenerate = false;
    warnings.push('All examination halls have 0 remaining capacity during this examination time slot.');
  } else if (totalAvailableCapacity < requiredSeats) {
    canGenerate = false;
    warnings.push(
      `Insufficient hall capacity. Required: ${requiredSeats} seats, but only ${totalAvailableCapacity} unassigned seats remain across available halls.`
    );
  }

  // Notice: Multiple departments having exams on the same date is ALLOWED and supported!
  const sharedHallsCount = selectedHalls.filter((h) => h.sharedWith.length > 0).length;
  if (sharedHallsCount > 0) {
    warnings.push(
      `${sharedHallsCount} hall(s) will be shared with other department examinations in this same session (mixed-department seating enabled).`
    );
  }

  return {
    exam,
    registeredStudents: requiredSeats,
    requiredCapacity: requiredSeats,
    availableCapacity: totalAvailableCapacity,
    totalHallsCount: allHalls.length,
    availableHallsCount: availableHalls.length,
    hallsNeeded: selectedHalls.length,
    selectedHalls: selectedHalls.map((h) => ({
      _id: h.hall._id,
      hallNumber: h.hall.hallNumber,
      building: h.hall.building,
      remainingCapacity: h.remainingCapacity,
      sharedWith: h.sharedWith,
    })),
    eligibleFacultyCount: eligibleFaculty.length,
    invigilatorsRequired,
    canGenerate,
    statusText: canGenerate ? 'READY TO GENERATE' : 'CANNOT GENERATE',
    warnings,
  };
};

/**
 * Generate Seating Plan with Mixed-Department Hall Sharing Support
 */
const generateSeatingPlan = async (examId) => {
  const analysis = await analyzeExamRequirements(examId);

  if (!analysis.canGenerate) {
    const msg = analysis.warnings.join(' ') || 'Cannot generate seating plan due to constraint conflicts.';
    throw new Error(msg);
  }

  const { exam } = analysis;
  const students = await getEligibleStudents(exam);

  // Group students by department / section for interleaving preference
  const deptGroups = {};
  students.forEach((s) => {
    const d = s.department || 'GENERAL';
    if (!deptGroups[d]) deptGroups[d] = [];
    deptGroups[d].push(s);
  });

  // Sort by register number
  Object.keys(deptGroups).forEach((d) => {
    deptGroups[d].sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
  });

  // Interleave students across available departments
  const interleavedStudents = [];
  const depts = Object.keys(deptGroups);
  let hasMore = true;
  let round = 0;

  while (hasMore) {
    hasMore = false;
    for (const d of depts) {
      if (round < deptGroups[d].length) {
        interleavedStudents.push(deptGroups[d][round]);
        hasMore = true;
      }
    }
    round++;
  }

  // Clear previous seating plan for THIS exact examination
  await SeatingPlan.deleteMany({ examId: exam._id });

  // Re-fetch active occupied seats from overlapping exams on this date/session
  const allOverlappingPlans = await SeatingPlan.find({
    examDate: exam.examDate,
    examId: { $ne: exam._id },
  }).populate('examId', 'startTime endTime');

  const occupiedSeatsByHall = {};
  allOverlappingPlans.forEach((plan) => {
    const planStartTime = plan.startTime || plan.examId?.startTime || '10:00';
    const planEndTime = plan.endTime || plan.examId?.endTime || '13:00';
    if (doIntervalsOverlap(exam.startTime, exam.endTime, planStartTime, planEndTime)) {
      const hId = plan.hallId.toString();
      if (!occupiedSeatsByHall[hId]) occupiedSeatsByHall[hId] = new Set();
      occupiedSeatsByHall[hId].add(plan.seatNumber);
    }
  });

  const allHalls = await Hall.find({ isAvailable: true }).sort({ capacity: -1, hallNumber: 1 });
  const newAssignments = [];
  let studentIdx = 0;

  for (const hall of allHalls) {
    if (studentIdx >= interleavedStudents.length) break;

    const rows = hall.rows || 5;
    const cols = hall.columns || 6;
    const takenSeats = occupiedSeatsByHall[hall._id.toString()] || new Set();

    for (let r = 0; r < rows; r++) {
      const rowLetter = getRowLetter(r);
      for (let c = 0; c < cols; c++) {
        if (studentIdx >= interleavedStudents.length) break;

        const seatNumber = `${rowLetter}${c + 1}`;

        // If this desk is already taken by another student from another department in this session, skip to next desk
        if (takenSeats.has(seatNumber)) {
          continue;
        }

        const currentStudent = interleavedStudents[studentIdx];

        newAssignments.push({
          examId: exam._id,
          studentId: currentStudent._id,
          hallId: hall._id,
          seatNumber,
          row: r,
          column: c,
          examDate: exam.examDate,
          session: exam.session || 'FN',
          startTime: exam.startTime,
          endTime: exam.endTime,
          generatedAt: new Date(),
        });

        studentIdx++;
      }
      if (studentIdx >= interleavedStudents.length) break;
    }
  }

  if (newAssignments.length < interleavedStudents.length) {
    throw new Error(
      `Could not allocate all students. Allocated ${newAssignments.length} out of ${interleavedStudents.length}.`
    );
  }

  // Insert generated assignments into MongoDB
  await SeatingPlan.insertMany(newAssignments);

  // Update registered student count on Exam
  exam.registeredStudentsCount = interleavedStudents.length;
  await exam.save();

  const distinctHalls = new Set(newAssignments.map((a) => a.hallId.toString()));

  return {
    success: true,
    message: `Successfully allocated ${newAssignments.length} students across ${distinctHalls.size} hall(s) with department interleaving and mixed-department sharing.`,
    totalAllocated: newAssignments.length,
    hallsUsed: distinctHalls.size,
  };
};

/**
 * Fetch formatted seating plan for an exam grouped by hall
 */
const getSeatingByExam = async (examId) => {
  const exam = await Exam.findById(examId);
  if (!exam) throw new Error('Exam not found');

  const plans = await SeatingPlan.find({ examId })
    .populate('studentId')
    .populate('hallId')
    .sort({ row: 1, column: 1 });

  const hallGroups = {};
  plans.forEach((p) => {
    if (!p.hallId) return;
    const hId = p.hallId._id.toString();
    if (!hallGroups[hId]) {
      hallGroups[hId] = {
        hallDetails: p.hallId,
        seats: [],
      };
    }
    hallGroups[hId].seats.push({
      seatNumber: p.seatNumber,
      row: p.row,
      column: p.column,
      student: p.studentId,
    });
  });

  return {
    exam,
    totalSeated: plans.length,
    halls: Object.values(hallGroups),
  };
};

/**
 * Clear seating plan for an exam
 */
const clearSeatingPlan = async (examId) => {
  return await SeatingPlan.deleteMany({ examId });
};

module.exports = {
  getEligibleStudents,
  analyzeExamRequirements,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingPlan,
};
