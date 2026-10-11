import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  CalendarDays,
  Clock,
  MapPin,
  Building,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  CalendarCheck,
  XCircle,
  Sparkles,
  UserCircle,
  Mail,
  Phone,
  ShieldCheck,
  Info,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const FacultyDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'availability', 'duties', 'profile'
  const [facultyData, setFacultyData] = useState(null);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form to declare availability
  const [slotDate, setSlotDate] = useState('2026-10-15');
  const [session, setSession] = useState('FN'); // 'FN' or 'AN'
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('13:00');
  const [status, setStatus] = useState('Available');
  const [notes, setNotes] = useState('');
  const [submittingSlot, setSubmittingSlot] = useState(false);

  // Sync times when session changes
  const handleSessionChange = (newSession) => {
    setSession(newSession);
    if (newSession === 'FN') {
      setStartTime('10:00');
      setEndTime('13:00');
    } else {
      setStartTime('14:00');
      setEndTime('17:00');
    }
  };

  const fetchDutiesAndAvailability = async () => {
    try {
      setLoading(true);
      setError('');
      const [dutiesRes, availRes] = await Promise.all([
        api.get('/invigilation/my-duties'),
        api.get('/faculty/availability/me'),
      ]);
      setFacultyData(dutiesRes.data);
      setAvailabilityList(availRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load faculty portal data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDutiesAndAvailability();
  }, []);

  const handleAddAvailabilitySlot = async (e) => {
    e.preventDefault();
    try {
      setSubmittingSlot(true);
      setError('');
      await api.post('/faculty/availability', {
        date: slotDate,
        startTime,
        endTime,
        status,
        notes,
      });
      setSuccess(`Availability slot for ${slotDate} (${session}) saved as ${status}.`);
      const availRes = await api.get('/faculty/availability/me');
      setAvailabilityList(availRes.data);
      setNotes('');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update availability slot');
    } finally {
      setSubmittingSlot(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await api.delete(`/faculty/availability/${id}`);
      setSuccess('Availability slot removed.');
      const availRes = await api.get('/faculty/availability/me');
      setAvailabilityList(availRes.data);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to remove slot');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#1b365d', fontWeight: 600 }}>Loading faculty invigilation portal...</p>
      </div>
    );
  }

  const faculty = facultyData?.faculty || user;
  const duties = facultyData?.duties || [];
  const totalDuties = facultyData?.totalDuties || 0;
  const nextDuty = duties.length > 0 ? duties[0] : null;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Institutional Banner Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ color: '#1b365d' }}>Faculty Invigilation Portal</h1>
          <p>Easwari Engineering College • Office of Controller of Examinations</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-purple" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <ShieldCheck size={14} /> Official Invigilator
          </span>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

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
          className={`btn ${activeTab === 'availability' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('availability')}
          style={{ fontSize: '0.85rem' }}
        >
          <CalendarCheck size={15} />
          <span>My Availability ({availabilityList.length})</span>
        </button>

        <button
          className={`btn ${activeTab === 'duties' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('duties')}
          style={{ fontSize: '0.85rem' }}
        >
          <Briefcase size={15} />
          <span>My Invigilation Duties ({totalDuties})</span>
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
          {/* Faculty Profile Card */}
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
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '12px',
                  background: '#1b365d',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 800,
                }}
              >
                {faculty?.name ? faculty.name.charAt(0) : 'F'}
              </div>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                  {faculty?.name || user?.name}
                </h2>
                <div style={{ display: 'flex', gap: '0.85rem', marginTop: '0.2rem', fontSize: '0.85rem', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>
                    Faculty ID: <strong style={{ fontFamily: 'JetBrains Mono', color: '#1b365d' }}>{faculty?.facultyId || user?.referenceId}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Department: <strong>{faculty?.department || 'IT'}</strong>
                  </span>
                  <span>•</span>
                  <span>{faculty?.email || user?.email}</span>
                </div>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Supervision Duties
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1b365d' }}>
                {totalDuties}
              </div>
            </div>
          </div>

          {/* Next Upcoming Duty Hero Card */}
          {nextDuty ? (
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
                    Upcoming Invigilation Session
                  </span>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>
                    Hall {nextDuty.hallId?.hallNumber} Supervision
                  </h2>
                  <p style={{ color: '#dbeafe', fontSize: '0.9rem' }}>
                    Paper: <strong>{nextDuty.examId?.examName}</strong> ({nextDuty.examId?.examCode})
                  </p>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    padding: '0.75rem 1.25rem',
                    borderRadius: '10px',
                    textAlign: 'center',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', color: '#dbeafe', textTransform: 'uppercase', fontWeight: 700 }}>
                    ASSIGNED HALL
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'JetBrains Mono', lineHeight: 1.1 }}>
                    {nextDuty.hallId?.hallNumber}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd' }}>
                    {nextDuty.hallId?.building}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Exam Date</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CalendarDays size={15} />
                    <span>{nextDuty.examId?.examDate}</span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Session & Timing</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={15} />
                    <span style={{ fontFamily: 'JetBrains Mono' }}>
                      {nextDuty.examId?.startTime} - {nextDuty.examId?.endTime}
                    </span>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Venue Location</span>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building size={15} />
                    <span>
                      {nextDuty.hallId?.building}, Floor {nextDuty.hallId?.floor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <UserCheck size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.35rem' }}>
                No Invigilation Duties Assigned Yet
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto' }}>
                The automated invigilator allocation system assigns halls dynamically based on your declared availability.
              </p>
            </div>
          )}

          {/* Action Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div className="metric-card" onClick={() => setActiveTab('availability')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#ebf8ff', color: '#1b365d' }}>
                <CalendarCheck size={20} />
              </div>
              <div>
                <div className="metric-label">Declared Slots</div>
                <div className="metric-value">{availabilityList.length}</div>
                <div className="metric-hint">Declare / update availability</div>
              </div>
            </div>

            <div className="metric-card" onClick={() => setActiveTab('duties')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                <Briefcase size={20} />
              </div>
              <div>
                <div className="metric-label">Invigilation Duties</div>
                <div className="metric-value" style={{ color: '#16a34a' }}>{totalDuties}</div>
                <div className="metric-hint">View all hall assignments</div>
              </div>
            </div>

            <div className="metric-card" onClick={() => setActiveTab('profile')} style={{ cursor: 'pointer' }}>
              <div className="metric-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
                <UserCircle size={20} />
              </div>
              <div>
                <div className="metric-label">Faculty Profile</div>
                <div className="metric-value" style={{ fontSize: '1.2rem', color: '#7c3aed' }}>{faculty?.department}</div>
                <div className="metric-hint">View contact and credentials</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MY AVAILABILITY */}
      {activeTab === 'availability' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header">
              <div>
                <h3 className="card-title">Declare Date & Session Availability</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                  Mark your availability for upcoming examination dates. The automated invigilation allocation algorithm strictly excludes faculty marked "Not Available".
                </p>
              </div>
            </div>

            <div style={{ padding: '1.5rem' }}>
              <form onSubmit={handleAddAvailabilitySlot} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Examination Date *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Session *</label>
                    <select
                      className="form-control"
                      value={session}
                      onChange={(e) => handleSessionChange(e.target.value)}
                    >
                      <option value="FN">FN — Forenoon (10:00 - 13:00)</option>
                      <option value="AN">AN — Afternoon (14:00 - 17:00)</option>
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>My Status *</label>
                    <select
                      className="form-control"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="Available">🟢 Available for Duty</option>
                      <option value="Not Available">🔴 Not Available (Exclude Me)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Reason / Notes (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Academic conference, official leave, PhD review..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingSlot}
                    className="btn btn-primary"
                    style={{ height: '38px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={16} />
                    <span>{submittingSlot ? 'Saving...' : 'Save Availability Slot'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* List of active declared slots */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Registered Availability Declarations</h3>
              <span className="badge badge-purple">{availabilityList.length} Registered Slots</span>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Time Slot</th>
                    <th>Status</th>
                    <th>Notes</th>
                    <th>Conflict Allocation Impact</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {availabilityList.length > 0 ? (
                    availabilityList.map((slot) => (
                      <tr key={slot._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                            <CalendarDays size={14} color="#64748b" />
                            <span>{slot.date}</span>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          {slot.startTime} - {slot.endTime}
                        </td>
                        <td>
                          <span className={`badge ${slot.status === 'Available' ? 'badge-emerald' : 'badge-rose'}`}>
                            {slot.status === 'Available' ? '🟢 Available' : '🔴 Not Available'}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {slot.notes || '-'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {slot.status === 'Not Available' ? (
                            <span style={{ color: '#b91c1c', fontWeight: 700 }}>
                              Strictly excluded from auto-assignment
                            </span>
                          ) : (
                            <span style={{ color: '#047857', fontWeight: 600 }}>
                              Eligible for auto-assignment
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDeleteSlot(slot._id)}
                            className="btn btn-danger-outline btn-sm"
                            title="Remove slot"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        No specific slot declarations. By default, you are treated as available for duties.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY INVIGILATION DUTIES */}
      {activeTab === 'duties' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h3 className="card-title">Assigned Invigilation Duty Roster</h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>
                Official invigilation duties assigned by the Controller of Examinations.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.8rem' }}>
              <Info size={14} />
              <span>Duties are finalized by the CoE and cannot be reassigned directly.</span>
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Exam Date</th>
                  <th>Session</th>
                  <th>Time Slot</th>
                  <th>Course Code</th>
                  <th>Course Title</th>
                  <th>Assigned Hall</th>
                  <th>Hall Location</th>
                </tr>
              </thead>
              <tbody>
                {duties.length > 0 ? (
                  duties.map((duty) => {
                    const hall = duty.hall || duty.hallId;
                    const exam = duty.examId || duty.slot;
                    return (
                      <tr key={duty._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#1b365d' }}>
                            <CalendarDays size={14} color="#1b365d" />
                            <span>{duty.examDate || exam?.date || exam?.examDate}</span>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-purple">{exam?.session || 'FN'}</span>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          {duty.startTime || exam?.startTime} - {duty.endTime || exam?.endTime}
                        </td>
                        <td>
                          <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#0f172a' }}>
                            {exam?.examCode || exam?.notes || 'EXAM'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{exam?.examName || exam?.notes || 'Examination Duty'}</td>
                        <td>
                          <span className="badge badge-blue" style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                            Hall {hall?.hallCode || hall?.hallNumber}
                          </span>
                        </td>
                        <td style={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {hall?.block ? `${hall.block} Block` : hall?.building} (Floor {hall?.floor})
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7">
                      <div className="empty-state">
                        <Briefcase size={40} />
                        <h3>No Invigilation Duties Assigned</h3>
                        <p>You have no pending invigilation duties assigned at this time.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MY PROFILE */}
      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="card-header">
            <h3 className="card-title">Faculty Invigilator Institutional Profile</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Official record maintained in Department & Exam Cell Directory
            </span>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Faculty Name
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {faculty?.name || user?.name}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Institutional Faculty ID
                </label>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: '#1b365d', marginTop: '4px' }}>
                  {faculty?.facultyId || user?.referenceId}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Department
                </label>
                <div style={{ marginTop: '4px' }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.85rem' }}>
                    {faculty?.department} — Department of {faculty?.department}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Designation / Role
                </label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>
                  Assistant Professor / Invigilator
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Official Email
                </label>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} color="#64748b" />
                  <span>{faculty?.email || user?.email}</span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                  Contact Phone
                </label>
                <div style={{ fontSize: '0.95rem', color: '#0f172a', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="#64748b" />
                  <span>{faculty?.phone || '+91 98765 43210'}</span>
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
                <strong>Invigilator Duty Status: Active.</strong> <br />
                Your availability slots are synchronized directly with the Examination Cell automated invigilation allocation engine.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyDashboard;
