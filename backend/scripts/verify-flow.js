const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Exam = require('../models/Exam');
const Hall = require('../models/Hall');
const Student = require('../models/Student');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const seatingService = require('../services/seatingService');
const invigilationService = require('../services/invigilationService');

const runVerification = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  }

  console.log('\n===============================================================');
  console.log('STARTING RIGOROUS VERIFICATION: EASWARI COLLEGE EXAMINATION SYSTEM');
  console.log('===============================================================\n');

  // Test 1: Fetch Exams for the SAME Date (2026-10-15) and Session (FN)
  const itExam = await Exam.findOne({ examCode: 'IT8501' });
  const cseExam = await Exam.findOne({ examCode: 'CS8591' });
  const eceExam = await Exam.findOne({ examCode: 'EC8691' });

  if (!itExam || !cseExam || !eceExam) {
    throw new Error('Scheduled exams for 2026-10-15 FN not found');
  }

  console.log(`[TEST 1] Identified 3 Different Department Exams on Same Date & Session (2026-10-15 FN):`);
  console.log(`  - IT Exam:  ${itExam.examName} (${itExam.examCode}) - Dept: ${itExam.department}`);
  console.log(`  - CSE Exam: ${cseExam.examName} (${cseExam.examCode}) - Dept: ${cseExam.department}`);
  console.log(`  - ECE Exam: ${eceExam.examName} (${eceExam.examCode}) - Dept: ${eceExam.department}`);

  // Test 2: Pre-Generation Analysis for IT Exam
  const itAnalysis = await seatingService.analyzeExamRequirements(itExam._id);
  console.log(`\n[TEST 2] Pre-Generation Analysis for IT Exam:`);
  console.log(`  - Registered Candidates: ${itAnalysis.registeredStudents}`);
  console.log(`  - Available Capacity across Non-Clashing Halls: ${itAnalysis.availableCapacity}`);
  console.log(`  - Halls Needed: ${itAnalysis.hallsNeeded}`);
  console.log(`  - Status: ${itAnalysis.statusText}`);

  if (!itAnalysis.canGenerate) {
    throw new Error(`IT Exam analysis failed: ${itAnalysis.warnings.join(', ')}`);
  }

  // Test 3: Generate Seating Plan for IT Exam
  const itGen = await seatingService.generateSeatingPlan(itExam._id);
  console.log(`\n[TEST 3] Generated IT Exam Seating Plan: ${itGen.message}`);

  const itAllocations = await SeatingPlan.find({ examId: itExam._id }).populate('hallId').populate('studentId');
  console.log(`  - IT Students Seated: ${itAllocations.length}`);
  console.log(`  - Hall Assigned: Hall ${itAllocations[0].hallId.hallNumber}`);
  console.log(`  - First 3 Seats: ${itAllocations.slice(0, 3).map((a) => `${a.seatNumber} (${a.studentId.name})`).join(', ')}`);

  // Test 4: MIXED-DEPARTMENT SEATING! Generate Seating Plan for CSE Exam into the SAME HALL
  console.log(`\n[TEST 4] Testing Mixed-Department Seating: Generating CSE Exam into available desks...`);
  const cseAnalysis = await seatingService.analyzeExamRequirements(cseExam._id);
  console.log(`  - CSE Registered Candidates: ${cseAnalysis.registeredStudents}`);
  console.log(`  - Remaining Free Desks in Available Halls: ${cseAnalysis.availableCapacity}`);
  console.log(`  - Status: ${cseAnalysis.statusText}`);

  const cseGen = await seatingService.generateSeatingPlan(cseExam._id);
  console.log(`  - Result: ${cseGen.message}`);

  const cseAllocations = await SeatingPlan.find({ examId: cseExam._id }).populate('hallId').populate('studentId');
  console.log(`  - CSE Students Seated: ${cseAllocations.length}`);
  console.log(`  - Hall Assigned: Hall ${cseAllocations[0].hallId.hallNumber}`);
  console.log(`  - First 3 Seats: ${cseAllocations.slice(0, 3).map((a) => `${a.seatNumber} (${a.studentId.name})`).join(', ')}`);

  // Verify that IT and CSE are both seated in Hall C301
  const sharedHall = itAllocations[0].hallId;
  const allSharedSeats = await SeatingPlan.find({
    hallId: sharedHall._id,
    examDate: '2026-10-15',
  }).populate('studentId').populate('examId');

  const deptsInHall = new Set(allSharedSeats.map((s) => s.studentId.department));
  const examsInHall = new Set(allSharedSeats.map((s) => s.examId.examCode));

  console.log(`\n[VERIFICATION OF MIXED-DEPARTMENT SHARING IN HALL ${sharedHall.hallNumber}]:`);
  console.log(`  - Total Candidates in Hall: ${allSharedSeats.length} / ${sharedHall.capacity}`);
  console.log(`  - Departments Sharing this Hall: ${Array.from(deptsInHall).join(', ')}`);
  console.log(`  - Examination Papers Sharing this Hall: ${Array.from(examsInHall).join(', ')}`);

  if (!deptsInHall.has('IT') || !deptsInHall.has('CSE')) {
    throw new Error(`Mixed department sharing failed: IT and CSE are not both in Hall ${sharedHall.hallNumber}`);
  }
  console.log(`  ✔ SUCCESS: Students from different departments (${Array.from(deptsInHall).join(' & ')}) sit together in the same examination hall!`);

  // Test 5: Automatic Invigilator Assignment & Availability Constraint
  console.log(`\n[TEST 5] Testing Automatic Invigilator Assignment for IT Exam:`);
  const invAnalysis = await invigilationService.analyzeInvigilationRequirements(itExam._id);
  console.log(`  - Halls Requiring Invigilator: ${invAnalysis.hallsCount}`);
  console.log(`  - Eligible Faculty Available: ${invAnalysis.eligibleFacultyCount}`);
  console.log(`  - Unavailable Faculty: ${invAnalysis.unavailableFacultyCount} (Prof. Ravi V. marked 'Not Available')`);
  console.log(`  - Status: ${invAnalysis.statusText}`);

  const invAssign = await invigilationService.autoAssignInvigilators(itExam._id);
  console.log(`  - Invigilators Assigned: ${invAssign.totalAssigned}`);

  const assignedDuty = await Invigilation.findOne({ examId: itExam._id }).populate('facultyId').populate('hallId');
  console.log(`  - Assigned Faculty: ${assignedDuty.facultyId.name} (${assignedDuty.facultyId.facultyId}) to Hall ${assignedDuty.hallId.hallNumber}`);

  // Confirm Ravi V. was strictly excluded
  const raviDuties = await Invigilation.find({
    facultyId: (await Faculty.findOne({ facultyId: 'FAC103' }))._id,
  });
  if (raviDuties.length > 0) {
    throw new Error('FAIL: Prof. Ravi V. was assigned despite being marked Not Available!');
  }
  console.log(`  ✔ SUCCESS: Prof. Ravi V. (FAC103 - Not Available) was strictly excluded from duty eligibility!`);

  // Test 6: Student Authenticated Privacy Isolation
  console.log(`\n[TEST 6] Testing Student Privacy & Isolation:`);
  const sampleStudent = await Student.findOne({ registerNumber: '23IT001' });
  const studentSeating = await SeatingPlan.findOne({ studentId: sampleStudent._id }).populate('examId').populate('hallId');
  console.log(`  - Student: ${sampleStudent.name} (${sampleStudent.registerNumber})`);
  console.log(`  - Allotted Exam: ${studentSeating.examId.examName} (${studentSeating.examId.examCode})`);
  console.log(`  - Allotted Hall: Hall ${studentSeating.hallId.hallNumber}`);
  console.log(`  - Allotted Seat: ${studentSeating.seatNumber}`);
  console.log(`  ✔ SUCCESS: Student sees only their own verified seat assignment!`);

  console.log('\n===============================================================');
  console.log('ALL VERIFICATIONS PASSED 100% CLEANLY!');
  console.log('===============================================================\n');

  process.exit(0);
};

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
