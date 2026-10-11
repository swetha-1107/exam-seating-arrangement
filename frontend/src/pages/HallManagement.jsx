import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  LayoutGrid,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const HallManagement = () => {
  const location = useLocation();
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [availableFilter, setAvailableFilter] = useState('');

  // Modals & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHall, setEditingHall] = useState(null);
  const [formData, setFormData] = useState({
    hallNumber: '',
    building: '',
    floor: '1',
    rows: '5',
    columns: '6',
    capacity: '30',
    isAvailable: true,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchHalls = async () => {
    try {
      setLoading(true);
      const res = await api.get('/halls', {
        params: { search, available: availableFilter },
      });
      setHalls(res.data);
    } catch (err) {
      setError(err.message || 'Failed to fetch halls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHalls();
  }, [search, availableFilter]);

  useEffect(() => {
    if (location.state?.openAdd) {
      openAddModal();
    }
  }, [location.state]);

  const openAddModal = () => {
    setEditingHall(null);
    setFormData({
      hallNumber: '',
      building: 'Main Block',
      floor: '1',
      rows: '5',
      columns: '6',
      capacity: '30',
      isAvailable: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (hall) => {
    setEditingHall(hall);
    setFormData({
      hallNumber: hall.hallNumber,
      building: hall.building,
      floor: hall.floor.toString(),
      rows: hall.rows.toString(),
      columns: hall.columns.toString(),
      capacity: hall.capacity.toString(),
      isAvailable: hall.isAvailable,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleRowsColsChange = (newRows, newCols) => {
    const r = parseInt(newRows, 10) || 0;
    const c = parseInt(newCols, 10) || 0;
    setFormData((prev) => ({
      ...prev,
      rows: newRows,
      columns: newCols,
      capacity: (r * c).toString(),
    }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingHall) {
        await api.put(`/halls/${editingHall._id}`, formData);
        setSuccess(`Hall ${formData.hallNumber} updated successfully.`);
      } else {
        await api.post('/halls', formData);
        setSuccess(`Hall ${formData.hallNumber} created successfully.`);
      }
      setIsModalOpen(false);
      fetchHalls();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (id, hallNumber) => {
    if (!window.confirm(`Delete Hall ${hallNumber}? Any seating plan or duties mapped to this hall will be removed.`)) {
      return;
    }
    try {
      await api.delete(`/halls/${id}`);
      setSuccess(`Hall ${hallNumber} deleted.`);
      fetchHalls();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to delete hall');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exam Hall & Venue Management</h1>
          <p>Easwari Engineering College • Configure examination rooms, desks, grid dimensions, and student capacity.</p>
        </div>
        <div className="header-actions">
          <button onClick={openAddModal} className="btn btn-primary">
            <Plus size={16} />
            <span>Add Exam Hall</span>
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

      <div className="card">
        {/* Filter & Search Bar */}
        <div className="filter-bar">
          <div className="search-input-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by hall number or building name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={availableFilter}
            onChange={(e) => setAvailableFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="true">Available</option>
            <option value="false">Unavailable / Inactive</option>
          </select>
        </div>

        {/* Halls Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Hall Number</th>
                <th>Building</th>
                <th>Floor</th>
                <th>Grid Dimensions</th>
                <th>Total Capacity</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading exam halls...
                  </td>
                </tr>
              ) : halls.length > 0 ? (
                halls.map((hall) => (
                  <tr key={hall._id}>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, fontSize: '0.95rem', color: '#1e293b' }}>
                        {hall.hallNumber}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{hall.building}</td>
                    <td>Floor {hall.floor}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#475569' }}>
                        <LayoutGrid size={15} color="#3b82f6" />
                        <span>{hall.rows} Rows × {hall.columns} Columns</span>
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-blue" style={{ fontSize: '0.85rem' }}>
                        {hall.capacity} Seats
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${hall.isAvailable ? 'badge-emerald' : 'badge-rose'}`}>
                        {hall.isAvailable ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => openEditModal(hall)}
                          className="btn btn-secondary btn-sm"
                          title="Edit Hall"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(hall._id, hall.hallNumber)}
                          className="btn btn-danger-outline btn-sm"
                          title="Delete Hall"
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
                      <Building2 size={40} />
                      <h3>No Examination Halls Found</h3>
                      <p>Add hall numbers and seat capacities to proceed.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Hall Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingHall ? 'Edit Examination Hall' : 'Add New Examination Hall'}
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
              {editingHall ? 'Save Changes' : 'Create Hall'}
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
            <label>Hall Number / Identifier *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. A101, B202"
              value={formData.hallNumber}
              onChange={(e) => setFormData({ ...formData, hallNumber: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Building Complex *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Science Block"
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Floor Number *</label>
              <input
                type="number"
                min="0"
                max="10"
                className="form-control"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rows (Desks along Depth) *</label>
              <input
                type="number"
                min="1"
                max="26"
                className="form-control"
                value={formData.rows}
                onChange={(e) => handleRowsColsChange(e.target.value, formData.columns)}
                required
              />
            </div>

            <div className="form-group">
              <label>Columns (Desks along Width) *</label>
              <input
                type="number"
                min="1"
                max="30"
                className="form-control"
                value={formData.columns}
                onChange={(e) => handleRowsColsChange(formData.rows, e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Total Seating Capacity (Auto-calculated: Rows × Columns)</label>
            <input
              type="number"
              className="form-control"
              value={formData.capacity}
              readOnly
              style={{ backgroundColor: '#f1f5f9', fontWeight: 700 }}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="isAvailableCheck"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              style={{ width: '18px', height: '18px' }}
            />
            <label htmlFor="isAvailableCheck" style={{ margin: 0, cursor: 'pointer' }}>
              Hall is available and active for examinations
            </label>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default HallManagement;
