const User = require('../models/User');
const ExamSeries = require('../models/ExamSeries');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const ProgrammeCourse = require('../models/ProgrammeCourse');
const Exam = require('../models/Exam');
const Subject = require('../models/Subject');
const Department = require('../models/Department');
const Hall = require('../models/Hall');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const Invigilation = require('../models/Invigilation');
const { doIntervalsOverlap, formatDateStr } = require('../utils/conflictChecker');

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
 * Resolves an identifier to an ExamSlot document.
 * Supports passing either an ExamSlot _id or an Exam _id.
 */
const resolveSlot = async (slotOrExamId) => {
  let slot = await ExamSlot.findById(slotOrExamId).populate('series');
  if (slot) return slot;

  // Fallback: check if an Exam document was passed
  const exam = await Exam.findById(slotOrExamId);
  if (exam) {
    if (exam.slotId) {
      slot = await ExamSlot.findById(exam.slotId).populate('series');
      if (slot) return slot;
    }
    // Find or create a matching slot for this exam
    slot = await ExamSlot.findOne({
      date: exam.examDate,
      startTime: exam.startTime,
      endTime: exam.endTime,
    }).populate('series');

    if (!slot) {
      slot = await ExamSlot.create({
        date: exam.examDate,
        startTime: exam.startTime,
        endTime: exam.endTime,
        notes: exam.examName,
      });
      exam.slotId = slot._id;
      await exam.save();
    }
    return slot;
  }
  return null;
};

/**
 * Collect applicable students of ALL papers in the slot (exactly once each).
 * Implements elective groups, open-electives, shared papers, and unassigned elective detection.
 */
const getSlotStudentsByPaper = async (slotId) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Exam Slot not found');

  // Find all papers scheduled in this slot
  let papers = await ExamPaper.find({ slot: slot._id })
    .populate('course')
    .populate('programmes.programme');

  // If no ExamPaper documents exist, check if Exam documents exist for this slot's time
  if (papers.length === 0) {
    const matchingExams = await Exam.find({
      $or: [
        { slotId: slot._id },
        { examDate: slot.date, startTime: slot.startTime, endTime: slot.endTime },
      ],
    }).populate('subjectId').populate('departments');

    for (const ex of matchingExams) {
      if (ex.subjectId) {
        let progList = [];
        if (ex.departments && ex.departments.length > 0) {
          progList = ex.departments.map((d) => ({
            programme: d._id || d,
            semester: ex.semester || 5,
            departmentCode: d.code || ex.department,
          }));
        } else if (ex.department && ex.department !== 'ALL') {
          const dept = await Department.findOne({ code: ex.department });
          if (dept) {
            progList.push({ programme: dept._id, semester: ex.semester || 5, departmentCode: dept.code });
          }
        }

        const paper = await ExamPaper.findOneAndUpdate(
          { slot: slot._id, course: ex.subjectId._id },
          {
            courseCode: ex.subjectId.courseCode || ex.examCode,
            courseName: ex.subjectId.courseName || ex.examName,
            programmes: progList,
            type: ex.subjectId.type || (ex.departments && ex.departments.length > 1 ? 'common' : 'core'),
          },
          { upsert: true, new: true }
        ).populate('course').populate('programmes.programme');
        papers.push(paper);
      }
    }
  }

  const papersWithStudents = [];
  const studentSeen = new Map(); // studentId -> paperId
  const electiveNotAssigned = [];
  const duplicates = [];

  for (const paper of papers) {
    const course = paper.course || {};
    const courseCode = paper.courseCode || course.courseCode || course.subjectCode;
    const courseType = paper.type || course.type || 'core';
    let applicableStudents = [];

    if (courseType === 'open-elective') {
      // Open elective: students whose electiveCourses contains this course code
      applicableStudents = await Student.find({
        electiveCourses: courseCode,
      }).sort({ programme: 1, registerNumber: 1 });
    } else if (courseType === 'elective') {
      // Programme Elective: students in that (programme, semester) taking this elective
      for (const progEntry of paper.programmes) {
        const progCode = progEntry.departmentCode || progEntry.programme?.code;
        const sem = progEntry.semester || 5;

        const students = await Student.find({
          $or: [{ programme: progCode }, { department: progCode }],
          semester: sem,
          electiveCourses: courseCode,
        }).sort({ registerNumber: 1 });

        applicableStudents.push(...students);

        // Check if there are students in this programme & semester without any matching elective in this slot
        const allSlotElectiveCodes = papers
          .filter((p) => p.type === 'elective')
          .map((p) => p.courseCode || p.course?.courseCode);

        const unassignedInProg = await Student.find({
          $or: [{ programme: progCode }, { department: progCode }],
          semester: sem,
          electiveCourses: { $nin: allSlotElectiveCodes },
        });

        unassignedInProg.forEach((s) => {
          if (!electiveNotAssigned.some((item) => item.student._id.toString() === s._id.toString())) {
            electiveNotAssigned.push({
              student: s,
              programme: progCode,
              semester: sem,
            });
          }
        });
      }
    } else {
      // Core or Common Paper: All students in the listed (programme, semester) pairs
      for (const progEntry of paper.programmes) {
        const progCode = progEntry.departmentCode || progEntry.programme?.code;
        const sem = progEntry.semester || 5;

        let query = {
          $or: [{ programme: progCode }, { department: progCode }],
        };
        if (sem) query.semester = sem;

        const students = await Student.find(query).sort({ registerNumber: 1 });
        applicableStudents.push(...students);
      }
    }

    // Deduplicate and detect student conflicts
    const finalPaperStudents = [];
    for (const stu of applicableStudents) {
      const sId = stu._id.toString();
      if (studentSeen.has(sId)) {
        duplicates.push({
          student: stu,
          firstPaper: studentSeen.get(sId),
          secondPaper: paper,
        });
      } else {
        studentSeen.set(sId, paper);
        finalPaperStudents.push(stu);
      }
    }

    paper.applicableStudentsCount = finalPaperStudents.length;
    await paper.save();

    papersWithStudents.push({
      paper,
      courseCode,
      courseName: paper.courseName || course.courseName,
      type: courseType,
      programmes: paper.programmes.map((p) => p.departmentCode || p.programme?.code).filter(Boolean),
      students: finalPaperStudents,
      studentCount: finalPaperStudents.length,
    });
  }

  const totalStudents = Array.from(studentSeen.keys()).length;

  return {
    slot,
    papers: papersWithStudents,
    totalStudents,
    electiveNotAssigned,
    duplicates,
  };
};

