import React, { useState } from 'react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const Navbar = ({ pageTitle = 'Dashboard' }) => {
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const handleResetData = async () => {
    if (!window.confirm('Reset database with fresh Easwari Engineering College sample data?')) {
      return;
    }
    setSeeding(true);
    try {
      await api.post('/seed');
      setSeedSuccess(true);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      alert(`Error reseeding: ${err.message}`);
      setSeeding(false);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-portal-title">
        <h2>{pageTitle}</h2>
        <p>Easwari Engineering College (Autonomous) • Ramapuram, Chennai</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user?.role === 'admin' && (
          <button
            onClick={handleResetData}
            disabled={seeding}
            className="btn btn-secondary btn-sm"
            title="Reloads EEC demo dataset (32 students, 4 exams, 4 halls, 6 faculty)"
          >
            {seedSuccess ? (
              <>
                <CheckCircle2 size={14} color="#027a48" />
                <span style={{ color: '#027a48' }}>Reset Complete</span>
              </>
            ) : (
              <>
                <RefreshCw size={14} className={seeding ? 'animate-spin' : ''} />
                <span>{seeding ? 'Reseeding...' : 'Reset Demo Data'}</span>
              </>
            )}
          </button>
        )}

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
