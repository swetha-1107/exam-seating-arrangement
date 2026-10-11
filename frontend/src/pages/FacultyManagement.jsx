import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  GraduationCap,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  ListFilter,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const FacultyManagement = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('directory'); // 'directory' or 'availability'
  const [facultyList, setFacultyList] = useState([]);
  const [availabilityList, setAvailabilityList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [availableFilter, setAvailableFilter] = useState('');

  // Modals & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({
    facultyId: '',
    name: '',
    department: 'IT',
    email: '',
    phone: '',
    availability: true,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.get('/faculty', {
        params: { search, department, available: availableFilter },
      });
      setFacultyList(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch faculty directory');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilityOverview = async () => {
    try {
      const res = await api.get('/faculty/availability/admin-overview');
      setAvailabilityList(res.data);
    } catch (err) {
      console.error('Failed to load availability overview:', err);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchAvailabilityOverview();
  }, [search, department, availableFilter]);

  useEffect(() => {
    if (location.state?.openAdd) {
      openAddModal();
    }
  }, [location.state]);

  const openAddModal = () => {
    setEditingFaculty(null);
    setFormData({
      facultyId: '',
      name: '',
      department: 'IT',
      email: '',
      phone: '',
      availability: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (fac) => {
    setEditingFaculty(fac);
    setFormData({
      facultyId: fac.facultyId,
      name: fac.name,
      department: fac.department,
      email: fac.email,
      phone: fac.phone,
      availability: fac.availability !== false,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleToggleAvailability = async (fac) => {
    try {
      await api.put(`/faculty/${fac._id}`, {
        availability: !fac.availability,
      });
      fetchFaculty();
    } catch (err) {
      setError(err.message || 'Failed to toggle availability');
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingFaculty) {
        await api.put(`/faculty/${editingFaculty._id}`, formData);
        setSuccess(`Faculty "${formData.name}" updated successfully.`);
      } else {
        await api.post('/faculty', formData);
        setSuccess(`Faculty "${formData.name}" added to directory.`);
      }
      setIsModalOpen(false);
      fetchFaculty();
      fetchAvailabilityOverview();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete faculty member "${name}"? Any assigned invigilation duties will also be removed.`)) {
      return;
    }
    try {
      await api.delete(`/faculty/${id}`);
      setSuccess(`Faculty "${name}" removed.`);
      fetchFaculty();
      fetchAvailabilityOverview();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete faculty');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Faculty & Invigilator Directory</h1>
          <p>Easwari Engineering College • Manage professors, invigilation duty eligibility, and time slot availability declarations.</p>
        </div>
        <div className="header-actions">
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Faculty Member</span>
          </button>
        </div>
      </div>

      {success && (
        <div className="alert alert-success">
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('directory')}
        >
          <GraduationCap size={16} />
          <span>Faculty Directory ({facultyList.length})</span>
        </button>
        <button
          className={`btn ${activeTab === 'availability' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('availability')}
        >
          <CalendarDays size={16} />
          <span>Slot Availability Declarations ({availabilityList.length})</span>
        </button>
      </div>

      {activeTab === 'directory' ? (
        <div className="card">
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="search-input-group">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search by faculty name, ID, or email..."
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
              value={availableFilter}
              onChange={(e) => setAvailableFilter(e.target.value)}
            >
              <option value="">All Duty Statuses</option>
              <option value="true">Available for Duty</option>
              <option value="false">Unavailable / On Leave</option>
            </select>
          </div>

          {/* Faculty Table */}
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty ID</th>
                  <th>Faculty Name</th>
                  <th>Department</th>
                  <th>Contact Details</th>
                  <th>Invigilation Duty Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem' }}>
                      Loading faculty members...
                    </td>
                  </tr>
                ) : facultyList.length > 0 ? (
                  facultyList.map((fac) => (
                    <tr key={fac._id}>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: '#1b365d' }}>
                          {fac.facultyId}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>{fac.name}</td>
                      <td>
                        <span className="badge badge-purple">{fac.department}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem', color: '#64748b' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} /> {fac.email}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {fac.phone}
                          </span>
                        </div>
                      </td>
                      <td>
                        <button
                          onClick={() => handleToggleAvailability(fac)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                          }}
                          title="Click to toggle availability"
                        >
                          <span className={`badge ${fac.availability ? 'badge-emerald' : 'badge-rose'}`}>
                            {fac.availability ? 'Available for Duty' : 'Unavailable'}
                          </span>
                        </button>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => openEditModal(fac)}
                            className="btn btn-secondary btn-sm"
                            title="Edit Faculty"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(fac._id, fac.name)}
                            className="btn btn-danger-outline btn-sm"
                            title="Delete Faculty"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="empty-state">
                        <GraduationCap size={40} />
                        <h3>No Faculty Members Found</h3>
                        <p>Add faculty records to assign invigilator duties.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Slot Availability Declarations Overview */
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Faculty Date & Time Slot Availability Records</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Faculty members log into their personal portal to declare availability for upcoming examination dates.
            </span>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Faculty Name</th>
                  <th>Faculty ID</th>
                  <th>Department</th>
                  <th>Exam Date</th>
                  <th>Time Slot</th>
                  <th>Availability Status</th>
                  <th>Constraint Impact</th>
                </tr>
              </thead>
              <tbody>
                {availabilityList.length > 0 ? (
                  availabilityList.map((slot) => (
                    <tr key={slot._id}>
                      <td style={{ fontWeight: 700, color: '#0f172a' }}>
                        {slot.facultyId?.name}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>
                          {slot.facultyId?.facultyId}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-purple">{slot.facultyId?.department}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                          <CalendarDays size={14} color="#64748b" />
                          <span>{slot.date}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'JetBrains Mono', fontSize: '0.85rem' }}>
                          <Clock size={14} color="#64748b" />
                          <span>{slot.startTime} - {slot.endTime}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${slot.status === 'Available' ? 'badge-emerald' : 'badge-rose'}`}>
                          {slot.status === 'Available' ? '🟢 Available' : '🔴 Not Available'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {slot.status === 'Not Available' ? (
                          <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                            Excluded from auto-allocation
                          </span>
                        ) : (
                          <span style={{ color: '#047857' }}>
                            Eligible for duty assignment
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                      No specific slot availability declarations found. Faculty default to their general duty availability.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Faculty Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? 'Edit Faculty Details' : 'Add New Faculty Member'}
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
              {editingFaculty ? 'Save Changes' : 'Create Faculty'}
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
            <label>Faculty ID *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. FAC101"
              value={formData.facultyId}
              onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Full Name with Title *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Dr. S. Ramesh"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Department *</label>
            <select
              className="form-control"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            >
              <option value="IT">IT - Information Technology</option>
              <option value="CSE">CSE - Computer Science & Engg</option>
              <option value="ECE">ECE - Electronics & Comm Engg</option>
              <option value="MECH">MECH - Mechanical Engg</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Official Email *</label>
              <input
                type="email"
                className="form-control"
                placeholder="faculty@easwari.edu"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone Number *</label>
              <input
                type="text"
                className="form-control"
                placeholder="+91 98765 43210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isFacultyAvailableCheck"
              checked={formData.availability}
              onChange={(e) => setFormData({ ...formData, availability: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="isFacultyAvailableCheck" style={{ margin: 0, cursor: 'pointer' }}>
              Faculty is active and eligible for invigilation duties
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FacultyManagement;
