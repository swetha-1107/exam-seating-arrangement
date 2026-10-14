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
 * Builds dynamic Programme Compatibility Matrix across the series / slot.
 * Cost(A, B) = count of slots where A and B write the same course code.
 * If A == B: cost is Infinity (unless allowSameDeptLastResort is enabled).
 * If A and B write the same paper in current slot: cost is Infinity.
 */
const buildProgrammeCompatibilityMatrix = async (seriesId, currentSlotId, options = {}) => {
  const allowSameDept = !!options.allowSameDeptLastResort;

  // Fetch all slots in the series
  const seriesSlots = seriesId ? await ExamSlot.find({ series: seriesId }) : [];
  const allSlotIds = seriesSlots.map((s) => s._id);
  if (currentSlotId && !allSlotIds.some((id) => id.toString() === currentSlotId.toString())) {
    allSlotIds.push(currentSlotId);
  }

  // Fetch all papers across series slots
  const allPapers = await ExamPaper.find({ slot: { $in: allSlotIds } }).populate('programmes.programme');

  // Map: (slotId, programme) -> courseCode
  const progSlotPaperMap = new Map();
  const allProgrammesSet = new Set();

  for (const paper of allPapers) {
    const sId = paper.slot.toString();
    const cCode = paper.courseCode;
    for (const pr of paper.programmes) {
      const pCode = (pr.departmentCode || pr.programme?.code || '').toUpperCase().trim();
      if (pCode) {
        allProgrammesSet.add(pCode);
        progSlotPaperMap.set(`${sId}:${pCode}`, cCode);
      }
    }
  }

  const programmes = Array.from(allProgrammesSet);
  const matrix = {};

  for (const p1 of programmes) {
    matrix[p1] = {};
    for (const p2 of programmes) {
      if (p1 === p2) {
        matrix[p1][p2] = allowSameDept ? 1000 : Infinity;
        continue;
      }

      // Check current slot clash (HARD: never same paper on same slot)
      if (currentSlotId) {
        const c1 = progSlotPaperMap.get(`${currentSlotId.toString()}:${p1}`);
        const c2 = progSlotPaperMap.get(`${currentSlotId.toString()}:${p2}`);
        if (c1 && c2 && c1 === c2) {
          matrix[p1][p2] = Infinity;
          continue;
        }
      }

      // Compute series cost (count of slots where p1 and p2 write the same paper)
      let sharedCount = 0;
      for (const s of allSlotIds) {
        const c1 = progSlotPaperMap.get(`${s.toString()}:${p1}`);
        const c2 = progSlotPaperMap.get(`${s.toString()}:${p2}`);
        if (c1 && c2 && c1 === c2) {
          sharedCount++;
        }
      }
      matrix[p1][p2] = sharedCount;
    }
  }

  return { programmes, matrix };
};

/**
 * Cluster-based, Compact, Bias-free Hall Selection.
 * 1. Groups active halls into clusters: (block, floor).
 * 2. Rotates starting block based on slot/series rotation (avoids CIVIL block bias).
 * 3. Fills entire floors before opening another floor; fills a block's floors before opening another block.
 * 4. Produces clear explanations of why each cluster was selected.
 */
