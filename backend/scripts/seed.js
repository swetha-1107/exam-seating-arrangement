const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Subject = require('../models/Subject');
const ProgrammeCourse = require('../models/ProgrammeCourse');
const ExamSeries = require('../models/ExamSeries');
const ExamSlot = require('../models/ExamSlot');
const ExamPaper = require('../models/ExamPaper');
const Exam = require('../models/Exam');
const Student = require('../models/Student');
const Hall = require('../models/Hall');
const Faculty = require('../models/Faculty');
const FacultyAvailability = require('../models/FacultyAvailability');
const SeatingPlan = require('../models/SeatingPlan');
const Invigilation = require('../models/Invigilation');

const runSeed = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/exam_seating_system');
  }

  console.log('--- Seeding Easwari Engineering College Examination System ---');

  // Clear existing data cleanly
  await Promise.all([
    User.deleteMany({}),
    Department.deleteMany({}),
    Subject.deleteMany({}),
    ProgrammeCourse.deleteMany({}),
    ExamSeries.deleteMany({}),
    ExamSlot.deleteMany({}),
    ExamPaper.deleteMany({}),
    Exam.deleteMany({}),
    Student.deleteMany({}),
    Hall.deleteMany({}),
    Faculty.deleteMany({}),
    FacultyAvailability.deleteMany({}),
    SeatingPlan.deleteMany({}),
    Invigilation.deleteMany({}),
  ]);

  // 1. Administrators
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

  // 2. Programmes (8 Departments)
  const departmentsData = [
    { code: 'IT', name: 'Information Technology', degree: 'B.Tech.', preferredBlock: 'MAIN' },
    { code: 'CSE', name: 'Computer Science and Engineering', degree: 'B.E.', preferredBlock: 'MAIN' },
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science', degree: 'B.Tech.', preferredBlock: 'MAIN' },
    { code: 'ECE', name: 'Electronics and Communication Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
    { code: 'EEE', name: 'Electrical and Electronics Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
    { code: 'CIVIL', name: 'Civil Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
    { code: 'MECH', name: 'Mechanical Engineering', degree: 'B.E.', preferredBlock: 'MECH' },
    { code: 'AUTO', name: 'Automobile Engineering', degree: 'B.E.', preferredBlock: 'MECH' },
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    const doc = await Department.create(d);
    deptMap[d.code] = doc;
  }
  console.log(`Created ${departmentsData.length} Programmes/Departments.`);

  // 3. Realistic Halls across Blocks & Floors
  const hallsData = [
    // MAIN BLOCK (Floors FIRST)
    { hallCode: 'LH1002', block: 'MAIN', floor: 'FIRST', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH1003', block: 'MAIN', floor: 'FIRST', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH1101', block: 'MAIN', floor: 'FIRST', benchRows: 5, benchColumns: 4 }, // 20 benches = 40 seats
    { hallCode: 'LH1102', block: 'MAIN', floor: 'FIRST', benchRows: 5, benchColumns: 4 }, // 20 benches = 40 seats

    // CIVIL BLOCK
    { hallCode: 'LH2101', block: 'CIVIL', floor: 'FIRST', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH2201', block: 'CIVIL', floor: 'SECOND', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH2304', block: 'CIVIL', floor: 'THIRD', benchRows: 5, benchColumns: 4 }, // 20 benches = 40 seats

    // MECH BLOCK
    { hallCode: 'LH3101', block: 'MECH', floor: 'FIRST', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH3201', block: 'MECH', floor: 'SECOND', benchRows: 4, benchColumns: 4 }, // 16 benches = 32 seats
    { hallCode: 'LH3301', block: 'MECH', floor: 'THIRD', benchRows: 5, benchColumns: 4 }, // 20 benches = 40 seats
  ];

  for (const h of hallsData) {
    const capacity = h.benchRows * h.benchColumns * 2;
    await Hall.create({
      ...h,
      hallNumber: h.hallCode,
      building: `${h.block} BLOCK`,
      rows: h.benchRows,
      columns: h.benchColumns,
      seatsPerBench: 2,
      capacity,
      usableCapacity: capacity,
      isActive: true,
      isAvailable: true,
    });
  }
  console.log(`Created ${hallsData.length} Examination Halls.`);

  // 4. Faculty & Availability
  const facultyData = [
    { name: 'Dr. Kumar R.', facultyId: 'FAC101', email: 'kumar@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543210' },
    { name: 'Dr. Priya S.', facultyId: 'FAC102', email: 'priya@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543211' },
    { name: 'Prof. Ravi V.', facultyId: 'FAC103', email: 'ravi@eec.srmrmp.edu.in', department: 'ECE', phone: '+91 9876543212' },
    { name: 'Prof. Anu M.', facultyId: 'FAC104', email: 'anu@eec.srmrmp.edu.in', department: 'MECH', phone: '+91 9876543213' },
    { name: 'Dr. Suresh K.', facultyId: 'FAC105', email: 'suresh@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543214' },
    { name: 'Dr. Meena N.', facultyId: 'FAC106', email: 'meena@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543215' },
    { name: 'Dr. Venkatesh T.', facultyId: 'FAC107', email: 'venkatesh@eec.srmrmp.edu.in', department: 'AIDS', phone: '+91 9876543216' },
    { name: 'Prof. Lakshmi B.', facultyId: 'FAC108', email: 'lakshmi@eec.srmrmp.edu.in', department: 'EEE', phone: '+91 9876543217' },
    { name: 'Prof. Sridhar P.', facultyId: 'FAC109', email: 'sridhar@eec.srmrmp.edu.in', department: 'CIVIL', phone: '+91 9876543218' },
    { name: 'Dr. Karthikeyan G.', facultyId: 'FAC110', email: 'karthik@eec.srmrmp.edu.in', department: 'AUTO', phone: '+91 9876543219' },
    { name: 'Prof. Deepa J.', facultyId: 'FAC111', email: 'deepa@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543220' },
    { name: 'Dr. Rajesh C.', facultyId: 'FAC112', email: 'rajesh@eec.srmrmp.edu.in', department: 'ECE', phone: '+91 9876543221' },
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

  // Set explicit unavailabilities to test constraints
  await FacultyAvailability.create([
    {
      facultyId: createdFaculty[1]._id, // Dr. Priya S.
      date: '2026-10-15',
      startTime: '09:30',
      endTime: '11:00',
      status: 'Not Available',
      notes: 'Symposium Co-ordinator duty',
    },
    {
      facultyId: createdFaculty[4]._id, // Dr. Suresh K.
      date: '2026-10-15',
      startTime: '09:30',
      endTime: '11:00',
      status: 'Not Available',
      notes: 'External university inspection',
    },
  ]);
  console.log(`Created ${createdFaculty.length} Faculty members with availability records.`);

  // 5. 175 Students with 12-digit Register Numbers conforming to Anna Univ / Easwari standard
  const studentGroups = [
    { code: 'IT', branchCode: '205', count: 25, sem: 5, electives: ['2311MEO902T'] },
    {
      code: 'CSE',
      branchCode: '104',
      count: 30,
      sem: 5,
      // First 15 take Cloud Computing, second 15 take Adv Comp Arch
      electiveSplit: [
        { count: 15, electives: ['2311CSE903T'] },
        { count: 15, electives: ['2311CSE901T'] },
      ],
    },
    { code: 'AIDS', branchCode: '243', count: 25, sem: 5, electives: [] },
    { code: 'ECE', branchCode: '106', count: 25, sem: 5, electives: [] },
    { code: 'EEE', branchCode: '105', count: 20, sem: 5, electives: [] },
    { code: 'AUTO', branchCode: '102', count: 15, sem: 5, electives: [] },
    { code: 'MECH', branchCode: '114', count: 20, sem: 5, electives: [] },
    { code: 'CIVIL', branchCode: '103', count: 15, sem: 5, electives: [] },
  ];

  const tamilFirstNames = [
    'Aakash', 'Abinaya', 'Ajith', 'Anitha', 'Aravind', 'Archana', 'Bala', 'Bharath',
    'Chandran', 'Deepa', 'Dinesh', 'Divya', 'Elango', 'Ganesh', 'Gayathri', 'Gokul',
    'Harish', 'Hema', 'Ilayaraja', 'Indhu', 'Jagadeesh', 'Janani', 'Karthik', 'Kavitha',
    'Keerthana', 'Lokesh', 'Madhavan', 'Mano', 'Meenakshi', 'Murali', 'Nandhini', 'Naveen',
    'Nithya', 'Pavithra', 'Pradeep', 'Prakash', 'Praveen', 'Priya', 'Raghav', 'Rajesh',
    'Ramkumar', 'Ranjith', 'Revathi', 'Rohit', 'Sanjay', 'Saravanan', 'Sathish', 'Selvam',
    'Senthamizh', 'Shalini', 'Sharath', 'Shiva', 'Sindhu', 'Siva', 'Sneha', 'Soundar',
    'Sowmya', 'Sridhar', 'Subash', 'Sudha', 'Suresh', 'Surya', 'Swetha', 'Tamilarasan',
    'Tarun', 'Udhaya', 'Vaishnavi', 'Varun', 'Vasanth', 'Vignesh', 'Vijay', 'Vinoth',
    'Vishnu', 'Yazhini', 'Yogesh', 'Yuvaraj',
  ];

  let nameIndex = 0;
  let totalStudentsCreated = 0;

  for (const group of studentGroups) {
    const deptDoc = deptMap[group.code];
    let electivesList = group.electives || [];

    for (let i = 1; i <= group.count; i++) {
      const seqStr = String(i).padStart(3, '0');
      const regNo = `310624${group.branchCode}${seqStr}`;
      const fName = tamilFirstNames[nameIndex % tamilFirstNames.length];
      const initial = String.fromCharCode(65 + ((i + nameIndex) % 26));
      const studentName = `${fName} ${initial}.`;
      nameIndex++;

      // Determine electives
      let studentElectives = electivesList;
      if (group.electiveSplit) {
        if (i <= group.electiveSplit[0].count) {
          studentElectives = group.electiveSplit[0].electives;
        } else {
          studentElectives = group.electiveSplit[1].electives;
        }
      }

      const email = `${regNo.toLowerCase()}@eec.srmrmp.edu.in`;

      const user = await User.create({
        name: studentName,
        email,
        password: 'password123',
        role: 'student',
        referenceId: regNo,
      });

      await Student.create({
        userId: user._id,
        registerNumber: regNo,
        name: studentName,
        programme: group.code,
        department: group.code,
        programmeId: deptDoc._id,
        departmentId: deptDoc._id,
        year: 3,
        semester: group.sem,
        section: i <= 15 ? 'A' : 'B',
        email,
        electiveCourses: studentElectives,
      });

      totalStudentsCreated++;
    }
  }
  console.log(`Created ${totalStudentsCreated} Students with 12-digit register numbers & electives.`);

  // 6. Subjects / Courses
  const coursesData = [
    // Slot 1
    { courseCode: '2311ITC501T', courseName: 'Software Engineering', type: 'core', semester: 5, deptCode: 'IT' },
    { courseCode: '2311CSC501T', courseName: 'Operating Systems Principles', type: 'core', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311ECC501T', courseName: 'Digital Signal Processing', type: 'core', semester: 5, deptCode: 'ECE' },
    { courseCode: '2311EEC501T', courseName: 'Control Systems', type: 'core', semester: 5, deptCode: 'EEE' },

    // Slot 2 (Shared paper + others)
    { courseCode: '2311SDA501L', courseName: 'Statistical Data Analysis', type: 'common', semester: 5, sharedDepts: ['IT', 'CSE', 'AIDS'] },
    { courseCode: '2311MEC501T', courseName: 'Heat and Mass Transfer', type: 'core', semester: 5, sharedDepts: ['MECH', 'AUTO'] },
    { courseCode: '2311CEC501T', courseName: 'Structural Analysis', type: 'core', semester: 5, deptCode: 'CIVIL' },

    // Slot 3 (Elective slot)
    { courseCode: '2311CSE903T', courseName: 'Cloud Computing Technologies', type: 'elective', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311CSE901T', courseName: 'Advanced Computer Architecture', type: 'elective', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311MEO902T', courseName: 'Renewable Energy Sources', type: 'open-elective', semester: 5, deptCode: 'IT' },
    { courseCode: '2311ECC502T', courseName: 'Wireless Networks', type: 'core', semester: 5, deptCode: 'ECE' },
  ];

  const courseMap = {};
  for (const c of coursesData) {
    const doc = await Subject.create({
      code: c.courseCode,
      courseCode: c.courseCode,
      name: c.courseName,
      courseName: c.courseName,
      type: c.type,
      semester: c.semester,
      isCommonPaper: c.type === 'common' || !!c.sharedDepts,
    });
    courseMap[c.courseCode] = doc;

    // Create ProgrammeCourse mapping
    if (c.deptCode && deptMap[c.deptCode]) {
      await ProgrammeCourse.create({
        programme: deptMap[c.deptCode]._id,
        semester: c.semester,
        course: doc._id,
      });
    } else if (c.sharedDepts) {
      for (const dCode of c.sharedDepts) {
        if (deptMap[dCode]) {
          await ProgrammeCourse.create({
            programme: deptMap[dCode]._id,
            semester: c.semester,
            course: doc._id,
          });
        }
      }
    }
  }
  console.log(`Created ${coursesData.length} Subjects / Courses.`);

  // 7. Exam Series
  const series = await ExamSeries.create({
    name: 'Continuous Assessment Test II (CAT II)',
    code: 'CAT-2',
    academicYear: '2026-2027',
    term: 'ODD',
    semesterScope: [5],
  });

  // 8. Exam Slots & Papers
  // Slot 1: 15.10.2026, 09:30 - 11:00 (IT, CSE, ECE, EEE)
  const slot1 = await ExamSlot.create({
    series: series._id,
    date: '2026-10-15',
    startTime: '09:30',
    endTime: '11:00',
    notes: 'CAT II Day 1 Forenoon Session',
    seatingStatus: 'NOT_GENERATED',
  });

  const slot1Papers = [
    { code: '2311ITC501T', depts: ['IT'], type: 'core' },
    { code: '2311CSC501T', depts: ['CSE'], type: 'core' },
    { code: '2311ECC501T', depts: ['ECE'], type: 'core' },
    { code: '2311EEC501T', depts: ['EEE'], type: 'core' },
  ];

  for (const p of slot1Papers) {
    const course = courseMap[p.code];
    const paper = await ExamPaper.create({
      slot: slot1._id,
      course: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      programmes: p.depts.map((d) => ({
        programme: deptMap[d]._id,
        semester: 5,
        departmentCode: d,
      })),
      type: p.type,
    });

    await Exam.create({
      examName: course.courseName,
      examCode: course.courseCode,
      subjectId: course._id,
      department: p.depts.length === 1 ? p.depts[0] : 'ALL',
      departments: p.depts.map((d) => deptMap[d]._id),
      semester: 5,
      examDate: slot1.date,
      startTime: slot1.startTime,
      endTime: slot1.endTime,
      session: 'FN',
      slotId: slot1._id,
      paperId: paper._id,
    });
  }

  // Slot 2: 16.10.2026, 09:30 - 11:00 (Shared Paper SDA between IT, CSE, AIDS; Mech/Auto; Civil)
  const slot2 = await ExamSlot.create({
    series: series._id,
    date: '2026-10-16',
    startTime: '09:30',
    endTime: '11:00',
    notes: 'CAT II Day 2 Forenoon Session (Common Paper SDA)',
    seatingStatus: 'NOT_GENERATED',
  });

  const slot2Papers = [
    { code: '2311SDA501L', depts: ['IT', 'CSE', 'AIDS'], type: 'common' },
    { code: '2311MEC501T', depts: ['MECH', 'AUTO'], type: 'core' },
    { code: '2311CEC501T', depts: ['CIVIL'], type: 'core' },
  ];

  for (const p of slot2Papers) {
    const course = courseMap[p.code];
    const paper = await ExamPaper.create({
      slot: slot2._id,
      course: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      programmes: p.depts.map((d) => ({
        programme: deptMap[d]._id,
        semester: 5,
        departmentCode: d,
      })),
      type: p.type,
    });

    await Exam.create({
      examName: course.courseName,
      examCode: course.courseCode,
      subjectId: course._id,
      department: p.depts.length === 1 ? p.depts[0] : 'ALL',
      departments: p.depts.map((d) => deptMap[d]._id),
      semester: 5,
      examDate: slot2.date,
      startTime: slot2.startTime,
      endTime: slot2.endTime,
      session: 'FN',
      slotId: slot2._id,
      paperId: paper._id,
    });
  }

  // Slot 3: 17.10.2026, 14:00 - 15:30 (Elective Slot: CSE Cloud & Arch, IT Open Elective, ECE Wireless)
  const slot3 = await ExamSlot.create({
    series: series._id,
    date: '2026-10-17',
    startTime: '14:00',
    endTime: '15:30',
    notes: 'CAT II Day 3 Afternoon Session (Electives)',
    seatingStatus: 'NOT_GENERATED',
  });

  const slot3Papers = [
    { code: '2311CSE903T', depts: ['CSE'], type: 'elective' },
    { code: '2311CSE901T', depts: ['CSE'], type: 'elective' },
    { code: '2311MEO902T', depts: ['IT'], type: 'open-elective' },
    { code: '2311ECC502T', depts: ['ECE'], type: 'core' },
  ];

  for (const p of slot3Papers) {
    const course = courseMap[p.code];
    const paper = await ExamPaper.create({
      slot: slot3._id,
      course: course._id,
      courseCode: course.courseCode,
      courseName: course.courseName,
      programmes: p.depts.map((d) => ({
        programme: deptMap[d]._id,
        semester: 5,
        departmentCode: d,
      })),
      type: p.type,
    });

    await Exam.create({
      examName: course.courseName,
      examCode: course.courseCode,
      subjectId: course._id,
      department: p.depts.length === 1 ? p.depts[0] : 'ALL',
      departments: p.depts.map((d) => deptMap[d]._id),
      semester: 5,
      examDate: slot3.date,
      startTime: slot3.startTime,
      endTime: slot3.endTime,
      session: 'AN',
      slotId: slot3._id,
      paperId: paper._id,
    });
  }

  console.log('Created 3 Exam Slots with 11 Papers.');
  console.log('--- Database Seeding Completed Successfully ---');
};

if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seed completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = runSeed;
