const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamRegistration = require('../models/ExamRegistration');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');

const runSeed = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  }

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Subject.deleteMany({}),
    Student.deleteMany({}),
    Exam.deleteMany({}),
    ExamRegistration.deleteMany({}),
    Hall.deleteMany({}),
    Faculty.deleteMany({}),
    FacultyAvailability.deleteMany({}),
    SeatingPlan.deleteMany({}),
    Invigilation.deleteMany({}),
  ]);

  console.log('Clearing database for fresh Easwari Engineering College seeding...');

  // 1. Create Administrator Accounts
  await User.create([
    {
      name: 'Office of Controller of Examinations',
      email: 'admin@eec.srmrmp.edu.in',
      password: 'admin123',
      role: 'admin',
      referenceId: 'COE-ADMIN',
    },
    {
      name: 'Controller of Examinations',
      email: 'admin@exam.edu',
      password: 'admin123',
      role: 'admin',
      referenceId: 'ADMIN',
    },
  ]);

  // 2. Create Dynamic Departments
  const deptIT = await Department.create({ code: 'IT', name: 'Information Technology' });
  const deptCSE = await Department.create({ code: 'CSE', name: 'Computer Science and Engineering' });
  const deptECE = await Department.create({ code: 'ECE', name: 'Electronics and Communication Engineering' });
  const deptMECH = await Department.create({ code: 'MECH', name: 'Mechanical Engineering' });

  // 3. Create Dynamic Subjects (including shared common paper)
  const subDBMS = await Subject.create({
    subjectCode: 'CS8492',
    subjectName: 'Database Management Systems',
    semester: 5,
    departments: [deptIT._id, deptCSE._id], // Shared between IT and CSE
    isCommonPaper: true,
  });

  const subWebTech = await Subject.create({
    subjectCode: 'IT8501',
    subjectName: 'Web Technology',
    semester: 5,
    departments: [deptIT._id],
    isCommonPaper: false,
  });

  const subNetworks = await Subject.create({
    subjectCode: 'CS8591',
    subjectName: 'Computer Networks',
    semester: 5,
    departments: [deptCSE._id],
    isCommonPaper: false,
  });

  const subMicro = await Subject.create({
    subjectCode: 'EC8691',
    subjectName: 'Microprocessors and Microcontrollers',
    semester: 5,
    departments: [deptECE._id],
    isCommonPaper: false,
  });

  const subPower = await Subject.create({
    subjectCode: 'ME8792',
    subjectName: 'Power Plant Engineering',
    semester: 5,
    departments: [deptMECH._id],
    isCommonPaper: false,
  });

  const subDiscrete = await Subject.create({
    subjectCode: 'MA8351',
    subjectName: 'Discrete Mathematics',
    semester: 3,
    departments: [deptIT._id, deptCSE._id, deptECE._id],
    isCommonPaper: true,
  });

  // 4. Create Faculty Members with Accounts
  const facultyData = [
    { name: 'Dr. Kumar R.', facultyId: 'FAC101', email: 'kumar@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543210' },
    { name: 'Dr. Priya S.', facultyId: 'FAC102', email: 'priya@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543211' },
    { name: 'Prof. Ravi V.', facultyId: 'FAC103', email: 'ravi@eec.srmrmp.edu.in', department: 'ECE', phone: '+91 9876543212' },
    { name: 'Prof. Anu M.', facultyId: 'FAC104', email: 'anu@eec.srmrmp.edu.in', department: 'MECH', phone: '+91 9876543213' },
    { name: 'Dr. Suresh K.', facultyId: 'FAC105', email: 'suresh@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543214' },
    { name: 'Dr. Meena N.', facultyId: 'FAC106', email: 'meena@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543215' },
  ];

  const createdFaculty = [];
  for (const f of facultyData) {
    const user = await User.create({
      name: f.name,
      email: f.email,
      password: 'faculty123',
      role: 'faculty',
      referenceId: f.facultyId,
    });

    const fac = await Faculty.create({
      userId: user._id,
      facultyId: f.facultyId,
      name: f.name,
      email: f.email,
      department: f.department,
      phone: f.phone,
      isActive: true,
    });

    createdFaculty.push(fac);
  }

  // 5. Create Faculty Availability Declarations
  // Ravi V. is explicitly marked 'Not Available' for 2026-10-15 and 2026-10-20 to test exclusion constraints!
  await FacultyAvailability.create([
    { facultyId: createdFaculty[0]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Available' },
    { facultyId: createdFaculty[1]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Available' },
    { facultyId: createdFaculty[2]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Not Available', notes: 'Symposium duty' },
    { facultyId: createdFaculty[3]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Available' },
    { facultyId: createdFaculty[4]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Available' },
    { facultyId: createdFaculty[5]._id, date: '2026-10-15', startTime: '10:00', endTime: '13:00', status: 'Available' },
    { facultyId: createdFaculty[2]._id, date: '2026-10-20', startTime: '10:00', endTime: '13:00', status: 'Not Available', notes: 'External Examiner duty' },
  ]);

  // 6. Create Examination Halls
  const halls = await Hall.create([
    { hallNumber: 'C301', building: 'Clock Tower Block', floor: 3, rows: 5, columns: 6, capacity: 30, isAvailable: true },
    { hallNumber: 'C302', building: 'Clock Tower Block', floor: 3, rows: 5, columns: 6, capacity: 30, isAvailable: true },
    { hallNumber: 'M201', building: 'Mechanical Sciences', floor: 2, rows: 6, columns: 6, capacity: 36, isAvailable: true },
    { hallNumber: 'E101', building: 'Electronics Block', floor: 1, rows: 5, columns: 6, capacity: 30, isAvailable: true },
  ]);

  // 7. Create Student Accounts (32 students: 8 IT, 8 CSE, 8 ECE, 8 MECH)
  const studentsToCreate = [];
  const deptList = [
    { code: 'IT', deptId: deptIT._id, prefix: '23IT' },
    { code: 'CSE', deptId: deptCSE._id, prefix: '23CSE' },
    { code: 'ECE', deptId: deptECE._id, prefix: '23ECE' },
    { code: 'MECH', deptId: deptMECH._id, prefix: '23MECH' },
  ];

  const firstNames = [
    'Arun', 'Bala', 'Chitra', 'Deepak', 'Ezhil', 'Farhana', 'Ganesh', 'Hari',
    'Dinesh', 'Ishwarya', 'Janani', 'Kavitha', 'Lokesh', 'Manoj', 'Naveen', 'Omprakash',
    'Pooja', 'Raghav', 'Surya', 'Tarun', 'Usha', 'Vignesh', 'Wendy', 'Yogesh',
    'Akash', 'Barath', 'Charan', 'Divya', 'Gokul', 'Hema', 'Karthik', 'Lavanya',
  ];

  let nameIdx = 0;
  const createdStudents = [];

  for (const dept of deptList) {
    for (let i = 1; i <= 8; i++) {
      const reg = `${dept.prefix}${String(i).padStart(3, '0')}`;
      const name = `${firstNames[nameIdx % firstNames.length]} ${String.fromCharCode(65 + (i % 26))}.`;
      const email = `${reg.toLowerCase()}@eec.srmrmp.edu.in`;
      nameIdx++;

      const user = await User.create({
        name,
        email,
        password: 'student123',
        role: 'student',
        referenceId: reg,
      });

      const stu = await Student.create({
        userId: user._id,
        registerNumber: reg,
        name,
        email,
        department: dept.code,
        departmentId: dept.deptId,
        year: 3,
        section: i <= 4 ? 'A' : 'B',
      });

      createdStudents.push(stu);
    }
  }

  // 8. Create Realistic Examination Schedule for the SAME Exam Date (2026-10-15) and Session (FN)
  // Demonstrating: Multiple departments having different exams on the same date/session AND sharing halls!
  const examIT = await Exam.create({
    examName: 'Web Technology',
    examCode: 'IT8501',
    subjectId: subWebTech._id,
    department: 'IT',
    departments: [deptIT._id],
    examDate: '2026-10-15',
    session: 'FN',
    startTime: '10:00',
    endTime: '13:00',
    semester: 5,
    status: 'Scheduled',
    registeredStudentsCount: 8,
  });

  const examCSE = await Exam.create({
    examName: 'Computer Networks',
    examCode: 'CS8591',
    subjectId: subNetworks._id,
    department: 'CSE',
    departments: [deptCSE._id],
    examDate: '2026-10-15',
    session: 'FN',
    startTime: '10:00',
    endTime: '13:00',
    semester: 5,
    status: 'Scheduled',
    registeredStudentsCount: 8,
  });

  const examECE = await Exam.create({
    examName: 'Microprocessors and Microcontrollers',
    examCode: 'EC8691',
    subjectId: subMicro._id,
    department: 'ECE',
    departments: [deptECE._id],
    examDate: '2026-10-15',
    session: 'FN',
    startTime: '10:00',
    endTime: '13:00',
    semester: 5,
    status: 'Scheduled',
    registeredStudentsCount: 8,
  });

  // Common Paper Exam across CSE & IT on 2026-10-20
  const examCommonDBMS = await Exam.create({
    examName: 'Database Management Systems (Common Paper)',
    examCode: 'CS8492',
    subjectId: subDBMS._id,
    department: 'ALL',
    departments: [deptIT._id, deptCSE._id],
    examDate: '2026-10-20',
    session: 'FN',
    startTime: '10:00',
    endTime: '13:00',
    semester: 5,
    status: 'Scheduled',
    registeredStudentsCount: 16,
  });

  // 9. Create Student Registrations (ExamRegistration collection)
  // IT students registered for Web Technology
  const itStudents = createdStudents.filter((s) => s.department === 'IT');
  for (const s of itStudents) {
    await ExamRegistration.create({
      studentId: s._id,
      examId: examIT._id,
      subjectId: subWebTech._id,
      isEligible: true,
    });
    // Also register for Common DBMS paper
    await ExamRegistration.create({
      studentId: s._id,
      examId: examCommonDBMS._id,
      subjectId: subDBMS._id,
      isEligible: true,
    });
  }

  // CSE students registered for Computer Networks
  const cseStudents = createdStudents.filter((s) => s.department === 'CSE');
  for (const s of cseStudents) {
    await ExamRegistration.create({
      studentId: s._id,
      examId: examCSE._id,
      subjectId: subNetworks._id,
      isEligible: true,
    });
    // Also register for Common DBMS paper
    await ExamRegistration.create({
      studentId: s._id,
      examId: examCommonDBMS._id,
      subjectId: subDBMS._id,
      isEligible: true,
    });
  }

  // ECE students registered for Microprocessors
  const eceStudents = createdStudents.filter((s) => s.department === 'ECE');
  for (const s of eceStudents) {
    await ExamRegistration.create({
      studentId: s._id,
      examId: examECE._id,
      subjectId: subMicro._id,
      isEligible: true,
    });
  }

  console.log('Seeding complete for Easwari Engineering College!');
  console.log('  - Administrator account: admin@exam.edu / admin123');
  console.log('  - Departments: IT, CSE, ECE, MECH');
  console.log('  - Subjects: CS8492 (Shared), IT8501, CS8591, EC8691, ME8792, MA8351');
  console.log('  - Students: 32 individual accounts (student123)');
  console.log('  - Faculty: 6 accounts (faculty123) with Ravi V. marked Not Available');
  console.log('  - Exam Registrations: Created across separate and shared examination papers');

  return { success: true };
};

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seed executed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { runSeed };
