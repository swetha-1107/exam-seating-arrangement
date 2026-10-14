import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  CalendarDays,
  Building2,
  Grid3X3,
  UserCheck,
  CheckCircle2,
  Layers,
  Clock,
} from 'lucide-react';
import api from '../services/api';
import SeatGrid from '../components/SeatGrid';

const ReportsPage = () => {
  const [reportType, setReportType] = useState('notice'); // 'notice', 'chart', 'timetable', 'invigilation'
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [slotPlan, setSlotPlan] = useState(null);
  const [invigilationDuties, setInvigilationDuties] = useState([]);
  const [selectedHallIdx, setSelectedHallIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // Fetch slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const res = await api.get('/seating/slots');
        setSlots(res.data);
        if (res.data.length > 0) {
          setSelectedSlotId(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load slots for reports:', err);
      }
    };
    fetchSlots();
  }, []);

  // Fetch slot plan and invigilation duties
  useEffect(() => {
    const loadReportData = async () => {
      if (!selectedSlotId) return;
      setLoading(true);
      try {
        const [planRes, invigRes] = await Promise.all([
          api.get(`/seating/slot/${selectedSlotId}`),
          api.get('/invigilation', { params: { slotId: selectedSlotId } }),
        ]);

        setSlotPlan(planRes.data);
        setInvigilationDuties(invigRes.data);
        setSelectedHallIdx(0);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [selectedSlotId]);

  const handlePrint = () => {
    window.print();
  };

  const selectedSlot = slots.find((s) => s._id === selectedSlotId);
  const halls = slotPlan?.halls || [];
  const activeHall = halls[selectedHallIdx] || null;

  return (
    <div>
      {/* Top Bar (Hidden during Print) */}
      <div className="page-header no-print" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Autonomous Examination Cell • Easwari Engineering College
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Official Examination Reports &amp; Notices
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Generate and print verified examination notices, hall charts, timetables, and invigilation duty rosters.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={handlePrint} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Printer size={16} />
            <span>Print Official Notice</span>
          </button>
        </div>
      </div>

      {/* Report Controls (Hidden during Print) */}
      <div className="card no-print" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Report Type Selector */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setReportType('notice')}
              className={`btn btn-sm ${reportType === 'notice' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <FileText size={14} />
              <span>1. Seating Arrangement Notice</span>
            </button>
            <button
              onClick={() => setReportType('chart')}
              className={`btn btn-sm ${reportType === 'chart' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Grid3X3 size={14} />
              <span>2. Hall Bench Chart</span>
            </button>
            <button
              onClick={() => setReportType('timetable')}
              className={`btn btn-sm ${reportType === 'timetable' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <CalendarDays size={14} />
              <span>3. Timetable Notice</span>
            </button>
            <button
              onClick={() => setReportType('invigilation')}
              className={`btn btn-sm ${reportType === 'invigilation' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <UserCheck size={14} />
              <span>4. Invigilation Roster</span>
            </button>
          </div>

          {/* Slot Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
              Slot:
            </label>
            <select
              value={selectedSlotId}
              onChange={(e) => setSelectedSlotId(e.target.value)}
              className="form-control"
              style={{ minWidth: '280px', fontSize: '0.85rem' }}
            >
              {slots.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.date} ({s.startTime} - {s.endTime}) [{s.seatingStatus || 'NOT_GENERATED'}]
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Hall Sub-selector for Bench Chart */}
        {reportType === 'chart' && halls.length > 0 && (
          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Select Hall:</span>
            {halls.map((hg, idx) => (
              <button
                key={hg.hall._id}
                onClick={() => setSelectedHallIdx(idx)}
                className={`btn btn-sm ${selectedHallIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.8rem' }}
              >
                {hg.hall.hallCode || hg.hall.hallNumber} ({hg.seatsCount} seats)
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PRINTABLE DOCUMENT AREA */}
      <div className="printable-document" style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {/* Institutional Letterhead Header */}
        <div style={{ textAlign: 'center', borderBottom: '2px solid #1b365d', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#1b365d', fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.04em' }}>
            EASWARI ENGINEERING COLLEGE
          </h2>
          <div style={{ fontSize: '0.82rem', color: '#475569', fontWeight: 600, margin: '0.15rem 0' }}>
            (An Autonomous Institution, Affiliated to Anna University Chennai)
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Bharathi Salai, Ramapuram, Chennai - 600 089, Tamil Nadu
          </div>
          <div style={{ fontSize: '0.9rem', color: '#1b365d', fontWeight: 800, marginTop: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            OFFICE OF THE CONTROLLER OF EXAMINATIONS
          </div>
        </div>

        {/* ======================================================== */}
        {/* REPORT 1: SEATING ARRANGEMENT NOTICE                    */}
        {/* ======================================================== */}
        {reportType === 'notice' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: 800, textDecoration: 'underline' }}>
                NOTICE TO CANDIDATES: SEATING ARRANGEMENT
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                {selectedSlot?.series?.name || 'Continuous Assessment Test II (CAT II)'} — Date: <u>{selectedSlot?.date}</u> &nbsp;|&nbsp; Time: <u>{selectedSlot?.startTime} – {selectedSlot?.endTime}</u>
                {selectedSlot?.reuseStatus && (
                  <span
                    style={{
                      marginLeft: '0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      background: selectedSlot.reuseStatus === 'RE-PLANNED' ? '#fef3c7' : '#dcfce7',
                      color: selectedSlot.reuseStatus === 'RE-PLANNED' ? '#b45309' : '#15803d',
                      border: `1px solid ${selectedSlot.reuseStatus === 'RE-PLANNED' ? '#f59e0b' : '#16a34a'}`,
                    }}
                  >
                    PLAN: {selectedSlot.reuseStatus}
                  </span>
                )}
              </p>
              {selectedSlot?.reuseStatus === 'RE-PLANNED' && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#b45309', fontWeight: 700, background: '#fffbeb', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                  ★ NOTICE: Seating arrangement for this examination date has been re-planned independently to resolve paper sharing constraints.
                </div>
              )}
              {selectedSlot?.papers && selectedSlot.papers.length > 0 && (
                <div style={{ marginTop: '0.45rem', fontSize: '0.82rem', color: '#1b365d', fontWeight: 600 }}>
                  <strong>Scheduled Papers:</strong>{' '}
                  {selectedSlot.papers.map((p) => `${p.courseCode} – ${p.courseName}`).join(' | ')}
                </div>
              )}
            </div>

            {/* Notice Table with Contiguous Register Ranges */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #1b365d', borderBottom: '2px solid #1b365d' }}>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>S.No</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Hall Code</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Block &amp; Floor</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Programme</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Register Number Range</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let serial = 1;
                  let grandTotal = 0;
                  const rows = [];

                  halls.forEach((hg) => {
                    const progMap = {};
                    hg.seats.forEach((st) => {
                      const p = st.student?.programme || 'OTHER';
                      if (!progMap[p]) progMap[p] = [];
                      if (st.student?.registerNumber) progMap[p].push(st.student.registerNumber);
                    });

                    const progs = Object.keys(progMap);
                    progs.forEach((prog, pIdx) => {
                      const regs = progMap[prog].sort();
                      const fromReg = regs[0];
                      const toReg = regs[regs.length - 1];
                      grandTotal += regs.length;

                      rows.push(
                        <tr key={`${hg.hall._id}-${prog}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {serial++}
                          </td>
                          {pIdx === 0 && (
                            <td
                              rowSpan={progs.length}
                              style={{ padding: '0.5rem', fontWeight: 800, color: '#1b365d', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}
                            >
                              {hg.hall.hallCode || hg.hall.hallNumber}
                            </td>
                          )}
                          {pIdx === 0 && (
                            <td
                              rowSpan={progs.length}
                              style={{ padding: '0.5rem', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}
                            >
                              {hg.hall.block} BLOCK ({hg.hall.floor} FLOOR)
                            </td>
                          )}
                          <td style={{ padding: '0.5rem', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                            {prog}
                          </td>
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                            {fromReg} &nbsp;TO&nbsp; {toReg}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                            {regs.length}
                          </td>
                        </tr>
                      );
                    });
                  });

                  if (rows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                          No seating plan generated for this examination slot.
                        </td>
                      </tr>
                    );
                  }

                  // Add Grand Total Row
                  rows.push(
                    <tr key="grand-total" style={{ background: '#f8fafc', fontWeight: 800, borderTop: '2px solid #1b365d' }}>
                      <td colSpan={5} style={{ padding: '0.6rem 0.75rem', textAlign: 'right', border: '1px solid #cbd5e1' }}>
                        GRAND TOTAL CANDIDATES:
                      </td>
                      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                        {grandTotal}
                      </td>
                    </tr>
                  );

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* REPORT 2: HALL-WISE 2D BENCH SEATING CHART              */}
        {/* ======================================================== */}
        {reportType === 'chart' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: 800 }}>
                HALL-WISE BENCH SEATING CHART
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                Hall: <u>{activeHall?.hall?.hallCode || activeHall?.hall?.hallNumber}</u> ({activeHall?.hall?.block} Block, {activeHall?.hall?.floor} Floor) &nbsp;|&nbsp; Date: <u>{selectedSlot?.date}</u> ({selectedSlot?.startTime} - {selectedSlot?.endTime})
              </p>
            </div>

            {activeHall ? (
              <SeatGrid hall={activeHall.hall} seats={activeHall.seats} />
            ) : (
              <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                No hall seating plan available.
              </p>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* REPORT 3: OFFICIAL TIMETABLE NOTICE                     */}
        {/* ======================================================== */}
        {reportType === 'timetable' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: 800, textDecoration: 'underline' }}>
                EXAMINATION TIMETABLE NOTIFICATION
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                {selectedSlot?.series?.name || 'Continuous Assessment Test II (CAT II)'} — Academic Year 2026-2027 (Odd Semester)
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #1b365d', borderBottom: '2px solid #1b365d' }}>
                  <th style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>S.No</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Date &amp; Session</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Course Code</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Course Name</th>
                  <th style={{ padding: '0.6rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Programmes</th>
                  <th style={{ padding: '0.6rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>Type</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let serial = 1;
                  const rows = [];
                  slots.forEach((sl) => {
                    (sl.papers || []).forEach((p, pIdx) => {
                      rows.push(
                        <tr key={`${sl._id}-${p.courseCode}`} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>
                            {serial++}
                          </td>
                          {pIdx === 0 && (
                            <td
                              rowSpan={sl.papers.length}
                              style={{ padding: '0.5rem', fontWeight: 700, color: '#1b365d', border: '1px solid #cbd5e1', verticalAlign: 'middle' }}
                            >
                              <div>{sl.date}</div>
                              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{sl.startTime} – {sl.endTime}</div>
                            </td>
                          )}
                          <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', border: '1px solid #cbd5e1' }}>
                            {p.courseCode}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: 600, border: '1px solid #cbd5e1' }}>
                            {p.courseName}
                          </td>
                          <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>
                            <strong>{p.programmes?.join(', ') || 'All'}</strong>
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                            {p.type}
                          </td>
                        </tr>
                      );
                    });
                  });
                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================== */}
        {/* REPORT 4: INVIGILATION DUTY CHART                       */}
        {/* ======================================================== */}
        {reportType === 'invigilation' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.15rem', textTransform: 'uppercase', fontWeight: 800, textDecoration: 'underline' }}>
                INVIGILATION DUTY ROSTER &amp; ATTENDANCE
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', fontWeight: 600 }}>
                Date: <u>{selectedSlot?.date}</u> &nbsp;|&nbsp; Session: <u>{selectedSlot?.startTime} – {selectedSlot?.endTime}</u>
              </p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderTop: '2px solid #1b365d', borderBottom: '2px solid #1b365d' }}>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>S.No</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Hall Code</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Block &amp; Floor</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Invigilator Name</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Department</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'left', border: '1px solid #cbd5e1' }}>Contact No</th>
                  <th style={{ padding: '0.6rem 0.5rem', textAlign: 'center', border: '1px solid #cbd5e1', width: '130px' }}>Signature</th>
                </tr>
              </thead>
              <tbody>
                {invigilationDuties.map((duty, idx) => (
                  <tr key={duty._id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={{ padding: '0.5rem', textAlign: 'center', border: '1px solid #cbd5e1' }}>{idx + 1}</td>
                    <td style={{ padding: '0.5rem', fontWeight: 800, color: '#1b365d', border: '1px solid #cbd5e1' }}>
                      {duty.hall?.hallCode || duty.hall?.hallNumber}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>
                      {duty.hall?.block} Block ({duty.hall?.floor} Floor)
                    </td>
                    <td style={{ padding: '0.5rem', fontWeight: 700, border: '1px solid #cbd5e1' }}>
                      {duty.faculty?.name}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}>
                      {duty.faculty?.department}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1', fontFamily: 'monospace' }}>
                      {duty.faculty?.phone || '—'}
                    </td>
                    <td style={{ padding: '0.5rem', border: '1px solid #cbd5e1' }}></td>
                  </tr>
                ))}
                {invigilationDuties.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No invigilators assigned for this slot yet. Assign invigilators via the Invigilation module.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Official Signatures Footer */}
        <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ textAlign: 'center', minWidth: '220px' }}>
            <div style={{ borderBottom: '1px solid #475569', height: '36px', marginBottom: '0.4rem' }}></div>
            <strong style={{ fontSize: '0.85rem', color: '#1b365d', display: 'block' }}>
              Deputy Controller of Examinations
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Easwari Engineering College</span>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ border: '1px solid #94a3b8', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.4rem auto', color: '#94a3b8', fontSize: '0.68rem', fontWeight: 700 }}>
              COE SEAL
            </div>
          </div>

          <div style={{ textAlign: 'center', minWidth: '220px' }}>
            <div style={{ borderBottom: '1px solid #475569', height: '36px', marginBottom: '0.4rem' }}></div>
            <strong style={{ fontSize: '0.85rem', color: '#1b365d', display: 'block' }}>
              Controller of Examinations
            </strong>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Easwari Engineering College</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
