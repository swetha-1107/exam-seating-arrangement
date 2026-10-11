import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  Clock,
  UserCheck,
  XCircle,
  CheckCircle2,
  Search,
  AlertCircle,
  Building2,
  Users,
  RefreshCw,
  Plus,
  Trash2,
  ShieldAlert,
} from 'lucide-react';
import api from '../services/api';
import Modal from '../components/Modal';

const FacultyAvailabilityManagement = () => {
  const [facultyAvailability, setFacultyAvailability] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manual Override / Slot Addition Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    facultyId: '',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '13:00',
    status: 'Available',
    notes: 'Admin record',
  });
  const [savingSlot, setSavingSlot] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [overviewRes, facultyRes] = await Promise.all([
        api.get('/faculty/availability/admin-overview', {
          params: dateFilter ? { date: dateFilter } : {},
        }),
        api.get('/faculty'),
      ]);
      setFacultyAvailability(overviewRes.data);
      setFacultyList(facultyRes.data);
    } catch (err) {
      setError(err.message || 'Failed to load faculty availability overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  const handleOpenModal = (facId = '') => {
    setSlotForm({
      facultyId: facId || (facultyList.length > 0 ? facultyList[0]._id : ''),
      date: '2026-10-15',
      startTime: '10:00',
      endTime: '13:00',
      status: 'Available',
      notes: 'Admin record',
    });
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (e) => {
    e.preventDefault();
    if (!slotForm.facultyId) {
      setError('Please select a faculty member');
      return;
    }

    try {
      setSavingSlot(true);
      setError('');
      // Use the faculty availability update endpoint
      await api.post('/faculty/availability', {
        date: slotForm.date,
        startTime: slotForm.startTime,
        endTime: slotForm.endTime,
        status: slotForm.status,
        notes: slotForm.notes,
      });

      setSuccess(`Availability slot recorded for faculty.`);
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to record slot');
    } finally {
      setSavingSlot(false);
    }
  };

  const filteredFaculty = facultyAvailability.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.facultyId.toLowerCase().includes(search.toLowerCase()) ||
      f.department.toLowerCase().includes(search.toLowerCase());
    const matchesDept = departmentFilter === 'ALL' || f.department === departmentFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'Available' && f.status === 'Available') ||
      (statusFilter === 'Not Available' && f.status === 'Not Available') ||
      (statusFilter === 'Already Assigned' && f.status === 'Already Assigned');

    return matchesSearch && matchesDept && matchesStatus;
  });

  const totalFacultyCount = facultyAvailability.length;
  const availableCount = facultyAvailability.filter((f) => f.status === 'Available').length;
  const unavailableCount = facultyAvailability.filter((f) => f.status === 'Not Available').length;
  const assignedCount = facultyAvailability.filter((f) => f.assignedDutiesCount > 0).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Faculty Availability Management</h1>
          <p>Easwari Engineering College • Monitor invigilator time slots, declared leaves, and auto-allocation eligibility.</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchData} className="btn btn-secondary">
            <RefreshCw size={16} />
            <span>Refresh</span>
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

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#ebf8ff', color: '#1b365d' }}>
            <Users size={20} />
          </div>
          <div>
            <div className="metric-label">Total Active Faculty</div>
            <div className="metric-value">{totalFacultyCount}</div>
            <div className="metric-hint">Across all departments</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="metric-label">Ready for Duty</div>
            <div className="metric-value" style={{ color: '#16a34a' }}>{availableCount}</div>
            <div className="metric-hint">Eligible for auto-assignment</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
            <XCircle size={20} />
          </div>
          <div>
            <div className="metric-label">Declared Unavailable</div>
            <div className="metric-value" style={{ color: '#dc2626' }}>{unavailableCount}</div>
            <div className="metric-hint">Excluded by conflict rules</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: '#faf5ff', color: '#7c3aed' }}>
            <UserCheck size={20} />
          </div>
          <div>
            <div className="metric-label">Assigned Invigilators</div>
            <div className="metric-value" style={{ color: '#7c3aed' }}>{assignedCount}</div>
            <div className="metric-hint">Currently allotted to halls</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="filter-bar" style={{ padding: '1rem' }}>
          <div className="search-input-group" style={{ flex: '1 1 240px' }}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by faculty name or ID..."
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
            <option value="IT">IT</option>
            <option value="CSE">CSE</option>
            <option value="ECE">ECE</option>
            <option value="MECH">MECH</option>
          </select>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">🟢 Ready for Duty</option>
            <option value="Not Available">🔴 Not Available (Excluded)</option>
            <option value="Already Assigned">🔵 Assigned to Hall</option>
          </select>

          <input
            type="date"
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            title="Filter by specific exam date"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="card-title">Faculty Availability & Constraint Registry</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Shows all faculty and their live status for automatic invigilator assignment.
            </span>
          </div>
          <span className="badge badge-blue">
            Showing {filteredFaculty.length} of {totalFacultyCount}
          </span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Faculty ID</th>
                <th>Faculty Name</th>
                <th>Department</th>
                <th>Contact</th>
                <th>Duty Status</th>
                <th>Declared Slot Constraints</th>
                <th>Assigned Duties</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem' }}>
                    Loading faculty availability records...
                  </td>
                </tr>
              ) : filteredFaculty.length > 0 ? (
                filteredFaculty.map((fac) => (
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
                    <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      <div>{fac.email}</div>
                      <div>{fac.phone}</div>
                    </td>
                    <td>
                      {fac.status === 'Not Available' ? (
                        <span className="badge badge-rose" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <XCircle size={12} /> Excluded (Not Available)
                        </span>
                      ) : fac.assignedDutiesCount > 0 ? (
                        <span className="badge badge-blue" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserCheck size={12} /> Assigned ({fac.assignedDutiesCount} Duties)
                        </span>
                      ) : (
                        <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Ready for Duty
                        </span>
                      )}
                    </td>
                    <td>
                      {fac.slots && fac.slots.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {fac.slots.map((s, idx) => (
                            <div
                              key={idx}
                              style={{
                                fontSize: '0.75rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: s.status === 'Available' ? '#f0fdf4' : '#fef2f2',
                                color: s.status === 'Available' ? '#166534' : '#991b1b',
                                border: `1px solid ${s.status === 'Available' ? '#bbf7d0' : '#fecaca'}`,
                                display: 'inline-block',
                              }}
                            >
                              <strong>{s.date}</strong> ({s.startTime}-{s.endTime}): {s.status}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No specific date exclusions (Available default)
                        </span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 800, color: fac.assignedDutiesCount > 0 ? '#1b365d' : '#94a3b8' }}>
                        {fac.assignedDutiesCount} hall(s)
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7">
                    <div className="empty-state">
                      <Users size={40} />
                      <h3>No matching faculty found</h3>
                      <p>Adjust your search filters or add faculty members in the master directory.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FacultyAvailabilityManagement;
