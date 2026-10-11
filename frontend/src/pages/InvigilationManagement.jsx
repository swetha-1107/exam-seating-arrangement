import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Layers,
} from 'lucide-react';
import api from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

const InvigilationManagementContent = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [duties, setDuties] = useState([]);
  const [slots, setSlots] = useState([]);
  const [exams, setExams] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  
  const queryParams = new URLSearchParams(location.search);
  const initialSlotOrExamId =
    queryParams.get('slotId') ||
    location.state?.slotId ||
    location.state?.selectedExamId ||
    '';

  const [selectedTargetId, setSelectedTargetId] = useState(initialSlotOrExamId);
  const [targetType, setTargetType] = useState('slot'); // 'slot' or 'exam'
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Analysis & Loading state
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch metadata (examination slots, exams, faculty)
  const fetchMetadata = async () => {
    try {
      setLoading(true);
      const [slotsRes, examsRes, facRes] = await Promise.allSettled([
        api.get('/seating/slots'),
        api.get('/exams'),
        api.get('/faculty'),
      ]);

      const loadedSlots = slotsRes.status === 'fulfilled' ? slotsRes.value.data : [];
      const loadedExams = examsRes.status === 'fulfilled' ? examsRes.value.data : [];
      const loadedFaculty = facRes.status === 'fulfilled' ? facRes.value.data : [];

      setSlots(loadedSlots);
      setExams(loadedExams);
      setFacultyList(loadedFaculty);

      if (!selectedTargetId) {
        if (loadedSlots.length > 0) {
          setSelectedTargetId(loadedSlots[0]._id);
          setTargetType('slot');
        } else if (loadedExams.length > 0) {
          setSelectedTargetId(loadedExams[0]._id);
          setTargetType('exam');
        }
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Failed to load examination slots and faculty.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch invigilation duties
  const fetchDuties = async (targetId) => {
    try {
      const activeId = targetId || selectedTargetId;
      const res = await api.get('/invigilation', {
        params: {
          slotId: targetType === 'slot' ? activeId : undefined,
          examId: targetType === 'exam' ? activeId : undefined,
          facultyId: selectedFacultyFilter || undefined,
          date: dateFilter || undefined,
        },
      });
      setDuties(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to load duties:', err);
      setError(err.message || 'Failed to load invigilation duties');
    }
  };

  // 3. Analyze constraints for the selected slot or exam
  const analyzeRequirements = async (targetId) => {
    const idToAnalyze = targetId || selectedTargetId;
    if (!idToAnalyze) {
      setAnalysis(null);
      return;
    }

    try {
      setAnalyzing(true);
      setError('');
      
      const endpoint = targetType === 'slot'
        ? `/invigilation/analyze-slot/${idToAnalyze}`
        : `/invigilation/analyze/${idToAnalyze}`;

      const res = await api.get(endpoint);
      setAnalysis(res.data);
    } catch (err) {
      // Fallback: If analyze-slot fails, try legacy analyze
      try {
        const fallbackRes = await api.get(`/invigilation/analyze/${idToAnalyze}`);
        setAnalysis(fallbackRes.data);
      } catch (fallbackErr) {
        setAnalysis(null);
        setError(err.message || 'Failed to analyze invigilation constraints.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  useEffect(() => {
    if (selectedTargetId) {
      analyzeRequirements(selectedTargetId);
      fetchDuties(selectedTargetId);
    }
  }, [selectedTargetId, selectedFacultyFilter, dateFilter, targetType]);

  // 4. Handle target switch
  const handleTargetChange = (e) => {
    const val = e.target.value;
    setSelectedTargetId(val);
    setError('');
    setSuccess('');

    // Detect if this is a slot or exam
    const isSlot = slots.some((s) => s._id === val);
    setTargetType(isSlot ? 'slot' : 'exam');
  };

  // 5. Automatic Invigilator Assignment
  const handleAutoAssign = async () => {
    if (!selectedTargetId) {
      setError('Please select an examination slot to assign invigilators.');
      return;
    }

    try {
      setAssigning(true);
      setError('');
      setSuccess('');

      const endpoint = targetType === 'slot'
        ? `/invigilation/assign-slot/${selectedTargetId}`
        : `/invigilation/auto-assign/${selectedTargetId}`;

      let res;
      try {
        res = await api.post(endpoint);
      } catch (postErr) {
        // Fallback to legacy endpoint if assign-slot fails
        res = await api.post(`/invigilation/auto-assign/${selectedTargetId}`);
      }

      setSuccess(res.data?.message || 'Invigilators assigned successfully.');
      await analyzeRequirements(selectedTargetId);
      await fetchDuties(selectedTargetId);
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.message || 'Failed to assign invigilators');
    } finally {
      setAssigning(false);
    }
  };

  // 6. Delete/Unassign Duty
  const handleDeleteDuty = async (id, facultyName) => {
    if (!window.confirm(`Unassign invigilation duty for ${facultyName || 'this faculty member'}?`)) return;
    try {
      await api.delete(`/invigilation/${id}`);
      setSuccess('Duty unassigned successfully.');
      await analyzeRequirements(selectedTargetId);
      await fetchDuties(selectedTargetId);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete duty assignment');
    }
  };

  // Selected target details
  const activeSlot = slots.find((s) => s._id === selectedTargetId);
  const activeExam = exams.find((e) => e._id === selectedTargetId);

  const targetTitle =
    activeSlot?.notes ||
    (activeSlot ? `Slot ${activeSlot.date} (${activeSlot.startTime}-${activeSlot.endTime})` : '') ||
    activeExam?.examName ||
    'Examination Slot';

  const targetDate = activeSlot?.date || activeExam?.examDate || analysis?.slot?.date || analysis?.exam?.examDate || '';
  const targetTime =
    activeSlot
      ? `${activeSlot.startTime} – ${activeSlot.endTime}`
      : activeExam
      ? `${activeExam.startTime} – ${activeExam.endTime}`
      : analysis?.slot
      ? `${analysis.slot.startTime} – ${analysis.slot.endTime}`
      : '';

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Office of Controller of Examinations • Easwari Engineering College
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Automated Faculty Invigilation Management
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Automatic constraint-based faculty assignment enforcing faculty availability, 1 invigilator per hall, and anti-clash rules.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/admin/seating')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Layers size={14} />
            <span>Manage Seating Plan</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Pre-Assignment Analysis & Automatic Trigger Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1b365d' }}>
            <Sparkles size={18} color="#1b365d" />
            <span>Pre-Assignment Constraint Diagnostics &amp; Allocation</span>
          </h3>
        </div>

        <div style={{ padding: '1.25rem' }}>
          {/* Target Slot Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: '#1e293b' }}>
              Select Examination Slot for Invigilator Assignment:
            </label>
            <select
              className="form-control"
              value={selectedTargetId}
              onChange={handleTargetChange}
              style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1b365d' }}
              disabled={loading}
            >
              {slots.map((slot) => (
                <option key={slot._id} value={slot._id}>
                  Slot: {slot.date} ({slot.startTime} – {slot.endTime}) — {slot.notes || 'CAT Session'} [{slot.seatingStatus || 'NOT_GENERATED'}]
                </option>
              ))}
              {slots.length === 0 && exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  Exam: [{exam.examCode || 'EXAM'}] {exam.examName} ({exam.examDate} • {exam.startTime} – {exam.endTime})
                </option>
              ))}
              {slots.length === 0 && exams.length === 0 && (
                <option value="">No examination slots or exams found. Please add exams in Timetable.</option>
              )}
            </select>
          </div>

          {/* Diagnostic Status Box */}
          {analyzing ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px' }}>
              <RefreshCw size={22} className="animate-spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
              <div>Checking hall requirements and faculty availability constraints...</div>
            </div>
          ) : analysis ? (
            <div
              style={{
                backgroundColor: analysis.canAssign ? '#f8fafc' : '#fff1f2',
                borderRadius: '10px',
                border: `1.5px solid ${analysis.canAssign ? '#cbd5e1' : '#fecdd3'}`,
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  marginBottom: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '0.75rem',
                }}
              >
                <div>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Invigilator Allocation Engine
                  </span>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                    {targetTitle}
                  </div>
                  {targetDate && (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                      <CalendarDays size={14} />
                      <span>{targetDate}</span>
                      {targetTime && (
                        <>
                          <span>•</span>
                          <Clock size={14} />
                          <span>{targetTime}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div>
                  {analysis.canAssign ? (
                    <span
                      className="badge badge-emerald"
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <CheckCircle size={15} />
                      <span>STATUS: {analysis.statusText || 'READY TO ASSIGN'}</span>
                    </span>
                  ) : (
                    <span
                      className="badge badge-rose"
                      style={{ fontSize: '0.85rem', padding: '0.35rem 0.8rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <XCircle size={15} />
                      <span>STATUS: {analysis.statusText || 'CANNOT ASSIGN'}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Constraint Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Halls in Seating Plan</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1b365d' }}>
                    {analysis.hallsCount ?? 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Invigilators Required: <strong>{analysis.invigilatorsRequired ?? analysis.hallsCount ?? 0}</strong>
                  </div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Eligible Available Faculty</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669' }}>
                    {analysis.eligibleFacultyCount ?? 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Passed availability &amp; conflict checks</div>
                </div>

                <div style={{ background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Availability Exclusions</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b91c1c' }}>
                    Enforced
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Unavailable faculty excluded</div>
                </div>
              </div>

              {/* Warnings List */}
              {analysis.warnings && analysis.warnings.length > 0 && (
                <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {analysis.warnings.map((warn, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '0.8rem',
                        color: analysis.canAssign ? '#92400e' : '#b91c1c',
                        background: analysis.canAssign ? '#fefce8' : '#fef2f2',
                        padding: '0.45rem 0.75rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Info size={14} style={{ flexShrink: 0 }} />
                      <span>{warn}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: '#64748b', background: '#f8fafc', borderRadius: '8px', marginBottom: '1.25rem' }}>
              Select an examination slot above to analyze constraints and assign invigilators.
            </div>
          )}

          {/* Action Trigger */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.25rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
              System allocates 1 invigilator per hall from eligible faculty while avoiding timetable conflicts.
            </span>

            <button
              onClick={handleAutoAssign}
              disabled={assigning || analyzing || !analysis?.canAssign}
              className="btn btn-primary"
              style={{ padding: '0.65rem 1.5rem', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              {assigning ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Checking Availability &amp; Assigning...</span>
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Auto Assign Invigilators</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Duty Table & Filters */}
      <div className="card">
        <div className="card-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <h3 className="card-title" style={{ color: '#1b365d' }}>Assigned Invigilation Duty Register</h3>
        </div>

        <div className="filter-bar" style={{ padding: '0.85rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', flex: 1 }}>
            <select
              className="form-control"
              style={{ maxWidth: '240px', fontSize: '0.82rem' }}
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
              className="form-control"
              style={{ maxWidth: '170px', fontSize: '0.82rem' }}
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem' }}
              >
                Clear Date
              </button>
            )}
          </div>
        </div>

        <div className="table-responsive">
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '0.65rem 0.85rem' }}>Faculty Invigilator</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Faculty ID</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Examination Session</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Assigned Hall</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Exam Date</th>
                <th style={{ padding: '0.65rem 0.85rem' }}>Time Slot</th>
                <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {duties.length > 0 ? (
                duties.map((duty) => {
                  const fac = duty.faculty || duty.facultyId;
                  const hall = duty.hall || duty.hallId;
                  const slotOrExam = duty.slot || duty.examId;

                  const facName = fac?.name || 'Assigned Faculty';
                  const facId = fac?.facultyId || '—';
                  const facDept = fac?.department || '—';
                  const hallLabel = hall?.hallCode || hall?.hallNumber || 'Hall';
                  const sessionLabel = slotOrExam?.notes || slotOrExam?.examName || 'CAT Examination';
                  const dutyDate = duty.examDate || slotOrExam?.date || slotOrExam?.examDate || '—';
                  const dutyTime =
                    duty.startTime && duty.endTime
                      ? `${duty.startTime} – ${duty.endTime}`
                      : slotOrExam?.startTime && slotOrExam?.endTime
                      ? `${slotOrExam.startTime} – ${slotOrExam.endTime}`
                      : '—';

                  return (
                    <tr key={duty._id}>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{facName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Dept: {facDept}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b365d' }}>
                          {facId}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{sessionLabel}</div>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span className="badge badge-primary" style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                          Hall {hallLabel}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>{dutyDate}</td>
                      <td style={{ padding: '0.65rem 0.85rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>
                          {dutyTime}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.85rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteDuty(duty._id, facName)}
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#b91c1c', padding: '0.25rem 0.5rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Unassign Duty"
                        >
                          <Trash2 size={13} />
                          <span>Unassign</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: '#64748b' }}>
                      <UserCheck size={36} color="#94a3b8" />
                      <h4 style={{ margin: 0, color: '#334155' }}>No Invigilation Duties Assigned Yet</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        Select an examination slot above and click <strong>"Auto Assign Invigilators"</strong>.
                      </p>
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

const InvigilationManagement = () => (
  <ErrorBoundary>
    <InvigilationManagementContent />
  </ErrorBoundary>
);

export default InvigilationManagement;
