import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  Plus,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const ExamRegistrationManagement = () => {
  const [registrations, setRegistrations] = useState([]);
  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedExamFilter, setSelectedExamFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);

  // Form states
  const [bulkExamId, setBulkExamId] = useState('');
  const [bulkDept, setBulkDept] = useState('ALL');
  const [bulkYear, setBulkYear] = useState('3');

  const [singleExamId, setSingleExamId] = useState('');
  const [singleRegNo, setSingleRegNo] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [regsRes, examsRes, deptsRes] = await Promise.all([
        api.get('/registrations', {
          params: {
            examId: selectedExamFilter || undefined,
            department: deptFilter !== 'ALL' ? deptFilter : undefined,
          },
        }),
        api.get('/exams'),
        api.get('/departments'),
      ]);

      setRegistrations(regsRes.data);
      setExams(examsRes.data);
      setDepartments(deptsRes.data);

      if (!bulkExamId && examsRes.data.length > 0) {
        setBulkExamId(examsRes.data[0]._id);
        setSingleExamId(examsRes.data[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch registrations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedExamFilter, deptFilter]);

  const handleBulkRegister = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/registrations/bulk', {
        examId: bulkExamId,
        department: bulkDept,
        year: bulkYear,
      });

      setSuccess(res.data.message);
      setIsBulkModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Bulk registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSingleRegister = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');

      // Find student by register number
      const studentsRes = await api.get('/students', { params: { search: singleRegNo.trim() } });
      const matched = studentsRes.data.find(
        (s) => s.registerNumber.toUpperCase() === singleRegNo.trim().toUpperCase()
      );

      if (!matched) {
        setError(`Student with register number '${singleRegNo}' not found.`);
        setSubmitting(false);
        return;
      }

      await api.post('/registrations', {
        studentId: matched._id,
        examId: singleExamId,
      });

      setSuccess(`Student ${matched.name} (${matched.registerNumber}) registered successfully.`);
      setIsSingleModalOpen(false);
      setSingleRegNo('');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, studentName) => {
    if (!window.confirm(`Unregister ${studentName} from this examination?`)) return;
    try {
      await api.delete(`/registrations/${id}`);
      setSuccess('Registration removed.');
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete registration');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Student Examination Registrations</h1>
          <p>Easwari Engineering College • Manage candidate examination eligibility. The automatic seating engine allocates only registered students.</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsSingleModalOpen(true)} className="btn btn-secondary">
            <UserPlus size={16} />
            <span>Register Candidate</span>
          </button>
          <button onClick={() => setIsBulkModalOpen(true)} className="btn btn-primary">
            <Sparkles size={16} />
            <span>Bulk Register Cohort</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isBulkModalOpen && !isSingleModalOpen && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card">
        <div className="filter-bar">
          <select
            className="filter-select"
            value={selectedExamFilter}
            onChange={(e) => setSelectedExamFilter(e.target.value)}
          >
            <option value="">Filter by Examination: All</option>
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                [{ex.examCode}] {ex.examName} ({ex.examDate} • {ex.session})
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
          >
            <option value="ALL">All Student Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d.code}>
                {d.code} - {d.name}
              </option>
            ))}
          </select>

          <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: 'auto' }}>
            Showing <strong>{registrations.length}</strong> eligible candidate registration(s)
          </span>
        </div>

        {/* Registrations Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Register No.</th>
                <th>Candidate Name</th>
                <th>Department</th>
                <th>Year & Sec</th>
                <th>Course Code</th>
                <th>Exam Subject</th>
                <th>Exam Date & Session</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading exam candidate registrations...
                  </td>
                </tr>
              ) : registrations.length > 0 ? (
                registrations.map((reg) => (
                  <tr key={reg._id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                        {reg.studentId?.registerNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#0f172a' }}>{reg.studentId?.name}</td>
                    <td>
                      <span className="badge badge-blue">{reg.studentId?.department}</span>
                    </td>
                    <td>
                      Yr {reg.studentId?.year} - {reg.studentId?.section}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800 }}>
                        {reg.examId?.examCode}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{reg.examId?.examName}</td>
                    <td>
                      <div>{reg.examId?.examDate}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                        Session: {reg.examId?.session || 'FN'} ({reg.examId?.startTime} - {reg.examId?.endTime})
                      </div>
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(reg._id, reg.studentId?.name)}
                        className="btn btn-danger-outline btn-sm"
                        title="Remove Registration"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <FileCheck2 size={40} />
                      <h3>No Candidate Registrations Found</h3>
                      <p>Click "Bulk Register Cohort" above to register students eligible to attend this examination.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Register Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Bulk Register Cohort to Examination"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsBulkModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleBulkRegister} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Cohort'}
            </button>
          </>
        }
      >
        <form onSubmit={handleBulkRegister}>
          <div className="form-group">
            <label>Select Examination Schedule *</label>
            <select
              className="form-control"
              value={bulkExamId}
              onChange={(e) => setBulkExamId(e.target.value)}
              required
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  [{ex.examCode}] {ex.examName} ({ex.examDate} • {ex.session})
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Student Department *</label>
              <select
                className="form-control"
                value={bulkDept}
                onChange={(e) => setBulkDept(e.target.value)}
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Year of Study *</label>
              <select
                className="form-control"
                value={bulkYear}
                onChange={(e) => setBulkYear(e.target.value)}
              >
                <option value="1">1st Year (Sem 1 & 2)</option>
                <option value="2">2nd Year (Sem 3 & 4)</option>
                <option value="3">3rd Year (Sem 5 & 6)</option>
                <option value="4">4th Year (Sem 7 & 8)</option>
              </select>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
            This will fetch all enrolled students matching the selected department and year, and register them as eligible candidates for this examination.
          </p>
        </form>
      </Modal>

      {/* Single Candidate Register Modal */}
      <Modal
        isOpen={isSingleModalOpen}
        onClose={() => setIsSingleModalOpen(false)}
        title="Register Individual Candidate"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSingleModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSingleRegister} disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Candidate'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSingleRegister}>
          <div className="form-group">
            <label>Select Examination Schedule *</label>
            <select
              className="form-control"
              value={singleExamId}
              onChange={(e) => setSingleExamId(e.target.value)}
              required
            >
              {exams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  [{ex.examCode}] {ex.examName} ({ex.examDate} • {ex.session})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Student Register Number *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 23IT001"
              value={singleRegNo}
              onChange={(e) => setSingleRegNo(e.target.value.toUpperCase())}
              required
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExamRegistrationManagement;