/**
 * Pre-Generation Readiness Diagnostic Summary:
 * Checks room capacity, detects time overlap conflicts, validates bench availability,
 * faculty availability, and provides exact blocking reasons.
 */
const analyzeSlotRequirements = async (slotId, options = {}) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Exam slot not found');

  const { papers, totalStudents, electiveNotAssigned, duplicates } = await getSlotStudentsByPaper(slot._id);

  // 1. Fetch all active halls
  const allActiveHalls = await Hall.find({ isActive: true }).sort({ block: 1, floor: 1, hallCode: 1 });

  // 2. Detect overlapping slots on the same date
  const otherSlots = await ExamSlot.find({
    _id: { $ne: slot._id },
    date: slot.date,
  });

  const overlappingSlots = otherSlots.filter((os) =>
    doIntervalsOverlap(slot.startTime, slot.endTime, os.startTime, os.endTime)
  );
  const overlappingSlotIds = overlappingSlots.map((s) => s._id);

  // Halls booked by overlapping slots
  const bookedHallIds = await SeatingPlan.distinct('hall', {
    slot: { $in: overlappingSlotIds },
  });
  const bookedHallIdSet = new Set(bookedHallIds.map((id) => id.toString()));

  // 3. Filter available halls (not booked, and within admin hallPool if specified)
  const poolIds = options.hallPool && Array.isArray(options.hallPool) && options.hallPool.length > 0
    ? new Set(options.hallPool.map((id) => id.toString()))
    : null;

  const availableHalls = allActiveHalls.filter((h) => {
    const hId = h._id.toString();
    if (bookedHallIdSet.has(hId)) return false;
    if (poolIds && !poolIds.has(hId)) return false;
    return true;
  });

  const availableCapacity = availableHalls.reduce((sum, h) => sum + (h.capacity || 0), 0);

  // 4. Determine minimum halls needed
  let accumulatedCapacity = 0;
  const selectedHalls = [];
  for (const h of availableHalls) {
    if (accumulatedCapacity < totalStudents) {
      accumulatedCapacity += h.capacity || 0;
      selectedHalls.push(h);
    }
  }
  const hallsNeeded = selectedHalls.length;

  // 5. Check faculty availability
  const allActiveFaculty = await Faculty.find({ isActive: true });
  const facultyAvail = await FacultyAvailability.find({ date: slot.date });
  const unavailableFacultyIds = new Set(
    facultyAvail.filter((fa) => fa.status === 'Not Available').map((fa) => fa.facultyId.toString())
  );

  // Overlapping invigilation duties
  const busyDuties = await Invigilation.find({ slot: { $in: overlappingSlotIds } });
  const busyFacultyIds = new Set(busyDuties.map((d) => (d.faculty || d.facultyId).toString()));

  const eligibleFaculty = allActiveFaculty.filter((f) => {
    const fId = f._id.toString();
    return !unavailableFacultyIds.has(fId) && !busyFacultyIds.has(fId);
  });

  // 6. Conflicts and Blocking Reasons
  const blockingReasons = [];
  const warnings = [];

  if (totalStudents === 0) {
    blockingReasons.push('No applicable students found for the courses scheduled in this slot.');
  }

  if (totalStudents > availableCapacity) {
    blockingReasons.push(
      `Insufficient hall capacity: ${totalStudents} students need seats, but only ${availableCapacity} seats available across active halls.`
    );
  }

  if (electiveNotAssigned.length > 0) {
    const names = electiveNotAssigned.slice(0, 5).map((e) => `${e.student.name} (${e.student.registerNumber})`).join(', ');
    const extra = electiveNotAssigned.length > 5 ? ` and ${electiveNotAssigned.length - 5} more` : '';
    blockingReasons.push(
      `Elective not assigned: ${electiveNotAssigned.length} student(s) have no elective course specified in this slot (${names}${extra}).`
    );
  }

  if (duplicates.length > 0) {
    blockingReasons.push(
      `Student double-booking: ${duplicates.length} student(s) are assigned to multiple conflicting papers in the same slot.`
    );
  }

  if (bookedHallIdSet.size > 0) {
    warnings.push(`${bookedHallIdSet.size} hall(s) are currently booked by overlapping examination slots.`);
  }

  if (eligibleFaculty.length < hallsNeeded) {
    warnings.push(
      `Faculty shortage: ${hallsNeeded} invigilators required for ${hallsNeeded} hall(s), but only ${eligibleFaculty.length} eligible faculty available.`
    );
  }

  const canGenerate = blockingReasons.length === 0;

  // Check if plan already exists
  const existingPlanCount = await SeatingPlan.countDocuments({ slot: slot._id });

  return {
    slot,
    series: slot.series,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    papers: papers.map((p) => ({
      _id: p.paper._id,
      courseCode: p.courseCode,
      courseName: p.courseName,
      type: p.type,
      programmes: p.programmes,
      studentCount: p.studentCount,
    })),
    totalStudents,
    availableCapacity,
    hallsNeeded,
    availableHallsCount: availableHalls.length,
    selectedHalls,
    allAvailableHalls: availableHalls,
    eligibleFacultyCount: eligibleFaculty.length,
    invigilatorsRequired: hallsNeeded,
    electiveNotAssignedCount: electiveNotAssigned.length,
    electiveNotAssigned,
    duplicates,
    existingPlanCount,
    hasExistingPlan: existingPlanCount > 0,
    canGenerate,
    statusText: canGenerate ? 'READY TO GENERATE' : 'CANNOT GENERATE',
    blockingReasons,
    warnings,
  };
};

