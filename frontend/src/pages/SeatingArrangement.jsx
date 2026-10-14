import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Grid3X3,
  CalendarDays,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Sparkles,
  Info,
  CheckCircle,
  XCircle,
  FileText,
  Share2,
  ShieldAlert,
  ArrowRight,
  Layers,
} from 'lucide-react';
import api from '../services/api';
import SeatGrid from '../components/SeatGrid';

const SeatingArrangement = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const queryParams = new URLSearchParams(location.search);
  const initialSlotId = queryParams.get('slotId') || location.state?.selectedSlotId || '';

  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(initialSlotId);
  const [selectedHallIdx, setSelectedHallIdx] = useState(0);

  // Analysis, Plan Data & Reuse Evaluation
  const [analysis, setAnalysis] = useState(null);
  const [seatingData, setSeatingData] = useState(null);
  const [reuseEvaluation, setReuseEvaluation] = useState(null);

  // Admin Toggle
  const [allowSameDeptLastResort, setAllowSameDeptLastResort] = useState(false);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch available Slots
  const fetchSlots = async () => {
    try {
      setLoading(true);
      const res = await api.get('/seating/slots');
      setSlots(res.data);

      if (res.data.length > 0) {
        if (!selectedSlotId || !res.data.some((s) => s._id === selectedSlotId)) {
          setSelectedSlotId(res.data[0]._id);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch examination slots.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  // 2. Whenever selectedSlotId changes, load analysis, seating plan, and reuse status
  const loadSlotDetails = async (slotId) => {
    if (!slotId) return;
    try {
      setAnalyzing(true);
      setError('');

      const [analysisRes, planRes] = await Promise.all([
        api.get(`/seating/analyze-slot/${slotId}`),
        api.get(`/seating/slot/${slotId}`),
      ]);

      setAnalysis(analysisRes.data);
      setSeatingData(planRes.data);
      setSelectedHallIdx(0);

      // Check multi-day reuse evaluation if applicable
      try {
        const reuseRes = await api.get(`/seating/evaluate-reuse/${slotId}`);
        setReuseEvaluation(reuseRes.data);
      } catch (e) {
        setReuseEvaluation(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load details for this slot.');
    } finally {
      setAnalyzing(false);
    }
  };

  useEffect(() => {
    if (selectedSlotId) {
      loadSlotDetails(selectedSlotId);
    }
  }, [selectedSlotId, allowSameDeptLastResort]);

  // 3. Handle Admin Toggle with Confirmation
  const handleToggleSameDept = (e) => {
    const newVal = e.target.checked;
    if (newVal) {
      const confirm = window.confirm(
        'WARNING: Allowing same-department pairing on a bench is only permitted as an extreme last resort when cohorts cannot be paired.\n\nAre you sure you want to enable this override?'
      );
      if (!confirm) return;
    }
    setAllowSameDeptLastResort(newVal);
  };

  // 4. Generate Seating Plan (Two-Seat Bench Mixed Pairing)
  const handleGenerate = async (forceReplace = false) => {
    if (!selectedSlotId) return;
    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/generate-slot/${selectedSlotId}`, {
        forceReplace,
        allowSameDeptLastResort,
      });

      setSuccess(res.data.message || 'Seating plan generated successfully (DRAFT)!');
      await loadSlotDetails(selectedSlotId);
      await fetchSlots();
    } catch (err) {
      if (err.message && err.message.includes('already exists')) {
        if (window.confirm('A seating plan already exists for this slot. Do you want to REGENERATE (replace) it?')) {
          handleGenerate(true);
          return;
        }
      }
      setError(err.message || 'Failed to generate seating plan.');
    } finally {
      setGenerating(false);
    }
  };

  // 5. Re-plan this day independently
  const handleReplan = async (slotIdToReplan) => {
    const sId = slotIdToReplan || selectedSlotId;
    if (!sId) return;

    const confirm = window.confirm(
      'This will re-plan seating specifically for this day, generating an independent layout that prevents paper conflicts. Other series exam days retain their base plan.\n\nProceed?'
    );
    if (!confirm) return;

    try {
      setReplanning(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/replan-slot/${sId}`, {
        allowSameDeptLastResort,
        reason: 'Specific slot override re-plan',
      });

      setSuccess(res.data.message || 'Slot successfully re-planned!');
      await loadSlotDetails(sId);
      await fetchSlots();
    } catch (err) {
      setError(err.message || 'Failed to re-plan slot seating.');
    } finally {
      setReplanning(false);
    }
  };

  // 6. Publish Seating Plan
  const handlePublish = async () => {
    if (!selectedSlotId) return;
    try {
      setPublishing(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/publish-slot/${selectedSlotId}`);
      setSuccess(res.data.message || 'Seating plan PUBLISHED! Students can now see their seat assignments.');
      await loadSlotDetails(selectedSlotId);
      await fetchSlots();
    } catch (err) {
      setError(err.message || 'Failed to publish seating plan.');
    } finally {
      setPublishing(false);
    }
  };

  // 7. Clear Seating Plan
  const handleClear = async () => {
    if (!selectedSlotId) return;
    if (!window.confirm('Are you sure you want to delete the seating plan for this slot?')) {
      return;
    }

    try {
      setClearing(true);
      setError('');
      setSuccess('');

      const res = await api.delete(`/seating/slot/${selectedSlotId}`);
      setSuccess(res.data.message || 'Seating plan cleared.');
      await loadSlotDetails(selectedSlotId);
      await fetchSlots();
    } catch (err) {
      setError(err.message || 'Failed to clear seating plan.');
    } finally {
      setClearing(false);
    }
  };

  const currentSlot = slots.find((s) => s._id === selectedSlotId);
  const halls = seatingData?.halls || [];
  const activeHall = halls[selectedHallIdx] || null;

  // Helper badge for multi-day status
  const getStatusBadge = (slot) => {
    const reuse = slot.reuseStatus;
    const seating = slot.seatingStatus;

    if (reuse === 'RE-PLANNED') {
      return <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: 700 }}>RE-PLANNED</span>;
    }
    if (reuse === 'NEEDS RE-PLAN') {
      return <span className="badge badge-danger" style={{ fontSize: '0.68rem', fontWeight: 700 }}>NEEDS RE-PLAN</span>;
    }
    if (reuse === 'REUSED OK') {
      return <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700 }}>REUSED OK</span>;
    }
    if (reuse === 'REUSED WITH WARNINGS') {
      return <span className="badge badge-warning" style={{ fontSize: '0.68rem', fontWeight: 700 }}>REUSED W/ WARNINGS</span>;
    }
    if (seating === 'PUBLISHED') {
      return <span className="badge badge-success" style={{ fontSize: '0.68rem', fontWeight: 700 }}>PUBLISHED</span>;
    }
    if (seating === 'DRAFT') {
      return <span className="badge badge-info" style={{ fontSize: '0.68rem', fontWeight: 700 }}>DRAFT PLAN</span>;
    }
    return <span className="badge badge-secondary" style={{ fontSize: '0.68rem' }}>NOT GENERATED</span>;
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Easwari Engineering College • Examination Seating System
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Automated Multi-Day Examination Seating Plan
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Pair candidates across distinct programmes, fill compact floor clusters fairly without hall-code bias, and reuse base series plans safely across examination days.
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/admin/reports')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <FileText size={15} />
            <span>Official Notices &amp; Reports</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}
      {success && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{success}</div>}

      {/* Multi-Day Exam Series Date Strip */}
      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CalendarDays size={18} color="#1b365d" />
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1b365d' }}>
              Series Examination Days (CAT II Timetable Strip)
            </h3>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Click an exam day below to view or manage its seating layout
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
          {slots.map((s, idx) => {
            const isSelected = s._id === selectedSlotId;
            return (
              <div
                key={s._id}
                onClick={() => setSelectedSlotId(s._id)}
                style={{
                  minWidth: '190px',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.15)' : 'none',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? '#1d4ed8' : '#0f172a' }}>
                    Day {idx + 1}: {s.date}
                  </span>
                  {getStatusBadge(s)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '0.35rem' }}>
                  {s.startTime} – {s.endTime} • {s.papersCount} Paper(s)
                </div>
                {s.seatCount > 0 && (
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#059669' }}>
                    {s.seatCount} students seated ({s.hallsCount} halls)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Readiness Diagnostics & Configuration Card */}
      {analysis && (
        <div
          className="card"
          style={{
            marginBottom: '1.25rem',
            borderLeft: analysis.canGenerate ? '4px solid #10b981' : '4px solid #ef4444',
            background: analysis.canGenerate ? '#f0fdf4' : '#fef2f2',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                {analysis.canGenerate ? (
                  <span className="badge badge-success" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    <CheckCircle2 size={13} style={{ marginRight: '0.25rem', verticalAlign: '-2px' }} />
                    READY TO GENERATE
                  </span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                    <AlertTriangle size={13} style={{ marginRight: '0.25rem', verticalAlign: '-2px' }} />
                    CANNOT GENERATE
                  </span>
                )}
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1b365d' }}>
                  Slot: {analysis.slot?.date} ({analysis.slot?.startTime} – {analysis.slot?.endTime})
                </span>
                {reuseEvaluation?.status && (
                  <span className="badge badge-navy" style={{ fontSize: '0.72rem' }}>
                    Reuse Status: {reuseEvaluation.status}
                  </span>
                )}
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                Total Candidates: <strong>{analysis.totalStudents}</strong> across <strong>{analysis.papers?.length || 0} papers</strong> • Available Hall Capacity: <strong>{analysis.availableCapacity} seats</strong> • Halls Required: <strong>~{analysis.hallsNeeded}</strong>
                {analysis.estimatedForcedEmptySeats > 0 && (
                  <span> • Forced Empty Bench Seats: <strong>{analysis.estimatedForcedEmptySeats}</strong></span>
                )}
              </p>
            </div>

            {/* Actions Toolbar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Admin Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  color: '#1b365d',
                  background: '#ffffff',
                  padding: '0.3rem 0.6rem',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="If checked, allows same-department pairing on benches only when cohorts cannot be paired with another programme"
              >
                <input
                  type="checkbox"
                  checked={allowSameDeptLastResort}
                  onChange={handleToggleSameDept}
                />
                <span>Allow same-department pairing as last resort</span>
              </label>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleGenerate(false)}
                disabled={generating || !analysis.canGenerate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Sparkles size={14} />
                <span>{halls.length > 0 ? 'Regenerate Seating' : 'Auto-Generate Seating'}</span>
              </button>

              {/* Re-plan specific day button */}
              {halls.length > 0 && (
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => handleReplan(selectedSlotId)}
                  disabled={replanning}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#d97706', borderColor: '#d97706', color: '#fff' }}
                >
                  <RotateCcw size={14} />
                  <span>Re-Plan This Day</span>
                </button>
              )}

              {currentSlot?.seatingStatus === 'DRAFT' && (
                <button
                  className="btn btn-success btn-sm"
                  onClick={handlePublish}
                  disabled={publishing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#059669', borderColor: '#059669', color: '#fff' }}
                >
                  <Share2 size={14} />
                  <span>Publish to Students</span>
                </button>
              )}

              {halls.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClear}
                  disabled={clearing}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#b91c1c' }}
                >
                  <Trash2 size={14} />
                  <span>Clear Plan</span>
                </button>
              )}
            </div>
          </div>

          {/* Cluster & Hall Selection Explanation Justification */}
          {analysis.selectionExplanations && analysis.selectionExplanations.length > 0 && (
            <div style={{ marginTop: '0.5rem', background: '#ffffff', padding: '0.6rem 0.8rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1b365d', marginBottom: '0.25rem' }}>
                Hall Cluster Selection Justification (Fair Rotation &amp; Compact Floor-Filling):
              </div>
              <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.75rem', color: '#475569' }}>
                {analysis.selectionExplanations.map((exp, idx) => (
                  <li key={idx}>{exp}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Blocking Warnings */}
          {analysis.warnings && analysis.warnings.length > 0 && (
            <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '0.5rem' }}>
              {analysis.warnings.map((w, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertTriangle size={13} />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Multi-Day Clashes Warning (if base plan reuse is violated) */}
          {reuseEvaluation && reuseEvaluation.clashes && reuseEvaluation.clashes.length > 0 && (
            <div style={{ marginTop: '0.5rem', background: '#fee2e2', border: '1px solid #f87171', padding: '0.6rem', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={14} />
                <span>Base Plan Reuse Warning: {reuseEvaluation.clashes.length} Bench Collision(s) Detected!</span>
              </div>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#7f1d1d' }}>
                Students who share benches in the base plan are scheduled to write the same paper or share a department on this date. Click <strong>"Re-Plan This Day"</strong> to generate a clash-free override.
              </p>
            </div>
          )}

          {/* Scheduled Papers in Slot */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {analysis.papers?.map((p, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '0.72rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1b365d',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <strong>{p.courseCode} – {p.courseName}:</strong> {p.studentCount} students ({p.programmes?.join(', ') || 'All'})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Seating Plan View */}
      {halls.length > 0 ? (
        <div>
          {/* Hall Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {halls.map((hg, idx) => (
              <button
                key={hg.hall._id}
                onClick={() => setSelectedHallIdx(idx)}
                className={`btn btn-sm ${selectedHallIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                <Building2 size={14} />
                <span>Hall {hg.hall.hallCode || hg.hall.hallNumber}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    background: selectedHallIdx === idx ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                    color: selectedHallIdx === idx ? '#fff' : '#475569',
                    padding: '0.05rem 0.35rem',
                    borderRadius: '4px',
                  }}
                >
                  {hg.seatsCount} seats
                </span>
              </button>
            ))}
          </div>

          {/* Hall Composition Banner */}
          {activeHall && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '0.5rem 0.85rem',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                fontSize: '0.8rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#1b365d' }}>Hall Composition: </span>
                <span style={{ color: '#475569' }}>
                  {activeHall.programmes?.join(', ')} ({activeHall.programmes?.length || 0} Programmes Seated)
                </span>
              </div>
              <div style={{ color: '#64748b' }}>
                Location: <strong>{activeHall.hall.block} Block • {activeHall.hall.floor} Floor</strong>
              </div>
            </div>
          )}

          {/* Active Hall Visualization */}
          {activeHall && (
            <SeatGrid hall={activeHall.hall} seats={activeHall.seats} />
          )}

          {/* Hall Allocation Summary Table (Notice Format) */}
          <div className="card" style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#1b365d', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <FileText size={18} color="#1b365d" />
              Contiguous Register Range Summary (Notice Board Layout)
            </h3>

            <div className="table-responsive">
              <table className="table" style={{ width: '100%', fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>Hall Code</th>
                    <th>Block &amp; Floor</th>
                    <th>Programme</th>
                    <th>Register Number Range</th>
                    <th>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {halls.map((hg) => {
                    // Group contiguous seats by programme
                    const progGroups = {};
                    hg.seats.forEach((st) => {
                      const p = st.student?.programme || 'OTHER';
                      if (!progGroups[p]) progGroups[p] = [];
                      if (st.student?.registerNumber) {
                        progGroups[p].push(st.student.registerNumber);
                      }
                    });

                    return Object.entries(progGroups).map(([prog, regs], pIdx) => {
                      regs.sort();
                      const fromReg = regs[0];
                      const toReg = regs[regs.length - 1];
                      return (
                        <tr key={`${hg.hall._id}-${prog}`}>
                          {pIdx === 0 && (
                            <td rowSpan={Object.keys(progGroups).length} style={{ fontWeight: 700, color: '#1b365d' }}>
                              {hg.hall.hallCode || hg.hall.hallNumber}
                            </td>
                          )}
                          {pIdx === 0 && (
                            <td rowSpan={Object.keys(progGroups).length}>
                              {hg.hall.block} Block • {hg.hall.floor} Floor
                            </td>
                          )}
                          <td style={{ fontWeight: 600 }}>{prog}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                            {fromReg} – {toReg}
                          </td>
                          <td style={{ fontWeight: 700 }}>{regs.length}</td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
          <Building2 size={40} color="#94a3b8" style={{ margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.1rem', color: '#1b365d', marginBottom: '0.35rem' }}>
            No Seating Plan Generated Yet For This Slot
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
            Click "Auto-Generate Seating" above to automatically allocate students across exam halls using two-student per bench pairing rules and compact cluster selection.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => handleGenerate(false)}
            disabled={generating || !analysis?.canGenerate}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Sparkles size={16} />
            <span>Generate Seating Plan Now</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default SeatingArrangement;
