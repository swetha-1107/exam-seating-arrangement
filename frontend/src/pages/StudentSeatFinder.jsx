import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  CalendarDays,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Building,
  CheckCircle2,
} from 'lucide-react';
import api from '../services/api';
import SeatGrid from '../components/SeatGrid';
import { useAuth } from '../context/AuthContext';

const StudentSeatFinder = () => {
  const { user } = useAuth();
  const [registerNumber, setRegisterNumber] = useState('');
  const [seatResult, setSeatResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If student is logged in and has referenceId, auto-query their seat!
  useEffect(() => {
    if (user?.role === 'student' && user.referenceId) {
      setRegisterNumber(user.referenceId);
      lookupSeat(user.referenceId);
    }
  }, [user]);

  const lookupSeat = async (regNoToSearch) => {
    const cleanRegNo = (regNoToSearch || registerNumber).trim().toUpperCase();
    if (!cleanRegNo) {
      setError('Please enter your student register number (e.g., 23IT001).');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/seating/student/${cleanRegNo}`);
      setSeatResult(res.data);
    } catch (err) {
      setSeatResult(null);
      setError(err.message || `No examination seat assignment found for '${cleanRegNo}'.`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    lookupSeat();
  };

  const activeAssignment = seatResult?.activeAssignment;
  const student = seatResult?.student;
  const hallLayout = seatResult?.hallLayout;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em' }}>
          Examination Seat Finder
        </h1>
        <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.5rem' }}>
          Instantly check your assigned examination hall, desk number, and view your seat location.
        </p>
      </div>

      {/* Search Box */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.06)',
          border: '1px solid #e2e8f0',
          marginBottom: '2rem',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
            <Search
              size={20}
              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Enter Student Register Number (e.g. 23IT001, 23CSE002)..."
              value={registerNumber}
              onChange={(e) => setRegisterNumber(e.target.value)}
              style={{
                width: '100%',
                padding: '0.85rem 1rem 0.85rem 3rem',
                fontSize: '1.05rem',
                fontWeight: 600,
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                outline: 'none',
                textTransform: 'uppercase',
                fontFamily: 'JetBrains Mono',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ padding: '0.85rem 2rem', fontSize: '1rem', borderRadius: '10px' }}
          >
            {loading ? 'Searching...' : 'Find My Seat'}
          </button>
        </form>

        {/* Demo Fast-Search Pills */}
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#64748b' }}>
          <span>Try sample register numbers:</span>
          {['23IT001', '23CSE001', '23ECE001', '23MECH001'].map((reg) => (
            <button
              key={reg}
              type="button"
              onClick={() => {
                setRegisterNumber(reg);
                lookupSeat(reg);
              }}
              style={{
                border: '1px solid #cbd5e1',
                background: '#f8fafc',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'JetBrains Mono',
              }}
            >
              {reg}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Seat Allocation Result Details Card */}
      {seatResult && activeAssignment && (
        <div>
          <div
            style={{
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#ffffff',
              borderRadius: '16px',
              padding: '2rem',
              boxShadow: '0 12px 28px -6px rgba(37, 99, 235, 0.4)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd' }}>
                  Student Information
                </span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.2rem 0' }}>
                  {student?.name}
                </h2>
                <p style={{ color: '#dbeafe', fontFamily: 'JetBrains Mono', fontSize: '0.95rem' }}>
                  Register Number: <strong>{student?.registerNumber}</strong> • Dept: <strong>{student?.department}</strong> (Year {student?.year})
                </p>
              </div>

              {/* Big Highlighted Seat Badge */}
              <div
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(8px)',
                  padding: '1rem 1.75rem',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#dbeafe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  YOUR SEAT
                </div>
                <div style={{ fontSize: '2.4rem', fontWeight: 900, fontFamily: 'JetBrains Mono', lineHeight: 1.1 }}>
                  {activeAssignment.seatNumber}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#93c5fd' }}>
                  Hall {activeAssignment.hall?.hallNumber}
                </div>
              </div>
            </div>

            {/* Exam Session Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase' }}>Examination Subject</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
                  {activeAssignment.exam?.examName}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase' }}>Exam Date</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CalendarDays size={16} />
                  <span>{activeAssignment.exam?.examDate}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase' }}>Session Time</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={16} />
                  <span style={{ fontFamily: 'JetBrains Mono' }}>
                    {activeAssignment.exam?.startTime} - {activeAssignment.exam?.endTime}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase' }}>Hall & Building</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building size={16} />
                  <span>
                    Hall {activeAssignment.hall?.hallNumber} ({activeAssignment.hall?.building}, Floor {activeAssignment.hall?.floor})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Seat Representation of the Hall with Student Highlighted */}
          {hallLayout?.hall && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                  Visual Hall Layout & Desk Location
                </h3>
                <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} />
                  Your seat ({activeAssignment.seatNumber}) is highlighted in Green
                </span>
              </div>

              <SeatGrid
                hall={hallLayout.hall}
                seats={hallLayout.occupiedSeats.map((s) => ({
                  row: s.row,
                  column: s.column,
                  seatNumber: s.seatNumber,
                  student: {
                    name: s.isCurrentStudent ? student.name : 'Candidate',
                    registerNumber: s.registerNumber,
                    department: s.department,
                  },
                }))}
                highlightRegisterNumber={student?.registerNumber}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentSeatFinder;