/**
 * Generates Seating Arrangement per Exam Slot with the 2-Students-Per-Bench rule.
 * Pair students from DIFFERENT programmes/papers on the same bench (e.g. IT + ECE).
 * Keeps student register numbers contiguous per programme in each hall.
 */
const generateSlotSeatingPlan = async (slotId, options = {}) => {
  const analysis = await analyzeSlotRequirements(slotId, options);

  if (!analysis.canGenerate) {
    throw new Error(`Cannot generate seating plan: ${analysis.blockingReasons.join('; ')}`);
  }

  const { slot, selectedHalls, totalStudents } = analysis;

  // Check for existing plan
  const existingCount = await SeatingPlan.countDocuments({ slot: slot._id });
  if (existingCount > 0 && !options.forceReplace) {
    throw new Error(
      `Seating plan already exists for this slot (${existingCount} seats). Please confirm 'Regenerate (replace)' to overwrite.`
    );
  }

  // Clear existing plan if forceReplace is true
  if (existingCount > 0 && options.forceReplace) {
    await SeatingPlan.deleteMany({ slot: slot._id });
    await Invigilation.deleteMany({ slot: slot._id });
  }

  // Fetch full student records grouped by paper and programme
  const { papers } = await getSlotStudentsByPaper(slot._id);

  // Flatten into student groups: each group is one (paper, programme) chunk, sorted by registerNumber
  let studentGroups = [];
  for (const p of papers) {
    // Group students by their programme
    const byProg = new Map();
    for (const stu of p.students) {
      const prog = stu.programme || stu.department || 'OTHER';
      if (!byProg.has(prog)) byProg.set(prog, []);
      byProg.get(prog).push(stu);
    }

    for (const [prog, stuList] of byProg.entries()) {
      stuList.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
      studentGroups.push({
        paperId: p.paper._id,
        courseCode: p.courseCode,
        courseName: p.courseName,
        programme: prog,
        students: stuList,
        remainingIndex: 0,
      });
    }
  }

  // Sort groups by size descending so larger cohorts are paired smoothly
  studentGroups.sort((a, b) => (b.students.length - b.remainingIndex) - (a.students.length - a.remainingIndex));

  const newAssignments = [];
  let samePaperBenchCount = 0;

  // Fill halls one by one
  for (const hall of selectedHalls) {
    const benchRows = hall.benchRows || 3;
    const benchColumns = hall.benchColumns || 5;

    for (let r = 0; r < benchRows; r++) {
      const rowLetter = getRowLetter(r);

      for (let c = 1; c <= benchColumns; c++) {
        // Stop if all students are seated
        const activeGroups = studentGroups.filter((g) => g.remainingIndex < g.students.length);
        if (activeGroups.length === 0) break;

        // BENCH PAIRING RULE:
        // Seat Left (L) gets student from Group 1
        activeGroups.sort((a, b) => (b.students.length - b.remainingIndex) - (a.students.length - a.remainingIndex));
        const group1 = activeGroups[0];
        const studentLeft = group1.students[group1.remainingIndex++];

        newAssignments.push({
          slot: slot._id,
          examId: slot._id,
          paper: group1.paperId,
          student: studentLeft._id,
          studentId: studentLeft._id,
          hall: hall._id,
          hallId: hall._id,
          benchRow: r,
          benchColumn: c,
          side: 'L',
          seatLabel: `${rowLetter}${c}-L`,
          seatNumber: `${rowLetter}${c}-L`,
          examDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'DRAFT',
          generatedAt: new Date(),
        });

        // Seat Right (R):
        // Priority (a): Pick a student from a DIFFERENT paper/programme!
        const differentGroups = studentGroups.filter(
          (g) => g.remainingIndex < g.students.length && g.paperId.toString() !== group1.paperId.toString()
        );

        if (differentGroups.length > 0) {
          differentGroups.sort((a, b) => (b.students.length - b.remainingIndex) - (a.students.length - a.remainingIndex));
          const group2 = differentGroups[0];
          const studentRight = group2.students[group2.remainingIndex++];

          newAssignments.push({
            slot: slot._id,
            examId: slot._id,
            paper: group2.paperId,
            student: studentRight._id,
            studentId: studentRight._id,
            hall: hall._id,
            hallId: hall._id,
            benchRow: r,
            benchColumn: c,
            side: 'R',
            seatLabel: `${rowLetter}${c}-R`,
            seatNumber: `${rowLetter}${c}-R`,
            examDate: slot.date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            status: 'DRAFT',
            generatedAt: new Date(),
          });
        } else {
          // Only one paper remains.
          // Priority (b): If spare capacity exists in halls, leave second seat empty for anti-malpractice.
          // Priority (c): Only pair same-paper students as last resort if remaining students exceed remaining benches.
          const totalRemaining = studentGroups.reduce((acc, g) => acc + (g.students.length - g.remainingIndex), 0);
          // Calculate remaining benches in this and future halls
          // If capacity is tight, place student in Seat R
          if (totalRemaining > 0 && group1.remainingIndex < group1.students.length) {
            const studentRight = group1.students[group1.remainingIndex++];
            samePaperBenchCount++;

            newAssignments.push({
              slot: slot._id,
              examId: slot._id,
              paper: group1.paperId,
              student: studentRight._id,
              studentId: studentRight._id,
              hall: hall._id,
              hallId: hall._id,
              benchRow: r,
              benchColumn: c,
              side: 'R',
              seatLabel: `${rowLetter}${c}-R`,
              seatNumber: `${rowLetter}${c}-R`,
              examDate: slot.date,
              startTime: slot.startTime,
              endTime: slot.endTime,
              status: 'DRAFT',
              generatedAt: new Date(),
            });
          }
        }
      }
    }
  }

  // Verify all students are seated
  const unseatedCount = studentGroups.reduce((sum, g) => sum + (g.students.length - g.remainingIndex), 0);
  if (unseatedCount > 0) {
    throw new Error(`Could not allocate all students. ${unseatedCount} students remained unseated due to hall geometry.`);
  }

  // Insert generated seating plans
  await SeatingPlan.insertMany(newAssignments);

  // Update slot status
  await ExamSlot.findByIdAndUpdate(slot._id, { seatingStatus: 'DRAFT' });

  return {
    success: true,
    message: `Successfully generated draft seating plan for ${newAssignments.length} students across ${selectedHalls.length} hall(s).`,
    totalSeated: newAssignments.length,
    totalAllocated: newAssignments.length,
    hallsUsed: selectedHalls.length,
    samePaperBenchCount,
    status: 'DRAFT',
  };
};