const selectHallClusters = async (requiredCapacity, slotId, options = {}) => {
  const slot = slotId ? await ExamSlot.findById(slotId).populate('series') : null;

  // Check overlapping slots for booked halls
  let bookedHallIdSet = new Set();
  if (slot) {
    const otherSlots = await ExamSlot.find({
      _id: { $ne: slot._id },
      date: slot.date,
    });
    const overlappingSlots = otherSlots.filter((os) =>
      doIntervalsOverlap(slot.startTime, slot.endTime, os.startTime, os.endTime)
    );
    if (overlappingSlots.length > 0) {
      const bookedIds = await SeatingPlan.distinct('hall', {
        slot: { $in: overlappingSlots.map((s) => s._id) },
      });
      bookedHallIdSet = new Set(bookedIds.map((id) => id.toString()));
    }
  }

  // Fetch all active halls
  const allHalls = await Hall.find({ isActive: true });
  const availableHalls = allHalls.filter((h) => !bookedHallIdSet.has(h._id.toString()));

  // Group into clusters: (block, floor)
  const clustersMap = new Map();
  for (const h of availableHalls) {
    const block = (h.block || 'MAIN').toUpperCase().trim();
    const floor = (h.floor || 'GROUND').toUpperCase().trim();
    const clusterKey = `${block}:${floor}`;
    if (!clustersMap.has(clusterKey)) {
      clustersMap.set(clusterKey, {
        block,
        floor,
        key: clusterKey,
        halls: [],
        totalCapacity: 0,
      });
    }
    const cl = clustersMap.get(clusterKey);
    cl.halls.push(h);
    cl.totalCapacity += h.capacity || h.usableCapacity || 32;
  }

  // Count past usage of blocks to break ties and ensure fair distribution
  const blockUsageCount = { MAIN: 0, CIVIL: 0, MECH: 0 };
  const allSlotPlans = await SeatingPlan.find({}).populate('hall');
  for (const sp of allSlotPlans) {
    if (sp.hall?.block) {
      const b = sp.hall.block.toUpperCase().trim();
      blockUsageCount[b] = (blockUsageCount[b] || 0) + 1;
    }
  }

  // Determine starting block rotation (fair tie-breaking)
  const availableBlocks = ['MAIN', 'CIVIL', 'MECH'];
  // Sort blocks by least-used first, then rotational index
  const slotDateNum = slot?.date ? new Date(slot.date).getDate() : 0;
  availableBlocks.sort((a, b) => {
    const diff = (blockUsageCount[a] || 0) - (blockUsageCount[b] || 0);
    if (diff !== 0) return diff;
    // Rotate tie-breaker by date
    return ((availableBlocks.indexOf(a) + slotDateNum) % 3) - ((availableBlocks.indexOf(b) + slotDateNum) % 3);
  });

  const floorOrder = ['GROUND', 'FIRST', 'SECOND', 'THIRD'];
  const orderedClusters = [];
  const isLargeCohort = requiredCapacity > 200;

  if (isLargeCohort) {
    // Spread across multiple blocks when student count is large (e.g. 15 Oct):
    // Fill GROUND floor of block 1, GROUND floor of block 2, GROUND floor of block 3, etc.
    for (const f of floorOrder) {
      for (const b of availableBlocks) {
        const cl = clustersMap.get(`${b}:${f}`);
        if (cl && cl.halls.length > 0) {
          orderedClusters.push(cl);
        }
      }
    }
  } else {
    // For smaller cohorts, fill a block's floors completely before opening another block
    for (const b of availableBlocks) {
      for (const f of floorOrder) {
        const cl = clustersMap.get(`${b}:${f}`);
        if (cl && cl.halls.length > 0) {
          orderedClusters.push(cl);
        }
      }
    }
  }

  // Select whole floors (compact selection)
  const selectedHalls = [];
  const explanations = [];
  let accumulatedCapacity = 0;

  for (const cl of orderedClusters) {
    if (accumulatedCapacity >= requiredCapacity) break;

    // Sort halls within cluster by room capacity descending, then priority (no alphabetical bias)
    cl.halls.sort((a, b) => (b.capacity || 32) - (a.capacity || 32) || (a.priority || 1) - (b.priority || 1));

    selectedHalls.push(...cl.halls);
    accumulatedCapacity += cl.totalCapacity;

    explanations.push(
      `Cluster ${cl.block} Block (${cl.floor} Floor) selected: ${cl.halls.length} halls, ${cl.totalCapacity} seats (compact floor-fill, usage count: ${blockUsageCount[cl.block] || 0}).`
    );
  }

  return {
    selectedHalls,
    accumulatedCapacity,
    explanations,
    availableCapacity: availableHalls.reduce((s, h) => s + (h.capacity || 32), 0),
    totalAvailableHalls: availableHalls,
  };
};

