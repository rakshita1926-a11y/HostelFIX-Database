
import { useState } from "react";
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

const menuItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Complaints", icon: FileText },
  { label: "Assign Technician", icon: UserRound },
  { label: "Hostels / Locations", icon: MapPin },
  { label: "Reports", icon: ChartNoAxesColumn },
];

const stats = [
  { label: "Total Complaints", value: 67, icon: CircleAlert, color: "red" },
  { label: "Pending", value: 17, icon: FileText, color: "pink" },
  { label: "In Progress", value: 8, icon: Clock, color: "blue" },
  { label: "Resolved", value: 42, icon: Check, color: "green" },
];

const priorities = [
  { label: "High", count: 22, color: "high" },
  { label: "Medium", count: 28, color: "medium" },
  { label: "Low", count: 17, color: "low" },
];

function Dashboard() {
  return (
    <>
      <header className="welcome">
        <h1>Welcome, Warden!</h1>
        <p>Here's what's happening with your hostels.</p>
      </header>

      <section className="stats-grid">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <article className={`stat-card ${color}`} key={label}>
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </section>

      <section className="priority-panel">
        <h2>Priority-wise Complaints</h2>
        <div className="priority-content">
          <div
            className="donut-chart"
            role="img"
            aria-label="67 complaints: 22 high, 28 medium, 17 low priority"
          >
            <div className="donut-hole">
              <strong>67</strong>
              <span>Total</span>
            </div>
          </div>

          <div className="priority-legend">
            {priorities.map((item) => (
              <div className="legend-row" key={item.label}>
                <span className={`legend-dot ${item.color}`} />
                <span>{item.label}</span>
                <strong>{item.count} ({Math.round((item.count / 67) * 100)}%)</strong>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}


const complaintData = [
  { id: "#1001", student: "Niveditha", location: "Room A101", asset: "Flush", priority: "High", status: "In Progress", date: "16 Oct", hostel: "Hostel A" },
  { id: "#1002", student: "Meera", location: "Room B201", asset: "Fan", priority: "Medium", status: "Pending", date: "16 Oct", hostel: "Hostel B" },
  { id: "#1003", student: "Rakshita", location: "Washroom C1", asset: "Light", priority: "Medium", status: "Assigned", date: "18 Oct", hostel: "Hostel C" },
  { id: "#1004", student: "Divya", location: "Corridor A2", asset: "Fan", priority: "Low", status: "Resolved", date: "20 Oct", hostel: "Hostel A" },
  { id: "#1005", student: "Ananya", location: "Room C301", asset: "Fan", priority: "High", status: "Pending", date: "21 Oct", hostel: "Hostel C" },
];

function ComplaintsPage() {
  const [complaints, setComplaints] = useState(complaintData);
  const [hostel, setHostel] = useState("All Hostels");
  const [location, setLocation] = useState("All Locations");
  const [asset, setAsset] = useState("All Assets");
  const [status, setStatus] = useState("All Status");
  const [search, setSearch] = useState("");

  const filteredComplaints = complaints.filter((c) =>
    (hostel === "All Hostels" || c.hostel === hostel) &&
    (location === "All Locations" || c.location === location) &&
    (asset === "All Assets" || c.asset === asset) &&
    (status === "All Status" || c.status === status) &&
    `${c.id} ${c.student} ${c.location} ${c.asset}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="complaints-page">
      <h1>All Complaints</h1>

      <div className="complaint-toolbar">
        <div className="complaint-filters">
          <select value={hostel} onChange={(e) => setHostel(e.target.value)}>
            <option>All Hostels</option>
            <option>Hostel A</option>
            <option>Hostel B</option>
            <option>Hostel C</option>
          </select>

          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option>All Locations</option>
            {[...new Set(complaintData.map((c) => c.location))].map((v) => <option key={v}>{v}</option>)}
          </select>

          <select value={asset} onChange={(e) => setAsset(e.target.value)}>
            <option>All Assets</option>
            {[...new Set(complaintData.map((c) => c.asset))].map((v) => <option key={v}>{v}</option>)}
          </select>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All Status</option>
            <option>Pending</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
        </div>

        <label className="complaint-search">
          <span aria-hidden="true">⌕</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
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
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredComplaints.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.student}</td>
                <td>{c.location}</td>
                <td>{c.asset}</td>
                <td><span className={`complaint-badge priority-${c.priority.toLowerCase()}`}>{c.priority}</span></td>
                <td>
  <select
    className={`status-select ${c.status.toLowerCase().replace(/\s+/g, "-")}`}
    value={c.status}
    onChange={(e) => {
      const newStatus = e.target.value;

      setComplaints((previous) =>
        previous.map((complaint) =>
          complaint.id === c.id
            ? { ...complaint, status: newStatus }
            : complaint
        )
      );
    }}
  >
    <option value="Pending">Pending</option>
    <option value="Assigned">Assigned</option>
    <option value="In Progress">In Progress</option>
    <option value="Resolved">Resolved</option>
  </select>
</td>
                <td>{c.date}</td>
              </tr>
            ))}
            {filteredComplaints.length === 0 && (
              <tr><td colSpan="7" className="no-complaints">No complaints match your filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function AssignTechnicianPage() {
  const [selectedTechnician, setSelectedTechnician] = useState("Suresh Kumar (Plumber)");
  const [assigned, setAssigned] = useState(false);

  const technicians = [
    "Suresh Kumar (Plumber)",
    "Ravi Shankar (Electrician)",
    "Arun Kumar (Carpenter)",
  ];

  return (
    <section className="assign-page">
      <h1>Assign Technician</h1>

      <div className="assign-card complaint-summary">
        <h2>Complaint #1001</h2>

        <div className="assign-detail">
          <strong>Total Option</strong>
          <span>Location: Room A101 (Block A)</span>
        </div>

        <div className="assign-detail">
          <strong>Asset</strong>
          <span>Flush System</span>
        </div>

        <div className="assign-detail">
          <strong>Description</strong>
          <span>Flush not working properly.</span>
        </div>
      </div>

      <div className="assign-card technician-form">
        <label htmlFor="technician-select">Select Technician</label>

        <select
          id="technician-select"
          value={selectedTechnician}
          onChange={(e) => {
            setSelectedTechnician(e.target.value);
            setAssigned(false);
          }}
        >
          {technicians.map((technician) => (
            <option key={technician} value={technician}>
              {technician}
            </option>
          ))}
        </select>

        <div className="assign-actions">
          {assigned && (
            <span className="assign-success">
              Assigned to {selectedTechnician}
            </span>
          )}
          <button onClick={() => setAssigned(true)}>Assign</button>
        </div>
      </div>
    </section>
  );
}


const initialHostels = [
  { id: "#0001", name: "Hostel A", block: "A", address: "North Campus" },
  { id: "#0002", name: "Hostel B", block: "B", address: "South Campus" },
  { id: "#0003", name: "Hostel C", block: "C", address: "East Campus" },
];

  
const hostelInfo = [
  { id: "#0001", name: "Hostel A", block: "A", address: "North Campus" },
  { id: "#0002", name: "Hostel B", block: "B", address: "South Campus" },
  { id: "#0003", name: "Hostel C", block: "C", address: "East Campus" },
];

const locationInfo = [
  { id: "#L001", name: "Room A101", block: "Hostel A", address: "First Floor" },
  { id: "#L002", name: "Washroom B1", block: "Hostel B", address: "Ground Floor" },
  { id: "#L003", name: "Corridor C2", block: "Hostel C", address: "Second Floor" },
];

const assetInfo = [
  { id: "#A001", name: "Flush System", block: "Washroom B1", address: "Plumbing" },
  { id: "#A002", name: "Ceiling Fan", block: "Room A101", address: "Electrical" },
  { id: "#A003", name: "Tube Light", block: "Corridor C2", address: "Electrical" },
];

const technicianInfo = [
  { id: "#T001", name: "Suresh Kumar", block: "Plumbing", address: "Available" },
  { id: "#T002", name: "Ravi Shankar", block: "Electrical", address: "Available" },
  { id: "#T003", name: "Arun Kumar", block: "Carpentry", address: "Busy" },
];

function HostelLocationsPage() {
  const [activeTab, setActiveTab] = useState("Hostels");

  const dataByTab = {
    Hostels: {
      rows: hostelInfo,
      columns: ["ID", "Name", "Block", "Address"],
    },
    Locations: {
      rows: locationInfo,
      columns: ["ID", "Location", "Hostel", "Area"],
    },
    Assets: {
      rows: assetInfo,
      columns: ["ID", "Asset", "Location", "Category"],
    },
    Technicians: {
      rows: technicianInfo,
      columns: ["ID", "Name", "Specialisation", "Availability"],
    },
  };

  const current = dataByTab[activeTab];

  return (
    <section className="management-page">
      <div className="management-tabs">
        {Object.keys(dataByTab).map((tab) => (
          <button
            key={tab}
            className={
              activeTab === tab
                ? "management-tab active"
                : "management-tab"
            }
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="management-heading">
        <h1>{activeTab}</h1>
      </div>

      <div className="management-table-wrap">
        <table className="management-table">
          <thead>
            <tr>
              {current.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>

          <tbody>
            {current.rows.map((item) => (
              <tr key={item.id}>
                <td>{item.id}</td>
                <td>{item.name}</td>
                <td>{item.block}</td>
                <td>{item.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="management-note">
        Information is available for viewing only.
      </p>
    </section>
  );
}


function ReportsPage() {
  const [period, setPeriod] = useState("Last 30 days");

  const reports = {
    "Last 7 days": {
      total: 18,
      resolved: 10,
      days: "1.8 days",
      priority: [5, 8, 5],
      hostels: [8, 6, 4],
    },
    "Last 30 days": {
      total: 67,
      resolved: 42,
      days: "2.3 days",
      priority: [18, 29, 20],
      hostels: [28, 22, 17],
    },
    "Last 90 days": {
      total: 184,
      resolved: 139,
      days: "2.1 days",
      priority: [52, 79, 53],
      hostels: [76, 61, 47],
    },
  };

  const data = reports[period];
  const priorityLabels = ["High", "Medium", "Low"];
  const priorityColors = ["#ffd6df", "#ffefbd", "#c9f5e3"];
  const hostelColors = ["#ffd6df", "#ffefbd", "#c9f5e3"];
  const maxPriority = Math.max(...data.priority);

  return (
    <section className="reports-page">
      <div className="reports-heading">
        <h1>Reports &amp; Analytics</h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="reports-period"
        >
          {Object.keys(reports).map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      <div className="reports-stats">
        <div className="report-stat total-stat">
          <span className="report-stat-label">Total Complaints</span>
          <strong>{data.total}</strong>
        </div>
        <div className="report-stat resolved-stat">
          <span className="report-stat-label">Resolved</span>
          <strong>{data.resolved}</strong>
        </div>
        <div className="report-stat time-stat">
          <span className="report-stat-label">Avg. Resolution Time</span>
          <strong>{data.days}</strong>
        </div>
      </div>

      <div className="reports-charts">
        <div className="report-chart-panel">
          <h2>Complaints by Priority</h2>
          <div className="priority-chart">
            {data.priority.map((value, index) => (
              <div className="priority-bar-group" key={priorityLabels[index]}>
                <div className="priority-bar-track">
                  <div
                    className="priority-bar"
                    style={{
                      height: `${(value / maxPriority) * 100}%`,
                      background: priorityColors[index],
                    }}
                  />
                </div>
                <span>{priorityLabels[index]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="report-chart-panel hostel-chart-panel">
          <h2>Complaints by Hostel</h2>
          <div className="hostel-chart-content">
            <div
              className="hostel-donut"
              style={{
                background: `conic-gradient(
                  ${hostelColors[0]} 0% ${(data.hostels[0] / data.total) * 100}%,
                  ${hostelColors[1]} ${(data.hostels[0] / data.total) * 100}% ${((data.hostels[0] + data.hostels[1]) / data.total) * 100}%,
                  ${hostelColors[2]} ${((data.hostels[0] + data.hostels[1]) / data.total) * 100}% 100%
                )`,
              }}
            >
              <div className="hostel-donut-center">
                <strong>{data.total}</strong>
                <span>Total</span>
              </div>
            </div>

            <div className="hostel-legend">
              {["A", "B", "C"].map((hostel, index) => (
                <div className="hostel-legend-item" key={hostel}>
                  <span
                    className="legend-color"
                    style={{ background: hostelColors[index] }}
                  />
                  <span>
                    {hostel} &nbsp; {data.hostels[index]} (
                    {Math.round((data.hostels[index] / data.total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlaceholderPage({ title }) {
  return (
    <section className="placeholder-panel">
      <ClipboardList size={30} />
      <h2>{title}</h2>
      <p>This section will be built next.</p>
    </section>
  );
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon"><Wrench size={17} /></span>
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

          <button className="nav-item logout" onClick={() => setActivePage("Logout")}>
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>

      <main className="main-content">
        
{activePage === "Dashboard" ? (
  <Dashboard />
) : activePage === "Complaints" ? (
  <ComplaintsPage />
) : activePage === "Assign Technician" ? (
  <AssignTechnicianPage />
) : activePage === "Hostels / Locations" ? (
  <HostelLocationsPage />
) : activePage === "Reports" ? (
  <ReportsPage />
) : activePage === "Logout" ? (
  <PlaceholderPage title="Logout" />
) : (
  <PlaceholderPage title={activePage} />
)}

      </main>
    </div>
  );
}
