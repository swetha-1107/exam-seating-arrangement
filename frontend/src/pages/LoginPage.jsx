import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  GraduationCap,
  UserCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Hash,
  Phone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('admin'); // 'admin', 'faculty', 'student'

  // Login inputs
  const [identifier, setIdentifier] = useState('admin@exam.edu');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);

  // Self-Registration inputs (Student & Faculty only, no public Admin registration)
  const [regRole, setRegRole] = useState('student');
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registerNumber, setRegisterNumber] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [department, setDepartment] = useState('IT');
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    setSuccess('');
    if (selectedRole === 'admin') {
      setIdentifier('admin@exam.edu');
      setPassword('admin123');
    } else if (selectedRole === 'faculty') {
      setIdentifier('FAC101');
      setPassword('faculty123');
    } else if (selectedRole === 'student') {
      setIdentifier('310624205001');
      setPassword('password123');
    }
  };

  const handleQuickDemo = (demoType) => {
    setError('');
    setSuccess('');
    if (demoType === 'admin') {
      setRole('admin');
      setIdentifier('admin@exam.edu');
      setPassword('admin123');
    } else if (demoType === 'faculty_kumar') {
      setRole('faculty');
      setIdentifier('FAC101');
      setPassword('faculty123');
    } else if (demoType === 'faculty_ravi') {
      setRole('faculty');
      setIdentifier('FAC103');
      setPassword('faculty123');
    } else if (demoType === 'student_it') {
      setRole('student');
      setIdentifier('310624205001');
      setPassword('password123');
    } else if (demoType === 'student_cse') {
      setRole('student');
      setIdentifier('310624104001');
      setPassword('password123');
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your login credentials.');
      return;
    }

    try {
      setLoading(true);
      const user = await login(identifier.trim(), password.trim(), role);

      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'faculty') {
        navigate('/faculty/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Please fill in all required registration fields.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: regRole,
        department,
        programme: department,
        registerNumber: regRole === 'student' ? registerNumber.trim() : undefined,
        facultyId: regRole === 'faculty' ? facultyId.trim() : undefined,
        year: regRole === 'student' ? year : undefined,
        section: regRole === 'student' ? section : undefined,
        phone: regRole === 'faculty' ? phone.trim() : undefined,
      };

      const user = await register(payload);
      setSuccess('Account created successfully! Redirecting...');

      setTimeout(() => {
        if (user.role === 'faculty') {
          navigate('/faculty/dashboard');
        } else {
          navigate('/student/dashboard');
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card" style={{ maxWidth: mode === 'register' ? '540px' : '460px' }}>
        {/* Institutional College Header */}
        <div className="login-brand">
          <img
            src="/college_logo.jpg"
            alt="Easwari Engineering College Logo"
            className="login-logo-img"
          />
          <h2>Easwari Engineering College</h2>
          <div className="login-subtext" style={{ color: '#7a1c1d', fontWeight: 700 }}>
            Autonomous Institution • Affiliated to Anna University
          </div>
          <div className="login-subtext" style={{ color: '#1b365d', fontWeight: 600, marginTop: '2px' }}>
            Office of the Controller of Examinations
          </div>
        </div>

        {/* Mode Toggle: Sign In vs Self Register */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              borderBottom: mode === 'login' ? '3px solid #1b365d' : '3px solid transparent',
              background: 'transparent',
              color: mode === 'login' ? '#1b365d' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Portal Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccess('');
            }}
            style={{
              flex: 1,
              padding: '0.65rem 1rem',
              fontWeight: 700,
              fontSize: '0.85rem',
              border: 'none',
              borderBottom: mode === 'register' ? '3px solid #7a1c1d' : '3px solid transparent',
              background: 'transparent',
              color: mode === 'register' ? '#7a1c1d' : '#64748b',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Student & Faculty Registration
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{success}</span>
          </div>
        )}

        {mode === 'login' ? (
          <>
            {/* Segmented Role Tabs */}
            <div className="role-pills">
              <button
                type="button"
                className={`role-pill-btn ${role === 'admin' ? 'active' : ''}`}
                onClick={() => handleRoleChange('admin')}
              >
                <ShieldCheck size={14} />
                <span>Admin</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${role === 'faculty' ? 'active' : ''}`}
                onClick={() => handleRoleChange('faculty')}
              >
                <GraduationCap size={14} />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                className={`role-pill-btn ${role === 'student' ? 'active' : ''}`}
                onClick={() => handleRoleChange('student')}
              >
                <UserCheck size={14} />
                <span>Student</span>
              </button>
            </div>

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>
                  {role === 'student'
                    ? 'Student Register Number or Email'
                    : role === 'faculty'
                    ? 'Faculty ID or College Email'
                    : 'Administrator Email'}
                </label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon-left" />
                  <input
                    type="text"
                    className="form-control"
                    placeholder={
                      role === 'student'
                        ? 'e.g. 310624205001 or student email'
                        : role === 'faculty'
                        ? 'e.g. FAC101 or faculty email'
                        : 'admin@exam.edu'
                    }
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon-left" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-btn-right"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem', fontSize: '0.9rem' }}
                disabled={loading}
              >
                <LogIn size={16} />
                <span>
                  {loading
                    ? 'Authenticating...'
                    : `Sign In as ${role === 'admin' ? 'Administrator' : role === 'faculty' ? 'Faculty Member' : 'Student'}`}
                </span>
              </button>
            </form>

            {/* Quick Demo Credentials */}
            <div className="demo-account-helpers">
              <p>Quick Demo Credentials (Pre-configured):</p>
              <div className="demo-buttons-row">
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickDemo('admin')}
                  title="Admin (admin@exam.edu / admin123)"
                >
                  Admin
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickDemo('faculty_kumar')}
                  title="Faculty (FAC101 / faculty123)"
                >
                  Faculty (Kumar)
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickDemo('faculty_ravi')}
                  title="Faculty (FAC103 / faculty123 - Not Available)"
                >
                  Faculty (Ravi - Not Available)
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickDemo('student_it')}
                  title="Student (310624205001 / password123)"
                >
                  Student (IT)
                </button>
                <button
                  type="button"
                  className="demo-pill"
                  onClick={() => handleQuickDemo('student_cse')}
                  title="Student (310624104001 / password123)"
                >
                  Student (CSE)
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Student & Faculty Self-Registration (No Public Admin Registration) */
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label>Registration Account Role *</label>
              <div className="role-pills" style={{ marginBottom: 0 }}>
                <button
                  type="button"
                  className={`role-pill-btn ${regRole === 'student' ? 'active' : ''}`}
                  onClick={() => setRegRole('student')}
                >
                  <UserCheck size={14} />
                  <span>Student</span>
                </button>
                <button
                  type="button"
                  className={`role-pill-btn ${regRole === 'faculty' ? 'active' : ''}`}
                  onClick={() => setRegRole('faculty')}
                >
                  <GraduationCap size={14} />
                  <span>Faculty Member</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Full Name *</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon-left" />
                <input
                  type="text"
                  className="form-control"
                  placeholder={regRole === 'student' ? 'e.g. S. Karthik' : 'e.g. Dr. K. Meenakshi'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Official Email Address *</label>
                <div className="input-with-icon">
                  <Mail size={16} className="input-icon-left" />
                  <input
                    type="email"
                    className="form-control"
                    placeholder="name@eec.srmrmp.edu.in"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Create Password *</label>
                <div className="input-with-icon">
                  <Lock size={16} className="input-icon-left" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-btn-right"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {regRole === 'student' ? (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Register Number *</label>
                    <div className="input-with-icon">
                      <Hash size={16} className="input-icon-left" />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 310624205281"
                        value={registerNumber}
                        onChange={(e) => setRegisterNumber(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      className="form-control"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="IT">IT - Information Technology</option>
                      <option value="CSE">CSE - Computer Science & Engg</option>
                      <option value="ECE">ECE - Electronics & Comm Engg</option>
                      <option value="MECH">MECH - Mechanical Engg</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Year of Study *</label>
                    <select
                      className="form-control"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Section *</label>
                    <select
                      className="form-control"
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>Faculty ID *</label>
                    <div className="input-with-icon">
                      <Hash size={16} className="input-icon-left" />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. FAC107"
                        value={facultyId}
                        onChange={(e) => setFacultyId(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Department *</label>
                    <select
                      className="form-control"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                    >
                      <option value="IT">IT - Information Technology</option>
                      <option value="CSE">CSE - Computer Science & Engg</option>
                      <option value="ECE">ECE - Electronics & Comm Engg</option>
                      <option value="MECH">MECH - Mechanical Engg</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Contact Phone Number *</label>
                  <div className="input-with-icon">
                    <Phone size={16} className="input-icon-left" />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.75rem', backgroundColor: '#7a1c1d' }}
              disabled={loading}
            >
              <UserPlus size={16} />
              <span>{loading ? 'Registering...' : `Create ${regRole === 'student' ? 'Student' : 'Faculty'} Account`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