/**
 * Pre-Generation Readiness Diagnostic Summary.
 * Validates capacity (accounting for forced empty seats), faculty, time overlap,
 * and provides clear explanations.
 */
const analyzeSlotRequirements = async (slotId, options = {}) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Exam slot not found');

  const { papers, totalStudents, electiveNotAssigned, duplicates } = await getSlotStudentsByPaper(slot._id);

  // Build compatibility matrix for this slot
  const { programmes, matrix } = await buildProgrammeCompatibilityMatrix(slot.series?._id || slot.series, slot._id, options);

  // Group student counts by programme in this slot
  const progCounts = {};
  for (const p of papers) {
    for (const st of p.students) {
      const prog = (st.programme || st.department || 'OTHER').toUpperCase().trim();
      progCounts[prog] = (progCounts[prog] || 0) + 1;
    }
  }

  // Estimate forced empty seats (unpairable surplus students sitting 1 per bench)
  let estimatedForcedEmptySeats = 0;
  const countsArray = Object.values(progCounts);
  if (countsArray.length > 0) {
    const maxProgCount = Math.max(...countsArray);
    const sumOtherProgs = totalStudents - maxProgCount;
    if (maxProgCount > sumOtherProgs) {
      // Surplus students in dominant programme that cannot be paired with another programme
      estimatedForcedEmptySeats = maxProgCount - sumOtherProgs;
    } else {
      // At most odd remainder across cohorts
      estimatedForcedEmptySeats = totalStudents % 2;
    }
  }

  const effectiveRequiredSeats = totalStudents + estimatedForcedEmptySeats;

  // Run cluster-based hall selection
  const hallSelection = await selectHallClusters(effectiveRequiredSeats, slot._id, options);

  // Check faculty availability
  const otherSlots = await ExamSlot.find({ _id: { $ne: slot._id }, date: slot.date });
  const overlappingSlots = otherSlots.filter((os) =>
    doIntervalsOverlap(slot.startTime, slot.endTime, os.startTime, os.endTime)
  );
  const overlappingSlotIds = overlappingSlots.map((s) => s._id);

  const allActiveFaculty = await Faculty.find({ isActive: true });
  const facultyAvail = await FacultyAvailability.find({ date: slot.date });
  const unavailableFacultyIds = new Set(
    facultyAvail.filter((fa) => fa.status === 'Not Available').map((fa) => fa.facultyId.toString())
  );
  const busyDuties = await Invigilation.find({ slot: { $in: overlappingSlotIds } });
  const busyFacultyIds = new Set(busyDuties.map((d) => (d.faculty || d.facultyId).toString()));

  const eligibleFaculty = allActiveFaculty.filter((f) => {
    const fId = f._id.toString();
    return !unavailableFacultyIds.has(fId) && !busyFacultyIds.has(fId);
  });

  const hallsNeeded = hallSelection.selectedHalls.length;

  // Diagnostics, blocking reasons, and warnings
  const blockingReasons = [];
  const warnings = [];

  if (totalStudents === 0) {
    blockingReasons.push('No applicable students found for the courses scheduled in this slot.');
  }

  if (effectiveRequiredSeats > hallSelection.availableCapacity) {
    blockingReasons.push(
      `Insufficient hall capacity: ${totalStudents} students need seats (+${estimatedForcedEmptySeats} forced empty seats for separation = ${effectiveRequiredSeats} required), but only ${hallSelection.availableCapacity} seats available across active halls.`
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

  if (eligibleFaculty.length < hallsNeeded) {
    warnings.push(
      `Faculty shortage: ${hallsNeeded} invigilators required for ${hallsNeeded} hall(s), but only ${eligibleFaculty.length} eligible faculty available.`
    );
  }

  if (estimatedForcedEmptySeats > 0) {
    warnings.push(
      `${estimatedForcedEmptySeats} bench seat(s) will be forced empty to maintain 0 same-department / 0 same-paper pairing.`
    );
  }

  const canGenerate = blockingReasons.length === 0;
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
    estimatedForcedEmptySeats,
    effectiveRequiredSeats,
    availableCapacity: hallSelection.availableCapacity,
    hallsNeeded,
    selectedHalls: hallSelection.selectedHalls,
    allAvailableHalls: hallSelection.totalAvailableHalls,
    selectionExplanations: hallSelection.explanations,
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
    compatibilityMatrix: matrix,
    programmesInSlot: Object.keys(progCounts),
  };
};

