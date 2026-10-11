# Examination Seating and Invigilation Management System

A full-stack, college-grade web application built to automate examination seating arrangement and invigilator duty assignments while enforcing strict multi-constraint conflict detection across exam timetables, venues, and faculty schedules.

---

## 1. Project Overview & Objectives

In academic institutions, manual generation of examination seating plans and faculty invigilation schedules is error-prone, labor-intensive, and prone to logistical conflicts. This system provides an automated solution that:

1. **Eliminates Timetable & Hall Conflicts**: Guarantees no exam hall or venue is assigned to multiple exams running at overlapping dates and times.
2. **Eliminates Faculty Conflicts**: Guarantees no professor is double-booked for invigilation duties during overlapping examination slots.
3. **Capacity Validation**: Automatically validates that total available seats across selected venues meet or exceed student enrollment before generating seating plans.
4. **Intelligent Department Interleaving**: Interleaves students across departments (e.g., IT, CSE, ECE, MECH in round-robin fashion) so that candidates sitting side-by-side belong to different branches, effectively curbing malpractice.
5. **Prevents Duplicate Seat Assignments**: Guarantees no student receives multiple seats, multiple halls, or duplicate seating records.
6. **Role-Based Portals**:
   - **Admin Portal**: Complete administrative suite with live metrics, CRUD for students, exams, halls, faculty, automatic seating generator, invigilation scheduler, and printable master reports.
   - **Student Portal (Seat Finder)**: Instant search by Student Register Number displaying exam session details and an interactive visual hall map with their assigned desk highlighted in green.
   - **Faculty Portal**: Personalized duty schedule displaying assigned dates, sessions, halls, and buildings.

---

## 2. Tech Stack

- **Frontend**:
  - React.js 18 (Vite build system)
  - React Router v6 (Role-based protected routing)
  - Axios (Configured with automated JWT bearer token injection)
  - Lucide React (Clean iconography)
  - Custom Responsive CSS Design System with `@media print` support
- **Backend**:
  - Node.js & Express.js REST APIs
  - JSON Web Tokens (JWT) for secure authentication
  - `bcryptjs` for salted password hashing
  - `cors` and `dotenv`
- **Database**:
  - MongoDB
  - Mongoose ODM (with compound unique indexes enforcing integrity)

---

## 3. Project Folder Structure

