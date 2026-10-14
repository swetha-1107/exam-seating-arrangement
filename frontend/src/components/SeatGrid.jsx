import React, { useState } from 'react';
import Modal from './Modal';
import { User, MapPin, BookOpen, Layers } from 'lucide-react';

const getRowLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

const PROGRAMME_COLORS = {
  IT: { bg: '#e0f2fe', border: '#0284c7', text: '#0369a1', badge: '#0284c7' },
  CSE: { bg: '#f3e8ff', border: '#9333ea', text: '#7e22ce', badge: '#9333ea' },
  ECE: { bg: '#ccfbf1', border: '#0d9488', text: '#0f766e', badge: '#0d9488' },
  EEE: { bg: '#ffedd5', border: '#ea580c', text: '#c2410c', badge: '#ea580c' },
  AIDS: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', badge: '#16a34a' },
  MECH: { bg: '#fef3c7', border: '#d97706', text: '#b45309', badge: '#d97706' },
  AUTO: { bg: '#fee2e2', border: '#dc2626', text: '#b91c1c', badge: '#dc2626' },
  CIVIL: { bg: '#ede9fe', border: '#7c3aed', text: '#6d28d9', badge: '#7c3aed' },
};

const getProgStyle = (prog) => {
  if (!prog) return { bg: '#f8fafc', border: '#cbd5e1', text: '#64748b', badge: '#94a3b8' };
  const upper = prog.toUpperCase();
  for (const [key, val] of Object.entries(PROGRAMME_COLORS)) {
    if (upper.includes(key)) return val;
  }
  return { bg: '#f1f5f9', border: '#64748b', text: '#334155', badge: '#64748b' };
};