/**
 * Publishes the seating plan so students can view their allocated seats.
 */
const publishSlotSeatingPlan = async (slotId) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Slot not found');

  const count = await SeatingPlan.countDocuments({ slot: slot._id });
  if (count === 0) {
    throw new Error('No seating plan exists to publish. Generate the seating plan first.');
  }

  await SeatingPlan.updateMany({ slot: slot._id }, { status: 'PUBLISHED' });
  await ExamSlot.findByIdAndUpdate(slot._id, { seatingStatus: 'PUBLISHED' });

  return {
    success: true,
    publishedSeats: count,
    message: `Seating plan for ${slot.date} (${slot.startTime} - ${slot.endTime}) has been PUBLISHED. Students can now view their allotted seats.`,
  };
};

/**
 * Clears the seating plan for an exam slot.
 */
const clearSlotSeatingPlan = async (slotId) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Slot not found');

  const deletedPlans = await SeatingPlan.deleteMany({ slot: slot._id });
  const deletedDuties = await Invigilation.deleteMany({ slot: slot._id });

  await ExamSlot.findByIdAndUpdate(slot._id, { seatingStatus: 'NOT_GENERATED' });

  return {
    success: true,
    message: `Seating plan cleared (${deletedPlans.deletedCount} seats, ${deletedDuties.deletedCount} invigilator duties removed).`,
  };
};