/**
 * Robust Two-Student Bench Pairing & Hall Seating Engine.
 * 
 * Rules:
 * 1. HARD: Never 2 students of the same department on a bench (unless allowSameDeptLastResort is explicitly true).
 * 2. HARD: Never 2 students writing the same course code on a bench.
 * 3. Every hall must have 2 or more programmes.
 * 4. Contiguous register numbers per programme in each hall.
 * 5. Surplus / Unpaired students sit 1 per bench with the other seat empty (forced empty seat).
 * 6. Capacity check strictly aborts if available capacity < totalStudents + forcedEmptySeats.
 */
const generateSlotSeatingPlan = async (slotId, options = {}) => {
  const analysis = await analyzeSlotRequirements(slotId, options);
  if (!analysis.canGenerate) {
    throw new Error(`Cannot generate seating plan: ${analysis.blockingReasons.join('; ')}`);
  }

  const { slot, totalStudents } = analysis;
  const allowSameDept = !!options.allowSameDeptLastResort;

  // Clear existing plan if forceReplace is true
  const existingCount = await SeatingPlan.countDocuments({ slot: slot._id });
  if (existingCount > 0) {
    if (!options.forceReplace) {
      throw new Error(
        `Seating plan already exists for this slot (${existingCount} seats). Please confirm 'Regenerate (replace)' to overwrite.`
      );
    }
    await SeatingPlan.deleteMany({ slot: slot._id });
    await Invigilation.deleteMany({ slot: slot._id });
  }

  // 1. Collect all students with their metadata
  const { papers } = await getSlotStudentsByPaper(slot._id);
  const seenStudentIds = new Set();
  const allStudentEntries = [];

  for (const p of papers) {
    for (const stu of p.students) {
      const sId = stu._id.toString();
      if (!seenStudentIds.has(sId)) {
        seenStudentIds.add(sId);
        const prog = (stu.programme || stu.department || 'OTHER').toUpperCase().trim();
        allStudentEntries.push({
          student: stu,
          paperId: p.paper._id,
          courseCode: p.courseCode,
          courseName: p.courseName,
          programme: prog,
          registerNumber: (stu.registerNumber || '').toUpperCase().trim(),
        });
      }
    }
  }

  // 2. Group students by programme and sort each group by registerNumber ascending
  const cohortsMap = new Map();
  for (const entry of allStudentEntries) {
    if (!cohortsMap.has(entry.programme)) {
      cohortsMap.set(entry.programme, []);
    }
    cohortsMap.get(entry.programme).push(entry);
  }

  for (const stuList of cohortsMap.values()) {
    stuList.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber));
  }

  // 3. Build compatibility matrix
  const { matrix } = await buildProgrammeCompatibilityMatrix(
    slot.series?._id || slot.series,
    slot._id,
    options
  );

  // Helper to check if two students can share a bench
  const areStudentsCompatible = (s1, s2) => {
    if (!s1 || !s2) return true; // empty seat is always compatible
    if (s1.programme === s2.programme && !allowSameDept) return false;
    if (s1.courseCode && s2.courseCode && s1.courseCode === s2.courseCode) return false;
    return true;
  };

  // Helper to check if two programmes are compatible in this slot
  const areProgsCompatible = (p1, p2) => {
    if (p1 === p2 && !allowSameDept) return false;
    const cost = matrix[p1]?.[p2];
    return cost !== undefined && cost !== Infinity;
  };

  // 4. Group Programmes into Left and Right streams to balance counts and minimize paper collisions
  // Sort programmes by count descending
  const sortedProgs = Array.from(cohortsMap.keys()).sort(
    (a, b) => cohortsMap.get(b).length - cohortsMap.get(a).length
  );

  let leftProgs = [];
  let rightProgs = [];
  let leftSum = 0;
  let rightSum = 0;

  // Greedily balance streams
  for (const p of sortedProgs) {
    if (leftSum <= rightSum) {
      leftProgs.push(p);
      leftSum += cohortsMap.get(p).length;
    } else {
      rightProgs.push(p);
      rightSum += cohortsMap.get(p).length;
    }
  }

  // Build Left and Right student lists
  let leftLane = [];
  for (const p of leftProgs) {
    leftLane.push(...cohortsMap.get(p));
  }

  let rightLane = [];
  for (const p of rightProgs) {
    rightLane.push(...cohortsMap.get(p));
  }

  // Balance stream counts:
  // Move surplus from end of larger stream to beginning of smaller stream.
  // Opposite ends guarantee they never align on the same bench!
  const diff = leftLane.length - rightLane.length;
  if (diff > 1) {
    const moveCount = Math.floor(diff / 2);
    const moved = leftLane.splice(leftLane.length - moveCount, moveCount);
    rightLane.unshift(...moved);
  } else if (diff < -1) {
    const moveCount = Math.floor(-diff / 2);
    const moved = rightLane.splice(rightLane.length - moveCount, moveCount);
    leftLane.unshift(...moved);
  }

  // 5. Select Halls with accurate capacity check
  const totalBenchesRequired = Math.max(leftLane.length, rightLane.length);
  const effectiveRequiredSeats = totalBenchesRequired * 2;
  const hallSelection = await selectHallClusters(effectiveRequiredSeats, slot._id, options);

  if (hallSelection.accumulatedCapacity < effectiveRequiredSeats) {
    throw new Error(
      `Insufficient capacity for safe seating: ${totalStudents} students require ${totalBenchesRequired} benches (${effectiveRequiredSeats} seats with separation), but only ${hallSelection.accumulatedCapacity} seats available.`
    );
  }

  const selectedHalls = hallSelection.selectedHalls;

  // 6. Ensure bench compatibility (0 same-department, 0 same-paper)
  for (let i = 0; i < totalBenchesRequired; i++) {
    const sLeft = leftLane[i];
    const sRight = rightLane[i];

    if (sLeft && sRight && !areStudentsCompatible(sLeft, sRight)) {
      let swapped = false;
      // Search forward in rightLane
      for (let j = i + 1; j < rightLane.length; j++) {
        const cand = rightLane[j];
        if (cand && areStudentsCompatible(sLeft, cand)) {
          const candPartner = leftLane[j];
          if (!candPartner || areStudentsCompatible(candPartner, sRight)) {
            rightLane[i] = cand;
            rightLane[j] = sRight;
            swapped = true;
            break;
          }
        }
      }

      // Search forward in leftLane if not resolved
      if (!swapped) {
        for (let j = i + 1; j < leftLane.length; j++) {
          const cand = leftLane[j];
          if (cand && areStudentsCompatible(cand, sRight)) {
            const candPartner = rightLane[j];
            if (!candPartner || areStudentsCompatible(sLeft, candPartner)) {
              leftLane[i] = cand;
              leftLane[j] = sLeft;
              swapped = true;
              break;
            }
          }
        }
      }
    }
  }

  // 7. Hall Allocation: Bench rows x columns, 2 seats per bench (L and R)
  // Ensures every hall has 2+ programmes and contiguous register numbers
  const newAssignments = [];
  const assignedStudentIds = new Set();
  const sameDeptWarnings = [];
  let forcedEmptySeatsCount = 0;
  let benchIndex = 0;

  for (const hall of selectedHalls) {
    if (benchIndex >= totalBenchesRequired) break;

    const benchRows = hall.benchRows || hall.rows || 4;
    const benchColumns = hall.benchColumns || hall.columns || 4;
    const hallBenches = benchRows * benchColumns;
    const hallProgs = new Set();
    const hallAssignments = [];

    for (let b = 0; b < hallBenches; b++) {
      if (benchIndex >= totalBenchesRequired) break;
      const r = Math.floor(b / benchColumns);
      const c = (b % benchColumns) + 1;
      const rowLetter = getRowLetter(r);

      const sLeft = leftLane[benchIndex];
      const sRight = rightLane[benchIndex];
      benchIndex++;

      if (sLeft) {
        const lId = sLeft.student._id.toString();
        if (assignedStudentIds.has(lId)) {
          throw new Error(`Integrity error: Duplicate student allocation for ${sLeft.registerNumber}`);
        }
        assignedStudentIds.add(lId);
        hallProgs.add(sLeft.programme);

        hallAssignments.push({
          slot: slot._id,
          examId: slot._id,
          paper: sLeft.paperId,
          student: sLeft.student._id,
          studentId: sLeft.student._id,
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
      }

      if (sRight) {
        const rId = sRight.student._id.toString();
        if (assignedStudentIds.has(rId)) {
          throw new Error(`Integrity error: Duplicate student allocation for ${sRight.registerNumber}`);
        }
        assignedStudentIds.add(rId);
        hallProgs.add(sRight.programme);

        if (sLeft && sLeft.programme === sRight.programme) {
          sameDeptWarnings.push(`Bench ${rowLetter}${c} in Hall ${hall.hallCode}: Same-department pairing (${sLeft.programme}) used as last resort.`);
        }

        hallAssignments.push({
          slot: slot._id,
          examId: slot._id,
          paper: sRight.paperId,
          student: sRight.student._id,
          studentId: sRight.student._id,
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

      if ((sLeft && !sRight) || (!sLeft && sRight)) {
        forcedEmptySeatsCount++;
      }
    }

    // Ensure every hall has 2+ programmes
    if (hallProgs.size < 2 && hallAssignments.length > 1 && newAssignments.length > 0) {
      // Find a swap partner from earlier assignments with a different programme
      const myProg = Array.from(hallProgs)[0];
      for (let prevIdx = newAssignments.length - 1; prevIdx >= 0; prevIdx--) {
        const prevA = newAssignments[prevIdx];
        if (prevA.side === 'R' && prevA.student) {
          // Check if candidate is different programme
          const prevStudentObj = allStudentEntries.find((e) => e.student._id.toString() === prevA.student.toString());
          if (prevStudentObj && prevStudentObj.programme !== myProg) {
            // Swap right seat
            const curR = hallAssignments.find((a) => a.side === 'R');
            if (curR) {
              const tempStudent = curR.student;
              const tempPaper = curR.paper;
              curR.student = prevA.student;
              curR.paper = prevA.paper;
              prevA.student = tempStudent;
              prevA.paper = tempPaper;
              hallProgs.add(prevStudentObj.programme);
              break;
            }
          }
        }
      }
    }

    newAssignments.push(...hallAssignments);
  }

  // Final verification: all students must be seated
  if (assignedStudentIds.size !== allStudentEntries.length) {
    throw new Error(
      `Could not allocate all students. Allocated ${assignedStudentIds.size} of ${allStudentEntries.length} students.`
    );
  }

  // Insert generated assignments into database
  await SeatingPlan.insertMany(newAssignments);

  // Update ExamSlot document with statuses and explanations
  slot.seatingStatus = 'DRAFT';
  slot.reuseStatus = slot.reuseStatus || 'BASE PLAN';
  slot.selectionExplanations = hallSelection.explanations;
  await slot.save();

  // If this slot belongs to an ExamSeries and series has no basePlanSlot yet, set this slot as base plan
  if (slot.series) {
    const seriesDoc = await ExamSeries.findById(slot.series._id || slot.series);
    if (seriesDoc && !seriesDoc.basePlanSlot) {
      seriesDoc.basePlanSlot = slot._id;
      seriesDoc.hasBasePlan = true;
      await seriesDoc.save();
    }
  }

  const distinctHallsUsed = new Set(newAssignments.map((a) => a.hall.toString())).size;

  return {
    success: true,
    message: `Successfully generated draft seating plan for ${newAssignments.length} students across ${distinctHallsUsed} hall(s).`,
    totalAllocated: newAssignments.length,
    hallsUsed: distinctHallsUsed,
    forcedEmptySeatsCount,
    sameDeptWarnings,
    selectionExplanations: hallSelection.explanations,
    status: 'DRAFT',
  };
};

/**
 * Multi-Day Base Plan Evaluation:
 * Evaluates whether the base plan can be reused for targetSlotId.
 * Checks for:
 * 1. Two students on a bench writing the SAME course code -> NEEDS RE-PLAN
 * 2. Two students on a bench of the SAME department -> NEEDS RE-PLAN (unless toggle allowed)
 * Returns status: 'REUSED OK', 'REUSED WITH WARNINGS', or 'NEEDS RE-PLAN'.
 */
const evaluateSlotReuseStatus = async (targetSlotId) => {
  const targetSlot = await resolveSlot(targetSlotId);
  if (!targetSlot) throw new Error('Target slot not found');

  const seriesId = targetSlot.series?._id || targetSlot.series;
  const series = seriesId ? await ExamSeries.findById(seriesId) : null;
  const baseSlotId = series?.basePlanSlot || null;

  if (!baseSlotId) {
    return {
      status: 'NOT_GENERATED',
      canReuse: false,
      reason: 'No base plan exists for this series.',
      clashes: [],
    };
  }

  // Fetch base plan assignments
  const basePlans = await SeatingPlan.find({ slot: baseSlotId })
    .populate('student')
    .populate('hall');

  if (basePlans.length === 0) {
    return {
      status: 'NOT_GENERATED',
      canReuse: false,
      reason: 'Base seating plan is empty.',
      clashes: [],
    };
  }

  // Fetch papers in target slot
  const { papers } = await getSlotStudentsByPaper(targetSlot._id);
  const studentPaperMap = new Map(); // studentId -> { paperId, courseCode, courseName }

  for (const p of papers) {
    for (const st of p.students) {
      studentPaperMap.set(st._id.toString(), {
        paperId: p.paper._id,
        courseCode: p.courseCode,
        courseName: p.courseName,
      });
    }
  }

  // Group base plan by (hall, benchRow, benchColumn)
  const benchMap = new Map();
  for (const bp of basePlans) {
    const key = `${bp.hall._id.toString()}:${bp.benchRow}:${bp.benchColumn}`;
    if (!benchMap.has(key)) benchMap.set(key, {});
    benchMap.get(key)[bp.side] = bp;
  }

  const clashes = [];
  let fullBenches = 0;
  let singleStudentBenches = 0;

  for (const [key, bData] of benchMap.entries()) {
    const leftSeat = bData['L'];
    const rightSeat = bData['R'];

    const leftExam = leftSeat?.student ? studentPaperMap.get(leftSeat.student._id.toString()) : null;
    const rightExam = rightSeat?.student ? studentPaperMap.get(rightSeat.student._id.toString()) : null;

    if (leftExam && rightExam) {
      fullBenches++;
      const leftProg = leftSeat.student?.programme || leftSeat.student?.department;
      const rightProg = rightSeat.student?.programme || rightSeat.student?.department;

      // Check Rule 1: Same Department
      if (leftProg === rightProg) {
        clashes.push({
          type: 'SAME_DEPARTMENT',
          hall: leftSeat.hall?.hallCode,
          bench: `${getRowLetter(leftSeat.benchRow)}${leftSeat.benchColumn}`,
          detail: `Both candidates belong to ${leftProg}`,
        });
      }

      // Check Rule 2: Same Course Code
      if (leftExam.courseCode === rightExam.courseCode) {
        clashes.push({
          type: 'SAME_PAPER',
          hall: leftSeat.hall?.hallCode,
          bench: `${getRowLetter(leftSeat.benchRow)}${leftSeat.benchColumn}`,
          detail: `Both candidates write the same paper ${leftExam.courseCode} (${leftExam.courseName})`,
        });
      }
    } else if (leftExam || rightExam) {
      singleStudentBenches++;
    }
  }

  if (clashes.length > 0) {
    return {
      status: 'NEEDS RE-PLAN',
      canReuse: false,
      reason: `${clashes.length} bench collision(s) detected when reusing base plan.`,
      clashes,
      fullBenches,
      singleStudentBenches,
    };
  }

  const status = singleStudentBenches > 0 ? 'REUSED WITH WARNINGS' : 'REUSED OK';
  return {
    status,
    canReuse: true,
    reason: `Base plan safely re-used (${fullBenches} paired benches, ${singleStudentBenches} single-candidate benches, 0 clashes).`,
    clashes: [],
    fullBenches,
    singleStudentBenches,
  };
};

/**
 * Re-plans seating for a specific slot override without affecting any other days.
 */
const replanSlotSeating = async (slotId, options = {}) => {
  const slot = await resolveSlot(slotId);
  if (!slot) throw new Error('Slot not found');

  // Clear existing plan for this slot only
  await SeatingPlan.deleteMany({ slot: slot._id });
  await Invigilation.deleteMany({ slot: slot._id });

  // Generate independent seating plan for this slot
  const result = await generateSlotSeatingPlan(slot._id, {
    ...options,
    forceReplace: true,
  });

  // Mark slot as RE-PLANNED
  slot.reuseStatus = 'RE-PLANNED';
  slot.seatingStatus = 'DRAFT';
  slot.replanReason = options.reason || 'Admin slot override re-plan';
  await slot.save();

  return {
    ...result,
    reuseStatus: 'RE-PLANNED',
    message: `Slot ${slot.date} has been successfully RE-PLANNED independently. Other exam days retain their base plan.`,
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
  slot.seatingStatus = 'PUBLISHED';
  await slot.save();

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

  slot.seatingStatus = 'NOT_GENERATED';
  slot.reuseStatus = '';
  await slot.save();

  return {
    success: true,
    deletedCount: deletedPlans.deletedCount,
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
    reuseStatus: slot.reuseStatus || '',
    totalSeated: plans.length,
    hallsCount: formattedHalls.length,
    halls: formattedHalls,
  };
};

/**
 * Get Authenticated Student's Own Seat Allotment.
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
  const loggedInStudentId = String(student._id);

  const hallDesks = await SeatingPlan.find({
    slot: activePlan.slot._id,
    hall: activePlan.hall._id,
  }).select('seatLabel student benchRow benchColumn side');

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
      seatLabel: activePlan.seatLabel,
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
      seatLabel: p.seatLabel,
      benchRow: p.benchRow,
      benchColumn: p.benchColumn,
      side: p.side,
    })),
    hallLayout: {
      hall: activePlan.hall,
      occupiedSeats: hallDesks.map((d) => {
        const studentId = d.student?._id ? String(d.student._id) : String(d.student || '');
        const isMine = studentId === loggedInStudentId;
        return {
          seatLabel: String(d.seatLabel || '').trim().toUpperCase(),
          occupied: true,
          isMine,
        };
      }),
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
  buildProgrammeCompatibilityMatrix,
  selectHallClusters,
  analyzeSlotRequirements,
  generateSlotSeatingPlan,
  evaluateSlotReuseStatus,
  replanSlotSeating,
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
