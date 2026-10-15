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

  console.log('--- Seeding Easwari Engineering College Realistic Examination System ---');

  // Clear existing collections cleanly
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

  // 2. Programmes (9 Departments)
  const departmentsData = [
    { code: 'IT', name: 'Information Technology', degree: 'B.Tech.', preferredBlock: 'MAIN' },
    { code: 'CSE', name: 'Computer Science and Engineering', degree: 'B.E.', preferredBlock: 'MAIN' },
    { code: 'AIDS', name: 'Artificial Intelligence and Data Science', degree: 'B.Tech.', preferredBlock: 'MAIN' },
    { code: 'ECE', name: 'Electronics and Communication Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
    { code: 'EEE', name: 'Electrical and Electronics Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
    { code: 'CSBS', name: 'Computer Science and Business Systems', degree: 'B.Tech.', preferredBlock: 'MAIN' },
    { code: 'MECH', name: 'Mechanical Engineering', degree: 'B.E.', preferredBlock: 'MECH' },
    { code: 'AUTO', name: 'Automobile Engineering', degree: 'B.E.', preferredBlock: 'MECH' },
    { code: 'CIVIL', name: 'Civil Engineering', degree: 'B.E.', preferredBlock: 'CIVIL' },
  ];

  const deptMap = {};
  for (const d of departmentsData) {
    const doc = await Department.create(d);
    deptMap[d.code] = doc;
  }
  console.log(`Created ${departmentsData.length} Programmes/Departments.`);

  // 3. Realistic Halls across 3 Blocks & 4 Floors (5 Halls per floor = 60 halls total)
  // Each floor has 3 halls with 32 capacity (4x4) and 2 halls with 40 capacity (5x4) = 176 capacity per floor
  const blocks = [
    { code: 'MAIN', prefix: '1' },
    { code: 'CIVIL', prefix: '2' },
    { code: 'MECH', prefix: '3' },
  ];
  const floors = [
    { name: 'GROUND', index: '0' },
    { name: 'FIRST', index: '1' },
    { name: 'SECOND', index: '2' },
    { name: 'THIRD', index: '3' },
  ];

  let totalHallsCreated = 0;
  for (const b of blocks) {
    for (const f of floors) {
      for (let hNum = 1; hNum <= 5; hNum++) {
        const hallCode = `LH${b.prefix}${f.index}0${hNum}`;
        const isLarger = hNum >= 4; // LHx04, LHx05 have 5 rows x 4 cols = 40 seats
        const benchRows = isLarger ? 5 : 4;
        const benchColumns = 4;
        const capacity = benchRows * benchColumns * 2;

        await Hall.create({
          hallCode,
          hallNumber: hallCode,
          block: b.code,
          building: `${b.code} BLOCK`,
          floor: f.name,
          benchRows,
          rows: benchRows,
          benchColumns,
          columns: benchColumns,
          seatsPerBench: 2,
          capacity,
          usableCapacity: capacity,
          priority: 1,
          isActive: true,
          isAvailable: true,
        });
        totalHallsCreated++;
      }
    }
  }
  console.log(`Created ${totalHallsCreated} Examination Halls across 3 blocks and 4 floors (5 per floor).`);

  // 4. Faculty Members (24 faculty members across 9 departments)
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
    { name: 'Dr. Balaji K.', facultyId: 'FAC113', email: 'balaji@eec.srmrmp.edu.in', department: 'CSBS', phone: '+91 9876543222' },
    { name: 'Prof. Saravanan M.', facultyId: 'FAC114', email: 'saravanan@eec.srmrmp.edu.in', department: 'MECH', phone: '+91 9876543223' },
    { name: 'Dr. Gayathri N.', facultyId: 'FAC115', email: 'gayathri@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543224' },
    { name: 'Prof. Vignesh P.', facultyId: 'FAC116', email: 'vignesh@eec.srmrmp.edu.in', department: 'AIDS', phone: '+91 9876543225' },
    { name: 'Dr. Anitha T.', facultyId: 'FAC117', email: 'anitha@eec.srmrmp.edu.in', department: 'EEE', phone: '+91 9876543226' },
    { name: 'Prof. Mohan S.', facultyId: 'FAC118', email: 'mohan@eec.srmrmp.edu.in', department: 'CIVIL', phone: '+91 9876543227' },
    { name: 'Dr. Sudha R.', facultyId: 'FAC119', email: 'sudha@eec.srmrmp.edu.in', department: 'CSE', phone: '+91 9876543228' },
    { name: 'Prof. Harish V.', facultyId: 'FAC120', email: 'harish@eec.srmrmp.edu.in', department: 'ECE', phone: '+91 9876543229' },
    { name: 'Dr. Radhika K.', facultyId: 'FAC121', email: 'radhika@eec.srmrmp.edu.in', department: 'CSBS', phone: '+91 9876543230' },
    { name: 'Prof. Dinesh B.', facultyId: 'FAC122', email: 'dinesh@eec.srmrmp.edu.in', department: 'AUTO', phone: '+91 9876543231' },
    { name: 'Dr. Udhaya M.', facultyId: 'FAC123', email: 'udhaya@eec.srmrmp.edu.in', department: 'MECH', phone: '+91 9876543232' },
    { name: 'Prof. Sneha L.', facultyId: 'FAC124', email: 'sneha@eec.srmrmp.edu.in', department: 'IT', phone: '+91 9876543233' },
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

  // 5. Students across 9 programmes (40–70 per programme, Semester 5, 12-digit register numbers)
  const studentGroups = [
    { code: 'IT', branchCode: '205', count: 46, sem: 5, electives: ['2311MEO902T'] },
    {
      code: 'CSE',
      branchCode: '104',
      count: 50,
      sem: 5,
      // First 25 Cloud Computing, next 25 Advanced Computer Architecture
      electiveSplit: [
        { count: 25, electives: ['2311CSE903T'] },
        { count: 25, electives: ['2311CSE901T'] },
      ],
    },
    { code: 'AIDS', branchCode: '243', count: 46, sem: 5, electives: [] },
    { code: 'ECE', branchCode: '106', count: 48, sem: 5, electives: ['2311ECE901T'] },
    { code: 'EEE', branchCode: '105', count: 44, sem: 5, electives: [] },
    { code: 'CSBS', branchCode: '115', count: 44, sem: 5, electives: [] },
    { code: 'MECH', branchCode: '114', count: 48, sem: 5, electives: ['2311MEE901T'] },
    { code: 'AUTO', branchCode: '102', count: 42, sem: 5, electives: [] },
    { code: 'CIVIL', branchCode: '103', count: 42, sem: 5, electives: [] },
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
    'Vishnu', 'Yazhini', 'Yogesh', 'Yuvaraj', 'Kavya', 'Kiran', 'Monika', 'Naveena',
    'Padma', 'Pooja', 'Prem', 'Preethi', 'Ramesh', 'Roopa', 'Sangeetha', 'Shankar',
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
        section: i <= 25 ? 'A' : 'B',
        email,
        electiveCourses: studentElectives,
      });

      totalStudentsCreated++;
    }
  }
  console.log(`Created ${totalStudentsCreated} Students across ${studentGroups.length} programmes with 12-digit register numbers.`);

  // 6. Subjects / Courses
  const coursesData = [
    // Day 1 Core Papers (All 9 programmes writing distinct papers)
    { courseCode: '2311ITC501T', courseName: 'Software Engineering', type: 'core', semester: 5, deptCode: 'IT' },
    { courseCode: '2311CSC501T', courseName: 'Operating Systems Principles', type: 'core', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311ADC501T', courseName: 'Foundations of Data Science', type: 'core', semester: 5, deptCode: 'AIDS' },
    { courseCode: '2311ECC501T', courseName: 'Digital Signal Processing', type: 'core', semester: 5, deptCode: 'ECE' },
    { courseCode: '2311EEC501T', courseName: 'Control Systems', type: 'core', semester: 5, deptCode: 'EEE' },
    { courseCode: '2311CBC501T', courseName: 'Computational Statistics', type: 'core', semester: 5, deptCode: 'CSBS' },
    { courseCode: '2311MEC501T', courseName: 'Heat and Mass Transfer', type: 'core', semester: 5, deptCode: 'MECH' },
    { courseCode: '2311AUC501T', courseName: 'Automotive Chassis', type: 'core', semester: 5, deptCode: 'AUTO' },
    { courseCode: '2311CEC501T', courseName: 'Structural Analysis', type: 'core', semester: 5, deptCode: 'CIVIL' },

    // Day 2 (Shared paper SDA between CSE, IT, AIDS; shared MAC between MECH, AUTO; core for others)
    { courseCode: '2311SDA501L', courseName: 'Statistical Data Analysis', type: 'common', semester: 5, sharedDepts: ['IT', 'CSE', 'AIDS'] },
    { courseCode: '2311MAC501T', courseName: 'Applied Thermal Engineering', type: 'common', semester: 5, sharedDepts: ['MECH', 'AUTO'] },
    { courseCode: '2311ECC502T', courseName: 'Analog Communication', type: 'core', semester: 5, deptCode: 'ECE' },
    { courseCode: '2311EEC502T', courseName: 'Power Electronics', type: 'core', semester: 5, deptCode: 'EEE' },
    { courseCode: '2311CBC502T', courseName: 'Object Oriented Software Engineering', type: 'core', semester: 5, deptCode: 'CSBS' },
    { courseCode: '2311CEC502T', courseName: 'Geotechnical Engineering', type: 'core', semester: 5, deptCode: 'CIVIL' },

    // Day 3 (Elective Slot)
    { courseCode: '2311CSE903T', courseName: 'Cloud Computing Technologies', type: 'elective', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311CSE901T', courseName: 'Advanced Computer Architecture', type: 'elective', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311MEO902T', courseName: 'Renewable Energy Sources', type: 'open-elective', semester: 5, deptCode: 'IT' },
    { courseCode: '2311ECE901T', courseName: 'VLSI Design', type: 'elective', semester: 5, deptCode: 'ECE' },
    { courseCode: '2311MEE901T', courseName: 'Finite Element Analysis', type: 'elective', semester: 5, deptCode: 'MECH' },

    // Day 4 (Core Papers)
    { courseCode: '2311ITC502T', courseName: 'Computer Networks', type: 'core', semester: 5, deptCode: 'IT' },
    { courseCode: '2311CSC502T', courseName: 'Database Management Systems', type: 'core', semester: 5, deptCode: 'CSE' },
    { courseCode: '2311ADC502T', courseName: 'Machine Learning', type: 'core', semester: 5, deptCode: 'AIDS' },
    { courseCode: '2311ECC503T', courseName: 'Microprocessors and Microcontrollers', type: 'core', semester: 5, deptCode: 'ECE' },
    { courseCode: '2311EEC503T', courseName: 'Electrical Machines II', type: 'core', semester: 5, deptCode: 'EEE' },
    { courseCode: '2311MEC502T', courseName: 'Design of Machine Elements', type: 'core', semester: 5, deptCode: 'MECH' },
    { courseCode: '2311CEC503T', courseName: 'Environmental Engineering', type: 'core', semester: 5, deptCode: 'CIVIL' },

    // Day 5 (Common paper across ALL 9 programmes)
    {
      courseCode: '2311CSD501L',
      courseName: 'Professional Ethics & Career Skill Development',
      type: 'common',
      semester: 5,
      sharedDepts: ['IT', 'CSE', 'AIDS', 'ECE', 'EEE', 'CSBS', 'MECH', 'AUTO', 'CIVIL'],
    },
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

  // 7. Exam Series (CAT II - 5 Days)
  const series = await ExamSeries.create({
    name: 'Continuous Assessment Test II (CAT II)',
    code: 'CAT-2',
    academicYear: '2026-2027',
    term: 'ODD',
    semesterScope: [5],
  });

  // Helper to create papers and backward-compatible exams
  const createSlotWithPapers = async (slotData, papersConfig) => {
    const slot = await ExamSlot.create({
      series: series._id,
      ...slotData,
      seatingStatus: 'NOT_GENERATED',
      reuseStatus: '',
    });

    for (const p of papersConfig) {
      const course = courseMap[p.code];
      const paper = await ExamPaper.create({
        slot: slot._id,
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
        examDate: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        session: slot.startTime.startsWith('09') ? 'FN' : 'AN',
        slotId: slot._id,
        paperId: paper._id,
      });
    }

    return slot;
  };

  // Day 1: 15.10.2026 (09:30 - 11:00) - ALL 9 PROGRAMMES WRITING!
  const slot1 = await createSlotWithPapers(
    {
      date: '2026-10-15',
      startTime: '09:30',
      endTime: '11:00',
      notes: 'CAT II Day 1 Forenoon Session (All 9 Programmes writing Core Papers)',
    },
    [
      { code: '2311ITC501T', depts: ['IT'], type: 'core' },
      { code: '2311CSC501T', depts: ['CSE'], type: 'core' },
      { code: '2311ADC501T', depts: ['AIDS'], type: 'core' },
      { code: '2311ECC501T', depts: ['ECE'], type: 'core' },
      { code: '2311EEC501T', depts: ['EEE'], type: 'core' },
      { code: '2311CBC501T', depts: ['CSBS'], type: 'core' },
      { code: '2311MEC501T', depts: ['MECH'], type: 'core' },
      { code: '2311AUC501T', depts: ['AUTO'], type: 'core' },
      { code: '2311CEC501T', depts: ['CIVIL'], type: 'core' },
    ]
  );

  // Day 2: 16.10.2026 (09:30 - 11:00) - Shared Paper SDA (IT + CSE + AIDS), MAC (MECH + AUTO), etc.
  const slot2 = await createSlotWithPapers(
    {
      date: '2026-10-16',
      startTime: '09:30',
      endTime: '11:00',
      notes: 'CAT II Day 2 Forenoon Session (Common Paper SDA shared by CSE & IT)',
    },
    [
      { code: '2311SDA501L', depts: ['IT', 'CSE', 'AIDS'], type: 'common' },
      { code: '2311MAC501T', depts: ['MECH', 'AUTO'], type: 'common' },
      { code: '2311ECC502T', depts: ['ECE'], type: 'core' },
      { code: '2311EEC502T', depts: ['EEE'], type: 'core' },
      { code: '2311CBC502T', depts: ['CSBS'], type: 'core' },
      { code: '2311CEC502T', depts: ['CIVIL'], type: 'core' },
    ]
  );

  // Day 3: 17.10.2026 (14:00 - 15:30) - Electives Slot
  const slot3 = await createSlotWithPapers(
    {
      date: '2026-10-17',
      startTime: '14:00',
      endTime: '15:30',
      notes: 'CAT II Day 3 Afternoon Session (Programme & Open Electives)',
    },
    [
      { code: '2311CSE903T', depts: ['CSE'], type: 'elective' },
      { code: '2311CSE901T', depts: ['CSE'], type: 'elective' },
      { code: '2311MEO902T', depts: ['IT'], type: 'open-elective' },
      { code: '2311ECE901T', depts: ['ECE'], type: 'elective' },
      { code: '2311MEE901T', depts: ['MECH'], type: 'elective' },
    ]
  );

  // Day 4: 18.10.2026 (09:30 - 11:00) - Core Papers
  const slot4 = await createSlotWithPapers(
    {
      date: '2026-10-18',
      startTime: '09:30',
      endTime: '11:00',
      notes: 'CAT II Day 4 Forenoon Session (Core Engineering Subjects)',
    },
    [
      { code: '2311ITC502T', depts: ['IT'], type: 'core' },
      { code: '2311CSC502T', depts: ['CSE'], type: 'core' },
      { code: '2311ADC502T', depts: ['AIDS'], type: 'core' },
      { code: '2311ECC503T', depts: ['ECE'], type: 'core' },
      { code: '2311EEC503T', depts: ['EEE'], type: 'core' },
      { code: '2311MEC502T', depts: ['MECH'], type: 'core' },
      { code: '2311CEC503T', depts: ['CIVIL'], type: 'core' },
    ]
  );

  // Day 5: 19.10.2026 (09:30 - 11:00) - Common Paper across ALL 9 PROGRAMMES
  const slot5 = await createSlotWithPapers(
    {
      date: '2026-10-19',
      startTime: '09:30',
      endTime: '11:00',
      notes: 'CAT II Day 5 Forenoon Session (Common Paper across all 9 Programmes)',
    },
    [
      {
        code: '2311CSD501L',
        depts: ['IT', 'CSE', 'AIDS', 'ECE', 'EEE', 'CSBS', 'MECH', 'AUTO', 'CIVIL'],
        type: 'common',
      },
    ]
  );

  console.log('Created 5 Exam Slots covering complete 5-day CAT II series.');
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
module.exports.runSeed = runSeed;
