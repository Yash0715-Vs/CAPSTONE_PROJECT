// =====================================================================
// Smart IT Asset & Ticket Management - React 18 Single Page Application
// Modern Dashboard with Real-Time WebSockets and Role-Based Controls
// =====================================================================

const { useState, useEffect, useCallback, useMemo } = React;

const API_BASE = window.location.origin;
const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/tickets`;

// Sample Demo Accounts for Instant Switching (Indian Employee Roles)
const DEMO_ACCOUNTS = [
  { user_id: "ADM-001", name: "Rajesh Sharma", role: "ADMIN", label: "Admin View (Rajesh Sharma)" },
  { user_id: "IT-501", name: "Priya Patel", role: "SUPPORT", label: "IT Support View (Priya Patel)" },
  { user_id: "EMP-101", name: "Aarav Verma", role: "EMPLOYEE", label: "Employee View (Aarav Verma)" },
  { user_id: "EMP-102", name: "Ananya Iyer", role: "EMPLOYEE", label: "Employee View (Ananya Iyer)" }
];

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("it_user");
    return saved ? JSON.parse(saved) : DEMO_ACCOUNTS[0];
  });
  const [token, setToken] = useState(() => localStorage.getItem("it_token") || "");
  
  const [activeTab, setActiveTab] = useState("tickets");
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [slaReport, setSlaReport] = useState(null);
  const [ticketMetrics, setTicketMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Add toast notification
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Fetch token or login
  const authenticateUser = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password: "password" })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        setCurrentUser(data.user);
        localStorage.setItem("it_token", data.access_token);
        localStorage.setItem("it_user", JSON.stringify(data.user));
        addToast(`Switched account to ${data.user.name} (${data.user.role})`, "success");
        return data.access_token;
      }
    } catch (e) {
      console.warn("Auth fallback", e);
    }
    return token;
  };

  // Initial Auth on load
  useEffect(() => {
    authenticateUser(currentUser.user_id);
  }, []);

  // Fetch All Data
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      // 1. Fetch Tickets
      const tRes = await fetch(`${API_BASE}/tickets`, { headers });
      if (tRes.ok) setTickets(await tRes.json());

      // 2. Fetch Assets
      const aRes = await fetch(`${API_BASE}/assets`, { headers });
      if (aRes.ok) setAssets(await aRes.json());

      // 3. Fetch Reports (Admin/Support only)
      if (currentUser.role !== "EMPLOYEE") {
        const rRes = await fetch(`${API_BASE}/reports/tickets`, { headers });
        if (rRes.ok) setTicketMetrics(await rRes.json());

        const sRes = await fetch(`${API_BASE}/reports/sla`, { headers });
        if (sRes.ok) setSlaReport(await sRes.json());
      }
    } catch (err) {
      console.error("Data fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [token, currentUser.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket Real-Time Connection
  useEffect(() => {
    let ws;
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setWsConnected(true);
        addToast("Real-Time WebSocket Stream Connected", "success");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLiveEvents(prev => [data, ...prev.slice(0, 19)]);
          if (data.event !== "PONG") {
            addToast(`⚡ Event: ${data.message || data.event}`, "info");
            fetchData();
          }
        } catch (e) {}
      };
      ws.onclose = () => setWsConnected(false);
      ws.onerror = () => setWsConnected(false);
    } catch (e) {
      setWsConnected(false);
    }

    return () => {
      if (ws) ws.close();
    };
  }, [fetchData, addToast]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.ticket_id.toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCategory || t.category === filterCategory;
      const matchPri = !filterPriority || t.priority === filterPriority;
      const matchStat = !filterStatus || t.status === filterStatus;
      return matchSearch && matchCat && matchPri && matchStat;
    });
  }, [tickets, search, filterCategory, filterPriority, filterStatus]);

  // SLA breach count calculation
  const criticalBreachCount = useMemo(() => {
    if (slaReport) return slaReport.breached_count;
    return tickets.filter(t => t.priority === "CRITICAL" && t.status !== "CLOSED").length;
  }, [slaReport, tickets]);

  return (
    <div className="app-container">
      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span>{t.type === "success" ? "✅" : "🔔"}</span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Top Navigation */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="brand-icon">🛠️</div>
          <div>
            <div className="brand-title">Smart IT Ops</div>
            <span className="brand-tag">FastAPI + MySQL</span>
          </div>
        </div>

        <div className="nav-actions">
          {/* WebSocket Live Status */}
          <div className="ws-badge">
            <span className="ws-dot"></span>
            <span>{wsConnected ? "WebSocket Live" : "Offline"}</span>
          </div>

          {/* User Profile Badge */}
          <div className="user-profile-badge">
            <div className="user-avatar">{currentUser.name.charAt(0)}</div>
            <div className="user-meta">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-role-tag">{currentUser.role}</span>
            </div>
            <button className="btn-secondary" style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem", marginLeft: "0.5rem" }} onClick={() => setShowLoginModal(true)}>
              Switch Role
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-wrapper">
        {/* KPI Grid */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div>
              <div className="kpi-title">Total Incidents</div>
              <div className="kpi-value">{tickets.length}</div>
              <div className="kpi-sub">
                {tickets.filter(t => t.status === "OPEN").length} Open | {tickets.filter(t => t.status === "RESOLVED").length} Resolved
              </div>
            </div>
            <div className="kpi-icon-wrap kpi-blue">🎫</div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">Critical SLA Attention</div>
              <div className="kpi-value" style={{ color: criticalBreachCount > 0 ? "var(--status-critical)" : "inherit" }}>
                {criticalBreachCount}
              </div>
              <div className="kpi-sub">Immediate Action Required</div>
            </div>
            <div className="kpi-icon-wrap kpi-red">⏱️</div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">Hardware Inventory</div>
              <div className="kpi-value">{assets.length}</div>
              <div className="kpi-sub">
                {assets.filter(a => a.status === "ASSIGNED").length} Assigned | {assets.filter(a => a.status === "AVAILABLE").length} Available
              </div>
            </div>
            <div className="kpi-icon-wrap kpi-purple">💻</div>
          </div>

          <div className="kpi-card">
            <div>
              <div className="kpi-title">SLA Compliance</div>
              <div className="kpi-value" style={{ color: "var(--status-low)" }}>
                {slaReport ? slaReport.compliance_rate : "94.2%"}
              </div>
              <div className="kpi-sub">Average Resolution: 1h 30m</div>
            </div>
            <div className="kpi-icon-wrap kpi-green">🛡️</div>
          </div>
        </section>

        {/* Action Bar & Tabs */}
        <div className="action-bar">
          <div className="tabs-list">
            <button className={`tab-btn ${activeTab === "tickets" ? "active" : ""}`} onClick={() => setActiveTab("tickets")}>
              🎫 Support Tickets ({tickets.length})
            </button>
            <button className={`tab-btn ${activeTab === "assets" ? "active" : ""}`} onClick={() => setActiveTab("assets")}>
              💻 Hardware Assets ({assets.length})
            </button>
            {currentUser.role !== "EMPLOYEE" && (
              <button className={`tab-btn ${activeTab === "reports" ? "active" : ""}`} onClick={() => setActiveTab("reports")}>
                📊 SLA & Analytics
              </button>
            )}
            <button className={`tab-btn ${activeTab === "events" ? "active" : ""}`} onClick={() => setActiveTab("events")}>
              ⚡ Live Feed ({liveEvents.length})
            </button>
          </div>

          <div>
            <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
              ➕ Raise New Ticket
            </button>
          </div>
        </div>

        {/* TAB 1: TICKETS VIEW */}
        {activeTab === "tickets" && (
          <div className="table-card">
            <div className="table-toolbar">
              <input 
                type="text" 
                className="search-input" 
                placeholder="Search ticket ID or title..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
              <div className="filter-group">
                <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">All Categories</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Network">Network</option>
                  <option value="Access">Access</option>
                  <option value="Software">Software</option>
                </select>

                <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title & Description</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, color: "var(--accent-cyan)" }}>{t.ticket_id}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", maxWidth: "320px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.description}
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: "rgba(255,255,255,0.06)" }}>{t.category}</span></td>
                    <td>
                      <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${t.status.toLowerCase().replace('_', '-')}`}>{t.status}</span>
                    </td>
                    <td style={{ fontSize: "0.8rem", color: t.assigned_to ? "var(--text-main)" : "var(--text-dim)" }}>
                      {t.assigned_to || "Unassigned"}
                    </td>
                    <td>
                      {currentUser.role !== "EMPLOYEE" && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                        <button className="btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={() => setShowResolveModal(t)}>
                          Resolve
                        </button>
                      )}
                      {t.status === "RESOLVED" && (
                        <button className="btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={async () => {
                          await fetch(`${API_BASE}/tickets/${t.ticket_id}/close`, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${token}` }
                          });
                          addToast(`Closed ticket ${t.ticket_id}`, "success");
                          fetchData();
                        }}>
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredTickets.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: "2rem", color: "var(--text-dim)" }}>
                      No matching support tickets found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: ASSETS VIEW */}
        {activeTab === "assets" && (
          <div className="table-card">
            <div className="table-toolbar">
              <div style={{ fontWeight: 600 }}>Enterprise Hardware Inventory</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
                Showing {assets.length} tracked IT assets
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Device / Type</th>
                  <th>Brand & Model</th>
                  <th>Serial Number</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600, color: "#c084fc" }}>{a.asset_id}</td>
                    <td style={{ fontWeight: 500 }}>{a.type}</td>
                    <td>{a.brand} {a.model}</td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-dim)" }}>{a.serial_number}</td>
                    <td>
                      <span className={`badge ${a.status === 'AVAILABLE' ? 'badge-low' : a.status === 'ASSIGNED' ? 'badge-assigned' : 'badge-high'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td>{a.assigned_to || "—"}</td>
                    <td>
                      {currentUser.role !== "EMPLOYEE" && a.status === "AVAILABLE" && (
                        <button className="btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={() => setShowAssignModal(a)}>
                          Assign
                        </button>
                      )}
                      {currentUser.role !== "EMPLOYEE" && a.status === "ASSIGNED" && (
                        <button className="btn-secondary" style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }} onClick={async () => {
                          await fetch(`${API_BASE}/assets/${a.asset_id}/return`, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${token}` }
                          });
                          addToast(`Returned ${a.asset_id} to inventory`, "success");
                          fetchData();
                        }}>
                          Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: REPORTS & ANALYTICS */}
        {activeTab === "reports" && slaReport && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>⏱️ SLA Health & Resolution Metrics</h3>
              <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem", fontSize: "0.85rem" }}>
                  <span>SLA Compliance Target</span>
                  <span style={{ fontWeight: 600, color: "var(--status-low)" }}>{slaReport.compliance_rate}</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "rgba(255,255,255,0.08)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: slaReport.compliance_rate, height: "100%", background: "linear-gradient(to right, var(--primary), var(--accent-cyan))" }}></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Total Incidents Analyzed</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{slaReport.total_tickets_analyzed}</div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Average Resolution</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{slaReport.resolution_metrics.average_resolution_human}</div>
                </div>
              </div>
            </div>

            <div className="table-card" style={{ padding: "1.5rem" }}>
              <h3 style={{ marginBottom: "1rem" }}>🌐 External System Diagnostic (Section 14)</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                Demonstrates Python Requests API integration against external network endpoints.
              </p>
              <button className="btn-primary" onClick={async () => {
                const res = await fetch(`${API_BASE}/reports/external-status`, { headers: { "Authorization": `Bearer ${token}` } });
                const json = await res.json();
                addToast(`External API Status: ${json.status} (IP: ${json.origin_ip})`, "success");
              }}>
                Run Network Health Check
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: LIVE WEBSOCKET EVENTS */}
        {activeTab === "events" && (
          <div className="table-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem" }}>⚡ Real-Time WebSocket Event Stream</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Live connection to <code style={{ color: "var(--accent-cyan)" }}>ws://localhost:8000/ws/tickets</code>
            </p>
            <div style={{ background: "var(--bg-input)", padding: "1rem", borderRadius: "var(--radius-md)", maxHeight: "350px", overflowY: "auto", fontFamily: "monospace", fontSize: "0.8rem" }}>
              {liveEvents.map((ev, i) => (
                <div key={i} style={{ padding: "0.4rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "var(--accent-cyan)" }}>[{new Date().toLocaleTimeString()}]</span> {JSON.stringify(ev)}
                </div>
              ))}
              {liveEvents.length === 0 && <div style={{ color: "var(--text-dim)" }}>Listening for live broadcasts...</div>}
            </div>
          </div>
        )}
      </main>

      {/* CREATE TICKET MODAL with Auto-Classification Preview */}
      {showCreateModal && (
        <CreateTicketModal 
          onClose={() => setShowCreateModal(false)} 
          token={token} 
          onSuccess={() => { setShowCreateModal(false); fetchData(); addToast("Ticket created successfully!", "success"); }}
        />
      )}

      {/* RESOLVE TICKET MODAL */}
      {showResolveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Resolve Ticket ({showResolveModal.ticket_id})</div>
              <button className="close-btn" onClick={() => setShowResolveModal(null)}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const notes = e.target.notes.value;
              await fetch(`${API_BASE}/tickets/${showResolveModal.ticket_id}/resolve`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ resolution: notes })
              });
              setShowResolveModal(null);
              fetchData();
              addToast(`Resolved ticket ${showResolveModal.ticket_id}`, "success");
            }}>
              <div className="form-group">
                <label className="form-label">Diagnostic & Resolution Notes</label>
                <textarea name="notes" className="form-textarea" rows="4" placeholder="Detail how the issue was fixed..." required minLength="5"></textarea>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowResolveModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ASSET MODAL */}
      {showAssignModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Assign Asset ({showAssignModal.asset_id})</div>
              <button className="close-btn" onClick={() => setShowAssignModal(null)}>×</button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const empId = e.target.empId.value;
              await fetch(`${API_BASE}/assets/${showAssignModal.asset_id}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ employee_id: empId, notes: "Assigned via web dashboard" })
              });
              setShowAssignModal(null);
              fetchData();
              addToast(`Assigned ${showAssignModal.asset_id} to ${empId}`, "success");
            }}>
              <div className="form-group">
                <label className="form-label">Assign To Employee ID</label>
                <select name="empId" className="form-select">
                  <option value="EMP-101">EMP-101 (Aarav Verma)</option>
                  <option value="EMP-102">EMP-102 (Ananya Iyer)</option>
                  <option value="EMP-103">EMP-103 (Vikram Singh)</option>
                  <option value="EMP-104">EMP-104 (Sneha Kulkarni)</option>
                  <option value="EMP-105">EMP-105 (Rohan Gupta)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowAssignModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Confirm Assignment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE SWITCHER MODAL */}
      {showLoginModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div className="modal-title">Select User Role (Quick Demo Switcher)</div>
              <button className="close-btn" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {DEMO_ACCOUNTS.map(acc => (
                <div 
                  key={acc.user_id} 
                  style={{
                    padding: "1rem", 
                    background: currentUser.user_id === acc.user_id ? "rgba(99, 102, 241, 0.15)" : "var(--bg-input)", 
                    border: `1px solid ${currentUser.user_id === acc.user_id ? "var(--primary)" : "var(--border-subtle)"}`,
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                  onClick={async () => {
                    await authenticateUser(acc.user_id);
                    setShowLoginModal(false);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{acc.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>{acc.user_id} • {acc.label}</div>
                  </div>
                  <span className={`badge ${acc.role === 'ADMIN' ? 'badge-critical' : acc.role === 'SUPPORT' ? 'badge-high' : 'badge-low'}`}>
                    {acc.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Component for Creating Tickets with Live Classification Preview
function CreateTicketModal({ onClose, token, onSuccess }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // Live Regex preview
  const inferredCategory = useMemo(() => {
    const text = `${title} ${desc}`.toLowerCase();
    if (text.match(/laptop|monitor|screen|keyboard|mouse|printer|hardware/)) return "Hardware";
    if (text.match(/wifi|internet|network|vpn|lan|dns/)) return "Network";
    if (text.match(/password|account|login|access|locked/)) return "Access";
    if (text.match(/software|app|excel|crash|update/)) return "Software";
    return "Other";
  }, [title, desc]);

  const inferredPriority = useMemo(() => {
    const text = `${title} ${desc}`.toLowerCase();
    if (text.match(/emergency|outage|entire|critical|down/)) return "CRITICAL";
    if (text.match(/not working|cannot work|black screen|broken/)) return "HIGH";
    if (text.match(/slow|intermittent|glitch/)) return "MEDIUM";
    return "LOW";
  }, [title, desc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title,
      description: desc,
      category: inferredCategory,
      priority: inferredPriority
    };

    const res = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      onSuccess();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div className="modal-title">Create Support Ticket</div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Incident Title</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., Laptop screen flickering intermittently" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required 
              minLength="3"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Detailed Description</label>
            <textarea 
              className="form-textarea" 
              rows="3" 
              placeholder="Provide symptoms, error messages, and context..." 
              value={desc} 
              onChange={e => setDesc(e.target.value)} 
              required 
              minLength="5"
            />
          </div>

          {/* Real-time Regex Auto-Classification Preview */}
          <div className="auto-classify-preview">
            <span>🤖 <strong>Regex AI Preview:</strong></span>
            <span>Category: <strong style={{ color: "#ffffff" }}>{inferredCategory}</strong></span>
            <span>•</span>
            <span>Priority: <strong style={{ color: "#ffffff" }}>{inferredPriority}</strong></span>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Submit Ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Render React 18 Application
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
