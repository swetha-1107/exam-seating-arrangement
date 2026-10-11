import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  CalendarDays,
  Building2,
  Grid3X3,
  UserCheck,
} from 'lucide-react';
import api from '../services/api';

const ReportsPage = () => {
  const [reportType, setReportType] = useState('seating'); // 'seating' or 'invigilation'
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [seatingRecords, setSeatingRecords] = useState([]);
  const [invigilationRecords, setInvigilationRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        setExams(res.data);
        if (res.data.length > 0) {
          setSelectedExamId(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to load exams for reports:', err);
      }
    };
    fetchExams();
  }, []);

  useEffect(() => {
    const fetchReportData = async () => {
      if (!selectedExamId) return;
      setLoading(true);
      try {
        if (reportType === 'seating') {
          const res = await api.get(`/seating/${selectedExamId}`);
          const flattened = [];
          if (res.data?.halls) {
            res.data.halls.forEach((hGroup) => {
              hGroup.seats.forEach((s) => {
                flattened.push({
                  hallNumber: hGroup.hallDetails.hallNumber,
                  building: hGroup.hallDetails.building,
                  seatNumber: s.seatNumber,
                  registerNumber: s.student?.registerNumber,
                  name: s.student?.name,
                  department: s.student?.department,
                  year: s.student?.year,
                  section: s.student?.section,
                });
              });
            });
          }
          flattened.sort((a, b) => a.hallNumber.localeCompare(b.hallNumber) || a.seatNumber.localeCompare(b.seatNumber));
          setSeatingRecords(flattened);
        } else {
          const res = await api.get('/invigilation', {
            params: { examId: selectedExamId },
          });
          setInvigilationRecords(res.data);
        }
      } catch (err) {
        console.error('Error fetching report data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReportData();
  }, [reportType, selectedExamId]);

  const handlePrint = () => {
    window.print();
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);

  return (
    <div>
      <div className="page-header no-print">
        <div>
          <h1>Examination Reports & Roster Generator</h1>
          <p>Easwari Engineering College • Generate and print official master seating charts and invigilation duty registers.</p>
        </div>
        <div className="header-actions">
          <button onClick={handlePrint} className="btn btn-primary">
            <Printer size={16} />
            <span>Print Official Document</span>
          </button>
        </div>
      </div>

      {/* Report Controls (Hidden during Print) */}
      <div className="card no-print" style={{ marginBottom: '2rem' }}>
        <div className="filter-bar" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>
              Select Document Type:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className={`btn btn-sm ${reportType === 'seating' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setReportType('seating')}
              >
                <Grid3X3 size={14} />
                <span>Master Seating Roster</span>
              </button>
              <button
                type="button"
                className={`btn btn-sm ${reportType === 'invigilation' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setReportType('invigilation')}
              >
                <UserCheck size={14} />
                <span>Invigilation Duty Chart</span>
              </button>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>
              Select Examination:
            </label>
            <select
              className="form-control"
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
            >
              {exams.map((exam) => (
                <option key={exam._id} value={exam._id}>
                  [{exam.examCode || 'EXAM'}] {exam.examName} ({exam.examDate} • Dept: {exam.department})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Official Easwari Engineering College Printable Letterhead */}
      <div className="print-header" style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid #1b365d', paddingBottom: '1rem' }}>
        <img
          src="/college_logo.jpg"
          alt="Easwari Engineering College Crest"
          style={{ width: 68, height: 68, objectFit: 'contain', margin: '0 auto 0.5rem auto' }}
        />
        <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1b365d', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
          EASWARI ENGINEERING COLLEGE
        </h2>
        <div style={{ fontSize: '0.85rem', color: '#7a1c1d', fontWeight: 700, margin: '2px 0' }}>
          (Autonomous Institution • Affiliated to Anna University, Chennai)
        </div>
        <div style={{ fontSize: '0.8rem', color: '#475569' }}>
          Bharathi Salai, Ramapuram, Chennai – 600 089, Tamil Nadu, India
        </div>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginTop: '0.6rem', textDecoration: 'underline' }}>
          OFFICE OF THE CONTROLLER OF EXAMINATIONS
        </h3>
        <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1b365d', margin: '4px 0 0 0' }}>
          {reportType === 'seating' ? 'OFFICIAL CANDIDATE SEATING ALLOCATION ROSTER' : 'OFFICIAL INVIGILATION DUTY ATTENDANCE REGISTER'}
        </p>

        {selectedExam && (
          <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.8rem', background: '#f8fafc', borderRadius: '6px', display: 'inline-block', fontSize: '0.85rem', border: '1px solid #e2e8f0' }}>
            <span>Course: <strong>{selectedExam.examCode} - {selectedExam.examName}</strong></span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>Date: <strong>{selectedExam.examDate}</strong></span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>Time: <strong>{selectedExam.startTime} - {selectedExam.endTime}</strong></span>
            <span style={{ margin: '0 8px' }}>|</span>
            <span>Dept: <strong>{selectedExam.department}</strong> (Sem {selectedExam.semester})</span>
          </div>
        )}
      </div>

      {/* Report Table Card */}
      <div className="card">
        <div className="card-header no-print">
          <h3 className="card-title">
            {reportType === 'seating' ? 'Student Seating Arrangement Roster' : 'Faculty Invigilator Hall Duties'}
          </h3>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Total Records: {reportType === 'seating' ? seatingRecords.length : invigilationRecords.length}
          </span>
        </div>

        <div className="table-responsive">
          {reportType === 'seating' ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Hall No</th>
                  <th>Desk / Seat</th>
                  <th>Register Number</th>
                  <th>Student Candidate Name</th>
                  <th>Department</th>
                  <th>Year & Sec</th>
                  <th>Candidate Signature</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                      Generating official roster...
                    </td>
                  </tr>
                ) : seatingRecords.length > 0 ? (
                  seatingRecords.map((rec, idx) => (
                    <tr key={`${rec.hallNumber}-${rec.seatNumber}-${idx}`}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>
                        <strong>Hall {rec.hallNumber}</strong>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {rec.seatNumber}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                          {rec.registerNumber}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{rec.name}</td>
                      <td>
                        <span className="badge badge-blue">{rec.department}</span>
                      </td>
                      <td>
                        Yr {rec.year} - {rec.section}
                      </td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', minWidth: '120px' }}></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      No seating records found for this examination. Please generate seating first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Faculty Invigilator</th>
                  <th>Faculty ID</th>
                  <th>Department</th>
                  <th>Assigned Hall</th>
                  <th>Date & Session</th>
                  <th>Signature of Invigilator</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                      Generating invigilation report...
                    </td>
                  </tr>
                ) : invigilationRecords.length > 0 ? (
                  invigilationRecords.map((inv, idx) => (
                    <tr key={inv._id}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{inv.facultyId?.name}</td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {inv.facultyId?.facultyId}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-purple">{inv.facultyId?.department}</span>
                      </td>
                      <td>
                        <span className="badge badge-blue" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                          Hall {inv.hallId?.hallNumber}
                        </span>
                      </td>
                      <td>
                        <div>{inv.examId?.examDate}</div>
                        <div style={{ fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: '#64748b' }}>
                          {inv.examId?.startTime} - {inv.examId?.endTime}
                        </div>
                      </td>
                      <td style={{ borderBottom: '1px solid #cbd5e1', minWidth: '140px' }}></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      No invigilation records found for this exam. Please assign invigilators first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
