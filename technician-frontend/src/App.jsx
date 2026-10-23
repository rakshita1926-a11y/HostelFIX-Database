
import { useMemo, useState } from "react";
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

const initialJobs = [
  {
    id: "1001",
    student: "Niveditha",
    location: "Room A101",
    hostel: "Hostel A",
    asset: "Flush System",
    issue: "Flush is not working properly",
    priority: "High",
    status: "In Progress",
    date: "16 Oct",
  },
  {
    id: "1002",
    student: "Meera",
    location: "Room B201",
    hostel: "Hostel B",
    asset: "Ceiling Fan",
    issue: "Fan is making a loud noise",
    priority: "Medium",
    status: "Pending",
    date: "18 Oct",
  },
  {
    id: "1003",
    student: "Rakshita",
    location: "Washroom C1",
    hostel: "Hostel C",
    asset: "Tube Light",
    issue: "Washroom light is not working",
    priority: "Medium",
    status: "Assigned",
    date: "19 Oct",
  },
  {
    id: "1004",
    student: "Divya",
    location: "Corridor A2",
    hostel: "Hostel A",
    asset: "Ceiling Fan",
    issue: "Fan requires maintenance",
    priority: "Low",
    status: "Resolved",
    date: "20 Oct",
  },
  {
    id: "1005",
    student: "Ananya",
    location: "Room C301",
    hostel: "Hostel C",
    asset: "Flush System",
    issue: "Water keeps running after flushing",
    priority: "High",
    status: "Pending",
    date: "21 Oct",
  },
];

const hostelInfo = [
  { id: "H001", name: "Hostel A", block: "A", address: "North Campus" },
  { id: "H002", name: "Hostel B", block: "B", address: "South Campus" },
  { id: "H003", name: "Hostel C", block: "C", address: "East Campus" },
];

const locationInfo = [
  { id: "L001", name: "Room A101", block: "Hostel A", address: "First Floor" },
  { id: "L002", name: "Washroom B1", block: "Hostel B", address: "Ground Floor" },
  { id: "L003", name: "Corridor C2", block: "Hostel C", address: "Second Floor" },
];

const assetInfo = [
  { id: "A001", name: "Flush System", block: "Washroom B1", address: "Plumbing" },
  { id: "A002", name: "Ceiling Fan", block: "Room A101", address: "Electrical" },
  { id: "A003", name: "Tube Light", block: "Corridor C2", address: "Electrical" },
];

const technicianInfo = [
  { id: "T001", name: "Suresh Kumar", block: "Plumbing", address: "Available" },
  { id: "T002", name: "Ravi Shankar", block: "Electrical", address: "Available" },
  { id: "T003", name: "Arun Kumar", block: "Carpentry", address: "Busy" },
];

const menuItems = [
  { name: "Dashboard", icon: LayoutDashboard },
  { name: "Complaints", icon: ClipboardList },
  { name: "Hostels / Locations", icon: MapPin },
  { name: "Reports", icon: ChartNoAxesColumn },
  { name: "Logout", icon: LogOut },
];

function Badge({ value, type = "status" }) {
  const className = value.toLowerCase().replace(/\s+/g, "-");
  return <span className={`badge ${type}-${className}`}>{value}</span>;
}

function Dashboard({ jobs, navigate }) {
  const total = jobs.length;
  const pending = jobs.filter((j) => j.status === "Pending").length;
  const progress = jobs.filter((j) => j.status === "In Progress").length;
  const resolved = jobs.filter((j) => j.status === "Resolved").length;
  const high = jobs.filter((j) => j.priority === "High").length;

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TECHNICIAN WORKSPACE</p>
          <h1>My Assigned Jobs</h1>
          <p className="muted">Track your repair jobs and keep their status updated.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard label="My Assigned Jobs" value={total} icon={ClipboardList} />
        <StatCard label="Pending" value={pending} icon={Clock} />
        <StatCard label="In Progress" value={progress} icon={Wrench} />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle2} />
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
            {jobs.slice(0, 4).map((job) => (
              <div className="recent-job" key={job.id}>
                <div className="job-icon"><Wrench size={17} /></div>
                <div className="recent-job-info">
                  <strong>#{job.id} · {job.asset}</strong>
                  <span>{job.location} · {job.hostel}</span>
                </div>
                <Badge value={job.status} />
              </div>
            ))}
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
          <div className="priority-number">{high}</div>
          <p className="muted">High-priority jobs in your list</p>
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

