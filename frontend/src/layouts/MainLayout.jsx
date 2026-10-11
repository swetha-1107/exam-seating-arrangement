import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, UserCheck, Grid3X3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f6f9' }}>
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '2px solid #7a1c1d',
          padding: '0.65rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(16, 42, 67, 0.06)',
        }}
      >
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <img
            src="/college_logo.jpg"
            alt="Easwari Engineering College Logo"
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#102a43', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              Easwari Engineering College
            </h2>
            <span style={{ fontSize: '0.72rem', color: '#627d98', fontWeight: 500 }}>
              Autonomous Institution • Office of Controller of Examinations
            </span>
          </div>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user?.role === 'admin' && (
            <Link to="/admin/dashboard" className="btn btn-primary btn-sm">
              <LayoutDashboard size={14} />
              <span>Admin Panel</span>
            </Link>
          )}

          {user?.role === 'faculty' && (
            <Link to="/faculty/dashboard" className="btn btn-secondary btn-sm">
              <UserCheck size={14} />
              <span>Faculty Portal</span>
            </Link>
          )}

          {user?.role === 'student' && (
            <Link to="/student/dashboard" className="btn btn-secondary btn-sm">
              <Grid3X3 size={14} />
              <span>My Examination Seat</span>
            </Link>
          )}

          {user ? (
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.8rem' }}
            >
              <LogOut size={14} />
              <span>Sign Out ({user.name ? user.name.split(' ')[0] : 'User'})</span>
            </button>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      <footer
        style={{
          textAlign: 'center',
          padding: '1.25rem',
          fontSize: '0.75rem',
          color: '#627d98',
          borderTop: '1px solid #d9e2ec',
          backgroundColor: '#ffffff',
        }}
      >
        <strong>Easwari Engineering College (Autonomous)</strong> — Affiliated to Anna University, Chennai. <br />
        Bharathi Salai, Ramapuram, Chennai – 600 089 | Examination Seating & Invigilation Management Portal &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

export default MainLayout;
