import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  CalendarDays,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  UserCheck,
  Building,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import SeatGrid from '../components/SeatGrid';

const SeatingArrangement = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Workflow Selection State
  const [selectedDate, setSelectedDate] = useState('2026-10-15');
  const [selectedSession, setSelectedSession] = useState('FN');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [selectedExamId, setSelectedExamId] = useState(
    location.state?.selectedExamId || ''
  );

  // Analysis & Plan Data
  const [analysis, setAnalysis] = useState(null);
  const [seatingData, setSeatingData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Initial Load: exams and departments
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [examsRes, deptsRes] = await Promise.all([
          api.get('/exams'),
          api.get('/departments'),
        ]);

        setExams(examsRes.data);
        setDepartments(deptsRes.data);

        if (!selectedExamId && examsRes.data.length > 0) {
          setSelectedExamId(examsRes.data[0]._id);
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize examinations list');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  // Filter exams by Date, Session, and Department
  const filteredExams = exams.filter((ex) => {
    if (selectedDate && ex.examDate !== selectedDate) return false;
    if (selectedSession && selectedSession !== 'ALL' && (ex.session || 'FN') !== selectedSession) return false;
    if (selectedDept && selectedDept !== 'ALL') {
      const matchDept = ex.department === selectedDept || ex.department === 'ALL';
      const matchLinked = (ex.departments || []).some((d) => (d.code || d) === selectedDept);
      if (!matchDept && !matchLinked) return false;
    }
    return true;
  });

  // When filters change, auto-select first matching exam if current selection is not in filtered list
  useEffect(() => {
    if (filteredExams.length > 0) {
      const exists = filteredExams.some((e) => e._id === selectedExamId);
      if (!exists) {
        setSelectedExamId(filteredExams[0]._id);
      }
    }
  }, [selectedDate, selectedSession, selectedDept, exams]);

  // 2. Fetch Analysis & Current Plan for selected exam
  const loadExamDetails = async (examId) => {
    if (!examId) return;
    try {
      setAnalyzing(true);
      setError('');

      const [analysisRes, seatingRes] = await Promise.allSettled([
        api.get(`/seating/analyze/${examId}`),
        api.get(`/seating/${examId}`),
      ]);

      if (analysisRes.status === 'fulfilled') {
        setAnalysis(analysisRes.value.data);
      } else {
        setAnalysis(null);
        setError(analysisRes.reason?.message || 'Failed to inspect exam requirements');
      }

      if (seatingRes.status === 'fulfilled') {
        setSeatingData(seatingRes.value.data);
      } else {
        setSeatingData(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load examination seating analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadExamDetails(selectedExamId);
    }
  }, [selectedExamId]);

  // 3. Automated Seating Generation
  const handleGenerateSeating = async () => {
    if (!selectedExamId) {
      setError('Please select an examination first.');
      return;
    }

    if (seatingData?.totalSeated > 0) {
      if (!window.confirm('A seating plan already exists for this examination. Regenerate and replace it?')) {
        return;
      }
    }

    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/generate/${selectedExamId}`);
      setSuccess(res.data.message || 'Seating plan generated successfully with department interleaving.');
      await loadExamDetails(selectedExamId);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message || 'Failed to generate seating plan.');
    } finally {
      setGenerating(false);
    }
  };

  // 4. Clear Seating Plan
  const handleClearSeating = async () => {
    if (!window.confirm('Clear all allocated seats for this examination?')) return;
    try {
      setClearing(true);
      setError('');
      await api.delete(`/seating/${selectedExamId}`);
      setSuccess('Seating plan cleared successfully.');
      await loadExamDetails(selectedExamId);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to clear seating plan.');
    } finally {
      setClearing(false);
    }
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Automatic Mixed-Department Seating Allocation</h1>
          <p>
            Easwari Engineering College • Automated constraint-based seating generation. Students from different departments share examination halls with department interleaving.
          </p>
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

      {/* Workflow Selector Bar */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} color="#1b365d" />
            <span>Step 1: Select Examination Session, Department & Paper</span>
          </h3>
          {seatingData?.totalSeated > 0 && (
            <button
              onClick={handleClearSeating}
              disabled={clearing}
              className="btn btn-danger-outline btn-sm"
            >
              <Trash2 size={14} />
              <span>{clearing ? 'Clearing...' : 'Clear Current Seating'}</span>
            </button>
          )}
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Examination Date:
              </label>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Session Slot:
              </label>
              <select
                className="form-control"
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                <option value="ALL">All Sessions</option>
                <option value="FN">FN - Forenoon (10:00 - 13:00)</option>
                <option value="AN">AN - Afternoon (14:00 - 17:00)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                Department:
              </label>
              <select
                className="form-control"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#1e293b' }}>
              Select Examination Paper to Allocate:
            </label>
            <select
              className="form-control"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              style={{ fontSize: '0.95rem', fontWeight: 700 }}
            >
              {filteredExams.length > 0 ? (
                filteredExams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    [{ex.examCode}] {ex.examName} ({ex.department}) • Date: {ex.examDate} • {ex.session || 'FN'} ({ex.startTime} - {ex.endTime})
                  </option>
                ))
              ) : (
                <option value="">No examinations match the selected date, session, and department filters</option>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Pre-Generation Readiness Diagnostic Summary Box */}
      {analysis && (
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} color="#1b365d" />
                <span>Step 2: Pre-Generation Readiness Summary & Conflict Checks</span>
              </h3>
            </div>
            <div>
              {analysis.canGenerate ? (
                <span className="badge badge-emerald" style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle size={16} />
                  <span>STATUS: {analysis.statusText}</span>
                </span>
              ) : (
                <span className="badge badge-rose" style={{ fontSize: '0.9rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <XCircle size={16} />
                  <span>STATUS: {analysis.statusText}</span>
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Eligible Candidates to Seat</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1b365d' }}>
                  {analysis.registeredStudents}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Dept: <strong>{analysis.exam.department}</strong>
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Available Hall Capacity</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669' }}>
                  {analysis.availableCapacity} seats
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Across non-clashing halls</div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Halls Required by Algorithm</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#7a1c1d' }}>
                  {analysis.hallsNeeded} {analysis.hallsNeeded === 1 ? 'Hall' : 'Halls'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {analysis.selectedHalls.map((h) => h.hallNumber).join(', ') || 'Auto-computed'}
                </div>
              </div>

              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Invigilators Required</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1b365d' }}>
                  {analysis.invigilatorsRequired}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  {analysis.eligibleFacultyCount} eligible faculty available
                </div>
              </div>
            </div>

            {/* Diagnostic Notices & Conflict Warnings */}
            {analysis.warnings && analysis.warnings.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {analysis.warnings.map((warn, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '0.85rem',
                      color: analysis.canGenerate ? '#1e3a8a' : '#b91c1c',
                      background: analysis.canGenerate ? '#eff6ff' : '#fef2f2',
                      padding: '0.5rem 0.85rem',
                      borderRadius: '6px',
                      border: `1px solid ${analysis.canGenerate ? '#bfdbfe' : '#fecaca'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Info size={16} />
                    <span>{warn}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Algorithm automatically allocates free desks and interleaves departments side-by-side.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleGenerateSeating}
                  disabled={generating || analyzing || !analysis?.canGenerate}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 2rem', fontSize: '0.95rem' }}
                >
                  {generating ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>Computing Allocation...</span>
                    </>
                  ) : (
                    <>
                      <Grid3X3 size={18} />
                      <span>{seatingData?.totalSeated > 0 ? 'Regenerate Seating Plan' : 'Generate Seating Plan'}</span>
                    </>
                  )}
                </button>

                {seatingData?.totalSeated > 0 && (
                  <button
                    onClick={() => navigate('/admin/invigilation', { state: { selectedExamId } })}
                    className="btn btn-secondary"
                    style={{ padding: '0.75rem 1.25rem' }}
                  >
                    <UserCheck size={16} />
                    <span>Assign Invigilators</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2D Visual Hall Matrix Output */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
              Step 3: Visual Hall Seating Charts (Mixed-Department View)
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Displays exact desk positions for each hall. Students writing different papers are clearly identified.
            </p>
          </div>

          {seatingData?.totalSeated > 0 && (
            <span className="badge badge-emerald" style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>
              {seatingData.halls.length} Hall(s) In Use • {seatingData.totalSeated} Students Seated
            </span>
          )}
        </div>

        {analyzing ? (
          <div style={{ textAlign: 'center', padding: '4rem', background: '#fff', borderRadius: '12px' }}>
            <p style={{ color: '#64748b' }}>Analyzing examination constraints and room layouts...</p>
          </div>
        ) : seatingData && seatingData.halls.length > 0 ? (
          <div>
            {seatingData.halls.map((hallGroup) => (
              <SeatGrid
                key={hallGroup.hallDetails._id}
                hall={hallGroup.hallDetails}
                seats={hallGroup.seats}
              />
            ))}
          </div>
        ) : (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
            <Grid3X3 size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem auto' }} />
            <h3 style={{ fontSize: '1.15rem', color: '#0f172a', marginBottom: '0.5rem' }}>
              No Seating Plan Generated For This Examination Yet
            </h3>
            <p style={{ color: '#64748b', maxWidth: '520px', margin: '0 auto', fontSize: '0.9rem' }}>
              Select an examination paper above and click <strong>"Generate Seating Plan"</strong>.
              The backend engine will allocate available desks across halls and enforce all college examination rules.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeatingArrangement;