const SeatGrid = ({ hall, seats = [], highlightRegisterNumber = null, mySeatLabel = null }) => {
  const [selectedSeat, setSelectedSeat] = useState(null);

  if (!hall) return null;

  const rows = hall.benchRows || hall.rows || 4;
  const cols = hall.benchColumns || hall.columns || 4;

  console.log('[SeatGrid] Raw seats prop received:', seats);

  const normMySeat = mySeatLabel ? String(mySeatLabel).trim().toUpperCase() : null;

  // Build grid lookup by ONE consistent key: seatLabel (e.g. "A1-R").
  // Normalise both sides (trim, uppercase) before comparing.
  const benchSeatMap = {};
  const progCounts = {};

  seats.forEach((seat) => {
    const rawLabel = seat?.seatLabel || seat?.seatNumber;
    if (rawLabel) {
      const key = String(rawLabel).trim().toUpperCase();
      benchSeatMap[key] = seat;
    }
    if (seat?.benchRow !== undefined || seat?.row !== undefined) {
      const r = seat.benchRow !== undefined ? seat.benchRow : seat.row;
      const c = seat.benchColumn !== undefined ? seat.benchColumn : seat.column;
      const side = (seat.side || 'L').toUpperCase();
      benchSeatMap[`${r}-${c}-${side}`] = seat;
    }

    if (seat?.student?.programme || seat?.student?.department) {
      const prog = seat.student.programme || seat.student.department;
      progCounts[prog] = (progCounts[prog] || 0) + 1;
    }
  });

  console.log('[SeatGrid] Seat-lookup map keys:', Object.keys(benchSeatMap));

  // Determine if this is Student View Mode
  const isStudentView = !!normMySeat || seats.some((s) => s?.occupied || s?.isMine !== undefined);

  // Compute student view counters: "YOU: 1, OTHERS: 31, VACANT: 0"
  let youCount = 0;
  let othersCount = 0;

  if (isStudentView) {
    Array.from({ length: rows }).forEach((_, r) => {
      const rowLetter = getRowLetter(r);
      Array.from({ length: cols }).forEach((_, c) => {
        const benchCode = `${rowLetter}${c + 1}`;
        ['L', 'R'].forEach((side) => {
          const lbl = `${benchCode}-${side}`.trim().toUpperCase();
          const s = benchSeatMap[lbl];
          const isMine = (normMySeat && lbl === normMySeat) || s?.isMine === true;
          if (isMine) {
            youCount++;
          } else if (s && (s.occupied || s.student)) {
            othersCount++;
          }
        });
      });
    });
  }
  const vacantCount = Math.max(0, rows * cols * 2 - (youCount + othersCount));

  return (
    <div className="hall-visual-container" style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Hall Details Header & Legend */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#1b365d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#1b365d" />
            <span>Hall {hall.hallCode || hall.hallNumber}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
              {hall.block || hall.building || 'MAIN'} BLOCK • {hall.floor} FLOOR
            </span>
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
            Configuration: {rows} Bench Rows × {cols} Columns (2 Seats per Bench) • Capacity: {hall.capacity || rows * cols * 2} • Seated: {isStudentView ? youCount + othersCount : seats.length}
          </p>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {isStudentView ? (
            <>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#dcfce7',
                  color: '#15803d',
                  border: '1px solid #16a34a',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>YOU:</span>
                <strong>{youCount}</strong>
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>OTHERS:</span>
                <strong>{othersCount}</strong>
              </span>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#f8fafc',
                  color: '#94a3b8',
                  border: '1px dashed #cbd5e1',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                <span>VACANT:</span>
                <strong>{vacantCount}</strong>
              </span>
            </>
          ) : (
            <>
              {Object.entries(progCounts).map(([prog, count]) => {
                const style = getProgStyle(prog);
                return (
                  <span
                    key={prog}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '4px',
                      background: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <span>{prog}:</span>
                    <strong>{count}</strong>
                  </span>
                );
              })}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 500,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  background: '#f8fafc',
                  color: '#94a3b8',
                  border: '1px dashed #cbd5e1',
                }}
              >
                Vacant
              </span>
            </>
          )}
        </div>
      </div>

      {/* Blackboard / Screen at the front */}
      <div
        style={{
          background: '#0f172a',
          color: '#ffffff',
          textAlign: 'center',
          padding: '0.45rem',
          borderRadius: '4px',
          fontWeight: 700,
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
          marginBottom: '1.25rem',
        }}
      >
        ▼ FRONT OF HALL • INVIGILATOR DESK &amp; BLACKBOARD ▼
      </div>

      {/* 2-Student Bench Matrix */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, minmax(190px, 1fr))`,
            gap: '0.85rem',
          }}
        >
          {Array.from({ length: rows }).map((_, r) => {
            const rowLetter = getRowLetter(r);
            return Array.from({ length: cols }).map((_, c) => {
              const benchCode = `${rowLetter}${c + 1}`;
              const labelL = `${benchCode}-L`.trim().toUpperCase();
              const labelR = `${benchCode}-R`.trim().toUpperCase();

              const seatL = benchSeatMap[labelL] || benchSeatMap[`${r}-${c}-L`];
              const seatR = benchSeatMap[labelR] || benchSeatMap[`${r}-${c}-R`];

              const renderSeatHalf = (seat, side, label) => {
                const normLabel = String(label).trim().toUpperCase();
                const isMine = (normMySeat && normLabel === normMySeat) || seat?.isMine === true;

                if (isStudentView) {
                  if (isMine) {
                    return (
                      <div
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: '4px',
                          background: '#dcfce7',
                          border: '2px solid #16a34a',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '72px',
                          boxShadow: '0 0 0 2px rgba(22,163,74,0.25)',
                          transition: 'all 0.15s ease',
                        }}
                        title={`${label}: YOUR DESK`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#15803d', fontFamily: 'monospace' }}>
                            {label}
                          </span>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '0.05rem 0.35rem',
                              borderRadius: '3px',
                              background: '#16a34a',
                              color: '#ffffff',
                            }}
                          >
                            YOU
                          </span>
                        </div>
                        <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#15803d', textAlign: 'center', margin: 'auto 0' }}>
                          YOUR DESK
                        </div>
                      </div>
                    );
                  } else if (seat && (seat.occupied || seat.student)) {
                    return (
                      <div
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: '4px',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '72px',
                          transition: 'all 0.15s ease',
                        }}
                        title={`${label}: Occupied`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', fontFamily: 'monospace' }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textAlign: 'center', margin: 'auto 0' }}>
                          Occupied
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        style={{
                          flex: 1,
                          padding: '0.45rem',
                          borderRadius: '4px',
                          background: '#f8fafc',
                          border: '1px dashed #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: '72px',
                        }}
                        title={`${label}: Vacant`}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>
                            {label}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', margin: 'auto 0' }}>
                          Vacant
                        </div>
                      </div>
                    );
                  }
                }

                // Admin / Reports Mode:
                const isTarget =
                  highlightRegisterNumber &&
                  seat?.student?.registerNumber?.toUpperCase() === highlightRegisterNumber.toUpperCase();

                const prog = seat?.student?.programme || seat?.student?.department;
                const style = getProgStyle(prog);

                return (
                  <div
                    onClick={() => seat && setSelectedSeat(seat)}
                    style={{
                      flex: 1,
                      padding: '0.45rem',
                      borderRadius: '4px',
                      cursor: seat ? 'pointer' : 'default',
                      background: seat ? style.bg : '#f8fafc',
                      border: isTarget
                        ? '2px solid #2563eb'
                        : seat
                        ? `1px solid ${style.border}`
                        : '1px dashed #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '72px',
                      boxShadow: isTarget ? '0 0 0 2px rgba(37,99,235,0.2)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                    title={
                      seat
                        ? `${label}: ${seat.student?.name} (${seat.student?.registerNumber}) - ${seat.paper?.courseName || ''}`
                        : `${label}: Vacant`
                    }
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: seat ? style.text : '#94a3b8', fontFamily: 'monospace' }}>
                        {label}
                      </span>
                      {seat && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '0.05rem 0.3rem',
                            borderRadius: '3px',
                            background: style.badge,
                            color: '#ffffff',
                          }}
                        >
                          {prog}
                        </span>
                      )}
                    </div>

                    {seat ? (
                      <div style={{ marginTop: '0.2rem' }}>
                        <div
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#0f172a',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {seat.student?.registerNumber}
                        </div>
                        <div
                          style={{
                            fontSize: '0.68rem',
                            color: '#334155',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {seat.student?.name}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.68rem', color: '#cbd5e1', textAlign: 'center', margin: 'auto 0' }}>
                        Vacant
                      </div>
                    )}
                  </div>
                );
              };

              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '0.35rem',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      marginBottom: '0.25rem',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Bench {benchCode} (Two-Seater Desk)
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    {renderSeatHalf(seatL, 'L', labelL)}
                    {renderSeatHalf(seatR, 'R', labelR)}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Modal with detailed student info when a seat is clicked */}
      <Modal
        isOpen={!isStudentView && !!selectedSeat}
        onClose={() => setSelectedSeat(null)}
        title={`Seat Allocation Details: ${selectedSeat?.seatLabel || ''} (Hall ${hall.hallCode || hall.hallNumber})`}
        maxWidth="460px"
        footer={
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSeat(null)}>
            Close
          </button>
        }
      >
        {selectedSeat && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={24} />
              </div>
              <div>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#1b365d' }}>
                  {selectedSeat.student?.name || 'Student'}
                </h4>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.15rem 0 0 0', fontFamily: 'monospace' }}>
                  Reg No: <strong>{selectedSeat.student?.registerNumber}</strong>
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Programme:</span>
                  <div style={{ fontWeight: 700, color: '#1b365d' }}>{selectedSeat.student?.programme || selectedSeat.student?.department}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Desk &amp; Side:</span>
                  <div style={{ fontWeight: 700, color: '#1b365d' }}>
                    Seat {selectedSeat.seatLabel} ({selectedSeat.side === 'L' ? 'Left' : 'Right'} Side)
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>Exam Paper:</span>
                  <div style={{ fontWeight: 600, color: '#1b365d' }}>
                    {selectedSeat.paper?.courseCode} – {selectedSeat.paper?.courseName}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SeatGrid;