```
exam-seating-system/
│
├── backend/
│   ├── config/
│   │   └── db.js                 # MongoDB connection logic
│   ├── controllers/
│   │   ├── authController.js     # User login, registration, profile
│   │   ├── studentController.js  # Student CRUD, search, filters, CSV upload
│   │   ├── examController.js     # Exam scheduling & duration checks
│   │   ├── hallController.js     # Hall CRUD, capacity calculator
│   │   ├── facultyController.js  # Faculty directory & availability toggle
│   │   ├── seatingController.js  # Seating generation & interleaving engine
│   │   ├── invigilationController.js # Automated duty assignment
│   │   └── dashboardController.js# Real-time MongoDB metrics & activity logs
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification & role authorization
│   ├── models/
│   │   ├── User.js               # Admin, Student, Faculty accounts
│   │   ├── Student.js            # Register number, dept, year, section
│   │   ├── Exam.js               # Exam date, start/end time, dept, sem
│   │   ├── Hall.js               # Hall number, rows, columns, capacity
│   │   ├── Faculty.js            # Faculty ID, contact, duty availability
│   │   ├── SeatingPlan.js        # Mapped seat records with unique indexes
│   │   └── Invigilation.js       # Faculty-to-hall duty assignments
│   ├── routes/                   # Modular Express routers
│   ├── scripts/
│   │   ├── seed.js               # Database seeder (28 students, 5 exams, 3 halls, 6 faculty)
│   │   └── verify-flow.js        # Automated end-to-end integration test
│   ├── utils/
│   │   └── conflictChecker.js    # Time overlap & conflict detection math
│   ├── .env                      # Environment configurations
│   ├── package.json
│   └── server.js                 # Express server entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Modal.jsx         # Accessible dialog component
│   │   │   ├── Navbar.jsx        # Top header with instant re-seed button
│   │   │   ├── SeatGrid.jsx      # Interactive visual 2D hall grid
│   │   │   ├── Sidebar.jsx       # Navigation drawer with portal links
│   │   │   └── StatCard.jsx      # Dashboard metric card
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Global authentication state
│   │   ├── layouts/
│   │   │   ├── AdminLayout.jsx   # Protected admin shell
│   │   │   └── MainLayout.jsx    # Public/student/faculty shell
│   │   ├── pages/
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── StudentManagement.jsx
│   │   │   ├── ExamManagement.jsx
│   │   │   ├── HallManagement.jsx
│   │   │   ├── FacultyManagement.jsx
│   │   │   ├── SeatingArrangement.jsx
│   │   │   ├── InvigilationManagement.jsx
│   │   │   ├── ReportsPage.jsx
│   │   │   ├── StudentSeatFinder.jsx
│   │   │   ├── FacultyDashboard.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── services/
│   │   │   └── api.js            # Axios client with interceptors
│   │   ├── App.jsx               # Route declarations
│   │   ├── index.css             # Design tokens & print styles
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 4. Installation & Setup Instructions

### Prerequisites
- **Node.js**: v18.x or v22.x installed (`node -v`)
- **npm**: v9.x or v10.x installed (`npm -v`)
- **MongoDB**: Local MongoDB instance running on port `27017`

### Step 1: Clone or Open Directory
Navigate to the project directory:
```bash
cd exam-seating-system
```

### Step 2: Backend Setup
```bash
cd backend
npm install
```

Configure `backend/.env` (pre-created with optimal defaults):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/exam_seating_system
JWT_SECRET=supersecretjwtkey_exam_seating_system_2026
NODE_ENV=development
```

Initialize the database with sample students, exams, halls, faculty, and users:
```bash
npm run seed
```

Run the backend server:
```bash
npm start
# or for auto-reload during development:
npm run dev
```
The backend API starts on `http://localhost:5000`.

### Step 3: Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
The React frontend starts on `http://localhost:3000`.

---

## 5. Demo Login Credentials

The application provides quick-fill demo buttons on the login screen for instant access:

| Role | Email / Identifier | Password | Access Rights & Landing Page |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@exam.edu` | `admin123` | Full admin control (`/admin/dashboard`) |
| **Faculty** | `faculty@exam.edu` (or `FAC101`) | `faculty123` | Personal invigilation duties (`/faculty/dashboard`) |
| **Student** | `student@exam.edu` (or `23IT001`) | `student123` | Student seat locator (`/student/seat-finder`) |

---

## 6. How to Test the Complete End-to-End Workflow

Follow this demonstration flow to experience all features:

1. **Login as Admin**:
   - Navigate to `http://localhost:3000/login`.
   - Click **"Admin Demo"** and click **Sign In**.
2. **Review Real-time Dashboard**:
   - Inspect the summary cards (*Total Students: 28, Total Exams: 5, Total Halls: 3, Total Faculty: 6*).
   - Check the **Upcoming Examinations** table and **Recent Activity Feed**.
3. **Data Management**:
   - Navigate to **Students** to add, edit, search, or filter students by department and year.
   - Navigate to **Halls** to inspect grid dimensions (e.g. 5 Rows × 6 Columns = 30 Capacity).
   - Navigate to **Faculty** to view faculty records or toggle invigilation availability.
