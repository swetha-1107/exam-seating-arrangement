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
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

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
    department: 'IT',
    year: '3',
    section: 'A',
    email: '',
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
      department: 'IT',
      year: '3',
      section: 'A',
      email: '',
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      registerNumber: student.registerNumber,
      name: student.name,
      department: student.department,
      year: student.year.toString(),
      section: student.section,
      email: student.email,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingStudent) {
        await api.put(`/students/${editingStudent._id}`, formData);
        setSuccess(`Student ${formData.name} updated successfully.`);
      } else {
        await api.post('/students', formData);
        setSuccess(`Student ${formData.name} added successfully.`);
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

  const handleBulkUpload = async (e) => {
    e.preventDefault();
    setError('');
    try {
      // Parse CSV / TSV lines: RegisterNumber, Name, Department, Year, Section, Email
      const lines = csvText.split('\n').filter((l) => l.trim().length > 0);
      const parsedStudents = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Skip header row if contains 'register'
        if (i === 0 && line.toLowerCase().includes('register')) continue;

        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 2) {
          parsedStudents.push({
            registerNumber: parts[0],
            name: parts[1],
            department: parts[2] || 'IT',
            year: Number(parts[3]) || 3,
            section: parts[4] || 'A',
            email: parts[5] || `${parts[0].toLowerCase()}@student.college.edu`,
          });
        }
      }

      if (parsedStudents.length === 0) {
        setError('No valid student rows found. Format: RegisterNumber, Name, Department, Year, Section, Email');
        return;
      }

      const res = await api.post('/students/bulk', { students: parsedStudents });
      setSuccess(res.data.message);
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
      <div className="page-header">
        <div>
          <h1>Student Directory</h1>
          <p>Easwari Engineering College • Register, update, and manage student enrollments across departments.</p>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsBulkModalOpen(true)} className="btn btn-secondary">
            <Upload size={16} />
            <span>CSV Bulk Import</span>
          </button>
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isModalOpen && !isBulkModalOpen && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        {/* Filter & Search Bar */}
        <div className="filter-bar">
          <div className="search-input-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, register number or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="ALL">All Departments</option>
            <option value="IT">IT</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
          </select>

          <select
            className="filter-select"
            value={year}
            onChange={(e) => setYear(e.target.value)}
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
          <table className="data-table">
            <thead>
              <tr>
                <th>Register No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Year</th>
                <th>Section</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading students...
                  </td>
                </tr>
              ) : students.length > 0 ? (
                students.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#1e293b' }}>
                        {student.registerNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{student.name}</td>
                    <td>
                      <span className={`badge ${
                        student.department === 'IT' ? 'badge-blue' :
                        student.department === 'CSE' ? 'badge-purple' :
                        student.department === 'ECE' ? 'badge-teal' : 'badge-amber'
                      }`}>
                        {student.department}
                      </span>
                    </td>
                    <td>Year {student.year}</td>
                    <td>Sec {student.section}</td>
                    <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{student.email}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => openEditModal(student)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Student"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(student._id, student.name)}
                          className="btn btn-danger-outline btn-sm"
                          title="Delete Student"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <Users size={40} />
                      <h3>No Students Found</h3>
                      <p>Try clearing your search query or add a new student.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingStudent ? 'Edit Student Details' : 'Add New Student'}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleFormSubmit}
            >
              {editingStudent ? 'Save Changes' : 'Create Student'}
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
          <div className="form-group">
            <label>Register Number *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. 23IT045"
              value={formData.registerNumber}
              onChange={(e) => setFormData({ ...formData, registerNumber: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Student Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Rohan Verma"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department *</label>
              <select
                className="form-control"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="IT">Information Technology (IT)</option>
                <option value="CSE">Computer Science & Eng (CSE)</option>
                <option value="ECE">Electronics & Comm (ECE)</option>
                <option value="MECH">Mechanical Eng (MECH)</option>
              </select>
            </div>

            <div className="form-group">
              <label>Year of Study *</label>
              <select
                className="form-control"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              >
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Section *</label>
              <input
                type="text"
                className="form-control"
                placeholder="A, B, C..."
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input
                type="email"
                className="form-control"
                placeholder="student@college.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Upload Modal */}
      <Modal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="CSV Bulk Student Import"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsBulkModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleBulkUpload}
            >
              Upload Students
            </button>
          </>
        }
      >
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
          Paste comma-separated values (CSV) with columns: <br />
          <code>RegisterNumber, Name, Department, Year, Section, Email</code>
        </p>

        <textarea
          className="form-control"
          style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.8rem' }}
          placeholder="23IT099, John Doe, IT, 3, A, 23it099@student.college.edu&#10;23CSE099, Jane Smith, CSE, 3, B, 23cse099@student.college.edu"
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default StudentManagement;
