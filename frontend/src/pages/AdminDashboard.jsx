import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  CalendarDays,
  Building2,
  GraduationCap,
  Clock,
  CheckCircle,
  UserPlus,
  PlusCircle,
  Grid3X3,
  UserCheck,
  Activity,
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  Clock3,
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
        <p style={{ color: '#64748b' }}>Loading Easwari Examination Control Center...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertTriangle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const counts = stats?.counts || {};
  const upcomingExams = stats?.upcomingExams || [];
  const activities = stats?.recentActivities || [];
  const facultyAvailability = stats?.facultyAvailability || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Examination Control Center</h1>
          <p>Easwari Engineering College • Real-time overview of college exams, seating capacity, and invigilator availability.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="metrics-grid">
        <StatCard
          title="Total Students"
          value={counts.totalStudents}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Total Exams"
          value={counts.totalExams}
          icon={CalendarDays}
          color="purple"
        />
        <StatCard
          title="Total Halls"
          value={counts.totalHalls}
          icon={Building2}
          color="amber"
        />
        <StatCard
          title="Total Faculty"
          value={counts.totalFaculty}
          icon={GraduationCap}
          color="teal"
        />
        <StatCard
          title="Upcoming Exams"
          value={counts.upcomingExams}
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Occupied Halls"
          value={counts.occupiedHalls}
          icon={CheckCircle}
          color="emerald"
        />
      </div>

      {/* Quick Administrative Actions Bar */}
      <div className="quick-actions-bar">
        <h3>Institutional Quick Actions</h3>
        <div className="quick-actions-list">
          <button
            onClick={() => navigate('/admin/students', { state: { openAdd: true } })}
            className="btn btn-secondary btn-sm"
          >
            <UserPlus size={15} />
            <span>Add Student</span>
          </button>
          <button
            onClick={() => navigate('/admin/exams', { state: { openAdd: true } })}
            className="btn btn-secondary btn-sm"
          >
            <PlusCircle size={15} />
            <span>Schedule Exam</span>
          </button>
          <button
            onClick={() => navigate('/admin/halls', { state: { openAdd: true } })}
            className="btn btn-secondary btn-sm"
          >
            <Building2 size={15} />
            <span>Add Hall</span>
          </button>
          <button
            onClick={() => navigate('/admin/faculty', { state: { openAdd: true } })}
            className="btn btn-secondary btn-sm"
          >
            <GraduationCap size={15} />
            <span>Add Faculty</span>
          </button>
          <button
            onClick={() => navigate('/admin/seating')}
            className="btn btn-primary btn-sm"
          >
            <Grid3X3 size={15} />
            <span>Automatic Seating</span>
          </button>
          <button
            onClick={() => navigate('/admin/invigilation')}
            className="btn btn-success btn-sm"
          >
            <UserCheck size={15} />
            <span>Assign Invigilators</span>
          </button>
        </div>
      </div>

      {/* Live Faculty Availability Status Overview Widget */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio size={18} color="#1b365d" />
            <span>Faculty Invigilation Availability & Live Duty Status</span>
          </h3>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Real-time synchronization with faculty availability declarations
          </span>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {facultyAvailability.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {facultyAvailability.map((f) => (
                <div
                  key={f._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    backgroundColor:
                      f.badgeType === 'available'
                        ? '#f0fdf4'
                        : f.badgeType === 'unavailable'
                        ? '#fef2f2'
                        : '#fefce8',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                      {f.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                      {f.facultyId} • {f.department}
                    </div>
                  </div>

                  <div>
                    {f.badgeType === 'available' && (
                      <span className="badge badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} />
                        <span>🟢 Available</span>
                      </span>
                    )}
                    {f.badgeType === 'unavailable' && (
                      <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={12} />
                        <span>🔴 Not Available</span>
                      </span>
                    )}
                    {f.badgeType === 'assigned' && (
                      <span className="badge badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock3 size={12} />
                        <span>🟡 Already Assigned ({f.assignedHalls})</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No active faculty members registered in system.</p>
          )}
        </div>
      </div>

      {/* Grid: Upcoming Exams & Recent Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {/* Upcoming Exams Table */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title">Upcoming Anna University Examinations</h3>
            <button
              onClick={() => navigate('/admin/exams')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.75rem' }}
            >
              View Timetable
            </button>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Exam Subject</th>
                  <th>Date</th>
                  <th>Time Slot</th>
                  <th>Dept</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingExams.length > 0 ? (
                  upcomingExams.map((exam) => (
                    <tr key={exam._id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#1b365d' }}>
                          {exam.examCode || 'EXAM'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{exam.examName}</td>
                      <td>{exam.examDate}</td>
                      <td style={{ fontSize: '0.8rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                        {exam.startTime} - {exam.endTime}
                      </td>
                      <td>
                        <span className="badge badge-blue">{exam.department}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            exam.status === 'Completed'
                              ? 'badge-emerald'
                              : exam.status === 'Cancelled'
                              ? 'badge-rose'
                              : 'badge-amber'
                          }`}
                        >
                          {exam.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>
                      No upcoming examinations scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={18} color="#1b365d" />
              <span>Recent Institutional Activity Log</span>
            </h3>
          </div>

          <div style={{ padding: '1.25rem 1.5rem' }}>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activities.map((act) => (
                  <div
                    key={act.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.85rem',
                      paddingBottom: '0.85rem',
                      borderBottom: '1px solid #f1f5f9',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        backgroundColor: act.type === 'seating' ? '#eff6ff' : '#ecfdf5',
                        color: act.type === 'seating' ? '#1b365d' : '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {act.type === 'seating' ? <Grid3X3 size={16} /> : <UserCheck size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a' }}>
                        {act.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b' }}>{act.description}</p>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })},{' '}
                        {new Date(act.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No recent activity recorded yet. Generate a seating plan or assign invigilators to see logs.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
