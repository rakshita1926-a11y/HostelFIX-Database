import { useState, useEffect } from 'react'
import './App.css'
import { UserRound, Wrench } from "lucide-react";
import {
  getToken,
  getUser,
  clearAuth,
  setOnUnauthorized,
  loginStudent,
  fetchLocations,
  fetchAssets,
  fetchComplaints,
  fetchComplaintById,
  submitComplaint,
} from './api'

function formatDate(isoString) {
  if (!isoString) return '—'
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return isoString
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MyComplaintsPage({ complaints, loading, error, onSelectComplaint, onRefresh }) {
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  const filteredComplaints = (complaints || []).filter((complaint) => {
    const matchesFilter =
      filter === 'All' ||
      (complaint.status && complaint.status.toLowerCase() === filter.toLowerCase())

    const searchStr = `${complaint.complaint_id || complaint.id || ''} ${complaint.location_name || complaint.location || ''} ${complaint.asset_name || complaint.asset || ''} ${complaint.priority || ''} ${complaint.status || ''} ${complaint.description || ''}`.toLowerCase()

    return matchesFilter && searchStr.includes(search.toLowerCase())
  })

  return (
    <section className="my-complaints-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Complaints</h1>
        <button
          className="filter-button"
          onClick={onRefresh}
          style={{ padding: '6px 14px', fontSize: '11px', cursor: 'pointer' }}
        >
          ↻ Refresh
        </button>
      </div>

      <div className="complaints-toolbar">
        <div className="complaint-filters">
          {['All', 'Pending', 'In Progress', 'Resolved'].map((item) => (
            <button
              key={item}
              className={`filter-button ${filter === item ? 'selected' : ''}`}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        <input
          className="complaint-search"
          type="search"
          placeholder="⌕  Search complaints..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div style={{ padding: '12px', background: '#ffebee', color: '#b71c1c', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      )}

      <div className="my-complaints-table-wrap">
        <table className="my-complaints-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Date</th>
              <th>Location</th>
              <th>Asset</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#777' }}>
                  Loading complaints...
                </td>
              </tr>
            ) : filteredComplaints.length > 0 ? (
              filteredComplaints.map((complaint) => {
                const idDisplay = `#${complaint.complaint_id || complaint.id}`
                const dateDisplay = formatDate(complaint.complaint_date || complaint.date)
                const locDisplay = complaint.location_name || complaint.location || '—'
                const assetDisplay = complaint.asset_name || complaint.asset || 'General'
                const priorityDisplay = complaint.priority || 'Medium'
                const statusDisplay = complaint.status || 'Pending'

                return (
                  <tr
                    key={complaint.complaint_id || complaint.id}
                    onClick={() => onSelectComplaint(complaint)}
                    className="clickable-complaint-row"
                  >
                    <td>{idDisplay}</td>
                    <td>{dateDisplay}</td>
                    <td>{locDisplay}</td>
                    <td>{assetDisplay}</td>
                    <td>
                      <span className={`my-priority priority-${priorityDisplay.toLowerCase()}`}>
                        {priorityDisplay}
                      </span>
                    </td>
                    <td>
                      <span className={`my-status status-${statusDisplay.toLowerCase().replace(/\s+/g, '-')}`}>
                        {statusDisplay}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan="6" className="empty-complaints">
                  No complaints found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ComplaintDetailsPage({ complaint: initialComplaint, onBack }) {
  const [complaint, setComplaint] = useState(initialComplaint)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialComplaint && initialComplaint.complaint_id) {
      setLoading(true)
      fetchComplaintById(initialComplaint.complaint_id)
        .then((fresh) => {
          setComplaint(fresh)
        })
        .catch((err) => {
          setError(err.message)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [initialComplaint])

  if (!complaint) {
    return (
      <section className="complaints-panel">
        <button onClick={onBack}>← Back to My Complaints</button>
        <p>Complaint not found.</p>
      </section>
    )
  }

  const idDisplay = `#${complaint.complaint_id || complaint.id}`
  const dateDisplay = formatDate(complaint.complaint_date || complaint.date)
  const locDisplay = complaint.location_name || complaint.location || '—'
  const assetDisplay = complaint.asset_name || complaint.asset || 'General Facility'
  const priorityDisplay = complaint.priority || 'Medium'
  const statusDisplay = complaint.status || 'Pending'

  const timeline = (complaint.status_history && complaint.status_history.length > 0)
    ? complaint.status_history
    : [
        {
          status: statusDisplay,
          changed_date: complaint.complaint_date,
          remarks: 'Complaint registered',
          changed_by: 'Student',
        },
      ]

  return (
    <section className="complaint-details-page">
      <button className="back-to-complaints" onClick={onBack}>
        ← Back to My Complaints
      </button>

      {loading && <p style={{ fontSize: '12px', color: '#666' }}>Refreshing complaint details...</p>}
      {error && <div style={{ padding: '8px', background: '#ffebee', color: '#c62828', fontSize: '11px', borderRadius: '4px', marginBottom: '10px' }}>{error}</div>}

      <div className="complaint-details-layout">
        <div className="complaint-details-main">
          <span className="detail-id">{idDisplay}</span>
          <h2>{assetDisplay} Issue</h2>

          <span className={`my-priority priority-${priorityDisplay.toLowerCase()}`}>
            {priorityDisplay}
          </span>

          <div className="complaint-metadata">
            <span>◷ &nbsp; {dateDisplay}</span>
            <span>⌖ &nbsp; {locDisplay} {complaint.floor_no !== undefined ? `(Floor ${complaint.floor_no})` : ''}</span>
            <span>⚒ &nbsp; {assetDisplay}</span>
          </div>

          <h3>Description</h3>
          <p className="detail-description">
            {complaint.description || 'No description provided.'}
          </p>

          <div className="technician-card">
            <strong>Technician Assignment</strong>
            {complaint.assigned_technician || complaint.technician_name ? (
              <>
                <p>👤 &nbsp; {complaint.assigned_technician || complaint.technician_name}</p>
                <span>
                  {complaint.technician_specialization || 'Maintenance'} · {complaint.technician_phone || 'Contact provided on dispatch'}
                </span>
              </>
            ) : (
              <p style={{ color: '#777', fontWeight: 400 }}>
                Not yet assigned to a technician. Pending warden review.
              </p>
            )}
          </div>
        </div>

        <aside className="complaint-timeline">
          <h3>Status Timeline</h3>

          {timeline.map((item, index) => (
            <div className="timeline-item" key={item.history_id || index}>
              <span className="timeline-dot" />
              <div>
                <strong>{item.status}</strong>
                <p>{formatDate(item.changed_date)} {formatTime(item.changed_date)}</p>
                {item.remarks && <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>{item.remarks}</p>}
                {item.changed_by && <small>(by {item.changed_by})</small>}
              </div>
            </div>
          ))}
        </aside>
      </div>
    </section>
  )
}

function LandingPage({ onLogin }) {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <a className="landing-brand" href="#home">
          <span className="landing-brand-icon">
            <Wrench size={25} strokeWidth={2.4} />
          </span>
          <span>HostelFix</span>
        </a>

        <nav className="landing-links">
          <a className="landing-active" href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#features">Features</a>
          <a href="#contact">Contact</a>
        </nav>

        <button className="landing-login" onClick={onLogin}>
          Login
        </button>
      </header>

      <main className="landing-hero" id="home">
        <div className="landing-corner-top" />
        <div className="landing-corner-bottom" />
        <div className="landing-cloud" />

        <section className="landing-copy">
          <h1>Your hostel.<br />Better maintained.</h1>

          <p>
            Report maintenance issues, track<br className="desktop-break" />
            progress and keep your hostel<br className="desktop-break" />
            comfortable, safe and clean — all in<br className="desktop-break" />
            one place.
          </p>

          <button className="landing-report" onClick={onLogin}>
            Report an Issue →
          </button>
        </section>

        <img
          src="/hostel-illustration.png"
          alt="Illustration of a hostel building"
          className="landing-hostel"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </main>
    </div>
  )
}

function StudentLoginPage({ onLoginSuccess, onBack }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await loginStudent({ identifier, password })
      onLoginSuccess(res.user)
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-corner login-corner-left" />
      <div className="login-corner login-corner-right" />
      <div className="login-corner login-corner-bottom" />

      <form className="login-card" onSubmit={handleSubmit}>
        <button
          type="button"
          className="login-back"
          onClick={onBack}
          aria-label="Back"
        >
          ←
        </button>

        <div className="login-brand">
          <span className="login-brand-icon">
            <Wrench size={27} strokeWidth={2.5} />
          </span>
          <span>HostelFix</span>
        </div>

        <h2>Student Login</h2>

        {error && (
          <div style={{
            padding: '10px 12px',
            marginBottom: '14px',
            background: '#ffebee',
            color: '#b71c1c',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: 1.4,
          }}>
            ⚠️ {error}
          </div>
        )}

        <label className="login-input">
          <UserRound size={15} />
          <input
            required
            placeholder="Student ID / Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
          />
        </label>

        <label className="login-input">
          <span>♙</span>
          <input
            required
            type="password"
            placeholder="Password (minimum 12 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
        </label>

        <div className="login-options">
          <label className="remember-option">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={loading}
            />
            Remember me
          </label>
          <button type="button" className="forgot-password">
            Forgot password?
          </button>
        </div>

        <button type="submit" className="login-submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="login-footer">
          Don't have an account? <a href="#contact-warden">Contact your warden</a>
        </p>
      </form>
    </div>
  )
}

function NewComplaintForm({ user, onSuccess }) {
  const [locations, setLocations] = useState([])
  const [assets, setAssets] = useState([])
  const [selectedLocationId, setSelectedLocationId] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [priority, setPriority] = useState('Medium')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoadingLookups(true)
    fetchLocations({ hostel_id: user?.hostel_id })
      .then((locs) => {
        setLocations(Array.isArray(locs) ? locs : [])
      })
      .catch((err) => {
        setError(`Failed to load locations: ${err.message}`)
      })
      .finally(() => {
        setLoadingLookups(false)
      })
  }, [user])

  useEffect(() => {
    if (selectedLocationId) {
      fetchAssets({ location_id: selectedLocationId })
        .then((ass) => {
          setAssets(Array.isArray(ass) ? ass : [])
        })
        .catch(() => {
          setAssets([])
        })
    } else {
      setAssets([])
      setSelectedAssetId('')
    }
  }, [selectedLocationId])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (!selectedLocationId) {
      setError('Please select a valid location.')
      return
    }

    if (!description.trim()) {
      setError('Please enter a description of the issue.')
      return
    }

    setLoading(true)

    try {
      const res = await submitComplaint({
        location_id: selectedLocationId,
        asset_id: selectedAssetId || null,
        priority,
        description,
      })

      setMessage(`Complaint registered successfully! ID #${res.complaint_id || res.id}`)
      setDescription('')
      setSelectedAssetId('')
      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err.message || 'Failed to submit complaint.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="complaints-panel">
      <div className="panel-header">
        <h2>Submit a New Complaint</h2>
      </div>

      {message && (
        <div style={{ padding: '12px', background: '#e8f5e9', color: '#2e7d32', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
          ✓ {message}
        </div>
      )}

      {error && (
        <div style={{ padding: '12px', background: '#ffebee', color: '#b71c1c', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
          ⚠️ {error}
        </div>
      )}

      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="complaint-fields-row">
          <label>
            Hostel Scoping
            <input
              type="text"
              readOnly
              value={user?.hostel_id ? `Assigned Hostel #${user.hostel_id}` : 'Student Hostel'}
              style={{ background: '#f5f5f5', color: '#555', cursor: 'not-allowed' }}
            />
          </label>

          <label>
            Location *
            <select
              required
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              disabled={loadingLookups || loading}
            >
              <option value="" disabled>
                {loadingLookups ? 'Loading locations...' : 'Select Location'}
              </option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={loc.location_id}>
                  {loc.location_name} (Floor {loc.floor_no} - {loc.location_type})
                </option>
              ))}
            </select>
          </label>

          <label>
            Asset (Optional)
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              disabled={!selectedLocationId || loading}
            >
              <option value="">
                {selectedLocationId ? 'Select Asset (or General)' : 'Select location first'}
              </option>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.asset_name} ({asset.asset_type})
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Priority *
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            disabled={loading}
          >
            <option value="Low">Low – Minor / cosmetic issue</option>
            <option value="Medium">Medium – Causes inconvenience</option>
            <option value="High">High – Affects health, safety, or core facilities</option>
          </select>
        </label>

        <label>
          Description *
          <textarea
            required
            rows="6"
            placeholder="Describe the issue in detail..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={loading}
          />
        </label>

        <div className="priority-guide">
          <strong>ⓘ &nbsp; Priority Guide</strong>
          <p>High – Affects health, safety or essential facilities</p>
          <p>Medium – Causes inconvenience</p>
          <p>Low – Minor issue / cosmetic</p>
          <p><em>Note: Urgent priority is strictly reserved for administrative escalation.</em></p>
        </div>

        <div className="complaint-submit-row">
          <button type="submit" className="complaint-submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </div>
      </form>
    </div>
  )
}

function App() {
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [selectedComplaint, setSelectedComplaint] = useState(null)
  const [currentUser, setCurrentUser] = useState(() => getUser())
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken())
  const [showLanding, setShowLanding] = useState(() => !getToken())

  const [complaints, setComplaints] = useState([])
  const [loadingComplaints, setLoadingComplaints] = useState(false)
  const [complaintsError, setComplaintsError] = useState('')

  useEffect(() => {
    setOnUnauthorized(() => {
      setIsLoggedIn(false)
      setCurrentUser(null)
      setShowLanding(false)
    })
  }, [])

  function loadStudentComplaints() {
    if (!getToken()) return
    setLoadingComplaints(true)
    setComplaintsError('')
    fetchComplaints()
      .then((data) => {
        setComplaints(Array.isArray(data) ? data : [])
      })
      .catch((err) => {
        setComplaintsError(err.message || 'Failed to load complaints')
      })
      .finally(() => {
        setLoadingComplaints(false)
      })
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadStudentComplaints()
    }
  }, [isLoggedIn])

  function handleLoginSuccess(user) {
    setCurrentUser(user)
    setIsLoggedIn(true)
    setShowLanding(false)
    setCurrentPage('Dashboard')
  }

  function handleLogout() {
    clearAuth()
    setCurrentUser(null)
    setIsLoggedIn(false)
    setShowLanding(true)
    setComplaints([])
    setCurrentPage('Dashboard')
  }

  // Calculate stats from real complaints
  const totalCount = complaints.length
  const inProgressCount = complaints.filter((c) => c.status === 'In Progress').length
  const resolvedCount = complaints.filter((c) => c.status === 'Resolved').length
  const pendingCount = complaints.filter((c) => c.status === 'Pending' || c.status === 'Assigned').length

  const realStats = [
    { label: 'Total Complaints', value: totalCount, icon: 'ⓘ', type: 'total' },
    { label: 'In Progress', value: inProgressCount, icon: '◷', type: 'progress' },
    { label: 'Resolved', value: resolvedCount, icon: '✓', type: 'resolved' },
    { label: 'Pending / Assigned', value: pendingCount, icon: '▤', type: 'pending' },
  ]

  return (
    <>
      {showLanding ? (
        <LandingPage onLogin={() => setShowLanding(false)} />
      ) : !isLoggedIn ? (
        <StudentLoginPage
          onLoginSuccess={handleLoginSuccess}
          onBack={() => setShowLanding(true)}
        />
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand">
              <span className="brand-icon">
                <Wrench size={24} strokeWidth={2.2} />
              </span>
              <span>HostelFix</span>
            </div>

            <nav className="navigation">
              {['Dashboard', 'New Complaint', 'My Complaints'].map((page) => (
                <button
                  key={page}
                  className={`nav-item ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  <span>
                    {page === 'Dashboard' ? '▦' : page === 'New Complaint' ? '⊕' : '▤'}
                  </span>
                  {page}
                </button>
              ))}

              <button
                className="nav-item"
                onClick={() => {
                  alert(`Student Profile:\nName: ${currentUser?.name || 'N/A'}\nStudent ID: ${currentUser?.student_id || 'N/A'}\nEmail: ${currentUser?.email || 'N/A'}\nHostel ID: ${currentUser?.hostel_id || 'N/A'}`)
                }}
              >
                <span><UserRound size={22} strokeWidth={1.8} /></span>
                Profile
              </button>

              <button className="nav-item" onClick={handleLogout}>
                <span>⇥</span>
                Logout
              </button>
            </nav>
          </aside>

          <main className="dashboard">
            {currentPage === 'Complaint Details' ? (
              <ComplaintDetailsPage
                complaint={selectedComplaint}
                onBack={() => setCurrentPage('My Complaints')}
              />
            ) : currentPage === 'New Complaint' ? (
              <NewComplaintForm
                user={currentUser}
                onSuccess={() => {
                  loadStudentComplaints()
                  setCurrentPage('My Complaints')
                }}
              />
            ) : currentPage === 'My Complaints' ? (
              <MyComplaintsPage
                complaints={complaints}
                loading={loadingComplaints}
                error={complaintsError}
                onRefresh={loadStudentComplaints}
                onSelectComplaint={(complaint) => {
                  setSelectedComplaint(complaint)
                  setCurrentPage('Complaint Details')
                }}
              />
            ) : (
              <>
                <header className="page-header">
                  <div>
                    <h1>Welcome, {currentUser?.name || 'Student'}!</h1>
                    <p>
                      Hostel #{currentUser?.hostel_id || '1'} · Student ID: {currentUser?.student_id || 'Student'}
                    </p>
                  </div>
                  <button
                    className="profile-button"
                    aria-label="Profile"
                    onClick={() => {
                      alert(`Student Profile:\nName: ${currentUser?.name || 'N/A'}\nStudent ID: ${currentUser?.student_id || 'N/A'}\nEmail: ${currentUser?.email || 'N/A'}\nHostel: #${currentUser?.hostel_id || 'N/A'}`)
                    }}
                  >
                    <UserRound size={22} strokeWidth={1.8} />
                  </button>
                </header>

                <section className="stats-grid">
                  {realStats.map((stat) => (
                    <article className={`stat-card ${stat.type}`} key={stat.type}>
                      <span className="stat-icon">{stat.icon}</span>
                      <span className="stat-label">{stat.label}</span>
                      <strong>{stat.value}</strong>
                    </article>
                  ))}
                </section>

                <section className="complaints-panel">
                  <div className="panel-header">
                    <h2>Recent Complaints</h2>
                    <button className="view-all" onClick={() => setCurrentPage('My Complaints')}>
                      View All →
                    </button>
                  </div>

                  {complaintsError && (
                    <div style={{ padding: '10px', background: '#ffebee', color: '#c62828', borderRadius: '6px', marginBottom: '10px', fontSize: '12px' }}>
                      ⚠️ {complaintsError}
                    </div>
                  )}

                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Date</th>
                          <th>Location</th>
                          <th>Asset</th>
                          <th>Priority</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingComplaints ? (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                              Loading recent complaints...
                            </td>
                          </tr>
                        ) : complaints.slice(0, 5).map((complaint) => {
                          const idDisplay = `#${complaint.complaint_id || complaint.id}`
                          const dateDisplay = formatDate(complaint.complaint_date || complaint.date)
                          const locDisplay = complaint.location_name || complaint.location || '—'
                          const assetDisplay = complaint.asset_name || complaint.asset || 'General'
                          const priorityDisplay = complaint.priority || 'Medium'
                          const statusDisplay = complaint.status || 'Pending'

                          return (
                            <tr
                              key={complaint.complaint_id || complaint.id}
                              onClick={() => {
                                setSelectedComplaint(complaint)
                                setCurrentPage('Complaint Details')
                              }}
                              className="clickable-complaint-row"
                            >
                              <td>{idDisplay}</td>
                              <td>{dateDisplay}</td>
                              <td>{locDisplay}</td>
                              <td>{assetDisplay}</td>
                              <td>
                                <span className={`pill priority-${priorityDisplay.toLowerCase()}`}>
                                  {priorityDisplay}
                                </span>
                              </td>
                              <td>
                                <span className={`pill status-${statusDisplay.toLowerCase().replace(/\s+/g, '-')}`}>
                                  {statusDisplay}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                        {!loadingComplaints && complaints.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: '#777' }}>
                              No complaints logged yet. Click "New Complaint" to report an issue.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      )}
    </>
  )
}

export default App
