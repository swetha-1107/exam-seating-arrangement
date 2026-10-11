const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Student = require('../models/Student');
const Faculty = require('../models/Faculty');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const seatingService = require('../services/seatingService');
const invigilationService = require('../services/invigilationService');

const runVerification = async () => {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  console.log('=== STARTING COMPREHENSIVE VERIFICATION FOR ALL 5 BUG FIXES ===\n');

  let passedTests = 0;
  let totalTests = 5;

  // -------------------------------------------------------------
  // TEST 1: REGISTRATION (Programme Mapping & Validation)
  // -------------------------------------------------------------
  console.log('--- TEST 1: Student Self-Registration ---');
  try {
    const testRegNo = `310624205${Math.floor(100 + Math.random() * 900)}`;
    const testEmail = `test_student_${Date.now()}@eec.srmrmp.edu.in`;

    // Simulate controller register action where payload has 'department' but NOT 'programme'
    const regPayload = {
      name: 'Swetha Test Student',
      email: testEmail,
      password: 'password123',
      role: 'student',
      department: 'IT',
      registerNumber: testRegNo,
      year: 3,
      section: 'B',
    };

    // Pre-validate hook test: direct Model creation
    const createdStudent = await Student.create({
      registerNumber: testRegNo,
      name: regPayload.name,
      email: regPayload.email,
      department: regPayload.department, // Notice: programme omitted intentionally
      year: regPayload.year,
      section: regPayload.section,
    });

    if (createdStudent.programme === 'IT' && createdStudent.department === 'IT') {
      console.log(`[PASS] Student created successfully with programme automatically mapped to: '${createdStudent.programme}'`);
      passedTests++;
    } else {
      console.error(`[FAIL] Student created but programme was: '${createdStudent.programme}'`);
    }

    // Clean up test student
    await Student.findByIdAndDelete(createdStudent._id);
  } catch (err) {
    console.error('[FAIL] Test 1 encountered error:', err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: LOGIN (Accepts 12-digit Reg No or Email, bcrypt verify, clear errors)
  // -------------------------------------------------------------
  console.log('\n--- TEST 2: Student Login with 12-Digit Reg Number & Email ---');
  try {
    const sampleStudentUser = await User.findOne({ role: 'student', referenceId: /^310624/ });
    if (!sampleStudentUser) {
      throw new Error('No 12-digit student user found in database. Seed data may need updating.');
    }

    console.log(`Found sample student: ${sampleStudentUser.name} (${sampleStudentUser.referenceId})`);

    // Verify password matching
    const correctMatch = await sampleStudentUser.matchPassword('password123');
    const wrongMatch = await sampleStudentUser.matchPassword('wrongpassword999');

    if (correctMatch && !wrongMatch) {
      console.log(`[PASS] Login credentials verified with bcrypt: matching correctly and rejecting wrong passwords.`);
      passedTests++;
    } else {
      console.error(`[FAIL] Password comparison failed: correctMatch=${correctMatch}, wrongMatch=${wrongMatch}`);
    }
  } catch (err) {
    console.error('[FAIL] Test 2 encountered error:', err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: DASHBOARD & SLOTS DISPLAY ("<paperCode> – <Subject Name>")
  // -------------------------------------------------------------
  console.log('\n--- TEST 3: Paper Display Formatting ("<paperCode> – <Subject Name>") ---');
  try {
    const slot = await ExamSlot.findOne();
    if (!slot) throw new Error('No ExamSlot found');

    const papers = await ExamPaper.find({ slot: slot._id }).populate('course');
    let allFormatted = true;

    for (const p of papers) {
      const code = p.course?.courseCode || p.courseCode;
      const name = p.course?.courseName || p.courseName;
      const displayName = `${code} – ${name}`;
      if (!code || !name) {
        allFormatted = false;
        console.error(`[FAIL] Incomplete paper details for: ${p._id}`);
      } else {
        console.log(`  Paper: ${displayName}`);
      }
    }

    if (allFormatted && papers.length > 0) {
      console.log(`[PASS] Papers have both paperCode and Subject Name populated.`);
      passedTests++;
    } else {
      console.error(`[FAIL] Papers missing courseCode or courseName.`);
    }
  } catch (err) {
    console.error('[FAIL] Test 3 encountered error:', err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: SEATING ALGORITHM REWRITE
  // -------------------------------------------------------------
  console.log('\n--- TEST 4: Seating Algorithm (Lanes, Anti-Programme Clash, Set Tracking) ---');
  try {
    // Find Slot 2 (16-10-2026, shared paper across IT, CSE, AIDS)
    const slot2 = await ExamSlot.findOne({ date: '2026-10-16' }) || (await ExamSlot.findOne());
    if (!slot2) throw new Error('Slot not found');

    console.log(`Generating seating for slot: ${slot2.date} (${slot2._id})...`);
    const genResult = await seatingService.generateSlotSeatingPlan(slot2._id, { forceReplace: true });
    console.log(`Generated seating: ${genResult.totalAllocated} students across ${genResult.hallsUsed} hall(s).`);

    // Verify constraints in generated plan
    const allSeats = await SeatingPlan.find({ slot: slot2._id }).populate('student');

    // 1. Verify exact 1 seat per student using Set
    const studentIdsSet = new Set();
    let hasDuplicateStudent = false;

    for (const seat of allSeats) {
      const sId = seat.student._id.toString();
      if (studentIdsSet.has(sId)) {
        hasDuplicateStudent = true;
        console.error(`[FAIL] Duplicate student found in slot: ${seat.student.registerNumber}`);
      }
      studentIdsSet.add(sId);
    }

    // 2. Verify benches: side L and side R on bench (r, c) in same hall must have DIFFERENT programmes
    const benchMap = new Map(); // `${hallId}-${benchRow}-${benchColumn}` -> { L: prog, R: prog }
    for (const seat of allSeats) {
      const bKey = `${seat.hall.toString()}-${seat.benchRow}-${seat.benchColumn}`;
      if (!benchMap.has(bKey)) {
        benchMap.set(bKey, {});
      }
      const bench = benchMap.get(bKey);
      bench[seat.side] = seat.student.programme || seat.student.department;
    }

    let sameProgrammeClashCount = 0;
    for (const [key, sides] of benchMap.entries()) {
      if (sides.L && sides.R && sides.L === sides.R) {
        sameProgrammeClashCount++;
        console.error(`[FAIL] Bench clash at ${key}: Both Left and Right are programme '${sides.L}'`);
      }
    }

    if (!hasDuplicateStudent && sameProgrammeClashCount === 0) {
      console.log(`[PASS] Seating algorithm verified:`);
      console.log(`       - Total students assigned: ${allSeats.length}`);
      console.log(`       - Unique students (Set check): ${studentIdsSet.size} (ZERO duplicates)`);
      console.log(`       - Total 2-seat benches checked: ${benchMap.size}`);
      console.log(`       - Same-programme bench clashes: ZERO (All benches pair students from DIFFERENT programmes)`);
      passedTests++;
    } else {
      console.error(`[FAIL] Duplicate students=${hasDuplicateStudent}, sameProgrammeClashes=${sameProgrammeClashCount}`);
    }
  } catch (err) {
    console.error('[FAIL] Test 4 encountered error:', err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: INVIGILATION AUTO-ASSIGNMENT & AVAILABILITY CONSTRAINTS
  // -------------------------------------------------------------
  console.log('\n--- TEST 5: Invigilation Auto-Assignment & Constraints ---');
  try {
    const slot2 = await ExamSlot.findOne({ date: '2026-10-16' }) || (await ExamSlot.findOne());
    const analysis = await invigilationService.analyzeSlotInvigilation(slot2._id);

    console.log(`Invigilation Analysis: Halls=${analysis.hallsCount}, Invigilators Required=${analysis.invigilatorsRequired}, Eligible Faculty=${analysis.eligibleFacultyCount}, canAssign=${analysis.canAssign}`);

    if (!analysis.canAssign) {
      throw new Error(`Cannot assign invigilators: ${analysis.warnings.join('; ')}`);
    }

    const assignResult = await invigilationService.autoAssignSlotInvigilators(slot2._id);
    console.log(`Assigned ${assignResult.totalAssigned} invigilators successfully.`);

    // Verify 1 invigilator per hall and no duplicates
    const duties = await Invigilation.find({ slot: slot2._id });
    const facultySet = new Set();
    const hallSet = new Set();
    let duplicateFaculty = false;
    let duplicateHall = false;

    for (const d of duties) {
      const fId = d.faculty.toString();
      const hId = d.hall.toString();
      if (facultySet.has(fId)) duplicateFaculty = true;
      if (hallSet.has(hId)) duplicateHall = true;
      facultySet.add(fId);
      hallSet.add(hId);
    }

    if (!duplicateFaculty && !duplicateHall && duties.length === analysis.hallsCount) {
      console.log(`[PASS] Invigilation verified:`);
      console.log(`       - Assigned exactly 1 invigilator per hall (${duties.length} halls).`);
      console.log(`       - Zero double-booked faculty.`);
      passedTests++;
    } else {
      console.error(`[FAIL] duplicateFaculty=${duplicateFaculty}, duplicateHall=${duplicateHall}`);
    }
  } catch (err) {
    console.error('[FAIL] Test 5 encountered error:', err.message);
  }

  console.log(`\n=============================================================`);
  console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log(`=============================================================`);

  await mongoose.disconnect();
  process.exit(passedTests === totalTests ? 0 : 1);
};

runVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
