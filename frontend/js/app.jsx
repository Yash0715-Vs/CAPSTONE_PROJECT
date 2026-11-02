// =====================================================================
// Apex Sentinel — React 18 Single Page Application
// Theme: Warm Editorial Craft & Enterprise Security (Google Stitch)
// =====================================================================

const { useState, useEffect, useCallback, useMemo, useRef } = React;

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
// Centralized API Error Parser
// Safely unpacks FastAPI/Pydantic validation schemas, RFC 7807 problem details,
// status code semantics, and network failure exceptions.
// =====================================================================
function parseApiError(errData, status, defaultMsg = "An unexpected error occurred.") {
  if (status === 401) {
    return "Session expired or unauthorized credentials. Please sign in again.";
  }
  if (status === 403) {
    if (errData && typeof errData.detail === "string") return errData.detail;
    return "Access Denied: You lack permissions for this operation.";
  }
  if (status === 404) {
    if (errData && typeof errData.detail === "string") return errData.detail;
    return "The requested record or resource was not found.";
  }
  if (status === 500) {
    return "Internal server error. Please try again or contact IT Support.";
  }
  if (errData) {
    if (typeof errData === "string") return errData;
    // FastAPI 422 Unprocessable Entity list of dicts
    if (Array.isArray(errData.detail)) {
      return errData.detail
        .map(d => {
          const loc = d.loc ? d.loc.filter(k => k !== "body").join(".") : "";
          return loc ? `${loc}: ${d.msg}` : d.msg;
        })
        .join("; ");
    }
    if (typeof errData.detail === "string") return errData.detail;
    if (errData.message && typeof errData.message === "string") return errData.message;
  }
  return defaultMsg;
}

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

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiError(data, res.status, "Invalid enterprise credentials or account inactive."));
      }

      onLoginSuccess(data.user, data.access_token);
    } catch (err) {
      setError(err.message || "Failed to connect to authentication server.");
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

      const regData = await regRes.json().catch(() => null);
      if (!regRes.ok) {
        throw new Error(parseApiError(regData, regRes.status, "Account activation failed."));
      }

      // 2. Registration succeeded, login with active credentials
      const userIdentifier = regData?.user_id || (regData?.user ? regData.user.user_id : email);
      const loginRes = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userIdentifier, password })
      });

      const loginData = await loginRes.json().catch(() => null);
      if (!loginRes.ok) {
        throw new Error(parseApiError(loginData, loginRes.status, "Registration complete! Please proceed to Sign In."));
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
  const myOpenTickets = tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "ASSIGNED").length;
  const myResolvedTickets = tickets.filter(t => t.status === "RESOLVED").length;
  const myClosedTickets = tickets.filter(t => t.status === "CLOSED").length;
  const myHighTickets = tickets.filter(t => (t.priority === "CRITICAL" || t.priority === "HIGH") && t.status !== "CLOSED").length;
  const myTotalTickets = tickets.length;
  const myAssignedTickets = tickets.filter(t => t.assigned_to === currentUser?.user_id && t.status !== "CLOSED").length;

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
  const assignedTickets = tickets.filter(t => t.status === "ASSIGNED").length;
  const inProgressOnlyTickets = tickets.filter(t => t.status === "IN_PROGRESS").length;
  const activeQueueTickets = openTickets + inProgressTickets;
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
  const activeOverdueCount = slaReport?.active_overdue_count ?? tickets.filter(t => (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "ASSIGNED") && t.sla_status === "BREACHED").length;
  const historicalBreachCount = slaReport?.historical_breached_count ?? tickets.filter(t => (t.status === "RESOLVED" || t.status === "CLOSED") && t.sla_status === "BREACHED").length;
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

  // WebSocket State & References
  const [wsConnected, setWsConnected] = useState(false);
  const [wsAuthenticated, setWsAuthenticated] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const pingTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Data Loading & API Error State
  const [fetchError, setFetchError] = useState(null);

  // Modals & Action Error / Submitting States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(null);
  const [resolveModalError, setResolveModalError] = useState("");
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(null);
  const [assignAssetError, setAssignAssetError] = useState("");
  const [isSubmittingAssignAsset, setIsSubmittingAssignAsset] = useState(false);

  const [showAssignTicketModal, setShowAssignTicketModal] = useState(null);
  const [assignTicketError, setAssignTicketError] = useState("");
  const [isSubmittingAssignTicket, setIsSubmittingAssignTicket] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);

  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Toast notification helper with sanitization (prevents object-as-child React errors)
  const addToast = useCallback((msg, type = "info") => {
    let cleanMsg = msg;
    if (typeof msg === "object" && msg !== null) {
      if (Array.isArray(msg)) {
        cleanMsg = msg.map(m => (typeof m === "object" ? (m.msg || JSON.stringify(m)) : String(m))).join("; ");
      } else if (msg.detail) {
        if (Array.isArray(msg.detail)) {
          cleanMsg = msg.detail.map(d => (d.msg ? `${d.loc ? d.loc.filter(k => k !== "body").join(".") : ""}: ${d.msg}` : JSON.stringify(d))).join("; ");
        } else if (typeof msg.detail === "string") {
          cleanMsg = msg.detail;
        } else {
          cleanMsg = JSON.stringify(msg.detail);
        }
      } else if (msg.message && typeof msg.message === "string") {
        cleanMsg = msg.message;
      } else {
        cleanMsg = JSON.stringify(msg);
      }
    }
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, msg: String(cleanMsg || "Notification"), type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  }, []);

  // Central Logout & Session Invalidation
  const handleLogout = useCallback((reason) => {
    if (token) {
      try {
        fetch(`${API_BASE}/auth/logout`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});
      } catch (e) {}
    }
    localStorage.removeItem("it_token");
    localStorage.removeItem("it_user");
    setToken("");
    setCurrentUser(null);
    setTickets([]);
    setAssets([]);
    setUsersList([]);
    setAuditLogs([]);
    setSlaReport(null);
    setLiveEvents([]);
    setWsConnected(false);
    setWsAuthenticated(false);
    setActiveTab("dashboard");
    if (wsRef.current) {
      try { wsRef.current.close(1000, "User logged out"); } catch (e) {}
      wsRef.current = null;
    }
    if (pingTimerRef.current) clearInterval(pingTimerRef.current);
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (reason) {
      addToast(reason, "info");
    } else {
      addToast("Signed out successfully.", "info");
    }
  }, [token, addToast]);

  // Quick switch role inside dashboard
  const authenticateUser = async (userId) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, password: "password" })
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setToken(data.access_token);
        setCurrentUser(data.user);
        localStorage.setItem("it_token", data.access_token);
        localStorage.setItem("it_user", JSON.stringify(data.user));
        setActiveTab("dashboard");
        addToast(`Switched account to ${data.user.name} (${data.user.role})`, "success");
        return data.access_token;
      } else {
        const msg = parseApiError(data, res.status, "Authentication failed.");
        addToast(msg, "error");
      }
    } catch (e) {
      addToast("Network error during role switch.", "error");
    }
    return token;
  };

  // Verify saved token on load & sync fresh profile
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(async res => {
        if (res.status === 401 || res.status === 403) {
          handleLogout("Session expired. Please sign in again.");
        } else if (res.ok) {
          const freshUser = await res.json().catch(() => null);
          if (freshUser) {
            setCurrentUser(freshUser);
            try { localStorage.setItem("it_user", JSON.stringify(freshUser)); } catch (e) {}
          }
        }
      })
      .catch(err => {
        console.warn("Could not verify session with server:", err);
      });
  }, [token, handleLogout]);

  // Prevent unauthorized active tabs when switching roles
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === "EMPLOYEE" && (activeTab === "employees" || activeTab === "users" || activeTab === "user-directory" || activeTab === "audit" || activeTab === "sla")) {
        setActiveTab("dashboard");
      } else if (currentUser.role === "SUPPORT" && (activeTab === "employees" || activeTab === "users" || activeTab === "user-directory" || activeTab === "audit")) {
        setActiveTab("dashboard");
      }
    }
  }, [currentUser, activeTab]);

  // Fetch All Data in Parallel with Status Code Verification & Error Handling
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setFetchError(null);
    const headers = { "Authorization": `Bearer ${token}` };

    try {
      const pTickets = fetch(`${API_BASE}/tickets`, { headers })
        .then(async r => {
          if (r.status === 401) {
            handleLogout("Session expired. Please sign in again.");
            return [];
          }
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(parseApiError(err, r.status, "Failed to load incident tickets."));
          }
          return r.json();
        })
        .then(data => setTickets(Array.isArray(data) ? data : []));

      const pAssets = fetch(`${API_BASE}/assets`, { headers })
        .then(async r => {
          if (r.status === 401) {
            handleLogout("Session expired. Please sign in again.");
            return [];
          }
          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            throw new Error(parseApiError(err, r.status, "Failed to load hardware inventory."));
          }
          return r.json();
        })
        .then(data => setAssets(Array.isArray(data) ? data : []));

      // Audit logs are strictly restricted to ADMIN
      let pAudit = Promise.resolve([]);
      if (currentUser && currentUser.role === "ADMIN") {
        pAudit = fetch(`${API_BASE}/reports/audit`, { headers })
          .then(async r => {
            if (r.status === 401) {
              handleLogout("Session expired. Please sign in again.");
              return [];
            }
            if (r.status === 403) return [];
            if (!r.ok) return [];
            return r.json();
          })
          .then(data => setAuditLogs(Array.isArray(data) ? data : []));
      } else {
        setAuditLogs([]);
      }

      // SLA report is restricted to staff (ADMIN & SUPPORT)
      let pSla = Promise.resolve(null);
      if (currentUser && currentUser.role !== "EMPLOYEE") {
        pSla = fetch(`${API_BASE}/reports/sla`, { headers })
          .then(async r => {
            if (r.status === 401) {
              handleLogout("Session expired. Please sign in again.");
              return null;
            }
            if (r.status === 403) return null;
            if (!r.ok) return null;
            return r.json();
          })
          .then(data => setSlaReport(data));
      } else {
        setSlaReport(null);
      }

      const staffPromises = [];
      if (currentUser && currentUser.role !== "EMPLOYEE") {
        staffPromises.push(
          fetch(`${API_BASE}/users`, { headers })
            .then(async r => {
              if (r.status === 401) {
                handleLogout("Session expired. Please sign in again.");
                return [];
              }
              if (!r.ok) return [];
              return r.json();
            })
            .then(data => setUsersList(Array.isArray(data) ? data : [])),

          fetch(`${API_BASE}/reports/tickets`, { headers })
            .then(r => r.ok ? r.json() : null)
            .then(data => setTicketMetrics(data))
        );
      } else {
        setUsersList([]);
        setTicketMetrics(null);
      }

      await Promise.all([pTickets, pAssets, pAudit, pSla, ...staffPromises]);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setFetchError(err.message || "Failed to synchronize operations data with server.");
    } finally {
      setLoading(false);
    }
  }, [token, currentUser, handleLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket Real-Time Connection with JWT Auth & Heartbeat Protocol (Section 38)
  useEffect(() => {
    if (!token || !currentUser) {
      if (wsRef.current) {
        try { wsRef.current.close(1000, "User logged out"); } catch (e) {}
        wsRef.current = null;
      }
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      setWsConnected(false);
      setWsAuthenticated(false);
      return;
    }

    let isDestroyed = false;
    let reconnectDelay = 2000;

    const connect = () => {
      if (isDestroyed || !token) return;

      // Prevent duplicate open/connecting sockets
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      // Connect with query token per Section 38 / app/main.py specification
      const socketUrl = WS_URL; // Secure in-band auth avoids token in URL access logs
      let ws;
      try {
        ws = new WebSocket(socketUrl);
        wsRef.current = ws;
      } catch (err) {
        setWsConnected(false);
        setWsAuthenticated(false);
        return;
      }

      ws.onopen = () => {
        if (isDestroyed) { ws.close(); return; }
        setWsConnected(true);
        reconnectDelay = 2000;
        if (token) { ws.send(JSON.stringify({ action: "auth", token })); }

        // Start heartbeat ping every 25 seconds
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = setInterval(() => {
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send("PING");
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "PONG") return;

          if (data.event === "CONNECTED") {
            if (data.authenticated) {
              setWsAuthenticated(true);
            } else {
              // In-band fallback AUTH frame
              ws.send(JSON.stringify({ action: "auth", token }));
            }
          } else if (data.event === "AUTH_SUCCESS") {
            setWsAuthenticated(true);
            addToast("Real-Time Event Stream Authenticated", "success");
          } else if (data.event === "AUTH_FAILED") {
            setWsAuthenticated(false);
            addToast(`WebSocket auth failed: ${data.message}`, "error");
          } else {
            // Live ticket event broadcast
            setLiveEvents(prev => [data, ...prev.slice(0, 24)]);
            const ticket = data.ticket;
            const evLabel = (data.event || "").replace("TICKET_", "");
            addToast(`⚡ Incident ${ticket?.ticket_id || ""}: ${evLabel} (${ticket?.title || data.message || ""})`, "info");
            fetchData();
          }
        } catch (e) {
          // ignore malformed message
        }
      };

      ws.onclose = (event) => {
        setWsConnected(false);
        setWsAuthenticated(false);
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);

        // Reconnect with backoff if not closed voluntarily
        if (!isDestroyed && token && event.code !== 1000) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, 20000);
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
        setWsAuthenticated(false);
      };
    };

    connect();

    return () => {
      isDestroyed = true;
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try { wsRef.current.close(1000, "Component unmounted"); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, [token, currentUser, fetchData, addToast]);

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
                  <span>{currentUser.role === 'EMPLOYEE' ? 'My Workspace' : 'Dashboard'}</span>
                </div>
              </button>

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'tickets' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('tickets')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">confirmation_number</span>
                  <span>{currentUser.role === 'EMPLOYEE' ? 'My Tickets' : 'Tickets'}</span>
                </div>
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface font-mono">
                  {currentUser.role === 'EMPLOYEE' ? myOpenTickets : openTickets}
                </span>
              </button>

              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'assets' ? 'bg-surface-container-highest text-on-surface font-medium shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('assets')}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[19px]">devices</span>
                  <span>{currentUser.role === 'EMPLOYEE' ? 'My Equipment' : 'Assets'}</span>
                </div>
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface-variant font-mono">
                  {currentUser.role === 'EMPLOYEE' ? assets.length : totalAssets}
                </span>
              </button>

              {currentUser && currentUser.role === 'ADMIN' && (
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

              {currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPPORT') && (
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
              )}

              {currentUser && currentUser.role === 'ADMIN' && (
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
              )}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 space-y-3">
          <div className="px-3 py-2.5 rounded-lg bg-surface-container flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${wsConnected && wsAuthenticated ? 'bg-tertiary' : wsConnected ? 'bg-amber-500' : 'bg-error'}`}></span>
              <span className="text-xs font-medium text-on-surface">Real-Time Stream</span>
            </div>
            <span className={`text-[11px] font-medium font-mono ${wsConnected && wsAuthenticated ? 'text-tertiary' : wsConnected ? 'text-amber-500' : 'text-on-surface-variant'}`}>
              {wsConnected && wsAuthenticated ? 'Live' : wsConnected ? 'Auth Pending' : 'Offline'}
            </span>
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
                onClick={() => handleLogout()}
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
                  {activeTab === 'dashboard' ? (currentUser.role === 'EMPLOYEE' ? 'My Employee Workspace' : currentUser.role === 'SUPPORT' ? 'ServiceDesk Operations Hub' : 'Operations Overview') :
                   activeTab === 'tickets' ? (currentUser.role === 'EMPLOYEE' ? 'My Support Incident Tickets' : 'Support Incident Tickets') :
                   activeTab === 'assets' ? (currentUser.role === 'EMPLOYEE' ? 'My Assigned Equipment' : 'Hardware Asset Fleet') :
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
              title={`Logged in as ${userName} (${userRole}) - Click to switch role`}
              onClick={() => setShowLoginModal(true)}
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
              {/* Context Bar & Title Area */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-mono text-[11px] font-medium tracking-wide">
                      <span className={`w-1.5 h-1.5 rounded-full ${wsConnected && wsAuthenticated ? "bg-tertiary animate-pulse" : "bg-amber-500"}`}></span>
                      {wsConnected && wsAuthenticated ? "Live Stream Authenticated" : "Live Database Connected"}
                    </span>
                    <span className="text-xs text-on-surface-variant font-mono">
                      {currentUser.role === 'ADMIN' ? 'Administrator Gateway' : currentUser.role === 'SUPPORT' ? 'IT ServiceDesk Console' : 'Personal Employee Portal'}
                    </span>
                  </div>
                  <h1 className="font-headline text-3xl lg:text-4xl text-on-surface tracking-tight font-normal">
                    {currentUser.role === 'EMPLOYEE' ? `Welcome, ${userName}` : currentUser.role === 'SUPPORT' ? 'ServiceDesk Operations Hub' : 'Operations & Infrastructure Overview'}
                  </h1>
                  <p className="text-sm text-on-surface-variant max-w-2xl font-body leading-relaxed">
                    {currentUser.role === 'EMPLOYEE'
                      ? 'Track your active incident requests, review custody of assigned company equipment, and submit support tickets.'
                      : currentUser.role === 'SUPPORT'
                      ? 'Operational incident queue triage, SLA breach management, and hardware fleet depository status.'
                      : 'Centralized visibility across hardware fleet custody, workforce support queues, and real-time SLA metrics.'}
                  </p>
                </div>

                {/* Action Controls */}
                <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-end">
                  {currentUser.role !== 'EMPLOYEE' && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors shadow-sm cursor-pointer"
                      onClick={handleExportReport}
                    >
                      <span className="material-symbols-outlined text-[17px] text-secondary">file_download</span>
                      <span>Export Operations Report</span>
                    </button>
                  )}

                  {currentUser.role === 'ADMIN' && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-colors shadow-sm cursor-pointer"
                      onClick={() => setShowCreateAssetModal(true)}
                    >
                      <span className="material-symbols-outlined text-[17px] text-primary">add_box</span>
                      <span>Register Asset</span>
                    </button>
                  )}

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

              {/* -------------------- ROLE 1: EMPLOYEE DASHBOARD -------------------- */}
              {currentUser.role === 'EMPLOYEE' && (
                <div className="space-y-8">
                  {/* 4 Personal KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: My Open Tickets */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">My Open Tickets</span>
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[19px]">inbox</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-headline font-medium text-on-surface">{myOpenTickets}</div>
                        <span className="text-xs text-on-surface-variant mt-1 block">
                          {myHighTickets > 0 ? `${myHighTickets} high priority request(s)` : 'All normal priority'}
                        </span>
                      </div>
                    </div>

                    {/* Card 2: My Resolved Tickets */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">My Resolved Tickets</span>
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[19px]">check_circle</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-headline font-medium text-on-surface">{myResolvedTickets}</div>
                        <span className="text-xs text-on-surface-variant mt-1 block">
                          {myClosedTickets} confirmed closed
                        </span>
                      </div>
                    </div>

                    {/* Card 3: My Assigned Equipment */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Assigned Equipment</span>
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[19px]">devices</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-headline font-medium text-on-surface">{assets.length}</div>
                        <span className="text-xs text-on-surface-variant mt-1 block truncate">
                          {assets.length > 0 ? assets.map(a => a.type).slice(0, 2).join(", ") : 'No hardware assigned'}
                        </span>
                      </div>
                    </div>

                    {/* Card 4: Total Requests Submitted */}
                    <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Personal Ticket History</span>
                        <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[19px]">history</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="text-3xl font-headline font-medium text-on-surface">{myTotalTickets}</div>
                        <span className="text-xs text-on-surface-variant mt-1 block">Lifetime incident count</span>
                      </div>
                    </div>
                  </div>

                  {/* Employee Content Split: My Incidents (7 Cols) & My Equipment (5 Cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: My Active Tickets */}
                    <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">My Support Incident Requests</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Tickets submitted by you for IT assistance</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-medium font-mono">
                          {myOpenTickets} Open / In Progress
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant font-label bg-surface-container-low">
                              <th className="py-2.5 px-3 rounded-l-md">Ticket ID</th>
                              <th className="py-2.5 px-3">Subject / Title</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 rounded-r-md text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-low">
                            {tickets.slice(0, 6).map(t => (
                              <tr key={t.id || t.ticket_id} className="hover:bg-surface-container-low transition-colors">
                                <td className="py-3 px-3 font-mono font-medium text-primary">#{t.ticket_id}</td>
                                <td className="py-3 px-3 min-w-[180px]">
                                  <div className="font-medium text-on-surface truncate max-w-xs">{t.title}</div>
                                  <div className="text-[11px] text-on-surface-variant truncate max-w-xs">{t.description}</div>
                                </td>
                                <td className="py-3 px-3">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-container text-on-surface">{t.category}</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>{t.status}</span>
                                </td>
                                <td className="py-3 px-3 text-right">
                                  {t.status === "RESOLVED" && (
                                    <button
                                      type="button"
                                      className="table-btn"
                                      style={{ borderColor: "var(--primary)", color: "var(--primary)" }}
                                      onClick={async () => {
                                        try {
                                          const res = await fetch(`${API_BASE}/tickets/${t.ticket_id}/close`, {
                                            method: "POST",
                                            headers: { "Authorization": `Bearer ${token}` }
                                          });
                                          if (res.ok) {
                                            addToast(`Confirmed and closed ticket ${t.ticket_id}`, "success");
                                            fetchData();
                                          } else {
                                            const err = await res.json().catch(() => null);
                                            addToast(parseApiError(err, res.status, "Failed to close ticket"), "error");
                                          }
                                        } catch (e) {
                                          addToast("Network error closing ticket.", "error");
                                        }
                                      }}
                                    >
                                      Confirm &amp; Close
                                    </button>
                                  )}
                                  {t.status !== "RESOLVED" && (
                                    <span className="text-[11px] text-on-surface-variant font-mono">{t.assigned_to ? `Assigned (${t.assigned_to})` : 'Queued'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                            {tickets.length === 0 && (
                              <tr>
                                <td colSpan="5" className="py-8 text-center text-on-surface-variant">
                                  You have not submitted any incident tickets yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                        <span className="text-xs text-on-surface-variant font-body">Showing {Math.min(6, tickets.length)} of {tickets.length} personal tickets</span>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('tickets')}
                        >
                          <span>View All My Tickets</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: My Assigned Hardware Equipment */}
                    <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">My Assigned Equipment</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Company devices currently in your custody</p>
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{assets.length} Devices</span>
                      </div>

                      <div className="space-y-3">
                        {assets.map(a => (
                          <div key={a.id || a.asset_id} className="p-3.5 rounded-lg border border-surface-container bg-surface-container-low/40 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-[20px]">
                                  {a.type === 'Laptop' ? 'laptop_mac' : a.type === 'Monitor' ? 'desktop_windows' : a.type === 'Keyboard' ? 'keyboard' : 'devices'}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-xs text-on-surface">{a.brand} {a.model}</div>
                                <div className="text-[11px] font-mono text-on-surface-variant mt-0.5">SN: {a.serial_number}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono text-xs font-semibold text-primary block">#{a.asset_id}</span>
                              <span className="badge-status open text-[10px] uppercase font-mono mt-0.5 inline-block">Assigned</span>
                            </div>
                          </div>
                        ))}
                        {assets.length === 0 && (
                          <div className="py-8 text-center text-on-surface-variant text-xs">
                            No hardware assets are currently assigned to your account.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                        <span className="text-xs text-on-surface-variant font-body">Equipment custody record</span>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('assets')}
                        >
                          <span>View Equipment Fleet</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- ROLE 2: SUPPORT DASHBOARD -------------------- */}
              {currentUser.role === 'SUPPORT' && (
                <div className="space-y-8">
                  {/* 6 Operational KPI Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                    {/* KPI 1: Active Queue */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Queue Active</span>
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[17px]">assignment</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{openTickets + inProgressTickets}</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">{openTickets} open, {inProgressTickets} active</span>
                      </div>
                    </div>

                    {/* KPI 2: My Assigned */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">My Assigned</span>
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[17px]">person</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{myAssignedTickets}</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">Assigned directly to you</span>
                      </div>
                    </div>

                    {/* KPI 3: High / Critical Escalations */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">High / Critical</span>
                        <div className="w-7 h-7 rounded-lg bg-error-container/60 flex items-center justify-center text-on-error-container">
                          <span className="material-symbols-outlined text-[17px]">warning</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{criticalTickets + highTickets}</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">{criticalTickets} critical, {highTickets} high</span>
                      </div>
                    </div>

                    {/* KPI 4: Resolved Incidents */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Resolved Incidents</span>
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[17px]">check_circle</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{resolvedTickets}</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">{closedTickets} confirmed closed</span>
                      </div>
                    </div>

                    {/* KPI 5: SLA Compliance */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">SLA Compliance</span>
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-tertiary">
                          <span className="material-symbols-outlined text-[17px]">timelapse</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{complianceRate}%</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">{activeOverdueCount} overdue in queue ({breachedTicketsCount} total)</span>
                      </div>
                    </div>

                    {/* KPI 6: Available in Depository */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-on-surface-variant font-label">In Depository</span>
                        <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[17px]">inventory_2</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="text-2xl font-headline font-medium text-on-surface">{availableAssets}</div>
                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">out of {totalAssets} total fleet</span>
                      </div>
                    </div>
                  </div>

                  {/* Priority Triage Queue (7 Cols) & Hardware Depository Status (5 Cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Operational Queue */}
                    <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">Active Operational Triage Queue</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Incidents requiring assignment or diagnosis</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium font-mono">
                          {criticalTickets + highTickets} High / Critical
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant font-label bg-surface-container-low">
                              <th className="py-2.5 px-3 rounded-l-md">Ticket ID</th>
                              <th className="py-2.5 px-3">Subject / Title</th>
                              <th className="py-2.5 px-3">Priority</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 rounded-r-md text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-low">
                            {tickets
                              .filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED")
                              .slice(0, 6)
                              .map(t => (
                                <tr key={t.id || t.ticket_id} className="hover:bg-surface-container-low transition-colors">
                                  <td className="py-3 px-3 font-mono font-medium text-primary">#{t.ticket_id}</td>
                                  <td className="py-3 px-3 min-w-[180px]">
                                    <div className="font-medium text-on-surface truncate max-w-xs">{t.title}</div>
                                    <div className="text-[11px] text-on-surface-variant truncate max-w-xs">By {t.created_by} · {t.description}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${t.priority === 'CRITICAL' ? 'bg-error-container text-on-error-container' : t.priority === 'HIGH' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface'}`}>
                                      {t.priority}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>{t.status}</span>
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <div className="flex justify-end gap-1.5">
                                      <button type="button" className="table-btn" onClick={() => setShowAssignTicketModal(t)}>Assign</button>
                                      <button type="button" className="table-btn" onClick={() => setShowResolveModal(t)}>Resolve</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                        <span className="text-xs text-on-surface-variant font-body">Operational ticket triage</span>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('tickets')}
                        >
                          <span>Open Full Queue ({totalTickets})</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>

                    {/* Right: Depository Fleet Status */}
                    <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-3">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">Hardware Fleet Status</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Depository &amp; deployment breakdown</p>
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{totalAssets} Units</span>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                              Assigned to Personnel
                            </span>
                            <span className="font-mono text-on-surface-variant">{assignedAssets} ({totalAssets > 0 ? ((assignedAssets/totalAssets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${totalAssets > 0 ? (assignedAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                              Available in Depository
                            </span>
                            <span className="font-mono text-on-surface-variant">{availableAssets} ({totalAssets > 0 ? ((availableAssets/totalAssets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-tertiary h-full rounded-full" style={{ width: `${totalAssets > 0 ? (availableAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                              Maintenance &amp; Diagnostics
                            </span>
                            <span className="font-mono text-on-surface-variant">{underRepairAssets}</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalAssets > 0 ? (underRepairAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                        <span className="text-xs text-on-surface-variant font-body">Hardware inventory management</span>
                        <button
                          type="button"
                          className="text-xs font-medium text-primary hover:text-primary-container flex items-center gap-1 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('assets')}
                        >
                          <span>Manage Fleet Inventory</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- ROLE 3: ADMIN DASHBOARD -------------------- */}
              {currentUser.role === 'ADMIN' && (
                <div className="space-y-8">
                  {/* 8 Executive KPI Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
                    {/* KPI 1: IT Assets */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Total Assets</span>
                        <span className="material-symbols-outlined text-[16px] text-primary">devices</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{totalAssets}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{assignedAssets} assigned</span>
                      </div>
                    </div>

                    {/* KPI 2: Total Employees */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Total Users</span>
                        <span className="material-symbols-outlined text-[16px] text-primary">badge</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{totalUsers}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{adminUsers} admins, {supportUsers} staff</span>
                      </div>
                    </div>

                    {/* KPI 3: Total Tickets */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Total Tickets</span>
                        <span className="material-symbols-outlined text-[16px] text-secondary">confirmation_number</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{totalTickets}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">All lifecycles</span>
                      </div>
                    </div>

                    {/* KPI 4: Open Tickets */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Open Tickets</span>
                        <span className="material-symbols-outlined text-[16px] text-primary">inbox</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{openTickets}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{inProgressTickets} active ({inProgressOnlyTickets} in-prog, {assignedTickets} assigned)</span>
                      </div>
                    </div>

                    {/* KPI 5: Resolved Tickets */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Resolved</span>
                        <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{resolvedTickets}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{closedTickets} confirmed closed</span>
                      </div>
                    </div>

                    {/* KPI 6: High-Priority */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">High Priority</span>
                        <span className="material-symbols-outlined text-[16px] text-on-error-container">warning</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{criticalTickets + highTickets}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{criticalTickets} critical, {highTickets} high</span>
                      </div>
                    </div>

                    {/* KPI 7: SLA Compliance */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">SLA Compliance</span>
                        <span className="material-symbols-outlined text-[16px] text-tertiary">timelapse</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-on-surface">{complianceRate}%</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">Target &gt;= 95%</span>
                      </div>
                    </div>

                    {/* KPI 8: Active SLA Breaches */}
                    <div className="bg-surface-container-lowest p-3.5 rounded-xl shadow-sm flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">SLA Breaches</span>
                        <span className="material-symbols-outlined text-[16px] text-error">notification_important</span>
                      </div>
                      <div className="mt-2.5">
                        <div className="text-2xl font-headline font-medium text-error">{breachedTicketsCount}</div>
                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{activeOverdueCount} active overdue · {historicalBreachCount} past</span>
                      </div>
                    </div>
                  </div>

                  {/* Incident Distribution (7 Cols) & Hardware Fleet Status (5 Cols) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Incident Breakdown */}
                    <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-3">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">Incident Category Distribution</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Categorization across {totalTickets} recorded incidents</p>
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{totalTickets} Incidents</span>
                      </div>

                      <div className="space-y-3.5 pt-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-on-surface">Hardware Incidents</span>
                            <span className="font-mono text-on-surface-variant">{hardwareTickets} ({totalTickets > 0 ? ((hardwareTickets/totalTickets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${totalTickets > 0 ? (hardwareTickets/totalTickets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-on-surface">Network &amp; Connectivity</span>
                            <span className="font-mono text-on-surface-variant">{networkTickets} ({totalTickets > 0 ? ((networkTickets/totalTickets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-secondary h-full rounded-full" style={{ width: `${totalTickets > 0 ? (networkTickets/totalTickets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-on-surface">Software &amp; OS Applications</span>
                            <span className="font-mono text-on-surface-variant">{softwareTickets} ({totalTickets > 0 ? ((softwareTickets/totalTickets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-primary-container h-full rounded-full" style={{ width: `${totalTickets > 0 ? (softwareTickets/totalTickets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-medium text-on-surface">Access &amp; Permissions</span>
                            <span className="font-mono text-on-surface-variant">{accessTickets} ({totalTickets > 0 ? ((accessTickets/totalTickets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-tertiary h-full rounded-full" style={{ width: `${totalTickets > 0 ? (accessTickets/totalTickets)*100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Hardware Fleet Status */}
                    <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-3">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">Hardware Fleet Status</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Physical device custody distribution</p>
                        </div>
                        <span className="text-xs font-mono text-on-surface-variant">{totalAssets} Units</span>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                              Assigned to Personnel
                            </span>
                            <span className="font-mono text-on-surface-variant">{assignedAssets} ({totalAssets > 0 ? ((assignedAssets/totalAssets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${totalAssets > 0 ? (assignedAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                              Available in Depository
                            </span>
                            <span className="font-mono text-on-surface-variant">{availableAssets} ({totalAssets > 0 ? ((availableAssets/totalAssets)*100).toFixed(0) : 0}%)</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-tertiary h-full rounded-full" style={{ width: `${totalAssets > 0 ? (availableAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-on-surface flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                              Maintenance &amp; Diagnostics
                            </span>
                            <span className="font-mono text-on-surface-variant">{underRepairAssets}</span>
                          </div>
                          <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${totalAssets > 0 ? (underRepairAssets/totalAssets)*100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Priority Support Queue & System Audit Trail */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Priority Support Queue */}
                    <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">Priority Support Queue</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Active support incidents requiring operational attention</p>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-[11px] font-medium font-mono">
                          {criticalTickets + highTickets} High / Critical
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant font-label bg-surface-container-low">
                              <th className="py-2.5 px-3 rounded-l-md">Ticket ID</th>
                              <th className="py-2.5 px-3">Subject / Title</th>
                              <th className="py-2.5 px-3">Priority</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3 rounded-r-md text-right">Assignee</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-container-low">
                            {tickets
                              .filter(t => t.status !== "RESOLVED" && t.status !== "CLOSED")
                              .slice(0, 5)
                              .map(t => (
                                <tr key={t.id || t.ticket_id} className="hover:bg-surface-container-low transition-colors">
                                  <td className="py-3 px-3 font-mono font-medium text-primary">#{t.ticket_id}</td>
                                  <td className="py-3 px-3 min-w-[180px]">
                                    <div className="font-medium text-on-surface truncate max-w-xs">{t.title}</div>
                                    <div className="text-[11px] text-on-surface-variant truncate max-w-xs">{t.description}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${t.priority === 'CRITICAL' ? 'bg-error-container text-on-error-container' : t.priority === 'HIGH' ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-surface-container text-on-surface'}`}>
                                      {t.priority}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>{t.status}</span>
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono text-[11px] text-on-surface-variant">{t.assigned_to || "Unassigned"}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: System Audit Trail (Admin Only) */}
                    <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm">
                      <div className="flex items-center justify-between pb-4">
                        <div>
                          <h2 className="font-headline text-xl text-on-surface font-normal">System Audit Trail</h2>
                          <p className="text-xs text-on-surface-variant mt-0.5">Chronological record of recent administrative and security actions</p>
                        </div>
                        <span className="text-[11px] font-mono text-tertiary">Real-time</span>
                      </div>

                      <div className="space-y-3">
                        {auditLogs.slice(0, 5).map((log, idx) => (
                          <div key={log.id || idx} className="p-3 rounded-lg bg-surface-container-low/50 border border-surface-container text-xs flex items-center justify-between">
                            <div>
                              <div className="font-medium text-on-surface flex items-center gap-1.5">
                                <span className="font-mono text-primary font-semibold">{log.user_id}</span>
                                <span>{log.action}</span>
                              </div>
                              <div className="text-[11px] text-on-surface-variant mt-0.5">{log.details}</div>
                            </div>
                            <span className="text-[10px] font-mono text-on-surface-variant whitespace-nowrap">
                              {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Live'}
                            </span>
                          </div>
                        ))}
                        {auditLogs.length === 0 && (
                          <div className="py-6 text-center text-on-surface-variant text-xs">No audit logs recorded yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: INCIDENT TICKETS */}
          {(activeTab === "tickets" || activeTab === "it-support-desk" || activeTab === "ticket-operations") && (
            <div>
              
              {fetchError && (
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: "var(--status-critical-bg)",
                  border: "1px solid var(--status-critical)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--status-critical)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => fetchData()}
                    style={{
                      borderColor: "var(--status-critical)",
                      color: "var(--status-critical)",
                      background: "transparent",
                      fontWeight: 600
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}
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
                    <div className="table-header-title">{currentUser.role === 'EMPLOYEE' ? 'My Support Incident Requests' : 'Enterprise Incident Queue'}</div>
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
                    {loading && tickets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                            <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "28px", color: "var(--primary)" }}>sync</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading incident ticket records...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--text-dim)" }}>inbox</span>
                            <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                              {tickets.length === 0 ? "No incident tickets registered in database" : "No tickets match the selected filters"}
                            </span>
                            {tickets.length > 0 && (search || filterCategory || filterPriority || filterStatus) && (
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() => { setSearch(""); setFilterCategory(""); setFilterPriority(""); setFilterStatus(""); }}
                                style={{ marginTop: "0.5rem" }}
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTickets.map(t => (
                        <tr key={t.id || t.ticket_id}>
                          <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>
                            #{t.ticket_id}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.title}</div>
                            <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "380px" }}>{t.description}</div>
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
                          <td>{t.assigned_to || "Unassigned"}</td>
                          <td>
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              {currentUser.role !== "EMPLOYEE" && t.status !== "CLOSED" && (
                                <button className="table-btn" onClick={() => setShowAssignTicketModal(t)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span>
                                  <span>Assign</span>
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
                                  try {
                                    const res = await fetch(`${API_BASE}/tickets/${t.ticket_id}/close`, {
                                      method: "POST",
                                      headers: { "Authorization": `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                      addToast(`Closed ticket ${t.ticket_id}`, "success");
                                      fetchData();
                                    } else {
                                      const err = await res.json().catch(() => null);
                                      const msg = parseApiError(err, res.status, `Failed to close ticket ${t.ticket_id}`);
                                      if (res.status === 401) handleLogout(msg);
                                      else addToast(msg, "error");
                                    }
                                  } catch (e) {
                                    addToast("Network failure. Could not reach server.", "error");
                                  }
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>lock</span>
                                  <span>Close</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: ASSET INVENTORY */}
          {(activeTab === "assets" || activeTab === "asset-management") && (
            <div>
              
              {fetchError && (
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: "var(--status-critical-bg)",
                  border: "1px solid var(--status-critical)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--status-critical)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => fetchData()}
                    style={{
                      borderColor: "var(--status-critical)",
                      color: "var(--status-critical)",
                      background: "transparent",
                      fontWeight: 600
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}
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
                    <div className="table-header-title">{currentUser.role === 'EMPLOYEE' ? 'My Assigned Hardware Equipment' : 'Enterprise Hardware Fleet'}</div>
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
                    {loading && assets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                            <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "28px", color: "var(--primary)" }}>sync</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading hardware fleet inventory...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--text-dim)" }}>devices</span>
                            <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                              {assets.length === 0 ? "No hardware devices registered in database" : "No hardware devices match the selected filters"}
                            </span>
                            {assets.length > 0 && (assetSearch || assetStatusFilter || assetTypeFilter) && (
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() => { setAssetSearch(""); setAssetStatusFilter(""); setAssetTypeFilter(""); }}
                                style={{ marginTop: "0.5rem" }}
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredAssets.map(a => (
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
                                  try {
                                    const res = await fetch(`${API_BASE}/assets/${a.asset_id}/return`, {
                                      method: "POST",
                                      headers: { "Authorization": `Bearer ${token}` }
                                    });
                                    if (res.ok) {
                                      addToast(`Returned asset ${a.asset_id} to inventory`, "success");
                                      fetchData();
                                    } else {
                                      const err = await res.json().catch(() => null);
                                      const msg = parseApiError(err, res.status, `Failed to return asset ${a.asset_id}`);
                                      if (res.status === 401) handleLogout(msg);
                                      else addToast(msg, "error");
                                    }
                                  } catch (e) {
                                    addToast("Network failure. Could not reach server.", "error");
                                  }
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>keyboard_return</span>
                                  <span>Return</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SLA & PERFORMANCE */}
          {(activeTab === "sla" || activeTab === "reports" || activeTab === "sla-monitor") && currentUser && (currentUser.role === "ADMIN" || currentUser.role === "SUPPORT") && (
            <div className="space-y-6">
              {/* SLA KPI Summary Cards */}
              
              {fetchError && (
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: "var(--status-critical-bg)",
                  border: "1px solid var(--status-critical)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--status-critical)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => fetchData()}
                    style={{
                      borderColor: "var(--status-critical)",
                      color: "var(--status-critical)",
                      background: "transparent",
                      fontWeight: 600
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}
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
          {(activeTab === "employees" || activeTab === "users" || activeTab === "user-directory") && currentUser && currentUser.role === "ADMIN" && (
            <div>
              
              {fetchError && (
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: "var(--status-critical-bg)",
                  border: "1px solid var(--status-critical)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--status-critical)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => fetchData()}
                    style={{
                      borderColor: "var(--status-critical)",
                      color: "var(--status-critical)",
                      background: "transparent",
                      fontWeight: 600
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}
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
                    {loading && usersList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                            <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "28px", color: "var(--primary)" }}>sync</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading workforce accounts...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--text-dim)" }}>badge</span>
                            <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                              {usersList.length === 0 ? "No workforce accounts enrolled in directory" : "No employees match the selected filters"}
                            </span>
                            {usersList.length > 0 && (userSearch || userRoleFilter) && (
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() => { setUserSearch(""); setUserRoleFilter(""); }}
                                style={{ marginTop: "0.5rem" }}
                              >
                                Clear Filters
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(u => (
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
                                    if (navigator.clipboard) {
                                      navigator.clipboard.writeText(u.invitation_token);
                                    }
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: AUDIT LOGS & LIVE STREAM */}
          {(activeTab === "audit" || activeTab === "events" || activeTab === "settings-audit-logs" || activeTab === "audit-logs") && currentUser && currentUser.role === "ADMIN" && (
            <div className="space-y-6">
              
              {fetchError && (
                <div style={{
                  padding: "0.85rem 1.25rem",
                  background: "var(--status-critical-bg)",
                  border: "1px solid var(--status-critical)",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  color: "var(--status-critical)"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>error</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    className="table-btn"
                    onClick={() => fetchData()}
                    style={{
                      borderColor: "var(--status-critical)",
                      color: "var(--status-critical)",
                      background: "transparent",
                      fontWeight: 600
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>refresh</span>
                    <span>Retry</span>
                  </button>
                </div>
              )}
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
                    {loading && auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
                            <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "28px", color: "var(--primary)" }}>sync</span>
                            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading system audit ledger...</span>
                          </div>
                        </td>
                      </tr>
                    ) : auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan="4" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--text-dim)" }}>history</span>
                            <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>
                              No audit events recorded yet.
                            </span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log, idx) => (
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
                      ))
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
        <RegisterAssetModal
          token={token}
          onClose={() => setShowCreateAssetModal(false)}
          addToast={addToast}
          onSuccess={(newAsset) => {
            setShowCreateAssetModal(false);
            fetchData();
            addToast(`Hardware asset ${newAsset.asset_id} registered successfully!`, "success");
          }}
        />
      )}

      {/* INVITE EMPLOYEE MODAL (ADMIN ONLY) */}
      {showInviteModal && (
        <div className="modal-backdrop">
          <div className="modal-surface">
            <h2 className="modal-title">Generate Employee Invitation</h2>
            <p className="modal-desc">Issues a cryptographically hashed single-use onboarding token.</p>

            {inviteError && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--status-critical-bg)",
                border: "1px solid var(--status-critical)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.15rem",
                color: "var(--status-critical)",
                fontSize: "0.84rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setInviteError("");
              const f = e.target;
              const payload = {
                name: f.name.value.trim(),
                email: f.email.value.trim(),
                role: f.role.value
              };
              setIsSubmittingInvite(true);
              try {
                const res = await fetch(`${API_BASE}/users/invite`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                  body: JSON.stringify(payload)
                });
                if (res.ok) {
                  const data = await res.json();
                  setShowInviteModal(false);
                  fetchData();
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(data.invitation_token);
                  }
                  addToast(`Token generated & copied to clipboard! (${data.invitation_token.slice(0, 16)}...)`, "success");
                } else {
                  const err = await res.json().catch(() => null);
                  const msg = parseApiError(err, res.status, "Failed to invite employee");
                  setInviteError(msg);
                  addToast(msg, "error");
                }
              } catch (netErr) {
                const msg = "Network error: Could not reach server to invite employee.";
                setInviteError(msg);
                addToast(msg, "error");
              } finally {
                setIsSubmittingInvite(false);
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Full Name *</label>
                <input name="name" type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="Aarav Verma" required />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Work Email *</label>
                <input name="email" type="email" className="apex-form-input" style={{ paddingLeft: "1rem" }} placeholder="aarav.verma@company.com" required />
              </div>
              <div className="form-field-group">
                <label className="form-field-label">Role Privilege *</label>
                <select name="role" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  <option value="EMPLOYEE">Employee (Standard Access)</option>
                  <option value="SUPPORT">IT Support (Ticket Resolution)</option>
                  <option value="ADMIN">System Administrator</option>
                </select>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => { setShowInviteModal(false); setInviteError(""); }} disabled={isSubmittingInvite}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta" disabled={isSubmittingInvite}>
                  {isSubmittingInvite ? "Generating..." : "Generate Invitation Token"}
                </button>
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

            {resolveModalError && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--status-critical-bg)",
                border: "1px solid var(--status-critical)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.15rem",
                color: "var(--status-critical)",
                fontSize: "0.84rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                <span>{resolveModalError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setResolveModalError("");
              const notes = e.target.notes.value.trim();
              if (!notes || notes.length < 5) {
                setResolveModalError("Resolution notes must be at least 5 characters.");
                return;
              }
              setIsSubmittingResolve(true);
              try {
                const res = await fetch(`${API_BASE}/tickets/${showResolveModal.ticket_id}/resolve`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                  body: JSON.stringify({ resolution: notes })
                });
                if (res.ok) {
                  setShowResolveModal(null);
                  fetchData();
                  addToast(`Resolved ticket ${showResolveModal.ticket_id}`, "success");
                } else {
                  const err = await res.json().catch(() => null);
                  const msg = parseApiError(err, res.status, "Failed to resolve ticket");
                  setResolveModalError(msg);
                  addToast(msg, "error");
                }
              } catch (netErr) {
                const msg = "Network failure: Could not reach server to resolve ticket.";
                setResolveModalError(msg);
                addToast(msg, "error");
              } finally {
                setIsSubmittingResolve(false);
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Resolution Summary *</label>
                <textarea name="notes" className="apex-form-input" style={{ height: "100px", padding: "0.75rem 1rem" }} placeholder="Detail steps taken to diagnose and resolve..." required minLength="5" />
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => { setShowResolveModal(null); setResolveModalError(""); }} disabled={isSubmittingResolve}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta" disabled={isSubmittingResolve}>
                  {isSubmittingResolve ? "Confirming..." : "Confirm Resolution"}
                </button>
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

            {assignTicketError && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--status-critical-bg)",
                border: "1px solid var(--status-critical)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.15rem",
                color: "var(--status-critical)",
                fontSize: "0.84rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                <span>{assignTicketError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAssignTicketError("");
              const assignedTo = e.target.assignedTo?.value;
              if (!assignedTo) {
                setAssignTicketError("Please select an authorized IT Support specialist.");
                return;
              }
              setIsSubmittingAssignTicket(true);
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
                  const err = await res.json().catch(() => null);
                  const msg = parseApiError(err, res.status, "Failed to assign ticket");
                  setAssignTicketError(msg);
                  addToast(msg, "error");
                }
              } catch (err) {
                const msg = "Network error: Could not reach server to assign ticket.";
                setAssignTicketError(msg);
                addToast(msg, "error");
              } finally {
                setIsSubmittingAssignTicket(false);
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Ticket Summary</label>
                <input
                  type="text"
                  className="apex-form-input"
                  style={{ background: "var(--bg-subtle)", cursor: "not-allowed", paddingLeft: "1rem" }}
                  value={`${showAssignTicketModal.ticket_id} - ${showAssignTicketModal.title}`}
                  readOnly
                />
              </div>

              <div className="form-field-group">
                <label className="form-field-label">Select IT Support Engineer</label>
                <select name="assignedTo" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  {usersList.filter(u => u.role === "SUPPORT" || u.role === "ADMIN").length > 0 ? (
                    usersList
                      .filter(u => u.role === "SUPPORT" || u.role === "ADMIN")
                      .map(u => (
                        <option key={u.user_id} value={u.user_id}>
                          {u.user_id} - {u.name} ({u.role} | {u.department || "IT Support"})
                        </option>
                      ))
                  ) : (
                    <option value="" disabled>No IT Support engineers currently available</option>
                  )}
                </select>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => { setShowAssignTicketModal(null); setAssignTicketError(""); }} disabled={isSubmittingAssignTicket}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta" disabled={isSubmittingAssignTicket || usersList.filter(u => u.role === "SUPPORT" || u.role === "ADMIN").length === 0}>
                  {isSubmittingAssignTicket ? "Assigning..." : "Assign Engineer"}
                </button>
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

            {assignAssetError && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "var(--status-critical-bg)",
                border: "1px solid var(--status-critical)",
                borderRadius: "var(--radius-md)",
                marginBottom: "1.15rem",
                color: "var(--status-critical)",
                fontSize: "0.84rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
                <span>{assignAssetError}</span>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              setAssignAssetError("");
              const empId = e.target.empId?.value;
              if (!empId) {
                setAssignAssetError("Please select an employee custodian.");
                return;
              }
              setIsSubmittingAssignAsset(true);
              try {
                const res = await fetch(`${API_BASE}/assets/${showAssignModal.asset_id}/assign`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                  body: JSON.stringify({ employee_id: empId, notes: "Assigned via AssetDesk console" })
                });
                if (res.ok) {
                  setShowAssignModal(null);
                  fetchData();
                  addToast(`Assigned ${showAssignModal.asset_id} to ${empId}`, "success");
                } else {
                  const err = await res.json().catch(() => null);
                  const msg = parseApiError(err, res.status, "Failed to assign asset");
                  setAssignAssetError(msg);
                  addToast(msg, "error");
                }
              } catch (netErr) {
                const msg = "Network error: Could not reach server to assign asset.";
                setAssignAssetError(msg);
                addToast(msg, "error");
              } finally {
                setIsSubmittingAssignAsset(false);
              }
            }}>
              <div className="form-field-group">
                <label className="form-field-label">Employee Custodian</label>
                <select name="empId" className="apex-form-input" style={{ paddingLeft: "1rem" }} required>
                  {usersList.length > 0 ? (
                    usersList.map(u => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.user_id} ({u.name} - {u.role})
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>No workforce employees currently loaded</option>
                  )}
                </select>
              </div>
              <div className="modal-actions-row">
                <button type="button" className="btn-secondary-parchment" onClick={() => { setShowAssignModal(null); setAssignAssetError(""); }} disabled={isSubmittingAssignAsset}>Cancel</button>
                <button type="submit" className="btn-primary-terracotta" disabled={isSubmittingAssignAsset || usersList.length === 0}>
                  {isSubmittingAssignAsset ? "Authorizing..." : "Authorize Custody"}
                </button>
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

// Modal Component for Registering Hardware Assets (Day 1 Critical Fix)
function RegisterAssetModal({ onClose, token, onSuccess, addToast }) {
  const [form, setForm] = useState({
    asset_id: "",
    type: "Laptop",
    brand: "",
    model: "",
    serial_number: ""
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const validate = () => {
    const errs = {};
    const aid = (form.asset_id || "").trim();
    if (!aid) {
      errs.asset_id = "Asset ID is required (e.g. LAP-1050).";
    } else if (!/^[A-Za-z0-9_-]{3,30}$/.test(aid)) {
      errs.asset_id = "Asset ID must be 3-30 characters (letters, numbers, hyphens).";
    }

    if (!form.type) {
      errs.type = "Please select an asset type.";
    }

    if (!(form.brand || "").trim()) {
      errs.brand = "Brand is required (e.g. Dell, Apple).";
    }

    if (!(form.model || "").trim()) {
      errs.model = "Model is required (e.g. Latitude 5440).";
    }

    const sn = (form.serial_number || "").trim();
    if (!sn) {
      errs.serial_number = "Serial number is required.";
    } else if (sn.length < 3) {
      errs.serial_number = "Serial number must be at least 3 characters.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    setSubmitting(true);
    const payload = {
      asset_id: form.asset_id.trim().toUpperCase(),
      type: form.type,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serial_number: form.serial_number.trim(),
      status: "AVAILABLE"
    };

    try {
      const res = await fetch(`${API_BASE}/assets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 201) {
        const data = await res.json();
        onSuccess(data);
      } else {
        const errData = await res.json().catch(() => null);
        const errorMsg = parseApiError(errData, res.status, "Failed to register hardware asset.");
        setApiError(errorMsg);
        if (addToast) addToast(errorMsg, "error");
      }
    } catch (networkErr) {
      const msg = "Network connection failed. Could not reach server to register device.";
      setApiError(msg);
      if (addToast) addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface">
        <h2 className="modal-title">Register Hardware Asset</h2>
        <p className="modal-desc">Add a new IT hardware device to the enterprise inventory.</p>

        {apiError && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "var(--status-critical-bg)",
            border: "1px solid var(--status-critical)",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.15rem",
            color: "var(--status-critical)",
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.15rem" }}>
            <div>
              <label className="form-field-label">Asset ID *</label>
              <input
                name="asset_id"
                type="text"
                className="apex-form-input"
                style={{ paddingLeft: "1rem", fontFamily: "var(--font-mono)" }}
                placeholder="e.g. LAP-1050"
                value={form.asset_id}
                onChange={e => {
                  setForm(prev => ({ ...prev, asset_id: e.target.value.toUpperCase() }));
                  if (formErrors.asset_id) setFormErrors(prev => ({ ...prev, asset_id: null }));
                }}
                required
              />
              {formErrors.asset_id && (
                <span style={{ color: "var(--status-critical)", fontSize: "0.78rem", marginTop: "0.3rem", display: "block" }}>
                  {formErrors.asset_id}
                </span>
              )}
            </div>

            <div>
              <label className="form-field-label">Asset Type *</label>
              <select
                name="type"
                className="apex-form-input"
                style={{ paddingLeft: "1rem" }}
                value={form.type}
                onChange={e => {
                  setForm(prev => ({ ...prev, type: e.target.value }));
                  if (formErrors.type) setFormErrors(prev => ({ ...prev, type: null }));
                }}
                required
              >
                <option value="Laptop">Laptop Workstation</option>
                <option value="Monitor">External Monitor</option>
                <option value="Keyboard">Mechanical Keyboard</option>
                <option value="Mouse">Optical Mouse</option>
                <option value="Printer">Network Laser Printer</option>
                <option value="Server">Edge Rack Server</option>
              </select>
              {formErrors.type && (
                <span style={{ color: "var(--status-critical)", fontSize: "0.78rem", marginTop: "0.3rem", display: "block" }}>
                  {formErrors.type}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.15rem" }}>
            <div>
              <label className="form-field-label">Brand *</label>
              <input
                name="brand"
                type="text"
                className="apex-form-input"
                style={{ paddingLeft: "1rem" }}
                placeholder="Dell / Apple / Lenovo"
                value={form.brand}
                onChange={e => {
                  setForm(prev => ({ ...prev, brand: e.target.value }));
                  if (formErrors.brand) setFormErrors(prev => ({ ...prev, brand: null }));
                }}
                required
              />
              {formErrors.brand && (
                <span style={{ color: "var(--status-critical)", fontSize: "0.78rem", marginTop: "0.3rem", display: "block" }}>
                  {formErrors.brand}
                </span>
              )}
            </div>

            <div>
              <label className="form-field-label">Model *</label>
              <input
                name="model"
                type="text"
                className="apex-form-input"
                style={{ paddingLeft: "1rem" }}
                placeholder="Latitude 5440 / MacBook Pro"
                value={form.model}
                onChange={e => {
                  setForm(prev => ({ ...prev, model: e.target.value }));
                  if (formErrors.model) setFormErrors(prev => ({ ...prev, model: null }));
                }}
                required
              />
              {formErrors.model && (
                <span style={{ color: "var(--status-critical)", fontSize: "0.78rem", marginTop: "0.3rem", display: "block" }}>
                  {formErrors.model}
                </span>
              )}
            </div>
          </div>

          <div className="form-field-group">
            <label className="form-field-label">Serial Number *</label>
            <input
              name="serial_number"
              type="text"
              className="apex-form-input"
              style={{ paddingLeft: "1rem", fontFamily: "var(--font-mono)" }}
              placeholder="e.g. SN-8921-9988"
              value={form.serial_number}
              onChange={e => {
                setForm(prev => ({ ...prev, serial_number: e.target.value }));
                if (formErrors.serial_number) setFormErrors(prev => ({ ...prev, serial_number: null }));
              }}
              required
            />
            {formErrors.serial_number && (
              <span style={{ color: "var(--status-critical)", fontSize: "0.78rem", marginTop: "0.3rem", display: "block" }}>
                {formErrors.serial_number}
              </span>
            )}
          </div>

          <div className="modal-actions-row">
            <button
              type="button"
              className="btn-secondary-parchment"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-terracotta"
              disabled={submitting}
            >
              {submitting ? "Registering Device..." : "Register Device"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal Component for Creating Tickets with Live Classification Preview
function CreateTicketModal({ onClose, token, onSuccess, addToast }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

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
    if (text.match(/emergency|outage|downtime|entire\s*(office|floor|team|company)|all\s*(users|systems)|production\s*(down|outage)|servers?\s*(down|dead)|system\s*down|security\s*breach|ransomware|malware|fire|smoke|spark|critical|sev[- ]?1/)) {
      return "CRITICAL";
    }
    if (
      text.match(/(mother\s*boa?r?d|mobo|logic\s*board|cpu|hard\s*drive|ssd|ram)[\s\S]*?(crash|dead|fried|broken|failure)/) ||
      text.match(/(crash|dead|fried|broken|failure)[\s\S]*?(mother\s*boa?r?d|mobo|logic\s*board|cpu|hard\s*drive|ssd|ram)/) ||
      text.match(/(scre+n|disp?lay|monit[oe]r)[\s\S]*?(not\s*working|blank|black|dead|broken|cracked)/) ||
      text.match(/not\s*(turning\s*on|starting|booting|working|charging|responding)|won'?t\s*(turn\s*on|boot|start)|cannot\s*(work|boot|start|login)|can'?t\s*(work|boot|start|login)/) ||
      text.match(/black\s*screen|blue\s*screen|bsod|kernel\s*panic|system\s*crash|unusable|locked\s*out|lockout|liquid\s*spill|urgent|asap/)
    ) {
      return "HIGH";
    }
    if (text.match(/inquiry|question|request|how\s+to|guidance|setup|suggestion|preference|cosmetic|scratch|ergonomic/)) {
      return "LOW";
    }
    return "MEDIUM";
  }, [title, desc]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!title.trim() || title.trim().length < 3) {
      setApiError("Ticket summary must be at least 3 characters.");
      return;
    }
    if (!desc.trim() || desc.trim().length < 5) {
      setApiError("Detailed symptoms must be at least 5 characters.");
      return;
    }

    setSubmitting(true);
    const payload = {
      title: title.trim(),
      description: desc.trim(),
      category: inferredCategory,
      priority: inferredPriority
    };

    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (res.status === 201) {
        onSuccess();
      } else {
        const errData = await res.json().catch(() => null);
        const msg = parseApiError(errData, res.status, "Failed to submit ticket.");
        setApiError(msg);
        if (addToast) addToast(msg, "error");
      }
    } catch (netErr) {
      const msg = "Network error: Could not reach server to submit ticket.";
      setApiError(msg);
      if (addToast) addToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-surface">
        <h2 className="modal-title">Create Incident Ticket</h2>
        <p className="modal-desc">Submit a new incident request to the IT ServiceDesk queue.</p>

        {apiError && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "var(--status-critical-bg)",
            border: "1px solid var(--status-critical)",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.15rem",
            color: "var(--status-critical)",
            fontSize: "0.84rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem"
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field-group">
            <label className="form-field-label">Incident Summary *</label>
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
            <label className="form-field-label">Detailed Symptoms *</label>
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
            <span style={{ color: "#d5d2cb" }}>|</span>
            <span>Priority: <strong style={{ color: inferredPriority === 'CRITICAL' ? 'var(--status-critical)' : 'inherit' }}>{inferredPriority}</strong></span>
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary-terracotta" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit to Queue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Render React 18 Application
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
