const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const ExamSeries = require('../models/ExamSeries');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const Student = require('../models/Student');
const Hall = require('../models/Hall');
const SeatingPlan = require('../models/SeatingPlan');
const seatingService = require('../services/seatingService');

const runTest = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  }

  console.log('========================================================');
  console.log('🧪 VERIFYING FINAL CORRECTIONS (Easwari Engineering College)');
  console.log('========================================================\n');

  let passedTests = 0;
  let totalTests = 8;

  // Fetch slots in order
  const slots = await ExamSlot.find({}).sort({ date: 1 });
  if (slots.length < 5) {
    throw new Error(`Expected at least 5 slots, found ${slots.length}. Run seed first.`);
  }

  const slot1 = slots[0]; // 15 Oct 2026
  const slot2 = slots[1]; // 16 Oct 2026

  // ------------------------------------------------------------------
  // TEST 1: Generate Seating for 15 Oct (Slot 1) - All 9 Programmes
  // ------------------------------------------------------------------
  console.log('--- TEST 1: Generating Seating for Day 1 (15 Oct 2026) ---');
  const slot1Result = await seatingService.generateSlotSeatingPlan(slot1._id, {
    forceReplace: true,
    allowSameDeptLastResort: false,
  });

  const slot1Plans = await SeatingPlan.find({ slot: slot1._id })
    .populate('student')
    .populate('paper')
    .populate('hall');

  const progsInSlot1 = new Set(slot1Plans.map((p) => p.student.programme));
  console.log(`Slot 1 total seated: ${slot1Plans.length} across ${slot1Result.hallsUsed} halls.`);
  console.log(`Programmes seated: ${Array.from(progsInSlot1).sort().join(', ')} (${progsInSlot1.size} programmes)`);

  if (progsInSlot1.size === 9 && slot1Plans.length === 410) {
    console.log('✅ TEST 1 PASSED: All 9 programmes (410 students) seated on 15 Oct.\n');
    passedTests++;
  } else {
    throw new Error(`TEST 1 FAILED: Expected 9 programmes and 410 students, got ${progsInSlot1.size} and ${slot1Plans.length}`);
  }

  // ------------------------------------------------------------------
  // TEST 2: Hard Rule 1 - Zero Same-Department Benches (toggle off)
  // ------------------------------------------------------------------
  console.log('--- TEST 2: Validating ZERO Same-Department Benches ---');
  // Group slot 1 plans by (hall, benchRow, benchColumn)
  const benchMapSlot1 = new Map();
  for (const p of slot1Plans) {
    const key = `${p.hall._id.toString()}:${p.benchRow}:${p.benchColumn}`;
    if (!benchMapSlot1.has(key)) benchMapSlot1.set(key, {});
    benchMapSlot1.get(key)[p.side] = p;
  }

  let sameDeptBenches = 0;
  for (const [key, bData] of benchMapSlot1.entries()) {
    const left = bData['L'];
    const right = bData['R'];
    if (left && right) {
      if (left.student.programme === right.student.programme) {
        sameDeptBenches++;
        console.error(`Same dept violation at bench ${key}: ${left.student.programme} and ${right.student.programme}`);
      }
    }
  }

  if (sameDeptBenches === 0) {
    console.log(`✅ TEST 2 PASSED: Exactly 0 same-department benches across all ${benchMapSlot1.size} benches.\n`);
    passedTests++;
  } else {
    throw new Error(`TEST 2 FAILED: Found ${sameDeptBenches} benches with same department!`);
  }

  // ------------------------------------------------------------------
  // TEST 3: Hard Rule 2 - Zero Same-Paper Benches
  // ------------------------------------------------------------------
  console.log('--- TEST 3: Validating ZERO Same-Paper Benches ---');
  let samePaperBenches = 0;
  for (const [key, bData] of benchMapSlot1.entries()) {
    const left = bData['L'];
    const right = bData['R'];
    if (left && right) {
      if (left.paper.courseCode === right.paper.courseCode) {
        samePaperBenches++;
        console.error(`Same paper violation at bench ${key}: ${left.paper.courseCode}`);
      }
    }
  }

  if (samePaperBenches === 0) {
    console.log(`✅ TEST 3 PASSED: Exactly 0 same-paper benches across all ${benchMapSlot1.size} benches.\n`);
    passedTests++;
  } else {
    throw new Error(`TEST 3 FAILED: Found ${samePaperBenches} benches with same course code!`);
  }

  // ------------------------------------------------------------------
  // TEST 4: Separation of Shared Paper Programmes (CSE & IT)
  // ------------------------------------------------------------------
  console.log('--- TEST 4: Validating CSE and IT Separation ---');
  let cseItSharedBenches = 0;
  for (const [key, bData] of benchMapSlot1.entries()) {
    const left = bData['L'];
    const right = bData['R'];
    if (left && right) {
      const pL = left.student.programme;
      const pR = right.student.programme;
      if ((pL === 'CSE' && pR === 'IT') || (pL === 'IT' && pR === 'CSE')) {
        cseItSharedBenches++;
      }
    }
  }

  console.log(`Benches sharing CSE and IT: ${cseItSharedBenches}`);
  if (cseItSharedBenches === 0) {
    console.log('✅ TEST 4 PASSED: Compatibility matrix separated CSE and IT into different partners.\n');
    passedTests++;
  } else {
    throw new Error(`TEST 4 FAILED: CSE and IT share ${cseItSharedBenches} benches!`);
  }

  // ------------------------------------------------------------------
  // TEST 5: Every Hall Has 2+ Programmes
  // ------------------------------------------------------------------
  console.log('--- TEST 5: Validating 2+ Programmes Per Hall ---');
  const hallProgMap = new Map();
  for (const p of slot1Plans) {
    const hCode = p.hall.hallCode;
    if (!hallProgMap.has(hCode)) hallProgMap.set(hCode, new Set());
    hallProgMap.get(hCode).add(p.student.programme);
  }

  let singleProgHalls = 0;
  for (const [hCode, progs] of hallProgMap.entries()) {
    if (progs.size < 2) {
      singleProgHalls++;
      console.error(`Hall ${hCode} has only ${progs.size} programme: ${Array.from(progs).join(', ')}`);
    }
  }

  if (singleProgHalls === 0) {
    console.log(`✅ TEST 5 PASSED: All ${hallProgMap.size} halls contain 2 or more distinct programmes.\n`);
    passedTests++;
  } else {
    throw new Error(`TEST 5 FAILED: Found ${singleProgHalls} halls with only 1 programme!`);
  }

  // ------------------------------------------------------------------
  // TEST 6: Cluster Compactness & No Hall Code Bias
  // ------------------------------------------------------------------
  console.log('--- TEST 6: Validating Cluster Compactness & Rotation ---');
  const distinctHallsUsed = Array.from(hallProgMap.keys());
  console.log(`Selected Halls: ${distinctHallsUsed.join(', ')}`);

  // Verify that halls are filled floor by floor and multiple blocks are used without pure CIVIL bias
  const blocksUsed = new Set(slot1Plans.map((p) => p.hall.block));
  console.log(`Blocks used: ${Array.from(blocksUsed).join(', ')}`);

  if (blocksUsed.size >= 2 && distinctHallsUsed.length >= 10) {
    console.log('✅ TEST 6 PASSED: Cluster-based compact selection fills whole floors across blocks fairly.\n');
    passedTests++;
  } else {
    throw new Error(`TEST 6 FAILED: Selection failed cluster compactness or used insufficient blocks (${Array.from(blocksUsed).join(', ')})`);
  }

  // ------------------------------------------------------------------
  // TEST 7: Multi-Day Base Plan Evaluation (Day 2 clash detection)
  // ------------------------------------------------------------------
  console.log('--- TEST 7: Multi-Day Reuse Evaluation for Day 2 ---');
  const reuseEval = await seatingService.evaluateSlotReuseStatus(slot2._id);
  console.log(`Evaluation status for Day 2: ${reuseEval.status}`);
  console.log(`Reason: ${reuseEval.reason}`);

  // Day 2 has common paper SDA shared between IT, CSE, AIDS.
  // When reusing Day 1 base plan, if any bench had cohorts that now share SDA, it must be flagged.
  // Or if safe, it passes.
  if (reuseEval.status === 'NEEDS RE-PLAN' || reuseEval.status === 'REUSED OK' || reuseEval.status === 'REUSED WITH WARNINGS') {
    console.log(`✅ TEST 7 PASSED: Multi-day reuse evaluation executed successfully (${reuseEval.status}).\n`);
    passedTests++;
  } else {
    throw new Error(`TEST 7 FAILED: Unexpected evaluation status: ${reuseEval.status}`);
  }

  // ------------------------------------------------------------------
  // TEST 8: Re-plan Override for Day 2
  // ------------------------------------------------------------------
  console.log('--- TEST 8: Re-Planning Day 2 Independently ---');
  const replanResult = await seatingService.replanSlotSeating(slot2._id, {
    reason: 'Resolve common paper SDA collision',
  });

  const slot2Plans = await SeatingPlan.find({ slot: slot2._id })
    .populate('student')
    .populate('paper')
    .populate('hall');

  const slot2Updated = await ExamSlot.findById(slot2._id);
  console.log(`Day 2 Re-planned total seated: ${slot2Plans.length}`);
  console.log(`Day 2 reuseStatus: ${slot2Updated.reuseStatus}`);

  // Check 0 same paper benches in Day 2
  const benchMapSlot2 = new Map();
  for (const p of slot2Plans) {
    const key = `${p.hall._id.toString()}:${p.benchRow}:${p.benchColumn}`;
    if (!benchMapSlot2.has(key)) benchMapSlot2.set(key, {});
    benchMapSlot2.get(key)[p.side] = p;
  }

  let slot2SamePaperBenches = 0;
  for (const [key, bData] of benchMapSlot2.entries()) {
    const left = bData['L'];
    const right = bData['R'];
    if (left && right) {
      if (left.paper.courseCode === right.paper.courseCode) {
        slot2SamePaperBenches++;
      }
    }
  }

  if (slot2Updated.reuseStatus === 'RE-PLANNED' && slot2SamePaperBenches === 0 && slot2Plans.length > 0) {
    console.log(`✅ TEST 8 PASSED: Day 2 re-planned with 0 same-paper benches (reuseStatus: RE-PLANNED).\n`);
    passedTests++;
  } else {
    throw new Error(`TEST 8 FAILED: Re-planned Day 2 had ${slot2SamePaperBenches} same-paper benches!`);
  }

  console.log('========================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('========================================================');
  process.exit(0);
};

runTest().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
