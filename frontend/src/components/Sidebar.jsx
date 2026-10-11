import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  GraduationCap,
  Building2,
  Grid3X3,
  UserCheck,
  FileBarChart2,
  LogOut,
  UserCircle,
  Briefcase,
  BookOpen,
  ClipboardList,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/departments-subjects', label: 'Departments & Subjects', icon: BookOpen },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/faculty', label: 'Faculty', icon: GraduationCap },
    { to: '/admin/exams', label: 'Exam Schedule', icon: CalendarDays },
    { to: '/admin/halls', label: 'Halls', icon: Building2 },
    { to: '/admin/faculty-availability', label: 'Faculty Availability', icon: Clock },
    { to: '/admin/seating', label: 'Seating Allocation', icon: Grid3X3 },
    { to: '/admin/invigilation', label: 'Invigilation Duties', icon: UserCheck },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart2 },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img
          src="/college_logo.jpg"
          alt="Easwari Engineering College Logo"
          className="sidebar-logo-img"
        />
        <div className="sidebar-institution-title">Easwari Engg College</div>
        <div className="sidebar-sub-title">Office of Controller of Examinations</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-title">Examination Administration</div>
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        <div className="nav-section-title">Portal Views</div>
        <NavLink to="/faculty/dashboard" className="nav-item">
          <Briefcase size={16} />
          <span>Faculty Portal</span>
        </NavLink>
        <NavLink to="/student/dashboard" className="nav-item">
          <UserCircle size={16} />
          <span>Student Portal</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-badge-container">
          <div className="user-badge-initial">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </div>
          <div className="user-badge-meta">
            <h4>{user?.name || 'Administrator'}</h4>
            <p>{user?.email || 'admin@eec.srmrmp.edu.in'}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{ width: '100%', justifyContent: 'center', borderColor: '#334e68', color: '#d9e2ec', backgroundColor: '#10243e' }}
        >
          <LogOut size={14} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
