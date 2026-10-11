import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import MainLayout from './layouts/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DepartmentSubjectManagement from './pages/DepartmentSubjectManagement';
import StudentManagement from './pages/StudentManagement';
import FacultyManagement from './pages/FacultyManagement';
import ExamManagement from './pages/ExamManagement';
import HallManagement from './pages/HallManagement';
import FacultyAvailabilityManagement from './pages/FacultyAvailabilityManagement';
import SeatingArrangement from './pages/SeatingArrangement';
import InvigilationManagement from './pages/InvigilationManagement';
import ReportsPage from './pages/ReportsPage';
import FacultyDashboard from './pages/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard';

// Root redirect handler based on authentication state and user role
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#1b365d', fontWeight: 600 }}>Connecting to Easwari Examination Portal...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user.role === 'faculty') {
    return <Navigate to="/faculty/dashboard" replace />;
  }

  return <Navigate to="/student/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Student & Faculty Institutional Portals */}
          <Route element={<MainLayout />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/seat-finder" element={<Navigate to="/student/dashboard" replace />} />
            <Route path="/faculty/dashboard" element={<FacultyDashboard />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="departments-subjects" element={<DepartmentSubjectManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="faculty" element={<FacultyManagement />} />
            <Route path="exams" element={<ExamManagement />} />
            <Route path="halls" element={<HallManagement />} />
            <Route path="faculty-availability" element={<FacultyAvailabilityManagement />} />
            <Route path="seating" element={<SeatingArrangement />} />
            <Route path="invigilation" element={<InvigilationManagement />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