function ComplaintsPage({ jobs, setJobs }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [selectedJob, setSelectedJob] = useState(null);

  const filteredJobs = useMemo(() => {
    const query = search.toLowerCase();
    return jobs.filter((job) => {
      const matchesSearch =
        `${job.id} ${job.asset} ${job.location} ${job.hostel} ${job.issue}`
          .toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || job.status === statusFilter;
      const matchesPriority = priorityFilter === "All" || job.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [jobs, search, statusFilter, priorityFilter]);

  function updateStatus(id, status) {
    setJobs((previous) =>
      previous.map((job) => job.id === id ? { ...job, status } : job)
    );
    setSelectedJob((previous) =>
      previous?.id === id ? { ...previous, status } : previous
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORK QUEUE</p>
          <h1>My Work Orders</h1>
          <p className="muted">View assigned jobs and update repair progress.</p>
        </div>
      </div>

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
            <option>Pending</option>
            <option>Assigned</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option>All</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Issue / Asset</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((job) => (
                <tr key={job.id}>
                  <td>#{job.id}</td>
                  <td>
                    <strong>{job.asset}</strong>
                    <span className="cell-subtitle">{job.issue}</span>
                  </td>
                  <td>{job.location}<span className="cell-subtitle">{job.hostel}</span></td>
                  <td><Badge value={job.priority} type="priority" /></td>
                  <td>
                    <select
                      className={`status-select status-${job.status.toLowerCase().replace(/\s+/g, "-")}`}
                      value={job.status}
                      onChange={(e) => updateStatus(job.id, e.target.value)}
                      aria-label={`Change status for job ${job.id}`}
                    >
                      <option>Pending</option>
                      <option>Assigned</option>
                      <option>In Progress</option>
                      <option>Resolved</option>
                    </select>
                  </td>
                  <td>
                    <button className="small-button" onClick={() => setSelectedJob(job)}>
                      Details
                    </button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr><td colSpan="6" className="empty-cell">No work orders match your filters.</td></tr>
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
                <p className="eyebrow">WORK ORDER #{selectedJob.id}</p>
                <h2>{selectedJob.asset}</h2>
              </div>
              <button className="icon-button" onClick={() => setSelectedJob(null)} aria-label="Close details">
                <X size={20} />
              </button>
            </div>
            <p>{selectedJob.issue}</p>
            <div className="detail-grid">
              <span>Location</span><strong>{selectedJob.location}, {selectedJob.hostel}</strong>
              <span>Reported by</span><strong>{selectedJob.student}</strong>
              <span>Reported date</span><strong>{selectedJob.date}</strong>
              <span>Priority</span><strong><Badge value={selectedJob.priority} type="priority" /></strong>
            </div>
            <label className="field-label" htmlFor="detail-status">Update status</label>
            <select
              id="detail-status"
              className="modal-select"
              value={selectedJob.status}
              onChange={(e) => updateStatus(selectedJob.id, e.target.value)}
            >
              <option>Pending</option>
              <option>Assigned</option>
              <option>In Progress</option>
              <option>Resolved</option>
            </select>
            <p className="muted modal-note">Status changes are currently saved in this page only.</p>
            <button className="primary-button full-button" onClick={() => setSelectedJob(null)}>
              Done
            </button>
          </section>
        </div>
      )}
    </>
  );
}

function HostelLocationsPage() {
  const [activeTab, setActiveTab] = useState("Hostels");

  const dataByTab = {
    Hostels: { rows: hostelInfo, columns: ["ID", "Name", "Block", "Address"] },
    Locations: { rows: locationInfo, columns: ["ID", "Location", "Hostel", "Area"] },
    Assets: { rows: assetInfo, columns: ["ID", "Asset", "Location", "Category"] },
    Technicians: {
      rows: technicianInfo,
      columns: ["ID", "Name", "Specialisation", "Availability"],
    },
  };

  const current = dataByTab[activeTab];

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">REFERENCE INFORMATION</p>
          <h1>Hostels / Locations</h1>
          <p className="muted">View hostel, location, asset, and technician information.</p>
        </div>
      </div>

      <section className="panel">
        <div className="tabs">
          {Object.keys(dataByTab).map((tab) => (
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
          <table>
            <thead>
              <tr>{current.columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {current.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.name}</td>
                  <td>{row.block}</td>
                  <td>{row.address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="read-only-note">Information is available for viewing only.</p>
      </section>
    </>
  );
}

function ReportsPage({ jobs }) {
  const [period, setPeriod] = useState("All sample jobs");
  const total = jobs.length;
  const resolved = jobs.filter((job) => job.status === "Resolved").length;
  const inProgress = jobs.filter((job) => job.status === "In Progress").length;
  const high = jobs.filter((job) => job.priority === "High").length;
  const priorities = [
    { label: "High", count: high, color: "#d98d94" },
    { label: "Medium", count: jobs.filter((job) => job.priority === "Medium").length, color: "#e8c777" },
    { label: "Low", count: jobs.filter((job) => job.priority === "Low").length, color: "#92c8ad" },
  ];
  const maxPriority = Math.max(1, ...priorities.map((item) => item.count));
  const hostels = ["Hostel A", "Hostel B", "Hostel C"].map((hostel) => ({
    name: hostel,
    count: jobs.filter((job) => job.hostel === hostel).length,
  }));

  return (
    <>
      <div className="page-heading reports-page-heading">
        <div>
          <p className="eyebrow">WORK SUMMARY</p>
          <h1>Reports &amp; Analytics</h1>
          <p className="muted">A summary of your assigned maintenance work.</p>
        </div>
        <select className="period-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          <option>All sample jobs</option>
        </select>
      </div>

      <div className="stats-grid report-stats">
        <StatCard label="Assigned Jobs" value={total} icon={ClipboardList} />
        <StatCard label="Resolved" value={resolved} icon={CheckCircle2} />
        <StatCard label="In Progress" value={inProgress} icon={Wrench} />
        <StatCard label="High Priority" value={high} icon={CircleAlert} />
      </div>

      <div className="reports-grid">
        <section className="panel">
          <h2>Jobs by Priority</h2>
          <p className="muted">Breakdown of your current sample jobs</p>
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
          <h2>Jobs by Hostel</h2>
          <p className="muted">Location breakdown of assigned work</p>
          <div className="hostel-report-list">
            {hostels.map((item) => (
              <div className="hostel-report-row" key={item.name}>
                <div className="hostel-report-label">
                  <span>{item.name}</span><strong>{item.count}</strong>
                </div>
                <div className="hostel-track">
                  <div style={{ width: `${total ? (item.count / total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="read-only-note">Reports reflect the sample jobs currently shown in this frontend.</p>
    </>
  );
}

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [jobs, setJobs] = useState(initialJobs);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function navigate(page) {
    if (page === "Logout") {
      setActivePage("Logout");
    } else {
      setActivePage(page);
    }
    setMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon"><Wrench size={22} /></div>
          <div><strong>HostelFix</strong><span>TECHNICIAN PORTAL</span></div>
          <button className="mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="profile-card">
          <div className="profile-avatar">T</div>
          <div><strong>Technician</strong><span>Maintenance Team</span></div>
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
          <span>Maintenance workspace</span>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu overlay" />}

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="breadcrumb">HostelFix <span>/</span> {activePage}</div>
          <div className="topbar-user"><span className="online-dot" /> Technician Portal</div>
        </header>

        <div className="page-content">
          {activePage === "Dashboard" && <Dashboard jobs={jobs} navigate={navigate} />}
          {activePage === "Complaints" && <ComplaintsPage jobs={jobs} setJobs={setJobs} />}
          {activePage === "Hostels / Locations" && <HostelLocationsPage />}
          {activePage === "Reports" && <ReportsPage jobs={jobs} />}
          {activePage === "Logout" && (
            <section className="panel logout-panel">
              <div className="logout-icon"><LogOut size={25} /></div>
              <h1>You're at the logout screen</h1>
              <p className="muted">Authentication will be connected when the backend is ready.</p>
              <button className="primary-button" onClick={() => setActivePage("Dashboard")}>
                Return to dashboard
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
