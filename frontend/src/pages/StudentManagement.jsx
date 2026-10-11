import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const PROGRAMMES = ['IT', 'CSE', 'AIDS', 'ECE', 'EEE', 'AUTO', 'MECH', 'CIVIL'];

const StudentManagement = () => {
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [year, setYear] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    registerNumber: '',
    name: '',
    programme: 'IT',
    year: '3',
    semester: '5',
    section: 'A',
    email: '',
    electiveCourses: '',
  });

  // Bulk CSV text
  const [csvText, setCsvText] = useState('');

  // Status Alerts
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students', {
        params: { search, department, year },
      });
      setStudents(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, department, year]);

  useEffect(() => {
    if (location.state?.openAdd) {
      openAddModal();
    }
  }, [location.state]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      registerNumber: '',
      name: '',
      programme: 'IT',
      year: '3',
      semester: '5',
      section: 'A',
      email: '',
      electiveCourses: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      registerNumber: student.registerNumber,
      name: student.name,
      programme: student.programme || student.department || 'IT',
      year: (student.year || 3).toString(),
      semester: (student.semester || 5).toString(),
      section: student.section || 'A',
      email: student.email,
      electiveCourses: Array.isArray(student.electiveCourses) ? student.electiveCourses.join(', ') : '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = {
        ...formData,
        department: formData.programme,
        year: Number(formData.year),
        semester: Number(formData.semester),
        electiveCourses: formData.electiveCourses
          .split(/[,;]/)
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean),
      };

      if (editingStudent) {
        await api.put(`/students/${editingStudent._id}`, payload);
        setSuccess(`Student ${formData.name} updated successfully.`);
      } else {
        await api.post('/students', payload);
        setSuccess(`Student ${formData.name} registered successfully.`);
      }
      setIsModalOpen(false);
      fetchStudents();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete student "${name}"?`)) return;
    try {
      await api.delete(`/students/${id}`);
      setSuccess(`Student ${name} deleted successfully.`);
      fetchStudents();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete student');
    }
  };

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
    setError('');
    if (!csvText.trim()) {
      setError('Please paste CSV content or select a .csv file to upload.');
      return;
    }

    try {
      const res = await api.post('/students/import-csv', { csvText });
      setSuccess(res.data.message || 'CSV Import completed successfully!');
      setIsBulkModalOpen(false);
      setCsvText('');
      fetchStudents();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Bulk upload failed');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#627d98', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Autonomous Student Information System
          </span>
          <h1 style={{ marginTop: '0.2rem', color: '#1b365d', fontSize: '1.45rem' }}>
            Student Directory
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Easwari Engineering College • 12-digit register numbers, programme enrollments, and elective courses.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsBulkModalOpen(true)} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Upload size={15} />
            <span>CSV Import</span>
          </button>
          <button onClick={openAddModal} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Plus size={15} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isModalOpen && !isBulkModalOpen && (
        <div className="alert alert-danger" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        {/* Filter & Search Bar */}
        <div className="filter-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="search-input-group" style={{ flex: 1, minWidth: '260px', display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.35rem 0.75rem' }}>
            <Search size={16} color="#64748b" style={{ marginRight: '0.5rem' }} />
            <input
              type="text"
              placeholder="Search by 12-digit register number, student name, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.85rem' }}
            >
            </input>
          </div>

          <select
            className="form-control"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            style={{ width: 'auto', minWidth: '160px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Programmes</option>
            {PROGRAMMES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select
            className="form-control"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            style={{ width: 'auto', minWidth: '120px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
        </div>

        {/* Student Table */}
        <div className="table-responsive">
          <table className="table" style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Register No</th>
                <th>Name</th>
                <th>Programme</th>
                <th>Year / Sem</th>
                <th>Section</th>
                <th>Elective Courses</th>
                <th>Email</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    Loading students directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    No students match the criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1b365d' }}>
                        {student.registerNumber}
                      </span>
                    </td>
                    <td>
                      <strong>{student.name}</strong>
                    </td>
                    <td>
                      <span className="badge badge-secondary" style={{ fontWeight: 700 }}>
                        {student.programme || student.department}
                      </span>
                    </td>
                    <td>
                      Yr {student.year} / Sem {student.semester || (student.year * 2 - 1)}
                    </td>
                    <td>{student.section}</td>
                    <td>
                      {student.electiveCourses && student.electiveCourses.length > 0 ? (
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {student.electiveCourses.map((code, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.35rem',
                                background: '#fef3c7',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                borderRadius: '3px',
                                fontFamily: 'monospace',
                                fontWeight: 600,
                              }}
                            >
                              {code}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                      )}
                    </td>
                    <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{student.email}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => openEditModal(student)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.45rem' }}
                          title="Edit Student"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id, student.name)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.2rem 0.45rem', color: '#dc2626' }}
                          title="Delete Student"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Profile' : 'Register New Student'}
        maxWidth="500px"
      >
        <form onSubmit={handleFormSubmit}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              12-Digit Register Number *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 310624205001"
              value={formData.registerNumber}
              onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value.toUpperCase() })}
              className="form-control"
              style={{ fontFamily: 'monospace' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              Student Full Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Aakash A."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-control"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Programme *
              </label>
              <select
                value={formData.programme}
                onChange={(e) => setFormData({ ...formData, programme: e.target.value })}
                className="form-control"
              >
                {PROGRAMMES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Section *
              </label>
              <input
                type="text"
                required
                placeholder="A, B, or C"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                className="form-control"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Year *
              </label>
              <select
                value={formData.year}
                onChange={(e) => {
                  const y = e.target.value;
                  setFormData({ ...formData, year: y, semester: (Number(y) * 2 - 1).toString() });
                }}
                className="form-control"
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                Semester *
              </label>
              <input
                type="number"
                min="1"
                max="8"
                required
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="form-control"
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '0.85rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              Student Email *
            </label>
            <input
              type="email"
              required
              placeholder="student@eec.srmrmp.edu.in"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              className="form-control"
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
              Elective Courses (Optional, comma-separated codes)
            </label>
            <input
              type="text"
              placeholder="e.g. 2311CSE903T, 2311MEO902T"
              value={formData.electiveCourses}
              onChange={(e) => setFormData({ ...formData, electiveCourses: e.target.value.toUpperCase() })}
              className="form-control"
              style={{ fontFamily: 'monospace' }}
            />
            <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
              Leave blank if student is enrolled in core courses only.
            </small>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm">
              {editingStudent ? 'Save Changes' : 'Register Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="CSV Bulk Student Import"
        maxWidth="600px"
      >
        <form onSubmit={handleBulkUpload}>
          {error && <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>{error}</div>}

          <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
            Upload a <code>.csv</code> file or paste CSV text below. First line must contain column headers.
          </p>

          <div style={{ background: '#f8fafc', padding: '0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.85rem', fontSize: '0.74rem', fontFamily: 'monospace' }}>
            <strong>Header format:</strong><br />
            Register Number, Name, Email, Programme, Year, Semester, Section, Elective Courses<br />
            <strong>Example row:</strong><br />
            310624104001, Aakash A., 310624104001@eec.edu, CSE, 3, 5, A, 2311CSE903T
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
              placeholder="Register Number, Name, Email, Programme, Year, Semester, Section, Elective Courses&#10;310624205001, Arun A., arun@eec.edu, IT, 3, 5, A, 2311MEO902T"
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
              Import Students
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StudentManagement;
