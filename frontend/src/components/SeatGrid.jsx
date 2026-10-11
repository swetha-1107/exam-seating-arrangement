import React, { useState } from 'react';
import Modal from './Modal';
import { User, CheckCircle2, MapPin } from 'lucide-react';

const getRowLetter = (index) => {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
};

const SeatGrid = ({ hall, seats = [], highlightRegisterNumber = null }) => {
  const [selectedSeat, setSelectedSeat] = useState(null);

  if (!hall) return null;

  const rows = hall.rows || 5;
  const cols = hall.columns || 6;

  // Map seats by `${r}-${c}`
  const seatMap = {};
  seats.forEach((seat) => {
    const key = `${seat.row}-${seat.column}`;
    seatMap[key] = seat;
  });

  return (
    <div className="hall-visual-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="#2563eb" />
            <span>Hall {hall.hallNumber}</span>
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {hall.building} • Floor {hall.floor} • Capacity: {hall.capacity} ({rows} Rows × {cols} Columns)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="badge badge-blue">IT</span>
          <span className="badge badge-purple">CSE</span>
          <span className="badge badge-teal">ECE</span>
          <span className="badge badge-amber">MECH</span>
          <span className="badge badge-gray">Empty</span>
        </div>
      </div>

      {/* Blackboard / Screen at the front */}
      <div className="board-banner">
        FRONT OF HALL / BLACKBOARD SCREEN
      </div>

      {/* Seat Matrix */}
      <div className="seats-grid-wrapper">
        <div
          className="seat-matrix"
          style={{
            gridTemplateColumns: `repeat(${cols}, 68px)`,
          }}
        >
          {Array.from({ length: rows }).map((_, r) => {
            const rowLetter = getRowLetter(r);
            return Array.from({ length: cols }).map((_, c) => {
              const seatCode = `${rowLetter}${c + 1}`;
              const assigned = seatMap[`${r}-${c}`];
              const isTargetStudent =
                highlightRegisterNumber &&
                assigned?.student?.registerNumber?.toUpperCase() ===
                  highlightRegisterNumber.toUpperCase();

              const dept = assigned?.student?.department?.toUpperCase() || '';

              let deptClass = '';
              if (assigned) {
                if (dept.includes('IT')) deptClass = 'dept-IT';
                else if (dept.includes('CSE')) deptClass = 'dept-CSE';
                else if (dept.includes('ECE')) deptClass = 'dept-ECE';
                else if (dept.includes('MECH')) deptClass = 'dept-MECH';
                else deptClass = 'occupied';
              } else {
                deptClass = 'empty';
              }

              return (
                <div
                  key={`${r}-${c}`}
                  className={`seat-cell ${deptClass} ${isTargetStudent ? 'target-student' : ''}`}
                  onClick={() => assigned && setSelectedSeat(assigned)}
                  title={
                    assigned
                      ? `${seatCode}: ${assigned.student?.name} (${assigned.student?.registerNumber})`
                      : `${seatCode}: Empty Desk`
                  }
                >
                  <span className="seat-num">{seatCode}</span>
                  {assigned ? (
                    <span className="seat-student-reg">
                      {assigned.student?.registerNumber || 'Assigned'}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Empty</span>
                  )}
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* Modal with detailed student info when a seat is clicked */}
      <Modal
        isOpen={!!selectedSeat}
        onClose={() => setSelectedSeat(null)}
        title={`Seat Details: ${selectedSeat?.seatNumber || ''} (Hall ${hall.hallNumber})`}
        maxWidth="440px"
        footer={
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedSeat(null)}>
            Close
          </button>
        }
      >
        {selectedSeat && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <User size={26} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>
                  {selectedSeat.student?.name || 'Student'}
                </h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Register No: <strong>{selectedSeat.student?.registerNumber}</strong>
                </p>
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b' }}>Department:</span>
                  <div style={{ fontWeight: 600 }}>{selectedSeat.student?.department}</div>
                </div>
                <div>
                  <span style={{ color: '#64748b' }}>Year & Section:</span>
                  <div style={{ fontWeight: 600 }}>
                    Year {selectedSeat.student?.year} - Sec {selectedSeat.student?.section}
                  </div>
                </div>
                <div style={{ gridColumn: 'span 2', marginTop: '0.25rem' }}>
                  <span style={{ color: '#64748b' }}>Email:</span>
                  <div style={{ fontWeight: 500 }}>{selectedSeat.student?.email}</div>
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
