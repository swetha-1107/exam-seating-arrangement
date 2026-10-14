import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  User,
  GraduationCap,
  Sparkles,
  AlertCircle,
  Building,
  CheckCircle2,
  BookOpen,
  MapPin,
  ClipboardList,
  Calendar,
  Grid3X3,
  UserCircle,
  Mail,
  Phone,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import api from '../services/api';
import SeatGrid from '../components/SeatGrid';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'my-exams', 'timetable', 'seating-plan', 'profile'
  const [seatingData, setSeatingData] = useState(null);
  const [registrationsData, setRegistrationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudentInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const [seatingRes, regRes] = await Promise.allSettled([
        api.get('/seating/my-seating'),
        api.get('/exams/my-exams'),
      ]);

      if (seatingRes.status === 'fulfilled') {
        console.log('[StudentDashboard] Raw seating API response:', seatingRes.value.data);
        setSeatingData(seatingRes.value.data);
      } else {
        console.warn('Seating fetch note:', seatingRes.reason?.message);
      }

      if (regRes.status === 'fulfilled') {
        setRegistrationsData(regRes.value.data?.exams || []);
      } else {
        console.warn('Exams fetch note:', regRes.reason?.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to load student examination records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentInfo();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#1b365d', fontWeight: 600 }}>Loading your personal examination portal...</p>
      </div>
    );
  }

  const student = seatingData?.student || user;
  const activeAssignment = seatingData?.activeAssignment;
  const allAssignments = seatingData?.allAssignments || [];
  const hallLayout = seatingData?.hallLayout;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Institutional Banner Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ color: '#1b365d' }}>Student Examination Portal</h1>
          <p>Easwari Engineering College • Office of Controller of Examinations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> Registered Candidate
          </span>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.25rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0.5rem',
        }}
      >
        <button
          className={`btn ${activeTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dashboard')}
          style={{ fontSize: '0.85rem' }}
        >
          <Sparkles size={15} />
          <span>Dashboard</span>
        </button>

        <button
          className={`btn ${activeTab === 'my-exams' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('my-exams')}
          style={{ fontSize: '0.85rem' }}
        >
          <BookOpen size={15} />
          <span>My Examinations ({registrationsData.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'timetable' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('timetable')}
          style={{ fontSize: '0.85rem' }}
        >
          <CalendarDays size={15} />
          <span>My Timetable</span>
        </button>

        <button
          className={`btn ${activeTab === 'seating-plan' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('seating-plan')}
          style={{ fontSize: '0.85rem' }}
        >
          <Grid3X3 size={15} />
          <span>My Seating Plan</span>
        </button>

        <button
          className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('profile')}
          style={{ fontSize: '0.85rem' }}
        >
          <UserCircle size={15} />
          <span>My Profile</span>
        </button>
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Quick Info Hero Card */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              padding: '1.5rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '12px',
                  background: '#1b365d',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  fontWeight: 800,
                }}
              >
                {student?.name ? student.name.charAt(0) : 'S'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {student?.name || user?.name}
                </h2>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>Reg No: <strong style={{ fontFamily: 'JetBrains Mono', color: '#1b365d' }}>{student?.registerNumber || user?.referenceId}</strong></span>
                  <span>•</span>
                  <span>Department: <strong>{student?.department}</strong></span>
                  <span>•</span>
                  <span>Year {student?.year || 3}, Section {student?.section || 'A'}</span>
                </div>
              </div>
            </div>

            <span className="badge badge-blue">Anna University Candidate</span>
          </div>

          {/* Active Seating Allotment Card (If Available) */}
          {activeAssignment ? (
            <div
              style={{
                background: '#1b365d',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '1.75rem',
                boxShadow: '0 8px 20px -4px rgba(27, 54, 93, 0.35)',
                marginBottom: '1.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#93c5fd', fontWeight: 700 }}>
                    Upcoming Examination Hall Allotment
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
                    {activeAssignment.exam?.examName}
                  </h2>
                  <p style={{ color: '#dbeafe', fontFamily: 'JetBrains Mono', fontSize: '0.9rem' }}>
                    Code: <strong>{activeAssignment.exam?.examCode || 'EXAM'}</strong> • Semester {activeAssignment.exam?.semester}
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '0.85rem 1.5rem',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#dbeafe', textTransform: 'uppercase', fontWeight: 700 }}>
                    ASSIGNED SEAT
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, fontFamily: 'JetBrains Mono', lineHeight: 1.1 }}>
                    {activeAssignment.seatNumber}
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd' }}>
                    Hall {activeAssignment.hall?.hallCode || activeAssignment.hall?.hallNumber}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Exam Date</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarDays size={15} />
                    <span>{activeAssignment.exam?.examDate}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Session & Time</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} />
                    <span style={{ fontFamily: 'JetBrains Mono' }}>
                      {activeAssignment.exam?.startTime} - {activeAssignment.exam?.endTime}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Venue Location</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={15} />
                    <span>
                      Hall {activeAssignment.hall?.hallCode || activeAssignment.hall?.hallNumber} ({activeAssignment.hall?.block || activeAssignment.hall?.building} Block, {activeAssignment.hall?.floor} Floor)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <Clock size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                Seating Arrangement In Progress
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
                The automated seating allocation for your registered courses will appear here once finalized by the Controller of Examinations.
              </p>
            </div>
          )}

          {/* Quick Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="metric-card" onClick={() => setActiveTab('my-exams')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#ebf8ff', color: '#1b365d' }}>
                <BookOpen size={20} />
              </div>
              <div>
                <div className="metric-label">Registered Papers</div>
                <div className="metric-value">{registrationsData.length}</div>
                <div className="metric-hint">Click to view all subjects</div>
              </div>
            </div>

            <div className="metric-card" onClick={() => setActiveTab('timetable')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
                <CalendarDays size={20} />
              </div>
              <div>
                <div className="metric-label">Upcoming Schedule</div>
                <div className="metric-value">{allAssignments.length || registrationsData.length}</div>
                <div className="metric-hint">Check exam timings</div>
              </div>
            </div>

            <div className="metric-card" onClick={() => setActiveTab('seating-plan')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Grid3X3 size={20} />
              </div>
              <div>
                <div className="metric-label">Assigned Desks</div>
                <div className="metric-value" style={{ color: '#16a34a' }}>{allAssignments.length}</div>
                <div className="metric-hint">View visual desk layout</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY EXAMINATIONS */}
      {activeTab === 'my-exams' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">My Registered Examination Courses</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Course registrations confirmed for the current end-semester examination session.
              </p>
            </div>
            <span className="badge badge-purple">{registrationsData.length} Subjects Registered</span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Semester</th>
                  <th>Exam Date</th>
                  <th>Session</th>
                  <th>Timing</th>
                  <th>Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {registrationsData.length > 0 ? (
                  registrationsData.map((reg) => (
                    <tr key={reg._id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {reg.subjectId?.subjectCode || reg.examId?.examCode || 'EXAM'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {reg.subjectId?.subjectName || reg.examId?.examName}
                      </td>
                      <td>
                        <span className="badge badge-blue">Sem {reg.subjectId?.semester || reg.examId?.semester || '-'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <CalendarDays size={13} color="#64748b" />
                          <span>{reg.examId?.examDate || 'TBD'}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-purple">
                          {reg.examId?.session || 'FN'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                        {reg.examId?.startTime} - {reg.examId?.endTime}
                      </td>
                      <td>
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Eligible
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">
                        <BookOpen size={40} />
                        <h3>No Registered Examinations Found</h3>
                        <p>You have not been enrolled in any examinations for this semester yet.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: MY TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">My Personal Examination Timetable</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Chronological schedule for your upcoming semester examinations.
              </p>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Date</th>
                  <th>Session</th>
                  <th>Timing</th>
                  <th>Course Code</th>
                  <th>Course Name</th>
                  <th>Hall Allocation</th>
                </tr>
              </thead>
              <tbody>
                {registrationsData.length > 0 ? (
                  registrationsData.map((reg) => {
                    const assignment = allAssignments.find((a) => a.exam?._id === reg.examId?._id);
                    return (
                      <tr key={reg._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1b365d' }}>
                            <CalendarDays size={14} color="#1b365d" />
                            <span>{reg.examId?.examDate || 'Scheduled Soon'}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-purple">{reg.examId?.session || 'FN'}</span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          {reg.examId?.startTime ? `${reg.examId.startTime} - ${reg.examId.endTime}` : '10:00 - 13:00'}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#0f172a' }}>
                            {reg.subjectId?.subjectCode || reg.examId?.examCode}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{reg.subjectId?.subjectName || reg.examId?.examName}</td>
                        <td>
                          {assignment ? (
                            <span className="badge badge-emerald" style={{ fontWeight: 700 }}>
                              Hall {assignment.hall?.hallNumber} • Seat {assignment.seatNumber}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Allocation Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      No examination timetable entries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MY SEATING PLAN */}
      {activeTab === 'seating-plan' && (
        <div>
          {activeAssignment ? (
            <>
              {/* Detailed Seat Information Box */}
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.03)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1b365d', margin: 0 }}>
                      Active Hall Allotment: {activeAssignment.exam?.examName}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>
                      Exam Date: <strong>{activeAssignment.exam?.examDate}</strong> • Timing: <strong>{activeAssignment.exam?.startTime} - {activeAssignment.exam?.endTime}</strong>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>ALLOCATED HALL</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1b365d' }}>
                        Hall {activeAssignment.hall?.hallNumber}
                      </div>
                    </div>
                    <div
                      style={{
                        background: '#f0fdf4',
                        border: '2px solid #16a34a',
                        color: '#166534',
                        padding: '0.5rem 1rem',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontFamily: 'JetBrains Mono',
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 700 }}>DESK NO.</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 900 }}>{activeAssignment.seatNumber}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Building:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>{activeAssignment.hall?.building}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Floor:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>Floor {activeAssignment.hall?.floor}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Desk Position:</span>
                    <strong style={{ display: 'block', color: '#0f172a' }}>
                      {(() => {
                        const label = activeAssignment.seatNumber || activeAssignment.seatLabel || '';
                        const str = String(label).trim().toUpperCase();
                        const match = str.match(/^([A-Z]+)(\d+)(?:-([LR]))?$/);
                        if (match) {
                          const rowLetter = match[1];
                          const colNum = match[2];
                          const side = match[3] === 'L' ? 'Left seat' : match[3] === 'R' ? 'Right seat' : '';
                          return `Row ${rowLetter}, Column ${colNum}${side ? ` (${side})` : ''}`;
                        }
                        return `Row ${activeAssignment.benchRow ?? '—'}, Col ${activeAssignment.benchColumn ?? '—'}`;
                      })()}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Visual Seat Matrix */}
              {hallLayout?.hall && (
                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                        Visual Hall Layout — Hall {activeAssignment.hall?.hallCode || activeAssignment.hall?.hallNumber}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                        Privacy notice: In compliance with institutional policies, peer student details are anonymized.
                      </p>
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={16} />
                      Your Desk ({activeAssignment.seatNumber || activeAssignment.seatLabel}) highlighted in Green
                    </span>
                  </div>

                  <SeatGrid
                    hall={hallLayout.hall}
                    seats={hallLayout.occupiedSeats}
                    mySeatLabel={activeAssignment.seatNumber || activeAssignment.seatLabel}
                  />
                </div>
              )}

              {/* All History Table */}
              {allAssignments.length > 1 && (
                <div className="card">
                  <div className="card-header">
                    <h3 className="card-title">All Allocated Exam Desks</h3>
                  </div>
                  <div className="table-responsive">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Exam Date</th>
                          <th>Hall</th>
                          <th>Venue</th>
                          <th>Seat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAssignments.map((a, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 700 }}>{a.exam?.examName}</td>
                            <td>{a.exam?.examDate}</td>
                            <td><span className="badge badge-blue">Hall {a.hall?.hallNumber}</span></td>
                            <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{a.hall?.building}</td>
                            <td><strong style={{ fontFamily: 'JetBrains Mono', color: '#16a34a' }}>{a.seatNumber}</strong></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
              <Grid3X3 size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
              <h3 style={{ fontSize: '1.2rem', color: '#0f172a', marginBottom: '0.5rem' }}>
                No Seating Plan Generated Yet
              </h3>
              <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
                The seating arrangement has not been released yet for your cohort. Check back once the Controller of Examinations publishes the arrangement.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <h3 className="card-title">Institutional Student Candidate Profile</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Verified record from Office of Controller of Examinations
            </span>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Candidate Full Name
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {student?.name || user?.name}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Anna University Register Number
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#1b365d', marginTop: '4px' }}>
                  {student?.registerNumber || user?.referenceId}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Academic Department
                </label>
                <div style={{ marginTop: '4px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.85rem' }}>
                    {student?.department} — Department of {student?.department}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Academic Year & Section
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  Year {student?.year || 3} • Section {student?.section || 'A'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Institutional Email
                </label>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#64748b" />
                  <span>{student?.email || user?.email}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Contact Phone
                </label>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#64748b" />
                  <span>{student?.phone || '+91 98765 43210'}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '2rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <ShieldCheck size={24} color="#16a34a" />
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>
                <strong>Candidate Status: Active & Enrolled.</strong> <br />
                All examination halls and desks are allotted dynamically according to anti-malpractice spacing standards.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
