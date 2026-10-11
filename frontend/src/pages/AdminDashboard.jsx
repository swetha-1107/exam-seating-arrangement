import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Building2,
  UserCheck,
  CalendarDays,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import api from '../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem' }}>
        <p style={{ color: '#1b365d', fontWeight: 600 }}>Loading Easwari Examination Administration Dashboard...</p>
      </div>
    );
  }

  const counts = stats?.counts || {};
  const nextSlot = stats?.nextSlot || null;
  const upcomingSlots = stats?.upcomingSlots || [];
  const facultyAvailability = stats?.facultyAvailability || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <CheckCircle2 size={12} /> Published
          </span>
        );
      case 'DRAFT':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <Clock size={12} /> Draft
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            <AlertCircle size={12} /> Not Generated
          </span>
        );
    }
  };

  return (
    <div>
      {/* Institutional Header */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Autonomous Examination Cell • Easwari Engineering College
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Examination Administration Dashboard
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Real-time oversight of examination slots, course papers, hall utilization, and seating status.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* Primary Statistics Cards */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <StatCard
          title="Total Students"
          value={counts.totalStudents?.toLocaleString() || '0'}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Academic Programmes"
          value={counts.totalProgrammes || '8'}
          icon={GraduationCap}
          color="purple"
        />
        <StatCard
          title="Examination Halls"
          value={counts.totalHalls || '0'}
          icon={Building2}
          color="emerald"
        />
        <StatCard
          title="Faculty Members"
          value={counts.totalFaculty || '0'}
          icon={UserCheck}
          color="amber"
        />
      </div>

      {/* Next Examination Slot Spotlight */}
      {nextSlot && (
        <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid #1b365d' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#e2e8f0', color: '#334155', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                  NEXT UPCOMING SLOT
                </span>
                {getStatusBadge(nextSlot.seatingStatus)}
              </div>
              <h3 style={{ margin: '0.25rem 0 0.2rem 0', color: '#1b365d', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarDays size={18} color="#1b365d" />
                {nextSlot.date} &nbsp;|&nbsp;
                <Clock size={16} color="#64748b" />
                {nextSlot.startTime} – {nextSlot.endTime}
              </h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                {nextSlot.series?.name || 'Continuous Assessment Test II'} • {nextSlot.notes || 'All Applicable Programmes'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate(`/admin/seating?slotId=${nextSlot._id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <span>Manage Seating</span>
                <ArrowRight size={14} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/admin/reports')}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <FileText size={14} />
                <span>Print Notice</span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', background: '#f8fafc', padding: '0.85rem', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
              Papers Scheduled in this Slot ({nextSlot.papers?.length || 0})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.65rem' }}>
              {nextSlot.papers?.map((paper, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    padding: '0.6rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1b365d' }}>
                      {paper.courseCode} – {paper.courseName}
                    </span>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '0.1rem 0.35rem',
                        borderRadius: '3px',
                        background: paper.type === 'common' ? '#e0f2fe' : paper.type === 'elective' ? '#fef3c7' : '#f1f5f9',
                        color: paper.type === 'common' ? '#0369a1' : paper.type === 'elective' ? '#b45309' : '#475569',
                      }}
                    >
                      {paper.type}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Programmes: <strong style={{ color: '#1b365d' }}>{paper.programmes?.join(', ') || 'All'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Examination Slots Grid & Faculty Availability */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        {/* Examination Slots Schedule */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#1b365d', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CalendarDays size={18} color="#1b365d" />
              Examination Slots Schedule
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/exams')}
            >
              Manage Timetable
            </button>
          </div>

          <div className="table-responsive">
            <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Slot / Date</th>
                  <th>Session Time</th>
                  <th>Papers Scheduled</th>
                  <th>Seating Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSlots.map((slot) => (
                  <tr key={slot._id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1b365d' }}>{slot.date}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{slot.notes || slot.series?.code}</div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                        {slot.startTime} – {slot.endTime}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#1b365d', fontSize: '0.8rem', marginBottom: '2px' }}>
                        {slot.papersCount} paper(s):
                      </div>
                      {slot.papers && slot.papers.length > 0 ? (
                        <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                          {slot.papers.map((p, pIdx) => (
                            <div key={pIdx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                              • <strong>{p.courseCode}</strong> – {p.courseName}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="badge badge-secondary" style={{ fontSize: '0.72rem' }}>No papers</span>
                      )}
                    </td>
                    <td>{getStatusBadge(slot.seatingStatus)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate(`/admin/seating?slotId=${slot._id}`)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                      >
                        Seating
                      </button>
                    </td>
                  </tr>
                ))}
                {upcomingSlots.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b' }}>
                      No examination slots found. Add slots via Timetable.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Real Faculty Availability Widget */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: '#1b365d', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <UserCheck size={18} color="#1b365d" />
              Faculty Availability
            </h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/admin/invigilation')}
            >
              Invigilation
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '420px', overflowY: 'auto' }}>
            {facultyAvailability.map((f) => (
              <div
                key={f._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.5rem 0.65rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  background: f.badgeType === 'unavailable' ? '#fef2f2' : '#ffffff',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1b365d' }}>
                    {f.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                    {f.department} • {f.facultyId}
                  </div>
                </div>
                <div>
                  {f.badgeType === 'unavailable' ? (
                    <span className="badge badge-danger" style={{ fontSize: '0.72rem' }}>
                      Not Available
                    </span>
                  ) : f.badgeType === 'assigned' ? (
                    <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                      Assigned ({f.assignedDuties})
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>
                      Available
                    </span>
                  )}
                </div>
              </div>
            ))}
            {facultyAvailability.length === 0 && (
              <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                No active faculty records found.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
