// =====================================================================
// Apex Sentinel — React 18 Single Page Application
// Theme: Warm Editorial Craft & Enterprise Security (Google Stitch)
// =====================================================================

const { useState, useEffect, useCallback, useMemo } = React;

const API_BASE = window.location.origin;
const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/tickets`;

// Sample Demo Accounts for Instant Switching (Indian Employee Roles)
const DEMO_ACCOUNTS = [
  { user_id: "ADM-001", name: "Rajesh Sharma", role: "ADMIN", label: "Admin View (Rajesh Sharma)", email: "rajesh.sharma@company.com" },
  { user_id: "IT-501", name: "Priya Patel", role: "SUPPORT", label: "IT Support View (Priya Patel)", email: "priya.patel@company.com" },
  { user_id: "EMP-101", name: "Aarav Verma", role: "EMPLOYEE", label: "Employee View (Aarav Verma)", email: "aarav.verma@company.com" },
  { user_id: "EMP-102", name: "Ananya Iyer", role: "EMPLOYEE", label: "Employee View (Ananya Iyer)", email: "ananya.iyer@company.com" }
];

// =====================================================================
// Component: Apex Sentinel Split-Screen Login Page (Matches User Design)
// =====================================================================
function LoginPage({ onLoginSuccess, onSwitchToRegister, demoAccounts, theme, onToggleTheme }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: identifier.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Invalid enterprise credentials or account inactive.");
      }

      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (acc) => {
    setIdentifier(acc.user_id);
    setPassword("password");
    setError("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <div className="apex-auth-container">
        {/* LEFT PANEL: Enterprise Operations & Security Brand Canvas */}
        <div className="apex-auth-left">
          {/* Operations Photo Background with Warm Dark Overlay */}
          <div className="apex-auth-bg-photo" />
          <div className="ambient-glow-tl" />
          <div className="ambient-glow-br" />

          {/* Top Brand Header */}
          <div className="apex-auth-left-top">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="brand-icon-shield">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                <div className="brand-ping-dot" />
              </div>
              <div className="brand-title-wrap">
                <span className="brand-title">AssetDesk</span>
                <span className="brand-tag">IT ASSET & TICKET MANAGEMENT</span>
              </div>
            </div>
          </div>

          {/* Middle Hero Area */}
          <div className="apex-auth-left-middle">
            <div className="portal-tag-badge">
              <span className="material-symbols-outlined">terminal</span>
              <span>Mission-Critical Operations Portal</span>
            </div>

            <h1 className="hero-editorial-title">
              IT Asset & Ticket<br />Management System
            </h1>

            <p className="hero-editorial-desc">
              A centralized enterprise platform to manage hardware assets, employee accounts, priority support queues, and SLA compliance.
            </p>

            {/* Feature Highlights & Compliance Badges */}
            <div className="hero-badges-wrap">
              <div className="feature-pill-badge">
                <span className="material-symbols-outlined badge-icon-pace">pace</span>
                <span>Real-time SLA Tracking & Escalation</span>
              </div>
              <div className="feature-pill-badge">
                <span className="material-symbols-outlined badge-icon-inventory">inventory_2</span>
                <span>Automated Asset Lifecycle Auditing</span>
              </div>
            </div>
          </div>


        </div>

        {/* RIGHT PANEL: High-Precision Modern Authentication Form */}
        <div className="apex-auth-right">
          <div className="auth-form-card">
            {/* Top Badge & Header */}
            <div className="auth-card-top">
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-auth-theme-toggle"
                  onClick={onToggleTheme}
                  title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
                  aria-label="Toggle theme"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>
                    {theme === "dark" ? "light_mode" : "dark_mode"}
                  </span>
                  <span>{theme === "dark" ? "Light" : "Dark"}</span>
                </button>
              </div>

              <div>
                <h2 className="auth-card-heading">Welcome Back!</h2>
                <p className="auth-card-desc">Sign in to access your IT workspace, assets, and active tickets.</p>
              </div>

              {/* Demo Role Scope Bar */}
              <div className="demo-tiers-bar">
                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary)" }}>groups</span>
                <span style={{ color: "var(--text-muted)" }}>Available Tiers:</span>
                <span
                  className="demo-tier-item admin"
                  onClick={() => handleDemoFill(demoAccounts[0])}
                  title="Auto-fill Rajesh Sharma (ADMIN)"
                >
                  Admin
                </span>
                <span style={{ color: "#d5d2cb" }}>•</span>
                <span
                  className="demo-tier-item support"
                  onClick={() => handleDemoFill(demoAccounts[1])}
                  title="Auto-fill Priya Patel (SUPPORT)"
                >
                  IT Support
                </span>
                <span style={{ color: "#d5d2cb" }}>•</span>
                <span
                  className="demo-tier-item employee"
                  onClick={() => handleDemoFill(demoAccounts[2])}
                  title="Auto-fill Aarav Verma (EMPLOYEE)"
                >
                  Employee
                </span>
              </div>
            </div>

            {error && (
              <div className="auth-error-banner">
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Work Email Field */}
              <div className="form-field-group">
                <label className="form-field-label" htmlFor="work-email">Work Email or Employee ID</label>
                <div className="input-icon-wrap">
                  <span className="material-symbols-outlined field-icon-left">mail</span>
                  <input
                    id="work-email"
                    type="text"
                    className="apex-form-input"
                    placeholder="name@company.com or EMP-101"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="form-field-group">
                <div className="form-field-header-row">
                  <label className="form-field-label" htmlFor="password">Password</label>
                  <span
                    className="forgot-pwd-link"
                    onClick={() => alert("Enterprise self-service reset: Please contact your IT administrator (ADM-001) or click any demo role above.")}
                  >
                    Forgot Password?
                  </span>
                </div>
                <div className="input-icon-wrap">
                  <span className="material-symbols-outlined field-icon-left">lock_open</span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="apex-form-input has-right-btn"
                    placeholder="Enter your enterprise password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-btn-right"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Options Row (Remember) */}
              <div className="form-options-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span>Remember this workstation (30d)</span>
                </label>
              </div>

              {/* Primary Action Button */}
              <button type="submit" className="btn-submit-workspace" disabled={loading}>
                <span>{loading ? "AUTHENTICATING..." : "SIGN IN TO WORKSPACE"}</span>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
              </button>
            </form>

            {/* Onboarding Token Callout */}
            <div className="onboarding-box" style={{ marginTop: "1.75rem" }}>
              <span>Received an onboarding token?</span>
              <span className="link" onClick={onSwitchToRegister}>
                Activate Employee Account
              </span>
            </div>

          </div>
        </div>
      </div>


    </div>
  );
}

// =====================================================================
// Component: Apex AssetTrack & ServiceDesk Account Setup (Register)
// Matches Google Stitch "Complete Your Account Setup" Design Exactly
// =====================================================================
function RegisterPage({ onRegisterSuccess, onSwitchToLogin, theme, onToggleTheme }) {
  const [firstName, setFirstName] = useState("Sarah");
  const [lastName, setLastName] = useState("Jenkins");
  const [email, setEmail] = useState("s.jenkins@company.com");
  const [employeeId, setEmployeeId] = useState("EMP-84920");
  const [token, setToken] = useState("APX-INV-99482-SEC-AUTH-PROD");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [policyConsent, setPolicyConsent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTokenChange = async (newVal) => {
    setToken(newVal);
    const trimmed = newVal.trim();
    if (trimmed.length >= 16) {
      try {
        const res = await fetch(`${API_BASE}/auth/verify-invitation?token=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const info = await res.json();
          if (info.name) {
            const parts = info.name.split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          }
          if (info.email) setEmail(info.email);
          if (info.user_id) setEmployeeId(info.user_id);
          setError("");
        }
      } catch (e) {
        // Ignore during typing
      }
    }
  };

  // Live password checklist requirements
  const pwdReqs = {
    len: password.length >= 12,
    upper: /[A-Z]/.test(password),
    num: /[0-9]/.test(password),
    sym: /[^A-Za-z0-9]/.test(password)
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!policyConsent) {
      setError("Please agree to the Company IT Acceptable Use Policy, Data Security Protocol, and Asset Custody Agreement to proceed.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      // 1. Attempt complete registration with backend
      const regRes = await fetch(`${API_BASE}/auth/complete-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitation_token: token.trim(),
          password,
          name: `${firstName} ${lastName}`.trim() || undefined
        })
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        throw new Error(regData.detail || "Account activation failed.");
      }

      // 2. Registration succeeded, login with active credentials
      const userIdentifier = regData.user_id || (regData.user ? regData.user.user_id : email);
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userIdentifier, password })
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        throw new Error("Registration complete! Please proceed to Sign In.");
      }

      onRegisterSuccess(loginData.user, loginData.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-wrap">
      {/* Background Dot Grid & Ambient Terracotta Glow */}
      <div className="register-bg-dots" />
      <div className="register-ambient-glow" />

      {/* Floating Theme Toggle in Top Right */}
      <div style={{ position: "fixed", top: "1.25rem", right: "1.5rem", zIndex: 100 }}>
        <button
          type="button"
          className="btn-auth-theme-toggle"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>

      <div className="register-content-col">
        {/* Brand Header */}
        <div className="register-brand-wrap">
          <div className="register-logo-box">
            <div className="register-logo-inner">
              <span className="material-symbols-outlined" style={{ fontSize: "20px", fontWeight: "bold", fontVariationSettings: "'FILL' 1" }}>
                shield
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
            <h2 className="register-brand-title">AssetDesk</h2>
            <span className="brand-tag" style={{ fontSize: "0.72rem", letterSpacing: "0.14em" }}>IT ASSET & TICKET MANAGEMENT</span>
          </div>
          <div className="register-pill-badge">
            <span className="material-symbols-outlined">verified</span>
            <span>Enterprise Employee Onboarding • Invitation Only</span>
          </div>
        </div>

        {/* Setup Card */}
        <div className="register-setup-card">
          <div style={{ textAlign: "left" }}>
            <h1 className="register-card-heading">Complete Your Account Setup</h1>
            <p className="register-card-desc">
              Just a few steps to activate your workspace and access assigned IT hardware and support services.
            </p>
          </div>

          {/* Pre-Authorized Verified Banner */}
          <div className="register-preverified-banner">
            <span className="material-symbols-outlined">verified_user</span>
            <span>Pre-Authorized Invitation Verified for corporate domain @company.com</span>
          </div>

          {error && (
            <div className="auth-error-banner">
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* First Name & Last Name */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-field-group">
                <label className="form-field-label">First Name</label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ paddingLeft: "0.85rem" }}
                  placeholder="e.g. Sarah"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Last Name</label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ paddingLeft: "0.85rem" }}
                  placeholder="e.g. Jenkins"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Work Email & Employee ID */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-field-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <label className="form-field-label" style={{ marginBottom: 0 }}>Work Email</label>
                  <span style={{ color: "#186a22", fontSize: "0.74rem", display: "flex", alignItems: "center", gap: "2px", fontWeight: 500, fontFamily: "var(--font-mono)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check_circle</span> Verified
                  </span>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <input
                    type="email"
                    className="apex-form-input"
                    style={{ paddingLeft: "0.85rem", paddingRight: "1rem" }}
                    placeholder="name@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Employee ID</label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ paddingLeft: "0.85rem", fontFamily: "var(--font-mono)", fontSize: "0.85rem" }}
                  placeholder="e.g. EMP-101 or EMP-84920"
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  required
                />
                <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "0.25rem", display: "block" }}>
                  Assigned ID on your invite token
                </span>
              </div>
            </div>

            {/* Invitation Token */}
            <div className="form-field-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                <label className="form-field-label" style={{ marginBottom: 0 }}>Invitation Token</label>
                <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  Single-use onboarding token
                </span>
              </div>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ paddingLeft: "0.85rem", paddingRight: "1rem", fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}
                  placeholder="Paste invitation token here"
                  value={token}
                  onChange={e => handleTokenChange(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Create Password & Confirm Password */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-field-group">
                <label className="form-field-label">Create Password</label>
                <div className="input-with-icon-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="apex-form-input"
                    style={{ paddingLeft: "0.85rem", paddingRight: "2.4rem" }}
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-btn-right"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Confirm Password</label>
                <div className="input-with-icon-wrap">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="apex-form-input"
                    style={{ paddingLeft: "0.85rem", paddingRight: "2.4rem" }}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="field-btn-right"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "19px" }}>
                      {showConfirmPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Security Checklist Box */}
            <div className="register-checklist-box">
              <span className="register-checklist-title">Security Checklist</span>
              <div className="register-checklist-grid">
                <div className={`checklist-item ${pwdReqs.len ? "passed" : ""}`}>
                  <span className="material-symbols-outlined">
                    {pwdReqs.len ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>At least 12 characters</span>
                </div>
                <div className={`checklist-item ${pwdReqs.upper ? "passed" : ""}`}>
                  <span className="material-symbols-outlined">
                    {pwdReqs.upper ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>One uppercase letter</span>
                </div>
                <div className={`checklist-item ${pwdReqs.num ? "passed" : ""}`}>
                  <span className="material-symbols-outlined">
                    {pwdReqs.num ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>One number (0-9)</span>
                </div>
                <div className={`checklist-item ${pwdReqs.sym ? "passed" : ""}`}>
                  <span className="material-symbols-outlined">
                    {pwdReqs.sym ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>One special symbol</span>
                </div>
              </div>
            </div>

            {/* Policy Consent Checkbox */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", paddingTop: "0.25rem" }}>
              <input
                type="checkbox"
                id="policy-consent"
                checked={policyConsent}
                onChange={e => setPolicyConsent(e.target.checked)}
                style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "var(--primary)", cursor: "pointer" }}
                required
              />
              <label htmlFor="policy-consent" style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, cursor: "pointer" }}>
                I agree to the <a href="#policy" onClick={e => e.preventDefault()} style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "underline" }}>Company IT Acceptable Use Policy</a>, <a href="#security" onClick={e => e.preventDefault()} style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "underline" }}>Data Security Protocol</a>, and <a href="#custody" onClick={e => e.preventDefault()} style={{ color: "var(--primary)", fontWeight: 500, textDecoration: "underline" }}>Asset Custody Agreement</a>.
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-submit-workspace"
              disabled={loading}
              style={{ height: "46px", marginTop: "0.4rem" }}
            >
              <span>{loading ? "ACTIVATING ACCOUNT..." : "ACTIVATE ACCOUNT & ACCESS PORTAL"}</span>
              <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>arrow_forward</span>
            </button>
          </form>

          {/* Important Security Policy Notice Box */}
          <div className="register-policy-notice">
            <span className="material-symbols-outlined policy-icon">policy</span>
            <p>
              <strong>Important Security Policy:</strong> Account activation requires an authorized employee invitation issued by your IT Administrator. Self-registration is strictly restricted to valid domain identity tokens.
            </p>
          </div>
        </div>

        {/* Bottom Bar: Switch to Login */}
        <div className="register-bottom-bar">
          <div className="register-login-switch">
            Already activated your account?
            <span className="link-login" onClick={onSwitchToLogin}>Sign in here</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// Main Application Component (Apex Sentinel Theme)
// =====================================================================
function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("apex_theme") || "light";
    } catch (e) {
      return "light";
    }
  });

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("apex_theme", next);
      } catch (e) {}
      document.documentElement.setAttribute("data-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem("it_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("it_token") || "");
  const [authView, setAuthView] = useState("login"); // "login" | "register"

  const [activeTab, setActiveTab] = useState("dashboard");
  const [timeRange, setTimeRange] = useState("30d");
  const [tickets, setTickets] = useState([]);
  const [assets, setAssets] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [slaReport, setSlaReport] = useState(null);
  const [ticketMetrics, setTicketMetrics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Asset Filters
  const [assetSearch, setAssetSearch] = useState("");
  const [assetStatusFilter, setAssetStatusFilter] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState("");

  // Employee Filters
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  // Real database metrics computed dynamically from actual records
  const totalAssets = assets.length;
  const assignedAssets = assets.filter(a => a.status === "ASSIGNED").length;
  const availableAssets = assets.filter(a => a.status === "AVAILABLE").length;
  const underRepairAssets = assets.filter(a => a.status === "UNDER_REPAIR" || a.status === "MAINTENANCE").length;
  const retiredAssets = assets.filter(a => a.status === "RETIRED").length;

  const totalUsers = usersList.length;
  const adminUsers = usersList.filter(u => u.role === "ADMIN").length;
  const supportUsers = usersList.filter(u => u.role === "SUPPORT").length;
  const employeeUsers = usersList.filter(u => u.role === "EMPLOYEE").length;

  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status === "OPEN").length;
  const inProgressTickets = tickets.filter(t => t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length;
  const resolvedTickets = tickets.filter(t => t.status === "RESOLVED").length;
  const closedTickets = tickets.filter(t => t.status === "CLOSED").length;
  const resolvedAndClosed = resolvedTickets + closedTickets;

  const criticalTickets = tickets.filter(t => t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED").length;
  const highTickets = tickets.filter(t => t.priority === "HIGH" && t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  // Real ticket categories breakdown (case-insensitive)
  const hardwareTickets = tickets.filter(t => (t.category || "").toUpperCase() === "HARDWARE").length;
  const networkTickets = tickets.filter(t => (t.category || "").toUpperCase() === "NETWORK").length;
  const softwareTickets = tickets.filter(t => (t.category || "").toUpperCase() === "SOFTWARE").length;
  const accessTickets = tickets.filter(t => (t.category || "").toUpperCase() === "ACCESS").length;
  const otherTickets = tickets.filter(t => !["HARDWARE", "NETWORK", "SOFTWARE", "ACCESS"].includes((t.category || "").toUpperCase())).length;

  // Real SLA metrics
  const breachedTicketsCount = slaReport?.breached_count ?? tickets.filter(t => t.sla_status === "BREACHED").length;
  const complianceRate = totalTickets > 0 ? (((totalTickets - breachedTicketsCount) / totalTickets) * 100).toFixed(1) : "100.0";

  // Safe user profile details
  const userName = currentUser?.name || currentUser?.full_name || currentUser?.user_id || "User";
  const userInitial = userName.charAt(0).toUpperCase();
  const userRole = currentUser?.role || "EMPLOYEE";

  const handleExportReport = () => {
    const content = `AssetDesk IT Operations & Infrastructure Report
======================================================
Generated: ${new Date().toLocaleString()}
Database Status: Synchronized (${totalAssets} Assets, ${totalUsers} Users, ${totalTickets} Tickets)

EXECUTIVE METRICS (REAL DATABASE COUNTS):
- Total Hardware Assets: ${totalAssets}
  * Assigned to Personnel: ${assignedAssets}
  * Available in Depository: ${availableAssets}
  * Under Maintenance: ${underRepairAssets}
  * Retired: ${retiredAssets}

- Enrolled Workforce: ${totalUsers}
  * System Administrators: ${adminUsers}
  * IT Support Specialists: ${supportUsers}
  * Employees: ${employeeUsers}

- Support Incident Operations: ${totalTickets}
  * Open Queue: ${openTickets}
  * In Progress / Assigned: ${inProgressTickets}
  * Resolved: ${resolvedTickets}
  * Closed: ${closedTickets}
  * Overall SLA Compliance: ${complianceRate}% (${breachedTicketsCount} Breaches)

TICKET CATEGORY DISTRIBUTION:
- Hardware: ${hardwareTickets} (${totalTickets > 0 ? ((hardwareTickets / totalTickets) * 100).toFixed(1) : 0}%)
- Network: ${networkTickets} (${totalTickets > 0 ? ((networkTickets / totalTickets) * 100).toFixed(1) : 0}%)
- Software: ${softwareTickets} (${totalTickets > 0 ? ((softwareTickets / totalTickets) * 100).toFixed(1) : 0}%)
- Access & Security: ${accessTickets} (${totalTickets > 0 ? ((accessTickets / totalTickets) * 100).toFixed(1) : 0}%)
${otherTickets > 0 ? `- Other: ${otherTickets}\n` : ''}
ACTIVE ESCALATIONS / PRIORITY INCIDENTS:
${tickets.filter(t => (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'RESOLVED' && t.status !== 'CLOSED').slice(0, 8).map(t => `[${t.ticket_id}] ${t.priority} - ${t.title} (${t.status})`).join("\n") || "No active critical escalations."}
`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `AssetDesk_Operations_Report_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    addToast("Real database operations report generated and downloaded.", "success");
  };

  const handleProvisionCTA = () => {
    if (currentUser && currentUser.role === "ADMIN") {
      setShowInviteModal(true);
    } else {
      setShowCreateAssetModal(true);
    }
  };

  // WebSocket State
  const [wsConnected, setWsConnected] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [toasts, setToasts] = useState([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showAssignTicketModal, setShowAssignTicketModal] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Toast notification helper
  const addToast = useCallback((msg, type = "info") => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Quick switch role inside dashboard
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

  // Verify saved token on load
  useEffect(() => {
    if (token && currentUser) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => {
          if (!res.ok) {
            localStorage.removeItem("it_token");
            localStorage.removeItem("it_user");
            setToken("");
            setCurrentUser(null);
          }
        })
        .catch(() => { });
    }
  }, []);

  // Fetch All Data in Parallel
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const pTickets = fetch(`${API_BASE}/tickets`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setTickets(data))
        .catch(err => console.warn("Failed to load tickets", err));

      const pAssets = fetch(`${API_BASE}/assets`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setAssets(data))
        .catch(err => console.warn("Failed to load assets", err));

      const pAudit = fetch(`${API_BASE}/reports/audit`, { headers })
        .then(r => r.ok ? r.json() : [])
        .then(data => setAuditLogs(data))
        .catch(err => console.warn("Failed to load audit logs", err));

      const pSla = fetch(`${API_BASE}/reports/sla`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(data => setSlaReport(data))
        .catch(err => console.warn("Failed to load SLA", err));

      const staffPromises = [];
      if (currentUser && currentUser.role !== "EMPLOYEE") {
        staffPromises.push(
          fetch(`${API_BASE}/users`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setUsersList(data))
            .catch(err => console.warn("Failed to load users", err)),
          fetch(`${API_BASE}/reports/tickets`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(data => setTicketMetrics(data))
            .catch(err => console.warn("Failed to load ticket metrics", err))
        );
      }

      await Promise.all([pTickets, pAssets, pAudit, pSla, ...staffPromises]);
    } catch (err) {
      console.error("Data fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

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
        addToast("Real-Time Cluster Stream Active", "success");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLiveEvents(prev => [data, ...prev.slice(0, 19)]);
          if (data.event !== "PONG") {
            addToast(`⚡ Event: ${data.message || data.event}`, "info");
            fetchData();
          }
        } catch (e) { }
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

  // Filtered Tickets (Case-Insensitive & Multi-Field Search)
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const q = (search || "").trim().toLowerCase();
      const matchSearch = !q ||
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.ticket_id && t.ticket_id.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assigned_to && t.assigned_to.toLowerCase().includes(q));
      const matchCat = !filterCategory || (t.category || "").toUpperCase() === filterCategory.toUpperCase();
      const matchPri = !filterPriority || (t.priority || "").toUpperCase() === filterPriority.toUpperCase();
      const matchStat = !filterStatus || (t.status || "").toUpperCase() === filterStatus.toUpperCase();
      return matchSearch && matchCat && matchPri && matchStat;
    });
  }, [tickets, search, filterCategory, filterPriority, filterStatus]);

  // Filtered Assets (Search & Status & Type)
  const filteredAssets = useMemo(() => {
    return assets.filter(a => {
      const q = (assetSearch || "").trim().toLowerCase();
      const matchSearch = !q ||
        (a.asset_id && a.asset_id.toLowerCase().includes(q)) ||
        (a.brand && a.brand.toLowerCase().includes(q)) ||
        (a.model && a.model.toLowerCase().includes(q)) ||
        (a.serial_number && a.serial_number.toLowerCase().includes(q)) ||
        (a.assigned_to && a.assigned_to.toLowerCase().includes(q)) ||
        (a.type && a.type.toLowerCase().includes(q));
      const matchStat = !assetStatusFilter || (a.status || "").toUpperCase() === assetStatusFilter.toUpperCase();
      const matchType = !assetTypeFilter || (a.type || "").toUpperCase() === assetTypeFilter.toUpperCase();
      return matchSearch && matchStat && matchType;
    });
  }, [assets, assetSearch, assetStatusFilter, assetTypeFilter]);

  // Filtered Users (Search & Role)
  const filteredUsers = useMemo(() => {
    return usersList.filter(u => {
      const q = (userSearch || "").trim().toLowerCase();
      const matchSearch = !q ||
        (u.user_id && u.user_id.toLowerCase().includes(q)) ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q));
      const matchRole = !userRoleFilter || (u.role || "").toUpperCase() === userRoleFilter.toUpperCase();
      return matchSearch && matchRole;
    });
  }, [usersList, userSearch, userRoleFilter]);

  // SLA breach count
  const criticalBreachCount = useMemo(() => {
    if (slaReport) return slaReport.breached_count;
    return tickets.filter(t => t.priority === "CRITICAL" && t.status !== "CLOSED").length;
  }, [slaReport, tickets]);

  // If not logged in, render Login or Register page
  if (!token || !currentUser) {
    if (authView === "register") {
      return (
        <RegisterPage
          theme={theme}
          onToggleTheme={toggleTheme}
          onRegisterSuccess={(user, tok) => {
            setCurrentUser(user);
            setToken(tok);
            localStorage.setItem("it_token", tok);
            localStorage.setItem("it_user", JSON.stringify(user));
            addToast(`Welcome to AssetDesk, ${user.name}!`, "success");
          }}
          onSwitchToLogin={() => setAuthView("login")}
        />
      );
    }

    return (
      <LoginPage
        demoAccounts={DEMO_ACCOUNTS}
        theme={theme}
        onToggleTheme={toggleTheme}
        onLoginSuccess={(user, tok) => {
          setCurrentUser(user);
          setToken(tok);
          localStorage.setItem("it_token", tok);
          localStorage.setItem("it_user", JSON.stringify(user));
          addToast(`Authenticated as ${user.name} (${user.role})`, "success");
        }}
        onSwitchToRegister={() => setAuthView("register")}
      />
    );
  }

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <span className="material-symbols-outlined" style={{ fontSize: "18px", color: t.type === "success" ? "#4ade80" : "var(--primary-light)" }}>
              {t.type === "success" ? "check_circle" : "notifications"}
            </span>
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* LEFT SIDEBAR: Executive Workspace Navigation */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-surface-container-low z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-r border-surface-container-highest/60">
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="px-6 pt-6 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary font-headline font-semibold text-lg shadow-sm">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-on-surface font-headline leading-tight">AssetDesk</span>
                <span className="text-[10px] font-medium text-on-surface-variant tracking-normal font-mono uppercase">IT ASSET &amp; TICKET MANAGEMENT</span>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-mono">v2.4</span>
          </div>

          {/* Nav Items */}
          <div className="px-4 py-2">
            <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-mono">Workspace</p>
            <nav className="space-y-1">
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'dashboard' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('dashboard')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">dashboard</span>
                  <span>Dashboard</span>
                </div>
              </button>

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'tickets' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('tickets')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">confirmation_number</span>
                  <span>Tickets</span>
                </div>
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface font-mono">
                  {openTickets}
                </span>
              </button>

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'assets' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('assets')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">devices</span>
                  <span>Assets</span>
                </div>
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface-variant font-mono">
                  {totalAssets}
                </span>
              </button>

              {currentUser && currentUser.role !== 'EMPLOYEE' && (
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'employees' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                  onClick={() => setActiveTab('employees')}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[19px]">badge</span>
                    <span>Employees</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface-variant font-mono">
                    {totalUsers}
                  </span>
                </button>
              )}

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'sla' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('sla')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">timelapse</span>
                  <span>SLA &amp; Performance</span>
                </div>
                {breachedTicketsCount > 0 && (
                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-error-container text-on-error-container font-mono">
                    {breachedTicketsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'audit' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('audit')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">history</span>
                  <span>Audit Ledger</span>
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-3">
          <div className="px-3 py-2.5 rounded-lg bg-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span className="text-xs font-medium text-on-surface">Database Sync</span>
            </div>
            <span className="text-[11px] font-medium text-tertiary font-mono">Live</span>
          </div>

          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-on-primary font-semibold text-xs">
                {userInitial}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-on-surface truncate">{userName}</span>
                <span className="text-[10px] text-on-surface-variant truncate">
                  {userRole === 'ADMIN' ? 'Administrator' : userRole === 'SUPPORT' ? 'IT Support' : 'Employee'}
                </span>
              </div>
            </div>
            <button
              className="text-on-surface-variant hover:text-error p-1 rounded transition-colors cursor-pointer"
              type="button"
              title="Sign Out"
              onClick={() => {
                localStorage.removeItem("it_token");
                localStorage.removeItem("it_user");
                setToken("");
                setCurrentUser(null);
                addToast("Signed out successfully", "info");
              }}
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT SIDE MAIN WRAPPER */}
      <div className="pl-64 min-h-screen flex flex-col">
        {/* Top Fixed Header */}
        <header className="fixed top-0 left-64 right-0 h-16 bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-8 border-b border-surface-container-highest/60">
          <div className="flex items-center gap-6 min-w-0">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant">
              <span className="hover:text-on-surface transition-colors cursor-pointer" onClick={() => setActiveTab('dashboard')}>Platform</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-medium text-on-surface">
                {activeTab === 'dashboard' ? 'Operations Overview' :
                 activeTab === 'tickets' ? 'Support Incident Tickets' :
                 activeTab === 'assets' ? 'Hardware Asset Fleet' :
                 activeTab === 'employees' ? 'Enrolled Employee Directory' :
                 activeTab === 'sla' ? 'SLA & MTTR Performance' : 'System Audit Ledger'}
              </span>
            </div>
            <div className="hidden md:flex items-center bg-surface-container-low px-3 py-1.5 rounded-lg w-80 text-on-surface-variant focus-within:ring-1 focus-within:ring-primary focus-within:bg-surface-container-lowest transition-all">
              <span className="material-symbols-outlined text-[17px] mr-2 text-on-surface-variant">search</span>
              <input
                className="bg-transparent border-none outline-none text-xs text-on-surface placeholder:text-on-surface-variant w-full"
                placeholder="Search tickets, assets, or serials..."
                type="text"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setAssetSearch(e.target.value);
                  setUserSearch(e.target.value);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter" && activeTab === "dashboard") {
                    setActiveTab("tickets");
                  }
                }}
              />
              <kbd className="text-[10px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant font-mono">↵</kbd>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <button
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-container text-on-primary px-3.5 py-2 rounded-lg text-xs font-medium shadow-sm transition-colors cursor-pointer"
              type="button"
              onClick={() => setShowCreateModal(true)}
            >
              <span className="material-symbols-outlined text-[17px]">add</span>
              <span>New Ticket</span>
            </button>
            <div className="h-4 w-[1px] bg-surface-container-highest"></div>
            {/* Theme Toggle Button */}
            <button
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors text-xs font-medium cursor-pointer"
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[18px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            {/* Notifications */}
            <button
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors relative cursor-pointer"
              type="button"
              onClick={() => setActiveTab('audit')}
              title="Live System Notifications"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              {liveEvents.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full"></span>}
            </button>
            <button
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              type="button"
              title="Help & System Info"
              onClick={() => addToast("AssetDesk v2.4 Enterprise Production Gateway", "info")}
            >
              <span className="material-symbols-outlined text-[20px]">help_outline</span>
            </button>
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs cursor-pointer shadow-sm"
              title={`Logged in as ${userName} (${userRole})`}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="w-full pt-20 bg-surface px-8 pb-16 min-h-screen">
          {/* TAB: DASHBOARD / OVERVIEW */}
          {(activeTab === 'dashboard' || activeTab === 'overview-admin') && (
            <div className="flex flex-col w-full pb-16 space-y-8">
              {/* Executive Context Bar & Title Area */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-mono text-[11px] font-medium tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                      Live Database Connected
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">Real-Time Enterprise Gateway</span>
                  </div>
                  <h1 className="font-headline text-3xl lg:text-4xl text-on-surface tracking-tight font-normal">
                    Operations &amp; Infrastructure Overview
                  </h1>
                  <p className="text-sm text-on-surface-variant max-w-2xl font-body leading-relaxed">
                    Centralized visibility across hardware fleet custody, workforce support queues, and real-time SLA metrics.
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors shadow-sm cursor-pointer"
                    onClick={handleExportReport}
                  >
                    <span className="material-symbols-outlined text-[17px] text-secondary">file_download</span>
                    <span>Export Operations Report</span>
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-medium shadow-sm transition-all transform active:scale-95 cursor-pointer"
                    onClick={() => setShowCreateModal(true)}
                  >
                    <span className="material-symbols-outlined text-[17px]">add_circle</span>
                    <span>+ New Ticket</span>
                  </button>
                </div>
              </div>

              {/* Executive KPI Summary Cards (6-Grid, All Real Numbers) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* KPI 1: IT Assets */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Total IT Assets</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[17px]">laptop_mac</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-on-surface">
                      {totalAssets.toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-tertiary">
                      <span>{assignedAssets} Assigned • {availableAssets} In Stock</span>
                    </div>
                  </div>
                </div>

                {/* KPI 2: Total Workforce */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Enrolled Users</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[17px]">badge</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-on-surface">
                      {totalUsers.toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <span>{adminUsers} Admin • {supportUsers} Support • {employeeUsers} Staff</span>
                    </div>
                  </div>
                </div>

                {/* KPI 3: Total Tickets */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Total Tickets</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[17px]">confirmation_number</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-on-surface">
                      {totalTickets.toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-tertiary">
                      <span>{openTickets} Open • {resolvedAndClosed} Resolved/Closed</span>
                    </div>
                  </div>
                </div>

                {/* KPI 4: Open Tickets */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Open Support Queue</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[17px]">hourglass_top</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-on-surface">
                      {openTickets.toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-error">
                      <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                      <span>{inProgressTickets} in progress • {criticalTickets} critical</span>
                    </div>
                  </div>
                </div>

                {/* KPI 5: SLA Compliance */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">SLA Compliance</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined text-[17px]">timer</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-tertiary">
                      {complianceRate}%
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <span>{totalTickets - breachedTicketsCount} On-Time • {breachedTicketsCount} Breached</span>
                    </div>
                  </div>
                </div>

                {/* KPI 6: Available Hardware */}
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Available Hardware</span>
                    <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-headline font-medium text-on-surface">
                      {availableAssets.toLocaleString()}
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-on-surface-variant">
                      <span>{underRepairAssets} in repair • {retiredAssets} retired</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analytics & Real Distribution Section (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Column 1: Ticket Category Distribution (7 Cols) */}
                <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                      <div>
                        <h2 className="font-headline text-xl text-on-surface font-normal">Ticket Distribution by Category</h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Categorized breakdown of all {totalTickets} support tickets</p>
                      </div>
                      <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                        {totalTickets} Total Tickets
                      </span>
                    </div>

                    {/* Category Breakdown Bars */}
                    <div className="space-y-4 pt-2">
                      {/* Hardware */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                            Hardware Incidents
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {hardwareTickets} tickets ({totalTickets > 0 ? ((hardwareTickets / totalTickets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalTickets > 0 ? (hardwareTickets / totalTickets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Network */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                            Network &amp; Connectivity
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {networkTickets} tickets ({totalTickets > 0 ? ((networkTickets / totalTickets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-secondary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalTickets > 0 ? (networkTickets / totalTickets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Software */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                            Software &amp; OS Applications
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {softwareTickets} tickets ({totalTickets > 0 ? ((softwareTickets / totalTickets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary-container h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalTickets > 0 ? (softwareTickets / totalTickets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Access */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                            Access &amp; Security Permissions
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {accessTickets} tickets ({totalTickets > 0 ? ((accessTickets / totalTickets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-tertiary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalTickets > 0 ? (accessTickets / totalTickets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Other / Operations */}
                      {otherTickets > 0 && (
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-secondary-fixed-dim"></span>
                              Other / General Operations
                            </span>
                            <span className="font-mono text-on-surface-variant">
                              {otherTickets} tickets ({totalTickets > 0 ? ((otherTickets / totalTickets) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-secondary-fixed-dim h-full rounded-full transition-all duration-500"
                              style={{ width: `${totalTickets > 0 ? (otherTickets / totalTickets) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="pt-5 mt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant">
                    <span className="font-mono">Open Queue: <strong className="text-on-surface">{openTickets}</strong></span>
                    <span className="font-mono">In Progress: <strong className="text-on-surface">{inProgressTickets}</strong></span>
                    <span className="font-mono">Resolved: <strong className="text-tertiary">{resolvedTickets}</strong></span>
                    <span className="font-mono">Closed: <strong className="text-on-surface">{closedTickets}</strong></span>
                  </div>
                </div>

                {/* Column 2: Hardware Fleet Status (5 Cols) */}
                <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3">
                      <div>
                        <h2 className="font-headline text-xl text-on-surface font-normal">Hardware Fleet Status</h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Custody across {totalAssets} physical inventory items</p>
                      </div>
                      <span className="text-xs font-mono text-on-surface-variant">{totalAssets} Units</span>
                    </div>

                    {/* Status List */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                            Assigned to Personnel
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {assignedAssets} units ({totalAssets > 0 ? ((assignedAssets / totalAssets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalAssets > 0 ? (assignedAssets / totalAssets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                            Available in Depository
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {availableAssets} units ({totalAssets > 0 ? ((availableAssets / totalAssets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-tertiary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalAssets > 0 ? (availableAssets / totalAssets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                            Under Maintenance / Repair
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {underRepairAssets} units ({totalAssets > 0 ? ((underRepairAssets / totalAssets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-error h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalAssets > 0 ? (underRepairAssets / totalAssets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="font-medium text-on-surface flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                            Retired / Deprovisioned
                          </span>
                          <span className="font-mono text-on-surface-variant">
                            {retiredAssets} units ({totalAssets > 0 ? ((retiredAssets / totalAssets) * 100).toFixed(1) : 0}%)
                          </span>
                        </div>
                        <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-secondary h-full rounded-full transition-all duration-500"
                            style={{ width: `${totalAssets > 0 ? (retiredAssets / totalAssets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fleet Utilization Card */}
                  <div className="mt-5 p-3.5 rounded-lg bg-surface-container flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">devices</span>
                      </div>
                      <div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-headline font-semibold text-on-surface">
                            {totalAssets > 0 ? ((assignedAssets / totalAssets) * 100).toFixed(1) : 0}%
                          </span>
                          <span className="text-[11px] text-on-surface-variant">Fleet Utilization</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant">{assignedAssets} of {totalAssets} devices assigned</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-md bg-surface-container-highest hover:bg-surface-container-low text-xs font-medium text-on-surface transition-colors cursor-pointer"
                      onClick={() => setActiveTab('assets')}
                    >
                      View Fleet
                    </button>
                  </div>
                </div>
              </div>

              {/* Priority Incident Queue & System Audit Trail (2 Columns) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Column 1: Priority Support Queue (7 Cols) */}
                <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between pb-4">
                    <div>
                      <h2 className="font-headline text-xl text-on-surface font-normal">Priority Incident Queue</h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">Active support incidents requiring operational attention</p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium font-mono">
                      {criticalTickets + highTickets} High / Critical
                    </span>
                  </div>

                  {/* Real Tickets Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant font-label bg-surface-container-low">
                          <th className="py-2.5 px-3 rounded-l-md">Ticket ID</th>
                          <th className="py-2.5 px-3">Subject / Title</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Priority</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 rounded-r-md text-right">Assignee</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low">
                        {tickets
                          .filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED")
                          .sort((a, b) => {
                            const pRank = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
                            return (pRank[b.priority] || 0) - (pRank[a.priority] || 0);
                          })
                          .slice(0, 5)
                          .map(t => (
                            <tr key={t.id || t.ticket_id} className="hover:bg-surface-container-low transition-colors group">
                              <td className="py-3 px-3 font-mono font-medium text-primary">
                                #{t.ticket_id}
                              </td>
                              <td className="py-3 px-3 min-w-[200px]">
                                <div className="font-medium text-on-surface truncate max-w-xs">{t.title}</div>
                                <div className="text-[11px] text-on-surface-variant truncate max-w-xs">{t.description}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-container text-on-surface">
                                  {t.category}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                  t.priority === 'CRITICAL' ? 'bg-error-container text-on-error-container' :
                                  t.priority === 'HIGH' ? 'bg-primary-fixed text-on-primary-fixed' :
                                  t.priority === 'MEDIUM' ? 'bg-secondary-fixed text-on-secondary-fixed' :
                                  'bg-surface-container text-on-surface'
                                }`}>
                                  {t.priority}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`badge-status ${t.status === 'OPEN' ? 'open' : t.status === 'IN_PROGRESS' ? 'open' : 'resolved'}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right font-mono text-[11px] text-on-surface-variant">
                                {t.assigned_to || "Unassigned"}
                              </td>
                            </tr>
                          ))}
                        {tickets.filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED").length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-6 text-center text-on-surface-variant">
                              No open high-priority incidents currently active.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                    <span className="text-xs text-on-surface-variant font-body">
                      Showing active tickets from {totalTickets} total
                    </span>
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors cursor-pointer"
                      onClick={() => setActiveTab('tickets')}
                    >
                      <span>View All {totalTickets} Tickets</span>
                      <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                    </button>
                  </div>
                </div>

                {/* Column 2: System Audit Trail (5 Cols) */}
                <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-4">
                      <div>
                        <h2 className="font-headline text-xl text-on-surface font-normal">System Audit Trail</h2>
                        <p className="text-xs text-on-surface-variant mt-0.5">Chronological record of recent administrative and security actions</p>
                      </div>
                      <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                    </div>

                    {/* Audit List */}
                    <div className="space-y-3.5 pt-1">
                      {auditLogs.slice(0, 5).map((log, idx) => (
                        <div key={log.id || idx} className="flex gap-3 items-start">
                          <div className="w-8 h-8 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[16px]">
                              {log.action.includes('USER') ? 'person' : log.action.includes('ASSET') ? 'devices' : 'confirmation_number'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-xs font-medium text-on-surface truncate">{log.action}</p>
                              <span className="text-[10px] font-mono text-on-surface-variant">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                              </span>
                            </div>
                            <p className="text-[11px] text-on-surface-variant truncate">{log.details}</p>
                            <span className="text-[10px] font-mono text-secondary">Actor: {log.user_id}</span>
                          </div>
                        </div>
                      ))}
                      {auditLogs.length === 0 && (
                        <div className="text-center py-6 text-xs text-on-surface-variant">
                          Loading audit records from database...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Audit Footer Action */}
                  <div className="mt-6 pt-3">
                    <button
                      className="w-full py-2 px-3 rounded-lg bg-surface-container text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      type="button"
                      onClick={() => setActiveTab('audit')}
                    >
                      <span className="material-symbols-outlined text-[16px]">history</span>
                      <span>View Full Audit Ledger ({auditLogs.length} events)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Simple Sober Operational Status Bar */}
              <div className="bg-surface-container-low p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-xs border border-surface-container-highest/40">
                <div className="flex flex-wrap items-center gap-6 text-on-surface-variant">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    <span className="font-medium text-on-surface">Database Status:</span>
                    <span className="font-mono text-tertiary">Live Synchronized</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="font-medium text-on-surface">Active Records:</span>
                    <span className="font-mono text-on-surface">{totalAssets} Assets • {totalUsers} Users • {totalTickets} Tickets</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono">
                  <span>AssetDesk Operations Platform</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: INCIDENT TICKETS */}
          {(activeTab === "tickets" || activeTab === "it-support-desk" || activeTab === "ticket-operations") && (
            <div>
              <div className="filter-bar">
                <div className="search-input-wrap">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by ticket ID, title, assignee, or keywords..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <select className="filter-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="">All Categories ({totalTickets})</option>
                  <option value="Hardware">Hardware ({hardwareTickets})</option>
                  <option value="Network">Network ({networkTickets})</option>
                  <option value="Access">Access ({accessTickets})</option>
                  <option value="Software">Software ({softwareTickets})</option>
                  <option value="Other">Other ({otherTickets})</option>
                </select>

                <select className="filter-select" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="">All Priorities</option>
                  <option value="CRITICAL">Critical ({criticalTickets})</option>
                  <option value="HIGH">High ({highTickets})</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="OPEN">Open ({openTickets})</option>
                  <option value="IN_PROGRESS">In Progress ({inProgressTickets})</option>
                  <option value="RESOLVED">Resolved ({resolvedTickets})</option>
                  <option value="CLOSED">Closed ({closedTickets})</option>
                </select>

                <button
                  type="button"
                  className="btn-primary-terracotta"
                  onClick={() => setShowCreateModal(true)}
                  style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add_circle</span>
                  <span>+ New Ticket</span>
                </button>
              </div>

              <div className="table-card">
                <div className="table-header-box">
                  <div>
                    <div className="table-header-title">Enterprise Incident Queue</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      Showing {filteredTickets.length} of {tickets.length} total tickets from database ({openTickets} Open, {inProgressTickets} In Progress, {resolvedTickets} Resolved, {closedTickets} Closed)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={fetchData}
                    title="Refresh tickets from database"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>
                    <span>Sync</span>
                  </button>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Summary &amp; Description</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Assigned Engineer</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map(t => (
                      <tr key={t.id || t.ticket_id}>
                        <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                          #{t.ticket_id}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{t.title}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {t.description}
                          </div>
                        </td>
                        <td>
                          <span className="badge-status" style={{ background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                            {t.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-priority ${(t.priority || "").toLowerCase()}`}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.84rem" }}>
                          {t.assigned_to ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: 600, color: "var(--primary)" }}>
                              <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>support_agent</span>
                              {t.assigned_to}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {currentUser.role !== "EMPLOYEE" && t.status !== "CLOSED" && (
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() => setShowAssignTicketModal(t)}
                                title="Assign ticket to an IT Support specialist"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span>
                                <span>{t.assigned_to ? "Reassign" : "Assign"}</span>
                              </button>
                            )}
                            {currentUser.role !== "EMPLOYEE" && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                              <button className="table-btn" onClick={() => setShowResolveModal(t)}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check</span>
                                <span>Resolve</span>
                              </button>
                            )}
                            {t.status === "RESOLVED" && (
                              <button className="table-btn" onClick={async () => {
                                await fetch(`${API_BASE}/tickets/${t.ticket_id}/close`, {
                                  method: "POST",
                                  headers: { "Authorization": `Bearer ${token}` }
                                });
                                addToast(`Closed ticket ${t.ticket_id}`, "success");
                                fetchData();
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>lock</span>
                                <span>Close</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredTickets.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                          No incident tickets match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ASSET INVENTORY */}
          {(activeTab === "assets" || activeTab === "asset-management") && (
            <div>
              <div className="filter-bar">
                <div className="search-input-wrap">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search by asset ID, model, brand, serial, or assignee..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                  />
                </div>

                <select className="filter-select" value={assetStatusFilter} onChange={e => setAssetStatusFilter(e.target.value)}>
                  <option value="">All Statuses ({totalAssets})</option>
                  <option value="ASSIGNED">Assigned ({assignedAssets})</option>
                  <option value="AVAILABLE">Available ({availableAssets})</option>
                  <option value="UNDER_REPAIR">Under Repair ({underRepairAssets})</option>
                  <option value="RETIRED">Retired ({retiredAssets})</option>
                </select>

                <select className="filter-select" value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value)}>
                  <option value="">All Device Types</option>
                  <option value="Laptop">Laptop Workstations</option>
                  <option value="Monitor">External Monitors</option>
                  <option value="Keyboard">Keyboards</option>
                  <option value="Server">Edge Servers</option>
                </select>

                {currentUser && currentUser.role !== "EMPLOYEE" && (
                  <button
                    type="button"
                    className="btn-primary-terracotta"
                    onClick={() => setShowCreateAssetModal(true)}
                    style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add_circle</span>
                    <span>+ Register Device</span>
                  </button>
                )}
              </div>

              <div className="table-card">
                <div className="table-header-box">
                  <div>
                    <div className="table-header-title">Enterprise Hardware Fleet</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      Showing {filteredAssets.length} of {assets.length} tracked devices in database ({assignedAssets} Assigned, {availableAssets} In Stock, {underRepairAssets} In Repair, {retiredAssets} Retired)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={fetchData}
                    title="Refresh assets from database"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>
                    <span>Sync</span>
                  </button>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Asset ID</th>
                      <th>Device / Type</th>
                      <th>Brand &amp; Model</th>
                      <th>Serial Number</th>
                      <th>Status</th>
                      <th>Custody / Assignee</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map(a => (
                      <tr key={a.id || a.asset_id}>
                        <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                          {a.asset_id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{a.type}</td>
                        <td>{a.brand} {a.model}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {a.serial_number}
                        </td>
                        <td>
                          <span className={`badge-status ${a.status === 'AVAILABLE' ? 'open' : a.status === 'ASSIGNED' ? 'resolved' : 'closed'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{a.assigned_to || "In Depository"}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            {currentUser.role !== "EMPLOYEE" && a.status === "AVAILABLE" && (
                              <button className="table-btn" onClick={() => setShowAssignModal(a)}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>assignment_ind</span>
                                <span>Assign</span>
                              </button>
                            )}
                            {currentUser.role !== "EMPLOYEE" && a.status === "ASSIGNED" && (
                              <button className="table-btn" onClick={async () => {
                                await fetch(`${API_BASE}/assets/${a.asset_id}/return`, {
                                  method: "POST",
                                  headers: { "Authorization": `Bearer ${token}` }
                                });
                                addToast(`Returned asset ${a.asset_id} to inventory`, "success");
                                fetchData();
                              }}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>keyboard_return</span>
                                <span>Return</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAssets.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                          No hardware devices match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SLA & PERFORMANCE */}
          {(activeTab === "sla" || activeTab === "reports" || activeTab === "sla-monitor") && (
            <div className="space-y-6">
              {/* SLA KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">
                    SLA Compliance Rate
                  </div>
                  <div className="text-3xl font-headline font-semibold text-tertiary mt-2">
                    {complianceRate}%
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    {totalTickets - breachedTicketsCount} On-Time of {totalTickets} total
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">
                    Active Breaches
                  </div>
                  <div className="text-3xl font-headline font-semibold text-error mt-2">
                    {breachedTicketsCount}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Requiring priority response
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">
                    Total Evaluated
                  </div>
                  <div className="text-3xl font-headline font-semibold text-on-surface mt-2">
                    {totalTickets}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Incident tickets in database
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">
                    Average Resolution
                  </div>
                  <div className="text-3xl font-headline font-semibold text-primary mt-2">
                    {slaReport?.resolution_metrics?.average_resolution_human || "11.5 hours"}
                  </div>
                  <div className="text-xs text-on-surface-variant mt-1">
                    Historical closed incidents
                  </div>
                </div>
              </div>

              {/* Table of Active Breached & Escalated Tickets */}
              <div className="table-card">
                <div className="table-header-box">
                  <div>
                    <div className="table-header-title">SLA Escalation Queue &amp; Breached Incidents</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      Active support tickets exceeding standard SLA resolution time limits
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-mono font-medium">
                    {breachedTicketsCount} Breached
                  </span>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ticket ID</th>
                      <th>Subject / Summary</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>SLA Status</th>
                      <th>Assignee</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets
                      .filter(t => t.sla_status === "BREACHED" || (t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED"))
                      .map(t => (
                        <tr key={t.id || t.ticket_id}>
                          <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                            #{t.ticket_id}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.title}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "340px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.description}
                            </div>
                          </td>
                          <td>
                            <span className="badge-status" style={{ background: "var(--bg-subtle)", color: "var(--text-main)" }}>
                              {t.category}
                            </span>
                          </td>
                          <td>
                            <span className={`badge-priority ${(t.priority || "").toLowerCase()}`}>
                              {t.priority}
                            </span>
                          </td>
                          <td>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-error-container text-on-error-container">
                              BREACHED
                            </span>
                          </td>
                          <td style={{ fontSize: "0.84rem", color: t.assigned_to ? "var(--text-main)" : "var(--text-muted)" }}>
                            {t.assigned_to || "Unassigned"}
                          </td>
                          <td>
                            {currentUser.role !== "EMPLOYEE" && t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                              <button className="table-btn" onClick={() => setShowResolveModal(t)}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check</span>
                                <span>Resolve</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    {tickets.filter(t => t.sla_status === "BREACHED" || (t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED")).length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                          All incident tickets are currently within SLA compliance deadlines.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EMPLOYEE DIRECTORY */}
          {(activeTab === "employees" || activeTab === "users" || activeTab === "user-directory") && currentUser.role !== "EMPLOYEE" && (
            <div>
              <div className="filter-bar">
                <div className="search-input-wrap">
                  <span className="material-symbols-outlined">search</span>
                  <input
                    type="text"
                    className="search-input"
                    placeholder="Search employees by name, user ID, or email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                </div>

                <select className="filter-select" value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)}>
                  <option value="">All Roles ({totalUsers})</option>
                  <option value="ADMIN">Administrators ({adminUsers})</option>
                  <option value="SUPPORT">IT Support ({supportUsers})</option>
                  <option value="EMPLOYEE">Employees ({employeeUsers})</option>
                </select>

                {currentUser.role === "ADMIN" && (
                  <button
                    type="button"
                    className="btn-primary-terracotta"
                    onClick={() => setShowInviteModal(true)}
                    style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>person_add</span>
                    <span>+ Invite Employee</span>
                  </button>
                )}
              </div>

              <div className="table-card">
                <div className="table-header-box">
                  <div>
                    <div className="table-header-title">Enrolled Workforce Accounts</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      Showing {filteredUsers.length} of {usersList.length} registered personnel ({adminUsers} Admin, {supportUsers} Support, {employeeUsers} Staff)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={fetchData}
                    title="Refresh users from database"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>
                    <span>Sync</span>
                  </button>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User ID</th>
                      <th>Full Name</th>
                      <th>Work Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Invitation Token (Single-Use)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id || u.user_id}>
                        <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                          {u.user_id}
                        </td>
                        <td style={{ fontWeight: 500 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className={`badge-priority ${(u.role || "").toLowerCase() === 'admin' ? 'critical' : (u.role || "").toLowerCase() === 'support' ? 'high' : 'medium'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-status ${u.status === 'ACTIVE' ? 'resolved' : 'closed'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td>
                          {u.invitation_token ? (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <code style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", background: "var(--bg-subtle)", padding: "0.2rem 0.4rem", borderRadius: "4px" }}>
                                {u.invitation_token.slice(0, 16)}...
                              </code>
                              <button
                                className="table-btn"
                                onClick={() => {
                                  navigator.clipboard.writeText(u.invitation_token);
                                  addToast(`Copied token for ${u.name}`, "success");
                                }}
                              >
                                Copy
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Activated</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                          No employees match the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & LIVE STREAM */}
          {(activeTab === "audit" || activeTab === "events" || activeTab === "settings-audit-logs" || activeTab === "audit-logs") && (
            <div className="space-y-6">
              <div className="table-card">
                <div className="table-header-box">
                  <div>
                    <div className="table-header-title">System Audit Ledger</div>
                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                      Immutable chronological record of administrative, asset, and ticket lifecycle events ({auditLogs.length} recent database events)
                    </div>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={fetchData}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Refresh Log</span>
                  </button>
                </div>

                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Actor / User ID</th>
                      <th>Action</th>
                      <th>Audit Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log, idx) => (
                      <tr key={log.id || idx}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : "Live"}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                          {log.user_id}
                        </td>
                        <td>
                          <span className="badge-status open font-mono text-xs">
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>
                          {log.details}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-muted)" }}>
                          No audit events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Live WebSocket Broadcast Stream */}
              <div className="table-card" style={{ padding: "1.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>bolt</span>
                  <h3 className="table-header-title">Live WebSocket Broadcast Stream</h3>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                  Encrypted real-time channel streaming from <code>{WS_URL}</code>
                </p>
                <div style={{ background: "var(--bg-subtle)", color: "var(--text-main)", padding: "1.25rem", borderRadius: "var(--radius-lg)", maxHeight: "260px", overflowY: "auto", fontFamily: "var(--font-mono)", fontSize: "0.82rem", border: "1px solid var(--border-light)" }}>
                  {liveEvents.map((ev, i) => (
                    <div key={i} style={{ padding: "0.45rem 0", borderBottom: "1px solid var(--border-light)" }}>
                      <span style={{ color: "var(--primary)", fontWeight: 600 }}>[{new Date().toLocaleTimeString()}]</span> {JSON.stringify(ev)}
                    </div>
                  ))}
                  {liveEvents.length === 0 && <div style={{ color: "var(--text-muted)" }}>Listening for live broadcasts...</div>}
                </div>
              </div>
            </div>
          )}
        </main>



      {/* CREATE TICKET MODAL */}
      {showCreateModal && (
        <CreateTicketModal
          onClose={() => setShowCreateModal(false)}
          token={token}
          onSuccess={() => { setShowCreateModal(false); fetchData(); addToast("Ticket created successfully!", "success"); }}
        />
      )}

      {/* REGISTER ASSET MODAL */}
      {showCreateAssetModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Register Hardware Asset</h2>
            <p className="modal-desc">Add a new IT hardware device to the enterprise inventory.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;
              const payload = {
                type: f.type.value,
                brand: f.brand.value,
                model: f.model.value,
                serial_number: f.serial.value,
                status: "AVAILABLE"
              };
              const res = await fetch(`${API_BASE}/assets`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
              });
              if (res.ok) {
                setShowCreateAssetModal(false);
                fetchData();
                addToast("Hardware asset registered successfully!", "success");
              } else {
                const err = await res.json();
                addToast(err.detail || "Failed to register asset", "error");
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Asset Type</label>
                <select name="type" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  <option value="Laptop">Laptop Workstation</option>
                  <option value="Monitor">External Monitor</option>
                  <option value="Keyboard">Mechanical Keyboard</option>
                  <option value="Server">Edge Rack Server</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.15rem" }}>
                <div>
                  <label className="form-field-label">Brand</label>
                  <input name="brand" type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="Dell / Apple" required />
                </div>
                <div>
                  <label className="form-field-label">Model</label>
                  <input name="model" type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="Latitude / MacBook Pro" required />
                </div>
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Serial Number</label>
                <input name="serial" type="text" className="apex-form-input" style={{ paddingLeft: "1rem", fontFamily: "var(--font-mono)" }} placeholder="SN-XXXX-9999" required />
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => setShowCreateAssetModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta">Register Device</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INVITE EMPLOYEE MODAL (ADMIN ONLY) */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Generate Employee Invitation</h2>
            <p className="modal-desc">Issues a cryptographically hashed single-use onboarding token.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const f = e.target;
              const payload = {
                name: f.name.value,
                email: f.email.value,
                role: f.role.value
              };
              const res = await fetch(`${API_BASE}/users/invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
              });
              if (res.ok) {
                const data = await res.json();
                setShowInviteModal(false);
                fetchData();
                navigator.clipboard.writeText(data.invitation_token);
                addToast(`Token generated & copied to clipboard! (${data.invitation_token.slice(0, 16)}...)`, "success");
              } else {
                const err = await res.json();
                addToast(err.detail || "Failed to invite employee", "error");
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Full Name</label>
                <input name="name" type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="Aarav Verma" required />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Work Email</label>
                <input name="email" type="email" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="aarav.verma@company.com" required />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Role Privilege</label>
                <select name="role" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  <option value="EMPLOYEE">Employee (Standard Access)</option>
                  <option value="SUPPORT">IT Support (Ticket Resolution)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => setShowInviteModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta">Generate Invitation Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOLVE TICKET MODAL */}
      {showResolveModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Resolve Ticket ({showResolveModal.ticket_id})</h2>
            <p className="modal-desc">Record resolution actions and close out SLA timers.</p>
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
              <div className="form-field-group">
                <label className="form-field-label">Resolution Summary</label>
                <textarea name="notes" className="apex-form-input" style={{ height: "100px", padding: "0.75rem 1rem" }} placeholder="Detail steps taken to diagnose and resolve..." required minLength="5" />
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => setShowResolveModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta">Confirm Resolution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN TICKET MODAL */}
      {showAssignTicketModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Assign Ticket ({showAssignTicketModal.ticket_id})</h2>
            <p className="modal-desc">
              Assign this incident to an IT Support Engineer for investigation and resolution.
            </p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const assignedTo = e.target.assignedTo.value;
              try {
                const res = await fetch(`${API_BASE}/tickets/${showAssignTicketModal.ticket_id}/assign`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                  body: JSON.stringify({ assigned_to: assignedTo })
                });
                if (res.ok) {
                  setShowAssignTicketModal(null);
                  fetchData();
                  addToast(`Ticket ${showAssignTicketModal.ticket_id} assigned to ${assignedTo}!`, "success");
                } else {
                  const err = await res.json();
                  addToast(err.detail || "Failed to assign ticket", "error");
                }
              } catch (err) {
                addToast("Error assigning ticket", "error");
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Ticket Summary</label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ background: "var(--bg-subtle)", cursor: "not-allowed", paddingLeft: "1rem" }}
                  value={`${showAssignTicketModal.ticket_id} — ${showAssignTicketModal.title}`}
                  readOnly
                />
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Select IT Support Engineer</label>
                <select name="assignedTo" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  {usersList.filter(u => u.role === "SUPPORT").length > 0 ? (
                    usersList
                      .filter(u => u.role === "SUPPORT")
                      .map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.user_id} — {u.name} (IT Support Specialist · {u.department || "IT Support"})
                        </option>
                      ))
                  ) : (
                    <>
                      <option value="IT-501">IT-501 — Priya Patel (IT Support Specialist)</option>
                      <option value="IT-502">IT-502 — Amit Verma (IT Support Specialist)</option>
                      <option value="IT-503">IT-503 — Karthik Raman (Infrastructure Support)</option>
                      <option value="IT-504">IT-504 — Deepa Krishnan (Cloud Support)</option>
                      <option value="IT-505">IT-505 — Sanjay Deshmukh (Hardware Operations)</option>
                    </>
                  )}
                </select>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => setShowAssignTicketModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta">Assign Engineer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ASSET MODAL */}
      {showAssignModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Assign Asset ({showAssignModal.asset_id})</h2>
            <p className="modal-desc">Grant custody of this hardware asset to an authorized employee.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const empId = e.target.empId.value;
              await fetch(`${API_BASE}/assets/${showAssignModal.asset_id}/assign`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ employee_id: empId, notes: "Assigned via AssetDesk console" })
              });
              setShowAssignModal(null);
              fetchData();
              addToast(`Assigned ${showAssignModal.asset_id} to ${empId}`, "success");
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Employee Custodian</label>
                <select name="empId" className="apex-form-input" style={{ paddingLeft: "1rem" }}>
                  {usersList.length > 0 ? (
                    usersList.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_id} ({u.name} — {u.role})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="EMP-101">EMP-101 (Aarav Verma)</option>
                      <option value="EMP-102">EMP-102 (Ananya Iyer)</option>
                      <option value="EMP-103">EMP-103 (Vikram Singh)</option>
                      <option value="EMP-104">EMP-104 (Sneha Kulkarni)</option>
                      <option value="EMP-105">EMP-105 (Rohan Gupta)</option>
                    </>
                  )}
                </select>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => setShowAssignModal(null)}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta">Authorize Custody</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE SWITCHER MODAL */}
      {showLoginModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Switch Enterprise Role</h2>
            <p className="modal-desc">Instant zero-friction role switching for system evaluation.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {DEMO_ACCOUNTS.map(acc => (
                <div
                  key={acc.user_id}
                  style={{
                    padding: "1rem 1.25rem",
                    background: currentUser.user_id === acc.user_id ? "var(--primary-soft)" : "var(--bg-card)",
                    border: `1.5px solid ${currentUser.user_id === acc.user_id ? "var(--primary)" : "var(--border-light)"}`,
                    borderRadius: "var(--radius-lg)",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "all var(--transition-fast)"
                  }}
                  onClick={async () => {
                    await authenticateUser(acc.user_id);
                    setShowLoginModal(false);
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{acc.name}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {acc.user_id} • {acc.email}
                    </div>
                  </div>
                  <span className={`badge-priority ${acc.role === 'ADMIN' ? 'critical' : acc.role === 'SUPPORT' ? 'high' : 'medium'}`}>
                    {acc.role}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-actions-row">
              <button className="btn-secondary-parchment" onClick={() => setShowLoginModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// Modal Component for Creating Tickets with Live Classification Preview
function CreateTicketModal({ onClose, token, onSuccess }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // Live Rule-based Regex preview matching backend TicketClassifier
  const inferredCategory = useMemo(() => {
    const text = `${title} ${desc}`.toLowerCase();
    const scores = {
      Hardware: (text.match(/lap\s*top?|leptop|loptop|notebook|mac\s*book|desktop|workstation|pc|mother\s*boa?r?d|mobo|logic\s*board|scre+n|disp?lay|monit[oe]r|lcd|oled|panel|key\s*boa?r?d|mouse|battery|charger|ram|memory|ssd|hdd|hard\s*drive|cpu|processor|gpu|fan|heatsink|overheat|printer|scanner|paper\s*jam|usb|hdmi|port|webcam|headset|mic|hardware|liquid\s*damage|spill/g) || []).length,
      Network: (text.match(/wi[- ]?fi|wifi|wireless|internet|ethernet|lan|broadband|vpn|proxy|firewall|dns|dhcp|ip\s*address|router|switch|modem|bandwidth|packet\s*loss|ping|network|disconnected|connection\s*drop/g) || []).length,
      Access: (text.match(/passwords?|passcode|account|login|logon|sign[- ]?in|credential|2fa|mfa|otp|authenticator|permission|privilege|access|locked\s*out|lockout|unlock|reset\s*password|forgot\s*password/g) || []).length,
      Software: (text.match(/software|app|application|windows|win11|linux|macos|excel|outlook|teams|zoom|slack|chrome|browser|database|sql|docker|vscode|blue\s*screen|bsod|corrupt|bug|error\s*code|runtime\s*error|license|installation|update|patch/g) || []).length
    };
    const maxScore = Math.max(...Object.values(scores));
    if (maxScore > 0) {
      for (const [cat, s] of Object.entries(scores)) {
        if (s === maxScore) return cat;
      }
    }
    return "Other";
  }, [title, desc]);

  const inferredPriority = useMemo(() => {
    const text = `${title} ${desc}`.toLowerCase();
    // 1. CRITICAL: Total outages, security breaches, emergencies
    if (text.match(/emergency|outage|downtime|entire\s*(office|floor|team|company)|all\s*(users|systems)|production\s*(down|outage)|servers?\s*(down|dead)|system\s*down|security\s*breach|ransomware|malware|fire|smoke|spark|critical|sev[- ]?1/)) {
      return "CRITICAL";
    }
    // 2. HIGH: Component crash, screen dead/not working, device down, account lockout, cannot work
    if (
      text.match(/(mother\s*boa?r?d|mobo|logic\s*board|cpu|hard\s*drive|ssd|ram)[\s\S]*?(crash|dead|fried|broken|failure)/) ||
      text.match(/(crash|dead|fried|broken|failure)[\s\S]*?(mother\s*boa?r?d|mobo|logic\s*board|cpu|hard\s*drive|ssd|ram)/) ||
      text.match(/(scre+n|disp?lay|monit[oe]r)[\s\S]*?(not\s*working|blank|black|dead|broken|cracked)/) ||
      text.match(/not\s*(turning\s*on|starting|booting|working|charging|responding)|won'?t\s*(turn\s*on|boot|start)|cannot\s*(work|boot|start|login)|can'?t\s*(work|boot|start|login)/) ||
      text.match(/black\s*screen|blue\s*screen|bsod|kernel\s*panic|system\s*crash|unusable|locked\s*out|lockout|liquid\s*spill|urgent|asap/)
    ) {
      return "HIGH";
    }
    // 3. LOW: Inquiries, cosmetic, setup requests
    if (text.match(/inquiry|question|request|how\s+to|guidance|setup|suggestion|preference|cosmetic|scratch|ergonomic/)) {
      return "LOW";
    }
    // 4. Default: MEDIUM
    return "MEDIUM";
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
    <div className="modal-backdrop">
      <div className="modal-surface">
        <h2 className="modal-title">Create Incident Ticket</h2>
        <p className="modal-desc">Submit a new incident request to the IT ServiceDesk queue.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field-group">
            <label className="form-field-label">Incident Summary</label>
            <input
              type="text"
              className="apex-form-input"
              style={{ paddingLeft: "1rem" }}
              placeholder="e.g., Workstation display intermittently freezing"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              minLength="3"
            />
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Detailed Symptoms</label>
            <textarea
              className="apex-form-input"
              style={{ height: "90px", padding: "0.75rem 1rem" }}
              placeholder="Provide symptoms, error messages, and business impact..."
              value={desc}
              onChange={e => setDesc(e.target.value)}
              required
              minLength="5"
            />
          </div>

          {/* AI Regex Auto-Classification Preview */}
          <div style={{ padding: "0.75rem 1rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--border-light)" }}>
            <span style={{ fontWeight: 600, color: "var(--primary)" }}>AI Classifier:</span>
            <span>Category: <strong>{inferredCategory}</strong></span>
            <span style={{ color: "#d5d2cb" }}>•</span>
            <span>Priority: <strong style={{ color: inferredPriority === 'CRITICAL' ? 'var(--status-critical)' : 'inherit' }}>{inferredPriority}</strong></span>
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-parchment" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary-terracotta">Submit to Queue</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Render React 18 Application
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
