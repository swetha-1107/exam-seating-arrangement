import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  UserCheck,
  CalendarDays,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  Building,
  Clock,
} from 'lucide-react';
import api from '../services/api';

const InvigilationManagement = () => {
  const location = useLocation();
  const [duties, setDuties] = useState([]);
  const [exams, setExams] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(
    location.state?.selectedExamId || ''
  );
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Analysis state
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchMetadata = async () => {
    try {
      const [examsRes, facRes] = await Promise.all([
        api.get('/exams'),
        api.get('/faculty'),
      ]);
      setExams(examsRes.data);
      setFacultyList(facRes.data);

      if (!selectedExamId && examsRes.data.length > 0) {
        setSelectedExamId(examsRes.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchDuties = async () => {
    try {
      const res = await api.get('/invigilation', {
        params: {
          examId: selectedExamId || undefined,
          facultyId: selectedFacultyFilter || undefined,
          date: dateFilter || undefined,
        },
      });
      setDuties(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load invigilation duties');
    }
  };

  const analyzeRequirements = async (examId) => {
    if (!examId) return;
    try {
      setAnalyzing(true);
      setError('');
      const res = await api.get(`/invigilation/analyze/${examId}`);
      setAnalysis(res.data);
    } catch (err) {
      setAnalysis(null);
      setError(err.message || 'Failed to analyze invigilation constraints.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      analyzeRequirements(selectedExamId);
      fetchDuties();
    }
  }, [selectedExamId, selectedFacultyFilter, dateFilter]);

  const handleAutoAssign = async () => {
    if (!selectedExamId) {
      setError('Please select an examination to assign invigilators.');
      return;
    }

    try {
      setAssigning(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/invigilation/auto-assign/${selectedExamId}`);
      setSuccess(res.data.message || 'Invigilators assigned automatically.');
      
      await analyzeRequirements(selectedExamId);
      await fetchDuties();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to assign invigilators');
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteDuty = async (id, facultyName) => {
    if (!window.confirm(`Unassign invigilation duty for ${facultyName}?`)) return;
    try {
      await api.delete(`/invigilation/${id}`);
      setSuccess(`Duty unassigned successfully.`);
      await analyzeRequirements(selectedExamId);
      await fetchDuties();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete duty assignment');
    }
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Invigilation Duty Management</h1>
          <p>Easwari Engineering College • Automated constraint-based faculty assignment enforcing faculty availability and conflict avoidance.</p>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Pre-Assignment Analysis & Automatic Trigger Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} color="#1b365d" />
            <span>Pre-Assignment Constraint Analysis & Auto-Allocation</span>
          </h3>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {/* Exam Selection Dropdown */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#1e293b' }}>
              Select Examination for Duty Allocation:
            </label>
            <select
              className="form-control"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ fontSize: '0.95rem', fontWeight: 600 }}
            >
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  [{exam.examCode || 'EXAM'}] {exam.examName} ({exam.examDate} • {exam.startTime}-{exam.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Diagnostic Status Box */}
          {analysis && (
            <div
              style={{
                backgroundColor: analysis.canAssign ? '#f8fafc' : '#fff1f2',
                borderRadius: '12px',
                border: `1.5px solid ${analysis.canAssign ? '#cbd5e1' : '#fecdd3'}`,
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>
                    Invigilator Allocation Engine
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {analysis.exam.examName} ({analysis.exam.examCode || 'EXAM'})
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Scheduled for {analysis.exam.examDate} ({analysis.exam.startTime} - {analysis.exam.endTime})
                  </div>
                </div>

                {/* Status Badge */}
                <div>
                  {analysis.canAssign ? (
                    <span
                      className="badge badge-emerald"
                      style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={16} />
                      <span>STATUS: {analysis.statusText}</span>
                    </span>
                  ) : (
                    <span
                      className="badge badge-rose"
                      style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={16} />
                      <span>STATUS: {analysis.statusText}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Constraint Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Halls in Seating Plan</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b365d' }}>
                    {analysis.hallsCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Invigilators Required: {analysis.invigilatorsRequired}</div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Eligible Available Faculty</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                    {analysis.eligibleFacultyCount}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pass availability checks</div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Availability Exclusions</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b91c1c' }}>
                    Enforced
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ravi (Not Available) excluded</div>
                </div>
              </div>

              {/* Warnings */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {analysis.warnings.map((warn, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.8rem',
                        color: analysis.canAssign ? '#92400e' : '#b91c1c',
                        background: analysis.canAssign ? '#fefce8' : '#fef2f2',
                        padding: '0.4rem 0.75rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Info size={14} />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Trigger */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', paddingTop: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              System assigns 1 invigilator per hall from available faculty while avoiding timetable conflicts.
            </span>

            <button
              onClick={handleAutoAssign}
              disabled={assigning || analyzing || !analysis?.canAssign}
              className="btn btn-primary"
              style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}
            >
              {assigning ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Checking Availability & Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck size={18} />
                  <span>Auto Assign Invigilators</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Duty Table & Filters */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Assigned Invigilation Duty Register</h3>
        </div>

        <div className="filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
            <select
              className="filter-select"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              <option value="">Filter by Exam: All</option>
              {exams.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.examName} ({e.examCode})
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={selectedFacultyFilter}
              onChange={(e) => setSelectedFacultyFilter(e.target.value)}
            >
              <option value="">Filter by Faculty: All</option>
              {facultyList.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name} ({f.facultyId})
                </option>
              ))}
            </select>

            <input
              type="date"
              className="filter-select"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="btn btn-secondary btn-sm"
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty Invigilator</th>
                <th>Faculty ID</th>
                <th>Examination Subject</th>
                <th>Assigned Hall</th>
                <th>Exam Date</th>
                <th>Time Slot</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {duties.length > 0 ? (
                duties.map((duty) => {
                  const fac = duty.faculty || duty.facultyId;
                  const hall = duty.hall || duty.hallId;
                  const exam = duty.examId || duty.slot;
                  return (
                    <tr key={duty._id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>
                          {fac?.name || 'Assigned Faculty'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          Dept: {fac?.department}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {fac?.facultyId}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{exam?.examName || exam?.notes || 'Examination'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                          {exam?.examCode || ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          Hall {hall?.hallCode || hall?.hallNumber}
                        </span>
                      </td>
                      <td>{duty.examDate || exam?.date || exam?.examDate}</td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          {duty.startTime || exam?.startTime} - {duty.endTime || exam?.endTime}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteDuty(duty._id, fac?.name)}
                          className="btn btn-danger-outline btn-sm"
                          title="Unassign Duty"
                        >
                          <Trash2 size={14} />
                          <span>Unassign</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <UserCheck size={40} />
                      <h3>No Invigilation Duties Assigned Yet</h3>
                      <p>Select an exam above and click "Auto Assign Invigilators".</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InvigilationManagement;
