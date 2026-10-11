import React, { useState, useEffect } from 'react';
import {
  Building,
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  CheckCircle2,
  Layers,
  Share2,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const DepartmentSubjectManagement = () => {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' or 'subjects'

  // Departments state
  const [departments, setDepartments] = useState([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ code: '', name: '' });

  // Subjects state
  const [subjects, setSubjects] = useState([]);
  const [subjLoading, setSubjLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [semFilter, setSemFilter] = useState('ALL');
  const [searchSubj, setSearchSubj] = useState('');
  const [isSubjModalOpen, setIsSubjModalOpen] = useState(false);
  const [editingSubj, setEditingSubj] = useState(null);
  const [subjForm, setSubjForm] = useState({
    subjectCode: '',
    subjectName: '',
    semester: '5',
    departments: [],
    isCommonPaper: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDepartments = async () => {
    try {
      setDeptLoading(true);
      const res = await api.get('/departments');
      setDepartments(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch departments');
    } finally {
      setDeptLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      setSubjLoading(true);
      const params = {};
      if (deptFilter !== 'ALL') params.departmentId = deptFilter;
      if (semFilter !== 'ALL') params.semester = semFilter;
      if (searchSubj) params.search = searchSubj;

      const res = await api.get('/subjects', { params });
      setSubjects(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch subjects');
    } finally {
      setSubjLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [deptFilter, semFilter, searchSubj]);

  // Dept handlers
  const openAddDept = () => {
    setEditingDept(null);
    setDeptForm({ code: '', name: '' });
    setError('');
    setIsDeptModalOpen(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptForm({ code: dept.code, name: dept.name });
    setError('');
    setIsDeptModalOpen(true);
  };

  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingDept) {
        await api.put(`/departments/${editingDept._id}`, deptForm);
        setSuccess(`Department '${deptForm.code}' updated.`);
      } else {
        await api.post('/departments', deptForm);
        setSuccess(`Department '${deptForm.code}' created.`);
      }
      setIsDeptModalOpen(false);
      fetchDepartments();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save department');
    }
  };

  const handleDeleteDept = async (id, code) => {
    if (!window.confirm(`Delete department '${code}'?`)) return;
    try {
      await api.delete(`/departments/${id}`);
      setSuccess(`Department '${code}' deleted.`);
      fetchDepartments();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete department');
    }
  };

  // Subj handlers
  const openAddSubj = () => {
    setEditingSubj(null);
    setSubjForm({
      subjectCode: '',
      subjectName: '',
      semester: '5',
      departments: departments.length > 0 ? [departments[0]._id] : [],
      isCommonPaper: false,
    });
    setError('');
    setIsSubjModalOpen(true);
  };

  const openEditSubj = (subj) => {
    setEditingSubj(subj);
    setSubjForm({
      subjectCode: subj.subjectCode,
      subjectName: subj.subjectName,
      semester: subj.semester.toString(),
      departments: (subj.departments || []).map((d) => (d._id ? d._id : d)),
      isCommonPaper: subj.isCommonPaper || false,
    });
    setError('');
    setIsSubjModalOpen(true);
  };

  const toggleDeptInSubject = (dId) => {
    setSubjForm((prev) => {
      const exists = prev.departments.includes(dId);
      const updated = exists ? prev.departments.filter((id) => id !== dId) : [...prev.departments, dId];
      return {
        ...prev,
        departments: updated,
        isCommonPaper: updated.length > 1,
      };
    });
  };

  const handleSubjSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (subjForm.departments.length === 0) {
      setError('Please select at least one department for this subject.');
      return;
    }
    try {
      if (editingSubj) {
        await api.put(`/subjects/${editingSubj._id}`, subjForm);
        setSuccess(`Subject '${subjForm.subjectCode}' updated.`);
      } else {
        await api.post('/subjects', subjForm);
        setSuccess(`Subject '${subjForm.subjectCode}' created.`);
      }
      setIsSubjModalOpen(false);
      fetchSubjects();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save subject');
    }
  };

  const handleDeleteSubj = async (id, code) => {
    if (!window.confirm(`Delete subject '${code}'?`)) return;
    try {
      await api.delete(`/subjects/${id}`);
      setSuccess(`Subject '${code}' deleted.`);
      fetchSubjects();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete subject');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Departments & Subjects Management</h1>
          <p>Easwari Engineering College • Configure academic departments, subjects, and multi-department common examination papers.</p>
        </div>
        <div className="header-actions">
          {activeTab === 'departments' ? (
            <button onClick={openAddDept} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Department</span>
            </button>
          ) : (
            <button onClick={openAddSubj} className="btn btn-primary">
              <Plus size={16} />
              <span>Add Subject / Paper</span>
            </button>
          )}
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isDeptModalOpen && !isSubjModalOpen && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('departments')}
        >
          <Building size={16} />
          <span>Departments ({departments.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'subjects' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('subjects')}
        >
          <BookOpen size={16} />
          <span>Subjects & Curriculum ({subjects.length})</span>
        </button>
      </div>

      {activeTab === 'departments' ? (
        /* Departments Directory */
        <div className="card">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Department Code</th>
                  <th>Full Department Name</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deptLoading ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '3rem' }}>
                      Loading departments...
                    </td>
                  </tr>
                ) : departments.length > 0 ? (
                  departments.map((dept) => (
                    <tr key={dept._id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {dept.code}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{dept.name}</td>
                      <td>
                        <span className="badge badge-emerald">Active</span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => openEditDept(dept)}
                            className="btn btn-secondary btn-sm"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteDept(dept._id, dept.code)}
                            className="btn btn-danger-outline btn-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No departments configured yet. Click "Add Department" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Subjects & Curriculum Directory */
        <div className="card">
          {/* Filters */}
          <div className="filter-bar">
            <div className="search-input-group">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by subject code or title..."
                value={searchSubj}
                onChange={(e) => setSearchSubj(e.target.value)}
              />
            </div>

            <select
              className="filter-select"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>

            <select
              className="filter-select"
              value={semFilter}
              onChange={(e) => setSemFilter(e.target.value)}
            >
              <option value="ALL">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Course Code</th>
                  <th>Subject Title</th>
                  <th>Semester</th>
                  <th>Mapped Departments</th>
                  <th>Paper Type</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subjLoading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                      Loading subjects...
                    </td>
                  </tr>
                ) : subjects.length > 0 ? (
                  subjects.map((subj) => (
                    <tr key={subj._id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {subj.subjectCode}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{subj.subjectName}</td>
                      <td>Semester {subj.semester}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {(subj.departments || []).map((d) => (
                            <span key={d._id || d} className="badge badge-blue">
                              {d.code || 'Dept'}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {subj.isCommonPaper || (subj.departments && subj.departments.length > 1) ? (
                          <span className="badge badge-purple" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Share2 size={12} />
                            <span>Common Shared Paper</span>
                          </span>
                        ) : (
                          <span className="badge badge-gray">Department Core</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => openEditSubj(subj)}
                            className="btn btn-secondary btn-sm"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubj(subj._id, subj.subjectCode)}
                            className="btn btn-danger-outline btn-sm"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                      No subjects found. Click "Add Subject / Paper" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isDeptModalOpen}
        onClose={() => setIsDeptModalOpen(false)}
        title={editingDept ? 'Edit Department' : 'Add New Department'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsDeptModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleDeptSubmit}>
              {editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </>
        }
      >
        <form onSubmit={handleDeptSubmit}>
          <div className="form-group">
            <label>Department Code * (e.g. IT, CSE, ECE)</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. IT"
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              required
            />
          </div>
          <div className="form-group">
            <label>Department Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Information Technology"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              required
            />
          </div>
        </form>
      </Modal>

      {/* Add / Edit Subject Modal */}
      <Modal
        isOpen={isSubjModalOpen}
        onClose={() => setIsSubjModalOpen(false)}
        title={editingSubj ? 'Edit Subject / Paper' : 'Configure New Examination Subject'}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setIsSubjModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSubjSubmit}>
              {editingSubj ? 'Update Subject' : 'Save Subject'}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubjSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Course / Subject Code *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. CS8492"
                value={subjForm.subjectCode}
                onChange={(e) => setSubjForm({ ...subjForm, subjectCode: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div className="form-group">
              <label>Semester *</label>
              <select
                className="form-control"
                value={subjForm.semester}
                onChange={(e) => setSubjForm({ ...subjForm, semester: e.target.value })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Subject / Paper Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Database Management Systems"
              value={subjForm.subjectName}
              onChange={(e) => setSubjForm({ ...subjForm, subjectName: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Mapped Departments * (Select all departments taking this subject)</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px', padding: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              {departments.map((d) => {
                const isSelected = subjForm.departments.includes(d._id);
                return (
                  <label
                    key={d._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: isSelected ? '#edfdf3' : '#ffffff',
                      border: `1px solid ${isSelected ? '#a6f4c5' : '#cbd5e1'}`,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 700 : 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleDeptInSubject(d._id)}
                    />
                    <span>{d.code} - {d.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isCommonPaperCheck"
              checked={subjForm.isCommonPaper}
              onChange={(e) => setSubjForm({ ...subjForm, isCommonPaper: e.target.checked })}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="isCommonPaperCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '0.85rem' }}>
              Explicitly mark as a <strong>Common Shared Examination Paper</strong> across selected departments
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentSubjectManagement;
