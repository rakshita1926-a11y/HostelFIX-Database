import { useState, useEffect } from "react";
import {
  Wrench,
  LayoutDashboard,
  FileText,
  UserRound,
  MapPin,
  ChartNoAxesColumn,
  LogOut,
  Clock,
  Check,
  CircleAlert,
  ClipboardList,
} from "lucide-react";
import "./App.css";
import {
  getToken,
  getUser,
  clearAuth,
  setOnUnauthorized,
  loginWarden,
  fetchWardenComplaints,
  fetchWardenTechnicians,
  assignComplaint,
  rejectComplaint,
  fetchLocations,
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

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Complaints", icon: FileText },
  { label: "Assign Technician", icon: UserRound },
  { label: "Hostels / Locations", icon: MapPin },
  { label: "Reports", icon: ChartNoAxesColumn },
];

function WardenLoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await loginWarden({ identifier, password });
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="warden-login-wrapper">
      <div className="warden-login-card">
        <div className="brand">
          <span className="brand-icon"><Wrench size={18} /></span>
          <span>HostelFix</span>
        </div>
        <h2>Warden Portal Login</h2>
        <p className="subtitle">Sign in to manage complaints, assignments, and technicians</p>

        {error && <div className="warden-alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Warden ID or Email</label>
          <input
            required
            placeholder="e.g. 1 or warden@hostel.edu"
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

          <button type="submit" className="warden-login-submit" disabled={loading}>
            {loading ? "Authenticating..." : "Login to Portal"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Dashboard({ complaints, loading, error, user, onNavigate }) {
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "Pending").length;
  const inProgress = complaints.filter((c) => c.status === "In Progress" || c.status === "Assigned").length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;

  const urgentCount = complaints.filter((c) => c.priority === "Urgent").length;
  const highCount = complaints.filter((c) => c.priority === "High").length;
  const mediumCount = complaints.filter((c) => c.priority === "Medium").length;
  const lowCount = complaints.filter((c) => c.priority === "Low").length;

  const stats = [
    { label: "Total Complaints", value: total, icon: CircleAlert, color: "red" },
    { label: "Pending", value: pending, icon: FileText, color: "pink" },
    { label: "In Progress / Assigned", value: inProgress, icon: Clock, color: "blue" },
    { label: "Resolved", value: resolved, icon: Check, color: "green" },
  ];

  const priorities = [
    { label: "Urgent", count: urgentCount, color: "high" },
    { label: "High", count: highCount, color: "high" },
    { label: "Medium", count: mediumCount, color: "medium" },
    { label: "Low", count: lowCount, color: "low" },
  ];

  return (
    <>
      <header className="welcome">
        <h1>Welcome, {user?.name || "Warden"}!</h1>
        <p>
          Managing Hostel #{user?.hostel_id || "1"} · {user?.email || "Supervising Warden"}
        </p>
      </header>

      {error && <div className="warden-alert-error">⚠️ {error}</div>}

      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article className={`stat-card ${color}`} key={label}>
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
            <strong>{loading ? "…" : value}</strong>
          </article>
        ))}
      </section>

      <section className="priority-panel">
        <h2>Priority-wise Complaints</h2>
        <div className="priority-content">
          <div
            className="donut-chart"
            role="img"
            aria-label={`${total} total complaints`}
          >
            <div className="donut-hole">
              <strong>{loading ? "…" : total}</strong>
              <span>Total</span>
            </div>
          </div>

          <div className="priority-legend">
            {priorities.map((item) => (
              <div className="legend-row" key={item.label}>
                <span className={`legend-dot ${item.color}`} />
                <span>{item.label}</span>
                <strong>
                  {item.count} ({total > 0 ? Math.round((item.count / total) * 100) : 0}%)
                </strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ marginTop: "24px" }} className="complaints-page">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h2 style={{ fontSize: "16px", margin: 0 }}>High Priority &amp; Pending Action</h2>
          <button
            onClick={() => onNavigate("Complaints")}
            style={{ background: "none", border: "none", color: "#970024", fontWeight: 600, cursor: "pointer", fontSize: "12px" }}
          >
            View All Complaints →
          </button>
        </div>

        <div className="complaint-table-wrap">
          <table className="complaint-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Student</th>
                <th>Location</th>
                <th>Asset</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "18px" }}>
                    Loading complaints...
                  </td>
                </tr>
              ) : complaints.slice(0, 5).map((c) => (
                <tr key={c.complaint_id || c.id}>
                  <td>#{c.complaint_id || c.id}</td>
                  <td>{c.student_name || c.student || "Student"}</td>
                  <td>{c.location_name || c.location || "—"}</td>
                  <td>{c.asset_name || c.asset || "General"}</td>
                  <td>
                    <span className={`complaint-badge priority-${(c.priority || "Medium").toLowerCase()}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`complaint-badge priority-${(c.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{formatDate(c.complaint_date || c.date)}</td>
                </tr>
              ))}
              {!loading && complaints.length === 0 && (
                <tr>
                  <td colSpan="7" className="no-complaints">No complaints logged for this hostel.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function ComplaintsPage({ complaints, loading, error, onRefresh, onSelectForAssign }) {
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [search, setSearch] = useState("");

  const [rejectModalComplaint, setRejectModalComplaint] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const filteredComplaints = (complaints || []).filter((c) => {
    const matchesStatus =
      statusFilter === "All Status" ||
      (c.status && c.status.toLowerCase() === statusFilter.toLowerCase());

    const matchesPriority =
      priorityFilter === "All Priority" ||
      (c.priority && c.priority.toLowerCase() === priorityFilter.toLowerCase());

    const searchTarget = `${c.complaint_id || c.id} ${c.student_name || ""} ${c.location_name || ""} ${c.asset_name || ""} ${c.description || ""}`.toLowerCase();
    const matchesSearch = searchTarget.includes(search.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  async function handleRejectSubmit(e) {
    e.preventDefault();
    if (!rejectModalComplaint) return;
    if (rejectReason.trim().length < 5) {
      setActionError("Reason must be at least 5 characters long.");
      return;
    }

    setRejecting(true);
    setActionError("");
    setActionMessage("");

    try {
      const res = await rejectComplaint(rejectModalComplaint.complaint_id, {
        reason: rejectReason.trim(),
      });
      setActionMessage(`Complaint #${rejectModalComplaint.complaint_id} rejected successfully.`);
      setRejectModalComplaint(null);
      setRejectReason("");
      onRefresh();
    } catch (err) {
      setActionError(err.message || "Failed to reject complaint.");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <section className="complaints-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>All Complaints (Hostel Queue)</h1>
        <button
          onClick={onRefresh}
          style={{ padding: "6px 12px", background: "#f5e8e8", color: "#970024", border: "1px solid #d8b2b9", borderRadius: "5px", cursor: "pointer", fontSize: "11px" }}
        >
          ↻ Refresh Queue
        </button>
      </div>

      {actionMessage && <div className="warden-alert-success">✓ {actionMessage}</div>}
      {actionError && <div className="warden-alert-error">⚠️ {actionError}</div>}
      {error && <div className="warden-alert-error">⚠️ {error}</div>}

      <div className="complaint-toolbar">
        <div className="complaint-filters">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All Priority</option>
            <option>Urgent</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Resolved</option>
            <option>Rejected</option>
          </select>
        </div>

        <label className="complaint-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, room, asset..."
            aria-label="Search complaints"
          />
        </label>
      </div>

      <div className="complaint-table-wrap">
        <table className="complaint-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student</th>
              <th>Location</th>
              <th>Asset</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Technician</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "20px" }}>Loading complaint queue...</td>
              </tr>
            ) : filteredComplaints.map((c) => {
              const isResolved = c.status === "Resolved";
              const isRejected = c.status === "Rejected";

              return (
                <tr key={c.complaint_id || c.id}>
                  <td>#{c.complaint_id || c.id}</td>
                  <td>
                    <strong>{c.student_name || c.student_id}</strong>
                    {c.student_contact && <div style={{ fontSize: "10px", color: "#666" }}>{c.student_contact}</div>}
                  </td>
                  <td>{c.location_name || "—"}</td>
                  <td>{c.asset_name || "General"}</td>
                  <td>
                    <span className={`complaint-badge priority-${(c.priority || "Medium").toLowerCase()}`}>
                      {c.priority}
                    </span>
                  </td>
                  <td>
                    <span className={`status-select ${(c.status || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.assigned_technician_name || c.technician_name || <em style={{ color: "#888" }}>Unassigned</em>}</td>
                  <td>{formatDate(c.complaint_date)}</td>
                  <td>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {!isResolved && !isRejected && (
                        <>
                          <button
                            onClick={() => onSelectForAssign(c)}
                            style={{ padding: "4px 8px", background: "#970024", color: "white", border: "none", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => {
                              setActionError("");
                              setRejectReason("");
                              setRejectModalComplaint(c);
                            }}
                            style={{ padding: "4px 8px", background: "#fdf0f0", color: "#c62828", border: "1px solid #ffcdd2", borderRadius: "4px", fontSize: "10px", cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {(isResolved || isRejected) && (
                        <span style={{ fontSize: "11px", color: "#888" }}>Archived</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredComplaints.length === 0 && (
              <tr>
                <td colSpan="9" className="no-complaints">No complaints match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejectModalComplaint && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "20px"
        }}>
          <div style={{
            background: "white",
            padding: "24px",
            borderRadius: "10px",
            width: "min(440px, 100%)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)"
          }}>
            <h3 style={{ margin: "0 0 10px", color: "#970024", fontSize: "17px" }}>
              Reject Complaint #{rejectModalComplaint.complaint_id}
            </h3>
            <p style={{ fontSize: "12px", color: "#555", margin: "0 0 14px" }}>
              Please provide a valid rationale for rejecting this complaint (minimum 5 characters).
            </p>

            <form onSubmit={handleRejectSubmit}>
              <textarea
                required
                rows="4"
                style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}
                placeholder="Reason for rejection (e.g. Duplicate complaint, invalid issue)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                disabled={rejecting}
              />

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setRejectModalComplaint(null)}
                  style={{ padding: "7px 14px", background: "#f0f0f0", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}
                  disabled={rejecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: "7px 16px", background: "#c62828", color: "white", border: "none", borderRadius: "5px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                  disabled={rejecting}
                >
                  {rejecting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

function AssignTechnicianPage({ complaints, targetComplaint, onAssigned }) {
  const [selectedComplaintId, setSelectedComplaintId] = useState(() => {
    return targetComplaint ? String(targetComplaint.complaint_id || targetComplaint.id) : "";
  });
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [remarks, setRemarks] = useState("Assigned for immediate inspection");
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [assignedMessage, setAssignedMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoadingTechs(true);
    fetchWardenTechnicians()
      .then((data) => {
        setTechnicians(Array.isArray(data) ? data : []);
        if (data && data.length > 0) {
          setSelectedTechnicianId(String(data[0].technician_id));
        }
      })
      .catch((err) => {
        setError(`Failed to load technicians: ${err.message}`);
      })
      .finally(() => {
        setLoadingTechs(false);
      });
  }, []);

  const eligibleComplaints = (complaints || []).filter(
    (c) => c.status !== "Resolved" && c.status !== "Rejected"
  );

  const activeComplaint = eligibleComplaints.find(
    (c) => String(c.complaint_id || c.id) === String(selectedComplaintId)
  ) || eligibleComplaints[0];

  async function handleAssignSubmit() {
    if (!activeComplaint) {
      setError("Please select an active complaint to assign.");
      return;
    }
    if (!selectedTechnicianId) {
      setError("Please select a technician from your hostel.");
      return;
    }

    setSubmitting(true);
    setError("");
    setAssignedMessage("");

    try {
      const res = await assignComplaint(activeComplaint.complaint_id, {
        technician_id: selectedTechnicianId,
        remarks,
      });

      const techObj = technicians.find((t) => String(t.technician_id) === String(selectedTechnicianId));
      setAssignedMessage(
        `Complaint #${activeComplaint.complaint_id} assigned successfully to ${techObj?.name || `Technician #${selectedTechnicianId}`}!`
      );
      if (onAssigned) {
        onAssigned();
      }
    } catch (err) {
      setError(err.message || "Assignment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="assign-page">
      <h1>Assign Technician</h1>

      {assignedMessage && <div className="warden-alert-success">✓ {assignedMessage}</div>}
      {error && <div className="warden-alert-error">⚠️ {error}</div>}

      <div style={{ marginBottom: "16px" }}>
        <label style={{ display: "block", marginBottom: "6px", fontWeight: 600, fontSize: "12px" }}>
          Select Complaint to Assign:
        </label>
        <select
          value={activeComplaint ? String(activeComplaint.complaint_id) : ""}
          onChange={(e) => {
            setSelectedComplaintId(e.target.value);
            setAssignedMessage("");
          }}
          style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "12px" }}
        >
          {eligibleComplaints.map((c) => (
            <option key={c.complaint_id} value={c.complaint_id}>
              #{c.complaint_id} — {c.location_name || "Location"} — {c.asset_name || "General"} ({c.priority} Priority, {c.status})
            </option>
          ))}
          {eligibleComplaints.length === 0 && (
            <option value="">No pending complaints needing assignment</option>
          )}
        </select>
      </div>

      {activeComplaint ? (
        <div className="assign-card complaint-summary">
          <h2>Complaint #{activeComplaint.complaint_id}</h2>

          <div className="assign-detail">
            <strong>Location</strong>
            <span>{activeComplaint.location_name || "Room"} (Floor {activeComplaint.floor_no || "—"})</span>
          </div>

          <div className="assign-detail">
            <strong>Asset</strong>
            <span>{activeComplaint.asset_name || "General Facility"} ({activeComplaint.asset_type || "Standard"})</span>
          </div>

          <div className="assign-detail">
            <strong>Student</strong>
            <span>{activeComplaint.student_name} ({activeComplaint.student_contact || activeComplaint.student_id})</span>
          </div>

          <div className="assign-detail">
            <strong>Description</strong>
            <span>{activeComplaint.description || "No description provided."}</span>
          </div>
        </div>
      ) : (
        <p style={{ color: "#777", fontSize: "12px" }}>All complaints in your hostel are currently assigned or resolved.</p>
      )}

      <div className="assign-card technician-form" style={{ marginTop: "16px" }}>
        <label htmlFor="technician-select">Select Technician (Scoped to your hostel)</label>

        <select
          id="technician-select"
          value={selectedTechnicianId}
          onChange={(e) => {
            setSelectedTechnicianId(e.target.value);
            setAssignedMessage("");
          }}
          disabled={loadingTechs || submitting}
        >
          {loadingTechs ? (
            <option>Loading technicians...</option>
          ) : (
            technicians.map((t) => (
              <option key={t.technician_id} value={t.technician_id}>
                {t.name} ({t.specialization}) — Tel: {t.phone}
              </option>
            ))
          )}
          {!loadingTechs && technicians.length === 0 && (
            <option value="">No technicians linked to your hostel</option>
          )}
        </select>

        <label style={{ marginTop: "12px", display: "block" }}>Assignment Remarks</label>
        <input
          type="text"
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="e.g. Inspect fan bearings and replace if needed"
          style={{ width: "100%", padding: "8px", border: "1px solid #ccc", borderRadius: "6px", fontSize: "12px", marginBottom: "14px" }}
        />

        <div className="assign-actions">
          <button onClick={handleAssignSubmit} disabled={submitting || !activeComplaint || technicians.length === 0}>
            {submitting ? "Assigning..." : "Assign Complaint"}
          </button>
        </div>
      </div>
    </section>
  );
}

function HostelLocationsPage({ user }) {
  const [activeTab, setActiveTab] = useState("Locations");
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    Promise.all([
      fetchLocations({ hostel_id: user?.hostel_id }).catch(() => []),
      fetchAssets().catch(() => []),
      fetchWardenTechnicians().catch(() => []),
    ])
      .then(([locs, ass, techs]) => {
        setLocations(Array.isArray(locs) ? locs : []);
        setAssets(Array.isArray(ass) ? ass : []);
        setTechnicians(Array.isArray(techs) ? techs : []);
      })
      .catch((err) => {
        setError(err.message || "Failed to load location/asset references");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const tabs = ["Hostel", "Locations", "Assets", "Technicians"];

  return (
    <section className="management-page">
      <div className="management-tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "management-tab active" : "management-tab"}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="management-heading">
        <h1>{activeTab} Management (Hostel #{user?.hostel_id || "1"})</h1>
      </div>

      {error && <div className="warden-alert-error">⚠️ {error}</div>}

      <div className="management-table-wrap">
        <table className="management-table">
          {activeTab === "Hostel" && (
            <>
              <thead>
                <tr><th>Hostel ID</th><th>Hostel Name</th><th>Assigned Warden</th><th>Contact</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>#{user?.hostel_id || 1}</td>
                  <td>Hostel Block #{user?.hostel_id || 1}</td>
                  <td>{user?.name || "Warden"}</td>
                  <td>{user?.phone || user?.email || "—"}</td>
                </tr>
              </tbody>
            </>
          )}

          {activeTab === "Locations" && (
            <>
              <thead>
                <tr><th>ID</th><th>Location Name</th><th>Floor</th><th>Type</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>Loading locations...</td></tr>
                ) : locations.map((loc) => (
                  <tr key={loc.location_id}>
                    <td>#{loc.location_id}</td>
                    <td>{loc.location_name}</td>
                    <td>Floor {loc.floor_no}</td>
                    <td>{loc.location_type}</td>
                  </tr>
                ))}
                {!loading && locations.length === 0 && (
                  <tr><td colSpan="4" className="no-complaints">No locations seeded for this hostel.</td></tr>
                )}
              </tbody>
            </>
          )}

          {activeTab === "Assets" && (
            <>
              <thead>
                <tr><th>ID</th><th>Asset Name</th><th>Asset Type</th><th>Status</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>Loading assets...</td></tr>
                ) : assets.map((a) => (
                  <tr key={a.asset_id}>
                    <td>#{a.asset_id}</td>
                    <td>{a.asset_name}</td>
                    <td>{a.asset_type}</td>
                    <td>{a.status || "Functional"}</td>
                  </tr>
                ))}
                {!loading && assets.length === 0 && (
                  <tr><td colSpan="4" className="no-complaints">No assets found.</td></tr>
                )}
              </tbody>
            </>
          )}

          {activeTab === "Technicians" && (
            <>
              <thead>
                <tr><th>ID</th><th>Technician Name</th><th>Specialization</th><th>Phone</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" style={{ textAlign: "center", padding: "16px" }}>Loading technicians...</td></tr>
                ) : technicians.map((t) => (
                  <tr key={t.technician_id}>
                    <td>#{t.technician_id}</td>
                    <td>{t.name}</td>
                    <td>{t.specialization}</td>
                    <td>{t.phone}</td>
                  </tr>
                ))}
                {!loading && technicians.length === 0 && (
                  <tr><td colSpan="4" className="no-complaints">No technicians assigned to your hostel.</td></tr>
                )}
              </tbody>
            </>
          )}
        </table>
      </div>

      <p className="management-note">
        Live database information scoped to Warden's assigned hostel.
      </p>
    </section>
  );
}

function ReportsPage({ complaints }) {
  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === "Resolved").length;
  const pending = complaints.filter((c) => c.status === "Pending").length;
  const inProgress = complaints.filter((c) => c.status === "In Progress" || c.status === "Assigned").length;
  const rejected = complaints.filter((c) => c.status === "Rejected").length;

  const urgentCount = complaints.filter((c) => c.priority === "Urgent").length;
  const highCount = complaints.filter((c) => c.priority === "High").length;
  const mediumCount = complaints.filter((c) => c.priority === "Medium").length;
  const lowCount = complaints.filter((c) => c.priority === "Low").length;

  const priorityData = [
    { label: "Urgent", count: urgentCount, color: "#ff8a80" },
    { label: "High", count: highCount, color: "#ffd6df" },
    { label: "Medium", count: mediumCount, color: "#ffefbd" },
    { label: "Low", count: lowCount, color: "#c9f5e3" },
  ];

  const maxPriority = Math.max(1, ...priorityData.map((p) => p.count));

  return (
    <section className="reports-page">
      <div className="reports-heading">
        <h1>Reports &amp; Analytics (Live Hostel Data)</h1>
      </div>

      <div className="reports-stats">
        <div className="report-stat total-stat">
          <span className="report-stat-label">Total Complaints</span>
          <strong>{total}</strong>
        </div>
        <div className="report-stat resolved-stat">
          <span className="report-stat-label">Resolved</span>
          <strong>{resolved}</strong>
        </div>
        <div className="report-stat time-stat">
          <span className="report-stat-label">Open / In Progress</span>
          <strong>{pending + inProgress}</strong>
        </div>
      </div>

      <div className="reports-charts">
        <div className="report-chart-panel">
          <h2>Complaints by Priority Tier</h2>
          <div className="priority-chart">
            {priorityData.map((item) => (
              <div className="priority-bar-group" key={item.label}>
                <div className="priority-bar-track">
                  <div
                    className="priority-bar"
                    style={{
                      height: `${(item.count / maxPriority) * 100}%`,
                      background: item.color,
                    }}
                  />
                </div>
                <span>{item.label} ({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-chart-panel hostel-chart-panel">
          <h2>Resolution Breakdown</h2>
          <div className="hostel-chart-content">
            <div className="hostel-donut-center" style={{ width: "120px", height: "120px", border: "4px solid #970024", borderRadius: "50%" }}>
              <strong>{total > 0 ? Math.round((resolved / total) * 100) : 0}%</strong>
              <span>Resolved</span>
            </div>

            <div className="hostel-legend">
              <div className="hostel-legend-item">
                <span className="legend-color" style={{ background: "#4caf50" }} />
                <span>Resolved: {resolved}</span>
              </div>
              <div className="hostel-legend-item">
                <span className="legend-color" style={{ background: "#2196f3" }} />
                <span>In Progress / Assigned: {inProgress}</span>
              </div>
              <div className="hostel-legend-item">
                <span className="legend-color" style={{ background: "#ff9800" }} />
                <span>Pending Review: {pending}</span>
              </div>
              <div className="hostel-legend-item">
                <span className="legend-color" style={{ background: "#f44336" }} />
                <span>Rejected: {rejected}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [currentUser, setCurrentUser] = useState(() => getUser());
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getToken());

  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [complaintsError, setComplaintsError] = useState("");
  const [targetComplaintForAssign, setTargetComplaintForAssign] = useState(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      clearAuth();
      setIsLoggedIn(false);
      setCurrentUser(null);
    });
  }, []);

  function loadComplaints() {
    if (!getToken()) return;
    setLoadingComplaints(true);
    setComplaintsError("");

    fetchWardenComplaints()
      .then((data) => {
        setComplaints(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setComplaintsError(err.message || "Failed to load complaints");
      })
      .finally(() => {
        setLoadingComplaints(false);
      });
  }

  useEffect(() => {
    if (isLoggedIn) {
      loadComplaints();
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
    setComplaints([]);
    setActivePage("Dashboard");
  }

  function handleSelectForAssign(complaint) {
    setTargetComplaintForAssign(complaint);
    setActivePage("Assign Technician");
  }

  if (!isLoggedIn) {
    return <WardenLoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Wrench size={14} /></span>
          <span>HostelFix</span>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? "active" : ""}`}
              onClick={() => setActivePage(label)}
            >
              <Icon size={14} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}

          <button className="nav-item logout" onClick={handleLogout}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {activePage === "Dashboard" && (
          <Dashboard
            complaints={complaints}
            loading={loadingComplaints}
            error={complaintsError}
            user={currentUser}
            onNavigate={(page) => setActivePage(page)}
          />
        )}
        {activePage === "Complaints" && (
          <ComplaintsPage
            complaints={complaints}
            loading={loadingComplaints}
            error={complaintsError}
            onRefresh={loadComplaints}
            onSelectForAssign={handleSelectForAssign}
          />
        )}
        {activePage === "Assign Technician" && (
          <AssignTechnicianPage
            complaints={complaints}
            targetComplaint={targetComplaintForAssign}
            onAssigned={loadComplaints}
          />
        )}
        {activePage === "Hostels / Locations" && (
          <HostelLocationsPage user={currentUser} />
        )}
        {activePage === "Reports" && (
          <ReportsPage complaints={complaints} />
        )}
      </main>
    </div>
  );
}
