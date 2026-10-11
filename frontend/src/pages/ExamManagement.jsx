import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Grid3X3,
  UserCheck,
  BookOpen,
  Upload,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const ExamManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals & Forms
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [editingExam, setEditingExam] = useState(null);
  const [formData, setFormData] = useState({
    subjectId: '',
    examName: '',
    examCode: '',
    department: 'IT',
    semester: '5',
    examDate: new Date().toISOString().split('T')[0],
    session: 'FN',
    startTime: '10:00',
    endTime: '13:00',
    status: 'Scheduled',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setBulkError('');
    if (!csvText.trim()) {
      setBulkError('Please paste CSV content or select a .csv file to upload.');
      return;
    }

    try {
      const res = await api.post('/exams/import-timetable-csv', { csvText });
      setSuccess(res.data.message || 'Timetable imported successfully!');
      setIsBulkModalOpen(false);
      setCsvText('');
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setBulkError(err.message || 'Bulk upload failed');
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examsRes, deptsRes, subjsRes] = await Promise.all([
        api.get('/exams', {
          params: { search, department: departmentFilter, date: dateFilter },
        }),
        api.get('/departments'),
        api.get('/subjects'),
      ]);

      setExams(examsRes.data);
      setDepartments(deptsRes.data);
      setSubjects(subjsRes.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch examination schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, departmentFilter, dateFilter]);

  useEffect(() => {
    if (location.state?.openAdd) {
      openAddModal();
    }
  }, [location.state]);

  const openAddModal = () => {
    setEditingExam(null);
    setFormData({
      subjectId: '',
      examName: '',
      examCode: '',
      department: departments.length > 0 ? departments[0].code : 'IT',
      semester: '5',
      examDate: new Date().toISOString().split('T')[0],
      session: 'FN',
      startTime: '10:00',
      endTime: '13:00',
      status: 'Scheduled',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (exam) => {
    setEditingExam(exam);
    setFormData({
      subjectId: exam.subjectId?._id || exam.subjectId || '',
      examName: exam.examName,
      examCode: exam.examCode,
      department: exam.department,
      semester: exam.semester ? exam.semester.toString() : '5',
      examDate: exam.examDate,
      session: exam.session || 'FN',
      startTime: exam.startTime,
      endTime: exam.endTime,
      status: exam.status,
    });
    setError('');
    setIsModalOpen(true);
  };

  // When subject changes in form, auto-populate code, name, and semester
  const handleSubjectSelect = (subjId) => {
    const selected = subjects.find((s) => s._id === subjId);
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        subjectId: subjId,
        examName: selected.subjectName,
        examCode: selected.subjectCode,
        semester: selected.semester ? selected.semester.toString() : prev.semester,
      }));
    } else {
      setFormData((prev) => ({ ...prev, subjectId: subjId }));
    }
  };

  // When session changes, set standard times
  const handleSessionChange = (sessionVal) => {
    if (sessionVal === 'FN') {
      setFormData((prev) => ({ ...prev, session: 'FN', startTime: '10:00', endTime: '13:00' }));
    } else {
      setFormData((prev) => ({ ...prev, session: 'AN', startTime: '14:00', endTime: '17:00' }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingExam) {
        await api.put(`/exams/${editingExam._id}`, formData);
        setSuccess(`Exam '${formData.examName}' (${formData.examCode}) updated.`);
      } else {
        await api.post('/exams', formData);
        setSuccess(`Exam '${formData.examName}' (${formData.examCode}) scheduled successfully.`);
      }
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete exam '${name}'? This will also remove any seating allocations and invigilation duties.`)) {
      return;
    }
    try {
      await api.delete(`/exams/${id}`);
      setSuccess(`Exam '${name}' deleted.`);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete exam');
    }
  };

  // Filter subjects for the selected department in the form
  const filteredSubjectsForForm = subjects.filter((s) => {
    if (formData.department === 'ALL') return true;
    return (s.departments || []).some((d) => (d.code || d) === formData.department);
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Examination Timetable Schedule</h1>
          <p>Easwari Engineering College • Schedule examination sessions, map departments, and prevent timetable slot conflicts.</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsBulkModalOpen(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Upload size={15} />
            <span>CSV Timetable Import</span>
          </button>
          <button onClick={openAddModal} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={15} />
            <span>Schedule Examination</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        {/* Filters */}
        <div className="filter-bar">
          <div className="search-input-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by exam subject name or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d.code}>
                {d.code} - {d.name}
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
            <button onClick={() => setDateFilter('')} className="btn btn-secondary btn-sm">
              Clear Date
            </button>
          )}
        </div>

        {/* Exams Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Course Code</th>
                <th>Subject / Paper Title</th>
                <th>Department</th>
                <th>Exam Date</th>
                <th>Session & Time</th>
                <th>Candidates</th>
                <th>Seating & Duty Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading examination schedules...
                  </td>
                </tr>
              ) : exams.length > 0 ? (
                exams.map((exam) => (
                  <tr key={exam._id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                        {exam.examCode}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{exam.examName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Semester {exam.semester}</div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{exam.department}</span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{exam.examDate}</span>
                    </td>
                    <td>
                      <div>
                        <span className="badge badge-purple" style={{ marginRight: 4 }}>
                          {exam.session || 'FN'}
                        </span>
                        <span style={{ fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          {exam.startTime} - {exam.endTime}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                        {exam.studentCount || 0} registered
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <span
                          className={`badge ${exam.hasSeating ? 'badge-emerald' : 'badge-gray'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate('/admin/seating', { state: { selectedExamId: exam._id } })}
                          title="Click to view seating plan"
                        >
                          <Grid3X3 size={12} style={{ marginRight: 3 }} />
                          {exam.hasSeating ? `${exam.seatedCount || exam.studentCount} Seated` : 'No Seating'}
                        </span>
                        <span
                          className={`badge ${exam.invigilatorCount > 0 ? 'badge-purple' : 'badge-gray'}`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => navigate('/admin/invigilation', { state: { selectedExamId: exam._id } })}
                          title="Click to view invigilation"
                        >
                          <UserCheck size={12} style={{ marginRight: 3 }} />
                          {exam.invigilatorCount > 0 ? `${exam.invigilatorCount} Invigilator(s)` : 'No Duty'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => openEditModal(exam)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Exam"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id, exam.examName)}
                          className="btn btn-danger-outline btn-sm"
                          title="Delete Exam"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">
                      <CalendarDays size={40} />
                      <h3>No Examinations Scheduled</h3>
                      <p>Click "Schedule Examination" above to create exam timetable entries.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Exam Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingExam ? 'Edit Examination Schedule' : 'Schedule New Examination'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleFormSubmit}>
              {editingExam ? 'Update Schedule' : 'Schedule Examination'}
            </button>
          </>
        }
      >
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>1. Department *</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value, subjectId: '' })}
              >
                <option value="ALL">ALL (Common Shared Exam)</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>2. Select Configured Subject</label>
              <select
                className="form-control"
                value={formData.subjectId}
                onChange={(e) => handleSubjectSelect(e.target.value)}
              >
                <option value="">-- Choose from Configured Subjects --</option>
                {filteredSubjectsForForm.map((s) => (
                  <option key={s._id} value={s._id}>
                    [{s.subjectCode}] {s.subjectName} (Sem {s.semester})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Course / Paper Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CS8492"
                value={formData.examCode}
                onChange={(e) => setFormData({ ...formData, examCode: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label>Examination Subject Title *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Database Management Systems"
                value={formData.examName}
                onChange={(e) => setFormData({ ...formData, examName: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Exam Date *</label>
              <input
                type="date"
                className="form-control"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Session Slot *</label>
              <select
                className="form-control"
                value={formData.session}
                onChange={(e) => handleSessionChange(e.target.value)}
              >
                <option value="FN">FN - Forenoon (10:00 - 13:00)</option>
                <option value="AN">AN - Afternoon (14:00 - 17:00)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Time (24h) *</label>
              <input
                type="time"
                className="form-control"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>End Time (24h) *</label>
              <input
                type="time"
                className="form-control"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Semester *</label>
              <select
                className="form-control"
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Status</label>
              <select
                className="form-control"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </form>
      </Modal>

      {/* Timetable CSV Bulk Import Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Import Timetable from CSV"
        maxWidth="600px"
      >
        <form onSubmit={handleBulkUpload}>
          {bulkError && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{bulkError}</div>}

          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
            Upload a <code>.csv</code> file or paste timetable rows below. First line must contain column headers.
          </p>

          <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', fontSize: '0.74rem', fontFamily: 'monospace' }}>
            <strong>Header format:</strong><br />
            Date, Start Time, End Time, Course Code, Course Name, Programmes, Paper Type<br />
            <strong>Example row:</strong><br />
            2026-10-15, 09:30, 11:00, 2311ITC501T, Software Engineering, IT, core
          </div>

          <div style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
              Upload .csv File:
            </label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="form-control"
              style={{ fontSize: '0.82rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
              Or Paste CSV Text:
            </label>
            <textarea
              rows={8}
              placeholder="Date, Start Time, End Time, Course Code, Course Name, Programmes, Paper Type&#10;2026-10-15, 09:30, 11:00, 2311ITC501T, Software Engineering, IT, core"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="form-control"
              style={{ fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setIsBulkModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              Import Timetable
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ExamManagement;