/**
 * Get Seating Plan for a slot grouped by hall with 2-seat bench visualization
 */
const getSlotSeatingPlan = async (slotId) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Slot not found');

  const plans = await SeatingPlan.find({ slot: slot._id })
    .populate('student')
    .populate('hall')
    .populate({
      path: 'paper',
      populate: { path: 'course' },
    })
    .sort({ benchRow: 1, benchColumn: 1, side: 1 });

  // Group by hall
  const hallGroups = {};
  plans.forEach((p) => {
    if (!p.hall) return;
    const hId = p.hall._id.toString();
    if (!hallGroups[hId]) {
      hallGroups[hId] = {
        hall: p.hall,
        seats: [],
        programmes: new Set(),
        papers: new Set(),
      };
    }

    const prog = p.student?.programme || p.student?.department || 'OTHER';
    const paperName = p.paper?.courseName || p.paper?.course?.courseName || 'Exam';
    hallGroups[hId].programmes.add(prog);
    hallGroups[hId].papers.add(paperName);

    hallGroups[hId].seats.push({
      _id: p._id,
      seatLabel: p.seatLabel,
      benchRow: p.benchRow,
      benchColumn: p.benchColumn,
      side: p.side,
      status: p.status,
      student: p.student ? {
        _id: p.student._id,
        name: p.student.name,
        registerNumber: p.student.registerNumber,
        programme: prog,
        section: p.student.section,
      } : null,
      paper: {
        _id: p.paper?._id,
        courseCode: p.paper?.courseCode || p.paper?.course?.courseCode,
        courseName: paperName,
      },
    });
  });

  const formattedHalls = Object.values(hallGroups).map((hg) => ({
    hall: hg.hall,
    seatsCount: hg.seats.length,
    programmes: Array.from(hg.programmes),
    papers: Array.from(hg.papers),
    seats: hg.seats,
  }));

  return {
    slot,
    status: slot.seatingStatus || (plans.length > 0 ? plans[0].status : 'NOT_GENERATED'),
    totalSeated: plans.length,
    hallsCount: formattedHalls.length,
    halls: formattedHalls,
  };
};

