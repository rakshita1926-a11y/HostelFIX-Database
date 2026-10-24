import { useMemo, useState, useEffect } from "react";
import {
  Wrench,
  LayoutDashboard,
  ClipboardList,
  MapPin,
  ChartNoAxesColumn,
  LogOut,
  Clock,
  CheckCircle2,
  CircleAlert,
  Search,
  Menu,
  X,
} from "lucide-react";
import "./App.css";
import {
  getToken,
  getUser,
  clearAuth,
  setOnUnauthorized,
  loginTechnician,
  fetchAssignments,
  fetchAssignmentById,
  updateAssignmentStatus,
  fetchAssets,
} from "./api";

function formatDate(isoString) {
  if (!isoString) return "—";
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function Badge({ value, type = "status" }) {
  const className = (value || "pending").toLowerCase().replace(/\s+/g, "-");
  return <span className={`badge ${type}-${className}`}>{value}</span>;
}

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Complaints", icon: ClipboardList },
  { name: "Hostels / Locations", icon: MapPin },
  { name: "Reports", icon: ChartNoAxesColumn },
  { name: "Logout", icon: LogOut },
];

function TechnicianLoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginTechnician({ identifier, password });
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="tech-login-wrapper">
      <div className="tech-login-card">
        <div className="brand">
          <div className="brand-icon"><Wrench size={22} /></div>
          <div style={{ marginLeft: "10px" }}>
            <strong style={{ fontSize: "16px" }}>HostelFix</strong>
            <span style={{ fontSize: "9px", color: "#8c6b72" }}>TECHNICIAN WORKSPACE</span>
          </div>
        </div>

        <h2>Technician Login</h2>
        <p className="subtitle">Sign in with your Technician ID or Phone to manage work orders</p>

        {error && <div className="tech-alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Technician ID or Phone Number</label>
          <input
            required
            placeholder="e.g. 1 or 9000000021"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
          />

          <label>Password</label>
          <input
            required
            type="password"
            placeholder="Minimum 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button type="submit" className="tech-login-submit" disabled={loading}>
            {loading ? "Authenticating..." : "Login to Workspace"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        <span>{label}</span>
        <span className="stat-icon"><Icon size={18} /></span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function Dashboard({ jobs, loading, error, navigate }) {
  const total = jobs.length;
  const pending = jobs.filter((j) => (j.complaint_status || j.status) === "Pending" || (j.complaint_status || j.status) === "Assigned").length;
  const progress = jobs.filter((j) => (j.complaint_status || j.status) === "In Progress").length;
  const resolved = jobs.filter((j) => (j.complaint_status || j.status) === "Resolved").length;
  const high = jobs.filter((j) => j.priority === "High" || j.priority === "Urgent").length;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TECHNICIAN WORKSPACE</p>
          <h1>My Assigned Jobs</h1>
          <p className="muted">Track your repair jobs and keep their status updated.</p>
        </div>
      </div>

      {error && <div className="tech-alert-error">⚠️ {error}</div>}

      <div className="stats-grid">
        <StatCard label="My Assigned Jobs" value={loading ? "…" : total} icon={ClipboardList} />
        <StatCard label="Pending / Assigned" value={loading ? "…" : pending} icon={Clock} />
        <StatCard label="In Progress" value={loading ? "…" : progress} icon={Wrench} />
        <StatCard label="Resolved" value={loading ? "…" : resolved} icon={CheckCircle2} />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Recent Work Orders</h2>
              <p className="muted">Your latest assigned maintenance jobs</p>
            </div>
            <button className="text-button" onClick={() => navigate("Complaints")}>
              View all
            </button>
          </div>

          <div className="recent-list">
            {loading ? (
              <p style={{ padding: "16px", color: "#666" }}>Loading assigned jobs...</p>
            ) : jobs.slice(0, 4).map((job) => {
              const currentStatus = job.complaint_status || job.status || "Assigned";
              return (
                <div className="recent-job" key={job.assignment_id || job.id}>
                  <div className="job-icon"><Wrench size={17} /></div>
                  <div className="recent-job-info">
                    <strong>#{job.complaint_id || job.id} · {job.asset_name || job.asset || "General"}</strong>
                    <span>{job.location_name || job.location || "Room"} · {job.hostel_name || job.hostel || "Hostel"}</span>
                  </div>
                  <Badge value={currentStatus} />
                </div>
              );
            })}
            {!loading && jobs.length === 0 && (
              <p style={{ padding: "16px", color: "#777" }}>No work orders assigned to you yet.</p>
            )}
          </div>
        </section>

        <section className="panel priority-summary">
          <div className="panel-heading">
            <div>
              <h2>Priority Overview</h2>
              <p className="muted">Jobs requiring attention</p>
            </div>
            <CircleAlert size={20} />
          </div>
          <div className="priority-number">{loading ? "…" : high}</div>
          <p className="muted">Urgent &amp; High-priority jobs in your queue</p>
          <div className="priority-track">
            <div style={{ width: `${total ? (high / total) * 100 : 0}%` }} />
          </div>
          <button className="primary-button full-button" onClick={() => navigate("Complaints")}>
            View work orders
          </button>
        </section>
      </div>
    </>
  );
}

function ComplaintsPage({ jobs, loading, error, onRefresh }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalDetails, setModalDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [modalRemarks, setModalRemarks] = useState("");

  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase();
    return (jobs || []).filter((job) => {
      const currentStatus = job.complaint_status || job.status || "";
      const matchesSearch =
        `${job.assignment_id} ${job.complaint_id} ${job.asset_name || ""} ${job.location_name || ""} ${job.description || ""}`
          .toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || currentStatus === statusFilter;
      const matchesPriority = priorityFilter === "All" || job.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [jobs, search, statusFilter, priorityFilter]);

  async function handleStatusChange(assignmentId, newStatus, remarks) {
    if (newStatus !== "In Progress" && newStatus !== "Resolved") {
      setActionError("Technicians can only advance status to 'In Progress' or 'Resolved'.");
      return;
    }

    setUpdatingId(assignmentId);
    setActionError("");
    setActionSuccess("");

    try {
      await updateAssignmentStatus(assignmentId, {
        status: newStatus,
        remarks: remarks || `Marked as ${newStatus} by technician`,
      });
      setActionSuccess(`Assignment #${assignmentId} status updated to ${newStatus}.`);
      onRefresh();
      if (selectedJob && (selectedJob.assignment_id === assignmentId || selectedJob.id === assignmentId)) {
        setSelectedJob(null);
      }
    } catch (err) {
      setActionError(err.message || "Failed to update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  function openJobDetails(job) {
    setSelectedJob(job);
    setModalDetails(null);
    setModalRemarks("");
    setActionError("");
    const aId = job.assignment_id || job.id;
    if (aId) {
      setLoadingDetails(true);
      fetchAssignmentById(aId)
        .then((data) => {
          setModalDetails(data);
        })
        .catch(() => {
          // fallback to using job item itself
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORK QUEUE</p>
          <h1>My Work Orders</h1>
          <p className="muted">View assigned jobs and update repair progress.</p>
        </div>
        <button
          onClick={onRefresh}
          className="text-button"
          style={{ padding: "8px 14px", border: "1px solid #d4c0c4", borderRadius: "6px" }}
        >
          ↻ Refresh Queue
        </button>
      </div>

      {actionSuccess && <div className="tech-alert-success">✓ {actionSuccess}</div>}
      {actionError && <div className="tech-alert-error">⚠️ {actionError}</div>}
      {error && <div className="tech-alert-error">⚠️ {error}</div>}

      <section className="panel">
        <div className="filter-row">
          <div className="search-box">
            <Search size={17} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs, assets, or locations..."
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option>
            <option>Urgent</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job / Complaint</th>
                <th>Issue / Asset</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Update Progress</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "20px" }}>Loading work orders...</td>
                </tr>
              ) : filteredJobs.map((job) => {
                const currentStatus = job.complaint_status || job.status || "Assigned";
                const isResolved = currentStatus === "Resolved";
                const aId = job.assignment_id || job.id;

                return (
                  <tr key={aId}>
                    <td>
                      <strong>#{job.complaint_id}</strong>
                      <div style={{ fontSize: "10px", color: "#777" }}>Assign #{aId}</div>
                    </td>
                    <td>
                      <strong>{job.asset_name || job.asset || "General"}</strong>
                      <span className="cell-subtitle">{job.description || job.issue || "No description"}</span>
                    </td>
                    <td>
                      {job.location_name || job.location || "Room"}
                      <span className="cell-subtitle">{job.hostel_name || job.hostel || "Hostel"}</span>
                    </td>
                    <td><Badge value={job.priority || "Medium"} type="priority" /></td>
                    <td><Badge value={currentStatus} type="status" /></td>
                    <td>
                      {!isResolved ? (
                        <div style={{ display: "flex", gap: "6px" }}>
                          {currentStatus !== "In Progress" && (
                            <button
                              onClick={() => handleStatusChange(aId, "In Progress")}
                              disabled={updatingId === aId}
                              style={{ padding: "4px 8px", background: "#e0f2fe", color: "#0369a1", border: "1px solid #bae6fd", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                            >
                              {updatingId === aId ? "Updating..." : "Start Work"}
                            </button>
                          )}
                          <button
                            onClick={() => handleStatusChange(aId, "Resolved")}
                            disabled={updatingId === aId}
                            style={{ padding: "4px 8px", background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                          >
                            {updatingId === aId ? "Updating..." : "Mark Resolved"}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: "11px", color: "#2e7d32", fontWeight: 600 }}>✓ Completed</span>
                      )}
                    </td>
                    <td>
                      <button className="small-button" onClick={() => openJobDetails(job)}>
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredJobs.length === 0 && (
                <tr><td colSpan="7" className="empty-cell">No work orders match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedJob && (
        <div className="modal-backdrop" onClick={() => setSelectedJob(null)}>
          <section className="job-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-heading">
              <div>
                <p className="eyebrow">WORK ORDER · ASSIGNMENT #{selectedJob.assignment_id || selectedJob.id}</p>
                <h2>{selectedJob.asset_name || selectedJob.asset || "General Facility"} Issue</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedJob(null)} aria-label="Close details">
                <X size={20} />
              </button>
            </div>

            <p style={{ marginTop: "8px", marginBottom: "14px", fontSize: "13px" }}>
              <strong>Description:</strong> {selectedJob.description || selectedJob.issue || "No description provided."}
            </p>

            <div className="detail-grid">
              <span>Complaint ID</span><strong>#{selectedJob.complaint_id}</strong>
              <span>Location</span><strong>{selectedJob.location_name || selectedJob.location}, {selectedJob.hostel_name || selectedJob.hostel}</strong>
              <span>Reported by</span><strong>{selectedJob.student_name || "Student"} ({selectedJob.student_contact || selectedJob.student_phone || "—"})</strong>
              <span>Reported date</span><strong>{formatDate(selectedJob.complaint_date || selectedJob.date)}</strong>
              <span>Current Status</span><strong><Badge value={selectedJob.complaint_status || selectedJob.status} /></strong>
              <span>Priority</span><strong><Badge value={selectedJob.priority || "Medium"} type="priority" /></strong>
            </div>

            {loadingDetails && <p style={{ fontSize: "11px", color: "#777", margin: "10px 0" }}>Loading status history...</p>}

            {modalDetails && modalDetails.status_history && (
              <div style={{ margin: "14px 0", maxHeight: "140px", overflowY: "auto", border: "1px solid #f0e6e6", padding: "8px", borderRadius: "6px" }}>
                <strong style={{ fontSize: "11px", display: "block", marginBottom: "6px" }}>Status History:</strong>
                {modalDetails.status_history.map((h) => (
                  <div key={h.history_id} style={{ fontSize: "10px", padding: "3px 0", borderBottom: "1px dashed #eee" }}>
                    <strong>{h.status}</strong> · {formatDate(h.changed_date)} {h.remarks ? `— ${h.remarks}` : ""}
                  </div>
                ))}
              </div>
            )}

            {(selectedJob.complaint_status !== "Resolved" && selectedJob.status !== "Resolved") && (
              <>
                <label className="field-label" style={{ marginTop: "12px" }}>Technician Remarks</label>
                <input
                  type="text"
                  placeholder="Optional remarks (e.g. Parts replaced, testing complete)..."
                  value={modalRemarks}
                  onChange={(e) => setModalRemarks(e.target.value)}
                  style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "12px", marginBottom: "12px" }}
                />

                <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                  <button
                    className="primary-button"
                    style={{ flex: 1, background: "#0284c7" }}
                    onClick={() => handleStatusChange(selectedJob.assignment_id || selectedJob.id, "In Progress", modalRemarks)}
                    disabled={updatingId}
                  >
                    Set In Progress
                  </button>
                  <button
                    className="primary-button"
                    style={{ flex: 1, background: "#16a34a" }}
                    onClick={() => handleStatusChange(selectedJob.assignment_id || selectedJob.id, "Resolved", modalRemarks)}
                    disabled={updatingId}
                  >
                    Mark Resolved
                  </button>
                </div>
              </>
            )}

            <button className="primary-button full-button" onClick={() => setSelectedJob(null)}>
              Close
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function HostelLocationsPage({ jobs }) {
  const [activeTab, setActiveTab] = useState("Assets");
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchAssets()
      .then((data) => {
        setAssets(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load assets");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Locations derived from assigned jobs
  const assignedLocations = useMemo(() => {
    const map = new Map();
    (jobs || []).forEach((j) => {
      if (j.location_name && !map.has(j.location_name)) {
        map.set(j.location_name, {
          location: j.location_name,
          hostel: j.hostel_name || "Hostel",
          type: j.location_type || "Room",
          floor: j.floor_no !== undefined ? `Floor ${j.floor_no}` : "—",
        });
      }
    });
    return Array.from(map.values());
  }, [jobs]);

  const tabs = ["Assets", "Assigned Locations"];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REFERENCE INFORMATION</p>
          <h1>Facility &amp; Asset Catalog</h1>
          <p className="muted">View registered assets and locations relevant to your work orders.</p>
        </div>
      </div>

      {error && <div className="tech-alert-error">⚠️ {error}</div>}

      <section className="panel">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "tab active" : "tab"}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <h2 className="section-title">{activeTab}</h2>

        <div className="table-wrap">
          {activeTab === "Assets" ? (
            <table>
              <thead>
                <tr><th>Asset ID</th><th>Asset Name</th><th>Asset Type</th><th>Operational Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>Loading assets...</td></tr>
                ) : assets.map((a) => (
                  <tr key={a.asset_id}>
                    <td>#{a.asset_id}</td>
                    <td>{a.asset_name}</td>
                    <td>{a.asset_type}</td>
                    <td><Badge value={a.status || "Functional"} type="status" /></td>
                  </tr>
                ))}
                {!loading && assets.length === 0 && (
                  <tr><td colSpan="4" className="empty-cell">No assets found in catalog.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr><th>Location</th><th>Hostel</th><th>Type</th><th>Floor</th></tr>
              </thead>
              <tbody>
                {assignedLocations.map((loc, idx) => (
                  <tr key={idx}>
                    <td>{loc.location}</td>
                    <td>{loc.hostel}</td>
                    <td>{loc.type}</td>
                    <td>{loc.floor}</td>
                  </tr>
                ))}
                {assignedLocations.length === 0 && (
                  <tr><td colSpan="4" className="empty-cell">No locations recorded from current assignments.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <p className="read-only-note">Asset data loaded from backend catalog.</p>
      </section>
    </>
  );
}

function ReportsPage({ jobs }) {
  const total = jobs.length;
  const resolved = jobs.filter((j) => (j.complaint_status || j.status) === "Resolved").length;
  const inProgress = jobs.filter((j) => (j.complaint_status || j.status) === "In Progress").length;
  const assigned = jobs.filter((j) => (j.complaint_status || j.status) === "Assigned" || (j.complaint_status || j.status) === "Pending").length;
  const high = jobs.filter((j) => j.priority === "High" || j.priority === "Urgent").length;

  const priorities = [
    { label: "High / Urgent", count: high, color: "#d98d94" },
    { label: "Medium", count: jobs.filter((j) => j.priority === "Medium").length, color: "#e8c777" },
    { label: "Low", count: jobs.filter((j) => j.priority === "Low").length, color: "#92c8ad" },
  ];
  const maxPriority = Math.max(1, ...priorities.map((item) => item.count));

  return (
    <>
      <div className="page-heading reports-page-heading">
        <div>
          <p className="eyebrow">WORK SUMMARY</p>
          <h1>Reports &amp; Analytics (My Assigned Work)</h1>
          <p className="muted">Live summary of repairs assigned to you.</p>
        </div>
      </div>

      <div className="stats-grid report-stats">
        <StatCard label="Assigned Jobs" value={total} icon={ClipboardList} />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle2} />
        <StatCard label="In Progress" value={inProgress} icon={Wrench} />
        <StatCard label="Urgent / High Priority" value={high} icon={CircleAlert} />
      </div>

      <div className="reports-grid">
        <section className="panel">
          <h2>Jobs by Priority Tier</h2>
          <p className="muted">Breakdown of your current assigned maintenance tickets</p>
          <div className="bar-chart">
            {priorities.map((item) => (
              <div className="bar-item" key={item.label}>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      height: `${(item.count / maxPriority) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <strong>{item.count}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>Resolution Rate</h2>
          <p className="muted">Completion progress</p>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: "40px", fontWeight: 800, color: "#4d2028" }}>
              {total > 0 ? Math.round((resolved / total) * 100) : 0}%
            </div>
            <p style={{ color: "#777", fontSize: "12px", margin: "6px 0 16px" }}>
              {resolved} of {total} jobs completed
            </p>
            <div style={{ height: "10px", background: "#f0e6e6", borderRadius: "5px", overflow: "hidden", margin: "0 auto", maxWidth: "260px" }}>
              <div style={{ height: "100%", width: `${total ? (resolved / total) * 100 : 0}%`, background: "#16a34a" }} />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearAuth();
      setIsLoggedIn(false);
      setCurrentUser(null);
    });
  }, []);

  function loadTechnicianAssignments() {
    if (!getToken()) return;
    setLoadingJobs(true);
    setJobsError("");

    fetchAssignments()
      .then((data) => {
        setJobs(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setJobsError(err.message || "Failed to load assigned jobs");
      })
      .finally(() => {
        setLoadingJobs(false);
      });
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadTechnicianAssignments();
    }
  }, [isLoggedIn]);

  function handleLoginSuccess(user) {
    setCurrentUser(user);
    setIsLoggedIn(true);
    setActivePage("Dashboard");
  }

  function handleLogout() {
    clearAuth();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setJobs([]);
    setActivePage("Dashboard");
  }

  function navigate(page) {
    if (page === "Logout") {
      handleLogout();
    } else {
      setActivePage(page);
    }
    setMobileMenuOpen(false);
  }

  if (!isLoggedIn) {
    return <TechnicianLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Wrench size={22} /></div>
          <div>
            <strong>HostelFix</strong>
            <span>TECHNICIAN PORTAL</span>
          </div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">{currentUser?.name ? currentUser.name[0].toUpperCase() : "T"}</div>
          <div>
            <strong>{currentUser?.name || "Technician"}</strong>
            <span>{currentUser?.specialization || "Maintenance"}</span>
          </div>
        </div>

        <p className="menu-label">WORKSPACE</p>
        <nav className="side-nav">
          {menuItems.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${activePage === name ? "active" : ""}`}
              onClick={() => navigate(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="online-dot" />
          <span>Connected to Portal</span>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close menu overlay"
        />
      )}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="breadcrumb">HostelFix <span>/</span> {activePage}</div>
          <div className="topbar-user">
            <span className="online-dot" /> {currentUser?.name || "Technician"} ({currentUser?.specialization || "Tech"})
          </div>
        </header>

        <div className="page-content">
          {activePage === "Dashboard" && (
            <Dashboard
              jobs={jobs}
              loading={loadingJobs}
              error={jobsError}
              navigate={navigate}
            />
          )}
          {activePage === "Complaints" && (
            <ComplaintsPage
              jobs={jobs}
              loading={loadingJobs}
              error={jobsError}
              onRefresh={loadTechnicianAssignments}
            />
          )}
          {activePage === "Hostels / Locations" && (
            <HostelLocationsPage jobs={jobs} />
          )}
          {activePage === "Reports" && (
            <ReportsPage jobs={jobs} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
