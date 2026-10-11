import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

const pageTitleMap = {
  '/admin/dashboard': 'Examination Control Center',
  '/admin/departments-subjects': 'Departments & Subjects Master',
  '/admin/students': 'Student Master Directory',
  '/admin/faculty': 'Faculty Directory',
  '/admin/exams': 'Examination Timetable Management',
  '/admin/halls': 'Examination Halls & Venues',
  '/admin/faculty-availability': 'Faculty Availability Monitoring',
  '/admin/seating': 'Automatic Seating Plan Generation',
  '/admin/invigilation': 'Automatic Invigilation Assignment',
  '/admin/reports': 'Official Examination Reports & Master Rosters',
};

const AdminLayout = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#627d98', fontSize: '0.95rem', fontWeight: 600 }}>Loading institutional system...</p>
      </div>
    );
  }

  // If not logged in or not admin, redirect to login
  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const currentTitle = pageTitleMap[location.pathname] || 'Administration Portal';

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar pageTitle={currentTitle} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