4. **Generate Automatic Seating Arrangement**:
   - Navigate to **Seating Plan** (`/admin/seating`).
   - Select **"Engineering Mathematics III (Common)"** from the exam dropdown.
   - Check available halls (e.g., Hall **A101** and Hall **B201**).
   - Click **"Generate Seating Plan"**.
   - Notice the visual hall layout:
     - Board / Screen banner at the front of the hall.
     - Row letters ($A, B, C\dots$) and seat numbers ($A1, A2, A3\dots$).
     - Alternating department colors (e.g., Seat A1: IT, Seat A2: CSE, Seat A3: ECE, Seat A4: MECH).
     - Click any seat to view the student's full registration details modal.
5. **Test Conflict Detection**:
   - Try selecting **"Computer Networks (Conflict Test)"** which is scheduled at the exact same date and time (`2026-10-05 10:00 - 13:00`).
   - Select Hall **A101** and click **Generate Seating Plan**.
   - Notice the error alert: `"Hall A101 is already occupied during this examination time by 'Data Structures and Algorithms'"`.
6. **Assign Invigilators**:
   - Navigate to **Invigilation** (`/admin/invigilation`).
   - Select an exam and click **"Assign Invigilators"**.
   - The system checks available non-conflicting faculty and assigns exactly one professor per hall.
7. **Verify Student Seat Finder**:
   - Open **Seat Finder** (`/student/seat-finder`) from the sidebar or top navigation.
   - Enter student register number `23IT001` and click **Find My Seat**.
   - The student sees their exam subject, date, time, assigned Hall, and Seat Number.
   - Below the details, the visual hall grid is rendered with their specific seat desk highlighted in **Green with a pulsing ring**.
8. **Verify Faculty Duty Schedule**:
   - Sign in as Faculty (`faculty@exam.edu` / `faculty123`) or navigate to `/faculty/dashboard`.
   - The faculty member sees their assigned invigilation duties, date, session time, hall, and venue.
9. **Printable Master Reports**:
   - Navigate to **Reports** (`/admin/reports`).
   - Switch between **Seating Plan Report** and **Invigilation Duty Report**.
   - Click **"Print / Save as PDF"** to preview clean, official university exam roster layouts.

---

## 7. REST API Reference Overview

### Authentication
- `POST /api/auth/login` - Authenticate user & return JWT token
- `POST /api/auth/register` - Create user account
- `GET /api/auth/me` - Get authenticated user profile

### Students
- `GET /api/students` - Query students with search & department/year filters
- `POST /api/students` - Add single student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student & clean up seating
- `POST /api/students/bulk` - Batch upload students (JSON/CSV)

### Exams
- `GET /api/exams` - List exams with seated count & invigilator count
- `POST /api/exams` - Schedule new exam (checks duplicate & time validity)
- `PUT /api/exams/:id` - Update exam details
- `DELETE /api/exams/:id` - Delete exam & associated records

### Halls
- `GET /api/halls` - List halls with availability filter
- `POST /api/halls` - Create hall (calculates capacity from rows × columns)
- `PUT /api/halls/:id` - Update hall
- `DELETE /api/halls/:id` - Delete hall

### Faculty
- `GET /api/faculty` - List faculty directory
- `POST /api/faculty` - Add faculty member
- `PUT /api/faculty/:id` - Update faculty or toggle availability
- `DELETE /api/faculty/:id` - Delete faculty

### Seating Engine
- `POST /api/seating/generate` - Run automated seating allocation with interleaving
- `GET /api/seating/:examId` - Get seating plan for exam grouped by hall
- `GET /api/seating/student/:registerNumber` - Lookup seat by student register number
- `DELETE /api/seating/:examId` - Clear seating plan for exam

### Invigilation Engine
- `POST /api/invigilation/assign` - Run automated conflict-free faculty assignment
- `GET /api/invigilation` - List all duties (filter by exam, date, faculty)
- `GET /api/invigilation/my-duties` - Get current faculty's assigned duties
- `DELETE /api/invigilation/:id` - Unassign duty

### Dashboard & Utilities
- `GET /api/dashboard/stats` - Fetch live metrics from MongoDB
- `POST /api/seed` - Instant database reset with realistic demo data