/**
 * Get Authenticated Student's Own Seat Allotment.
 * Privacy & Isolation: Students only view their seat if PUBLISHED!
 */
const getMySeating = async (studentUser) => {
  let student = await Student.findOne({
    $or: [
      { userId: studentUser._id },
      { registerNumber: studentUser.referenceId },
      { email: studentUser.email },
    ],
  });

  if (!student) {
    throw new Error('Student profile not found for this account');
  }

  // Only published plans are visible to students
  const publishedPlans = await SeatingPlan.find({
    student: student._id,
    status: 'PUBLISHED',
  })
    .populate('slot')
    .populate('hall')
    .populate({
      path: 'paper',
      populate: { path: 'course' },
    })
    .sort({ examDate: 1, startTime: 1 });

  if (publishedPlans.length === 0) {
    return {
      student,
      activeAssignment: null,
      allAssignments: [],
      hallLayout: null,
    };
  }

  const activePlan = publishedPlans[0];

  // For visual orientation in the hall, fetch all desks in that hall for that slot, anonymizing peer students
  const hallDesks = await SeatingPlan.find({
    slot: activePlan.slot._id,
    hall: activePlan.hall._id,
  })
    .populate('student')
    .select('benchRow benchColumn side seatLabel student');

  return {
    student,
    activeAssignment: {
      exam: {
        examName: activePlan.paper?.courseName || activePlan.paper?.course?.courseName,
        examCode: activePlan.paper?.courseCode || activePlan.paper?.course?.courseCode,
        examDate: activePlan.examDate || activePlan.slot?.date,
        startTime: activePlan.startTime || activePlan.slot?.startTime,
        endTime: activePlan.endTime || activePlan.slot?.endTime,
      },
      hall: activePlan.hall,
      seatNumber: activePlan.seatLabel,
      benchRow: activePlan.benchRow,
      benchColumn: activePlan.benchColumn,
      side: activePlan.side,
    },
    allAssignments: publishedPlans.map((p) => ({
      exam: {
        examName: p.paper?.courseName || p.paper?.course?.courseName,
        examCode: p.paper?.courseCode || p.paper?.course?.courseCode,
        examDate: p.examDate || p.slot?.date,
        startTime: p.startTime || p.slot?.startTime,
        endTime: p.endTime || p.slot?.endTime,
      },
      hall: p.hall,
      seatNumber: p.seatLabel,
      benchRow: p.benchRow,
      benchColumn: p.benchColumn,
      side: p.side,
    })),
    hallLayout: {
      hall: activePlan.hall,
      occupiedSeats: hallDesks.map((d) => ({
        benchRow: d.benchRow,
        benchColumn: d.benchColumn,
        side: d.side,
        seatLabel: d.seatLabel,
        isCurrentStudent: d.student?._id?.toString() === student._id.toString(),
        programme: d.student?.programme || d.student?.department,
      })),
    },
  };
};

// Backwards-compatibility wrappers
const analyzeExamRequirements = async (examId) => {
  const slot = await resolveSlot(examId);
  const analysis = await analyzeSlotRequirements(slot._id);
  return {
    ...analysis,
    registeredStudents: analysis.totalStudents,
    hallsNeeded: analysis.hallsNeeded,
    availableCapacity: analysis.availableCapacity,
    canGenerate: analysis.canGenerate,
    statusText: analysis.statusText,
    warnings: analysis.blockingReasons.concat(analysis.warnings),
    exam: {
      _id: examId,
      department: analysis.papers[0]?.programmes?.join(', ') || 'ALL',
      examDate: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
    },
  };
};

const generateSeatingPlan = async (examId, options = {}) => {
  const slot = await resolveSlot(examId);
  return generateSlotSeatingPlan(slot._id, { ...options, forceReplace: true });
};

const getSeatingByExam = async (examId) => {
  const slot = await resolveSlot(examId);
  return getSlotSeatingPlan(slot._id);
};

const clearSeatingPlan = async (examId) => {
  const slot = await resolveSlot(examId);
  return clearSlotSeatingPlan(slot._id);
};

module.exports = {
  getRowLetter,
  resolveSlot,
  getSlotStudentsByPaper,
  analyzeSlotRequirements,
  generateSlotSeatingPlan,
  publishSlotSeatingPlan,
  clearSlotSeatingPlan,
  getSlotSeatingPlan,
  getMySeating,
  // Backwards compatibility wrappers
  analyzeExamRequirements,
  generateSeatingPlan,
  getSeatingByExam,
  clearSeatingPlan,
};
