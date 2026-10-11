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

  // Analysis & Plan Data
  const [analysis, setAnalysis] = useState(null);
  const [seatingData, setSeatingData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Fetch available Slots
  useEffect(() => {
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

    fetchSlots();
  }, []);

  // 2. Whenever selectedSlotId changes, load analysis and seating plan
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
  }, [selectedSlotId]);

  // 3. Generate Seating Plan (Two-Seat Bench Mixed Pairing)
  const handleGenerate = async (forceReplace = false) => {
    if (!selectedSlotId) return;
    try {
      setGenerating(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/generate-slot/${selectedSlotId}`, {
        forceReplace,
      });

      setSuccess(res.data.message || 'Seating plan generated successfully (DRAFT)!');
      await loadSlotDetails(selectedSlotId);

      // Refresh slots list to update status
      const slotsRes = await api.get('/seating/slots');
      setSlots(slotsRes.data);
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

  // 4. Publish Seating Plan
  const handlePublish = async () => {
    if (!selectedSlotId) return;
    try {
      setPublishing(true);
      setError('');
      setSuccess('');

      const res = await api.post(`/seating/publish-slot/${selectedSlotId}`);
      setSuccess(res.data.message || 'Seating plan PUBLISHED! Students can now see their seat assignments.');
      await loadSlotDetails(selectedSlotId);

      // Refresh slots list
      const slotsRes = await api.get('/seating/slots');
      setSlots(slotsRes.data);
    } catch (err) {
      setError(err.message || 'Failed to publish seating plan.');
    } finally {
      setPublishing(false);
    }
  };

  // 5. Clear Seating Plan
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

      const slotsRes = await api.get('/seating/slots');
      setSlots(slotsRes.data);
    } catch (err) {
      setError(err.message || 'Failed to clear seating plan.');
    } finally {
      setClearing(false);
    }
  };

  const currentSlot = slots.find((s) => s._id === selectedSlotId);
  const halls = seatingData?.halls || [];
  const activeHall = halls[selectedHallIdx] || null;

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Easwari Engineering College • Examination Seating System
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Automated Slot Seating Allocation
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Automatic 2-student-per-bench pairing across multiple programmes with contiguous register number chunking.
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

      {/* Slot Selection Card */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#1b365d' }}>
              Select Examination Slot:
            </label>
            <select
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="form-control"
              style={{ minWidth: '320px', fontWeight: 600 }}
              disabled={loading}
            >
              {slots.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.date} ({s.startTime} - {s.endTime}) — {s.papersCount} Paper(s) [{s.seatingStatus || 'NOT_GENERATED'}]
                </option>
              ))}
            </select>
          </div>

          {currentSlot && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Status:</span>
              {currentSlot.seatingStatus === 'PUBLISHED' ? (
                <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CheckCircle2 size={13} /> PUBLISHED
                </span>
              ) : currentSlot.seatingStatus === 'DRAFT' ? (
                <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={13} /> DRAFT (UNPUBLISHED)
                </span>
              ) : (
                <span className="badge badge-secondary">NOT GENERATED</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Readiness Diagnostics Summary Card */}
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
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569' }}>
                Applicable Students: <strong>{analysis.totalStudents}</strong> across <strong>{analysis.papers?.length || 0} papers</strong> • Available Hall Capacity: <strong>{analysis.availableCapacity} seats</strong> • Halls Needed: <strong>~{analysis.hallsNeeded}</strong>
              </p>
            </div>

            {/* Actions Toolbar */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleGenerate(false)}
                disabled={generating || !analysis.canGenerate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Sparkles size={14} />
                <span>{halls.length > 0 ? 'Regenerate Seating' : 'Auto-Generate Seating'}</span>
              </button>

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
                <strong>{p.courseCode}:</strong> {p.studentCount} students ({p.programmes?.join(', ') || 'All'})
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
            No Seating Plan Generated Yet
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.25rem auto' }}>
            Click "Auto-Generate Seating" above to automatically allocate students across exam halls using the university two-student per bench pairing rules.
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
