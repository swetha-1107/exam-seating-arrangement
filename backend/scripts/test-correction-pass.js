const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const Student = require('../models/Student');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const seatingService = require('../services/seatingService');
const invigilationService = require('../services/invigilationService');

const runTests = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  }

  console.log('\n======================================================');
  console.log('--- RUNNING RIGOROUS CORRECTION PASS TEST SUITE ---');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // ------------------------------------------------------------------
    // TEST 1: Slot 1 Analysis & Two-Seat Bench Seating Generation
    // ------------------------------------------------------------------
    console.log('>>> TEST 1: Slot 1 Analysis & Two-Student Bench Pairing...');
    const slot1 = await ExamSlot.findOne({ date: '2026-10-15', startTime: '09:30' });
    assert(!!slot1, 'Slot 1 exists in DB');

    const analysis1 = await seatingService.analyzeSlotRequirements(slot1._id);
    console.log(`   Analysis: totalStudents=${analysis1.totalStudents}, usableCapacity=${analysis1.availableCapacity}, canGenerate=${analysis1.canGenerate}`);
    assert(analysis1.canGenerate === true, 'Slot 1 readiness: READY TO GENERATE');
    assert(analysis1.totalStudents === 100, `Slot 1 has 100 students (IT 25 + CSE 30 + ECE 25 + EEE 20) (got ${analysis1.totalStudents})`);

    // Generate Seating
    const genResult1 = await seatingService.generateSlotSeatingPlan(slot1._id, { forceReplace: true });
    assert(genResult1.totalAllocated === 100, `Generated seating for all 100 students (got ${genResult1.totalAllocated})`);
    assert(genResult1.status === 'DRAFT', 'Initial generation status is DRAFT');

    // Verify 2-student-per-bench pairing:
    // Left (L) and Right (R) on the same bench must NOT have the same paper / programme
    const plans1 = await SeatingPlan.find({ slot: slot1._id })
      .populate('student')
      .populate('paper');

    const benchMap = new Map();
    for (const p of plans1) {
      const key = `${p.hall.toString()}_r${p.benchRow}_c${p.benchColumn}`;
      if (!benchMap.has(key)) benchMap.set(key, {});
      benchMap.get(key)[p.side] = p;
    }

    let sameBenchCollision = 0;
    let pairedBenchesCount = 0;
    for (const [benchKey, sides] of benchMap.entries()) {
      if (sides.L && sides.R) {
        pairedBenchesCount++;
        const progL = sides.L.student?.programme || sides.L.paper?.courseCode;
        const progR = sides.R.student?.programme || sides.R.paper?.courseCode;
        if (progL === progR) {
          sameBenchCollision++;
          console.error(`   Collision detected at ${benchKey}: both sides are ${progL}`);
        }
      }
    }

    assert(sameBenchCollision === 0, `Zero same-programme pairings on any bench (${pairedBenchesCount} paired benches)`);
    assert(pairedBenchesCount > 0, `Two students seated per bench across ${pairedBenchesCount} benches`);

    // ------------------------------------------------------------------
    // TEST 2: Contiguous Register Numbers & Seat Labels (A1-L, A1-R)
    // ------------------------------------------------------------------
    console.log('\n>>> TEST 2: Seat Labels & Contiguous Register Number Ranges...');
    const sampleSeat = plans1[0];
    assert(/^[A-Z]\d+-[LR]$/.test(sampleSeat.seatLabel), `Seat label follows college format 'A1-L' / 'A1-R' (e.g. ${sampleSeat.seatLabel})`);

    // Check contiguous ranges per hall
    const slotPlanData = await seatingService.getSlotSeatingPlan(slot1._id);
    assert(slotPlanData.halls.length > 0, `Slot plan grouped across ${slotPlanData.halls.length} halls`);

    for (const hGroup of slotPlanData.halls) {
      // For each programme in this hall, register numbers should be ordered and contiguous
      const progRegs = {};
      for (const st of hGroup.seats) {
        const prog = st.student?.programme || 'UNKNOWN';
        const reg = st.student?.registerNumber;
        if (!progRegs[prog]) progRegs[prog] = [];
        if (reg) progRegs[prog].push(reg);
      }
      for (const [pCode, regs] of Object.entries(progRegs)) {
        const sorted = [...regs].sort();
        const isSorted = regs.every((r, idx) => r === sorted[idx]);
        assert(isSorted, `Hall ${hGroup.hall.hallCode}: Programme ${pCode} (${regs.length} students) has contiguous sorted register range: ${regs[0]} to ${regs[regs.length - 1]}`);
      }
    }

    // ------------------------------------------------------------------
    // TEST 3: Slot 2 - Shared Paper Resolution (2311SDA501L)
    // ------------------------------------------------------------------
    console.log('\n>>> TEST 3: Slot 2 Shared Paper Resolution (2311SDA501L)...');
    const slot2 = await ExamSlot.findOne({ date: '2026-10-16', startTime: '09:30' });
    assert(!!slot2, 'Slot 2 exists in DB');

    const analysis2 = await seatingService.analyzeSlotRequirements(slot2._id);
    console.log(`   Analysis: totalStudents=${analysis2.totalStudents}, papers=${analysis2.papers.length}`);
    // IT (25) + CSE (30) + AIDS (25) = 80 writing 2311SDA501L, MECH (20) + AUTO (15) = 35 writing 2311MEC501T, CIVIL (15) writing 2311CEC501T. Total = 130
    assert(analysis2.totalStudents === 130, `Slot 2 has 130 students total (got ${analysis2.totalStudents})`);

    const sdaPaper = analysis2.papers.find((p) => p.courseCode === '2311SDA501L');
    assert(!!sdaPaper, 'Shared paper 2311SDA501L identified in slot 2');
    assert(sdaPaper.studentCount === 80, `Shared paper 2311SDA501L includes 80 students across IT, CSE, AIDS (got ${sdaPaper.studentCount})`);

    // Generate Slot 2
    const genResult2 = await seatingService.generateSlotSeatingPlan(slot2._id, { forceReplace: true });
    assert(genResult2.totalAllocated === 130, `Slot 2 allocated all 130 students (got ${genResult2.totalAllocated})`);

    // ------------------------------------------------------------------
    // TEST 4: Slot 3 - Elective Slot Resolution
    // ------------------------------------------------------------------
    console.log('\n>>> TEST 4: Slot 3 Elective Slot Resolution...');
    const slot3 = await ExamSlot.findOne({ date: '2026-10-17', startTime: '14:00' });
    assert(!!slot3, 'Slot 3 exists in DB');

    const analysis3 = await seatingService.analyzeSlotRequirements(slot3._id);
    console.log(`   Analysis: totalStudents=${analysis3.totalStudents}, papers=${analysis3.papers.length}`);
    // CSE Cloud (15) + CSE Arch (15) + IT Open Elective (25) + ECE Wireless (25) = 80
    assert(analysis3.totalStudents === 80, `Slot 3 elective students total = 80 (got ${analysis3.totalStudents})`);

    const cloudPaper = analysis3.papers.find((p) => p.courseCode === '2311CSE903T');
    const archPaper = analysis3.papers.find((p) => p.courseCode === '2311CSE901T');
    const openElectivePaper = analysis3.papers.find((p) => p.courseCode === '2311MEO902T');

    assert(cloudPaper && cloudPaper.studentCount === 15, `Cloud Computing elective has exactly 15 students (got ${cloudPaper?.studentCount})`);
    assert(archPaper && archPaper.studentCount === 15, `Adv Comp Architecture elective has exactly 15 students (got ${archPaper?.studentCount})`);
    assert(openElectivePaper && openElectivePaper.studentCount === 25, `Open Elective Renewable Energy has exactly 25 IT students (got ${openElectivePaper?.studentCount})`);

    const genResult3 = await seatingService.generateSlotSeatingPlan(slot3._id, { forceReplace: true });
    assert(genResult3.totalAllocated === 80, `Slot 3 allocated all 80 elective students (got ${genResult3.totalAllocated})`);

    // ------------------------------------------------------------------
    // TEST 5: Invigilation Auto-Assignment & Availability Constraints
    // ------------------------------------------------------------------
    console.log('\n>>> TEST 5: Invigilation Assignment & Availability Constraints...');
    const invigAnalysis1 = await invigilationService.analyzeSlotInvigilation(slot1._id);
    console.log(`   Invigilation: hallsCount=${invigAnalysis1.hallsCount}, eligibleFaculty=${invigAnalysis1.eligibleFacultyCount}, unavailable=${invigAnalysis1.unavailableFacultyCount}`);

    assert(invigAnalysis1.canAssign === true, 'Invigilation readiness: READY TO ASSIGN');
    assert(invigAnalysis1.unavailableFacultyCount === 2, `2 faculty correctly identified as 'Not Available' (got ${invigAnalysis1.unavailableFacultyCount})`);

    // Auto-assign invigilators
    const assignResult = await invigilationService.autoAssignSlotInvigilators(slot1._id);
    assert(assignResult.totalAssigned === invigAnalysis1.hallsCount, `Assigned exactly 1 invigilator per hall used (${assignResult.totalAssigned})`);

    // Ensure unavailable faculty (Dr. Priya S. FAC102, Dr. Suresh K. FAC105) are NEVER assigned
    const assignedFacIds = assignResult.assignments.map((a) => (a.faculty?.facultyId || a.facultyId?.facultyId));
    assert(!assignedFacIds.includes('FAC102'), 'Unavailable faculty FAC102 (Dr. Priya S.) was NOT assigned');
    assert(!assignedFacIds.includes('FAC105'), 'Unavailable faculty FAC105 (Dr. Suresh K.) was NOT assigned');

    // ------------------------------------------------------------------
    // TEST 6: Student Privacy, Isolation, and Publishing Lifecycle
    // ------------------------------------------------------------------
    console.log('\n>>> TEST 6: Student Privacy & Publishing Lifecycle...');
    const sampleStudentUser = await Student.findOne({ registerNumber: '310624205001' }).populate('userId');

    // While slot 1 is DRAFT, student must NOT see active assignment
    const draftMySeating = await seatingService.getMySeating(sampleStudentUser.userId || sampleStudentUser);
    assert(draftMySeating.activeAssignment === null, 'DRAFT status: Student CANNOT see seating details before publishing');

    // Publish Slot 1
    const publishResult = await seatingService.publishSlotSeatingPlan(slot1._id);
    assert(publishResult.publishedSeats === 100, `Published 100 seats for Slot 1`);

    // Now student checks their seating
    const publishedMySeating = await seatingService.getMySeating(sampleStudentUser.userId || sampleStudentUser);
    assert(publishedMySeating.activeAssignment !== null, 'PUBLISHED status: Student CAN now see their allocated seat');
    assert(publishedMySeating.activeAssignment.seatNumber !== null, `Student allocated seat: ${publishedMySeating.activeAssignment.seatNumber}`);
    assert(publishedMySeating.activeAssignment.hall !== null, `Student allocated hall: ${publishedMySeating.activeAssignment.hall?.hallCode || publishedMySeating.activeAssignment.hall?.hallNumber}`);

    // Verify student layout does not leak private info of other students
    const layout = publishedMySeating.hallLayout;
    assert(layout && layout.occupiedSeats.length > 0, 'Hall layout provided for student bench orientation');
    const otherSeat = layout.occupiedSeats.find((s) => !s.isCurrentStudent);
    assert(otherSeat && otherSeat.registerNumber === undefined, 'Other students in hall diagram do NOT have registerNumber leaked');

    console.log('\n======================================================');
    console.log(`--- TEST RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
    console.log('======================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exit(1);
  }
};

runTests();
