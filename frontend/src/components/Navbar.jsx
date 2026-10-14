import React from 'react';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ pageTitle = 'Dashboard' }) => {
  const { user } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-portal-title">
        <h2>{pageTitle}</h2>
        <p>Easwari Engineering College (Autonomous) • Ramapuram, Chennai</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
          <span style={{ color: '#627d98' }}>Role:</span>
          <span className={`badge ${user?.role === 'admin' ? 'badge-navy' : user?.role === 'faculty' ? 'badge-assigned' : 'badge-available'}`}>
            {user?.role?.toUpperCase() || 'GUEST'}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
