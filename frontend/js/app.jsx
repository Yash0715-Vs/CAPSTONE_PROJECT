// =====================================================================

// Apex Sentinel — React 18 Single Page Application

// Theme: Warm Editorial Craft & Enterprise Security (Google Stitch)

// =====================================================================



const { useState, useEffect, useCallback, useMemo, useRef } = React;



const API_BASE = (function() {

  const loc = window.location;

  if (!loc.origin || loc.origin === "null" || loc.origin.startsWith("file:") || ["5500", "5501", "3000", "5173"].includes(loc.port)) {

    return "http://127.0.0.1:8000";

  }

  return loc.origin;

})();



const WS_URL = (function() {

  const loc = window.location;

  if (!loc.origin || loc.origin === "null" || loc.origin.startsWith("file:") || ["5500", "5501", "3000", "5173"].includes(loc.port)) {

    return "ws://127.0.0.1:8000/ws/tickets";

  }

  return `${loc.protocol === "https:" ? "wss:" : "ws:"}//${loc.host}/ws/tickets`;

})();





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

// Timezone-Aware Date & Time Localization Helpers

// Ensures UTC timestamps from backend are localized accurately to user's

// current system timezone and locale.

// =====================================================================

function formatLocalDateTime(raw) {

  if (!raw) return "";

  let s = String(raw).trim();

  // If naive ISO string (no 'Z' and no timezone offset), treat it as UTC

  if (!s.endsWith("Z") && !s.includes("+") && !/[0-9]{4}-[0-9]{2}-[0-9]{2}.*[-+][0-9]{2}:?[0-9]{2}/.test(s)) {

    s = s.replace(" ", "T") + "Z";

  }

  const d = new Date(s);

  return isNaN(d.getTime()) ? String(raw) : d.toLocaleString();

}



function formatLocalTime(raw) {

  if (!raw) return "";

  let s = String(raw).trim();

  if (!s.endsWith("Z") && !s.includes("+") && !/[0-9]{4}-[0-9]{2}-[0-9]{2}.*[-+][0-9]{2}:?[0-9]{2}/.test(s)) {

    s = s.replace(" ", "T") + "Z";

  }

  const d = new Date(s);

  return isNaN(d.getTime()) ? String(raw) : d.toLocaleTimeString();

}





// =====================================================================
// Component: Self-Service Password Recovery Modal (Real-World Enterprise Flow)
// Works for all Employee, IT Support, and Admin accounts
// =====================================================================
function ForgotPasswordModal({ isOpen, onClose, initialIdentifier, onPasswordResetSuccess }) {
  const [step, setStep] = useState(1); // 1: Request Code, 2: Reset Form, 3: Success
  const [identifier, setIdentifier] = useState(initialIdentifier || "");
  const [resetToken, setResetToken] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (initialIdentifier) {
      setIdentifier(initialIdentifier);
    }
  }, [initialIdentifier]);

  if (!isOpen) return null;

  const handleRequestToken = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError("Please enter your Work Email or Employee ID.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiError(data, res.status, "Account not found or password reset failed."));
      }
      setResetToken(data.reset_token);
      setUserInfo(data);
      setStep(2);
    } catch (err) {
      if (err.name === "TypeError" && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        setError("Unable to connect to backend server (port 8000). Please verify the server is running.");
      } else {
        setError(err.message || "Failed to generate password reset code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (!resetToken.trim()) {
      setError("Reset verification token is required.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken.trim(), new_password: newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(parseApiError(data, res.status, "Failed to reset password."));
      }
      setStep(3);
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess(userInfo ? userInfo.user_id : identifier.trim());
      }
    } catch (err) {
      if (err.name === "TypeError" && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {
        setError("Unable to connect to backend server (port 8000). Please verify the server is running.");
      } else {
        setError(err.message || "Failed to reset password.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (resetToken) {
      navigator.clipboard.writeText(resetToken);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleClose = () => {
    setStep(1);
    setError("");
    setResetToken("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1100 }}>
      <div className="modal-surface" style={{ maxWidth: "480px", padding: "1.75rem" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>
                {step === 3 ? "check_circle" : "lock_reset"}
              </span>
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: "1.35rem", margin: 0, fontWeight: 600 }}>
                {step === 1 && "Forgot Password?"}
                {step === 2 && "Set New Password"}
                {step === 3 && "Password Reset Successful"}
              </h2>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                {step === 1 && "Enterprise Account Self-Service Recovery"}
                {step === 2 && `Account: ${userInfo ? userInfo.user_id : identifier}`}
                {step === 3 && "Your credentials have been updated"}
              </div>
            </div>
          </div>
          <button type="button" className="table-btn" onClick={handleClose} style={{ padding: "0.25rem 0.5rem" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="alert-danger" style={{ marginBottom: "1rem", padding: "0.65rem 0.85rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", borderRadius: "var(--radius-sm)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Identifier & Request Code */}
        {step === 1 && (
          <form onSubmit={handleRequestToken}>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
              Enter your registered <strong>Work Email</strong> or <strong>Employee / User ID</strong> (e.g. <code>IT-49799</code>, <code>ADM-001</code>, <code>EMP-101</code>). We'll generate a secure verification code to reset your password.
            </p>

            <div style={{ marginBottom: "1.25rem" }}>
              <label className="form-field-label" htmlFor="recovery-id" style={{ display: "block", marginBottom: "0.4rem", fontWeight: 500, fontSize: "0.85rem" }}>
                Work Email or Employee ID
              </label>
              <div className="input-icon-wrap" style={{ position: "relative" }}>
                <span className="material-symbols-outlined field-icon-left" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "18px" }}>badge</span>
                <input
                  id="recovery-id"
                  type="text"
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "2.5rem" }}
                  placeholder="e.g. IT-49799 or tirthg@company.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="table-btn" onClick={handleClose} style={{ padding: "0.6rem 1.1rem" }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary-teal" disabled={loading} style={{ padding: "0.6rem 1.4rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                <span>{loading ? "Verifying..." : "Generate Reset Code"}</span>
                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>arrow_forward</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: Code verification & New password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword}>
            {/* Token notice banner */}
            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Verification Code (Valid 15m)
                </span>
                <button type="button" onClick={handleCopyToken} style={{ background: "transparent", border: "none", color: "var(--primary)", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "2px" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>{copySuccess ? "done" : "content_copy"}</span>
                  <span>{copySuccess ? "Copied!" : "Copy"}</span>
                </button>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.95rem", fontWeight: 600, color: "var(--primary)", wordBreak: "break-all" }}>
                {resetToken}
              </div>
            </div>

            {/* Verification code input */}
            <div style={{ marginBottom: "1rem" }}>
              <label className="form-field-label" htmlFor="reset-token-input" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500, fontSize: "0.85rem" }}>
                Reset Verification Code
              </label>
              <input
                id="reset-token-input"
                type="text"
                className="form-input"
                style={{ width: "100%", fontFamily: "var(--font-mono)" }}
                placeholder="RST-..."
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
              />
            </div>

            {/* New Password */}
            <div style={{ marginBottom: "1rem" }}>
              <label className="form-field-label" htmlFor="new-password" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500, fontSize: "0.85rem" }}>
                New Password (minimum 8 characters)
              </label>
              <div className="input-icon-wrap" style={{ position: "relative" }}>
                <span className="material-symbols-outlined field-icon-left" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "18px" }}>lock</span>
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label className="form-field-label" htmlFor="confirm-new-password" style={{ display: "block", marginBottom: "0.35rem", fontWeight: 500, fontSize: "0.85rem" }}>
                Confirm New Password
              </label>
              <div className="input-icon-wrap" style={{ position: "relative" }}>
                <span className="material-symbols-outlined field-icon-left" style={{ position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", fontSize: "18px" }}>lock_reset</span>
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-input"
                  style={{ width: "100%", paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
              <button type="button" className="table-btn" onClick={() => setStep(1)} style={{ padding: "0.6rem 1rem" }}>
                ← Change ID
              </button>
              <button type="submit" className="btn-primary-teal" disabled={loading} style={{ padding: "0.6rem 1.4rem" }}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "1rem 0 0.5rem 0" }}>
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.25rem auto" }}>
              <span className="material-symbols-outlined" style={{ fontSize: "36px" }}>check_circle</span>
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "0.5rem" }}>
              Password Reset Complete!
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "1.75rem" }}>
              Your account password has been updated and securely hashed with Bcrypt. You can now log into your workspace.
            </p>
            <button
              type="button"
              className="btn-primary-teal"
              onClick={handleClose}
              style={{ width: "100%", padding: "0.75rem", fontSize: "0.95rem", justifyContent: "center" }}
            >
              Back to Sign In
            </button>
          </div>
        )}

      </div>
    </div>
  );
}


// =====================================================================

// Component: Apex Sentinel Split-Screen Login Page (Matches User Design)

// =====================================================================

function LoginPage({ onLoginSuccess, onSwitchToRegister, demoAccounts, theme, onToggleTheme }) {

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [rememberMe, setRememberMe] = useState(true);

  const [showForgotModal, setShowForgotModal] = useState(false);

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

      if (err.name === "TypeError" && (err.message === "Failed to fetch" || err.message.includes("fetch"))) {

        setError(`Unable to connect to backend server at ${API_BASE}. Please verify the FastAPI backend server is running on port 8000.`);

      } else {

        setError(err.message || "Failed to connect to authentication server.");

      }

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

                    onClick={() => setShowForgotModal(true)}

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



          <ForgotPasswordModal
            isOpen={showForgotModal}
            onClose={() => setShowForgotModal(false)}
            initialIdentifier={identifier}
            onPasswordResetSuccess={(resetUserId) => {
              setIdentifier(resetUserId);
              setPassword("");
              setError("");
            }}
          />



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

      {/* Background Dot Grid & Ambient Deep Teal Glow */}

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

// =====================================================================

// Expandable Description Component (Inline "More" / "Show less" toggle)

// =====================================================================

function ExpandableDescription({ text, maxLength = 80 }) {

  const [isExpanded, setIsExpanded] = useState(false);



  if (!text) {

    return <span style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.78rem" }}>No description provided</span>;

  }



  const trimmed = text.trim();

  const needsTruncation = trimmed.length > maxLength;



  return (

    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", maxWidth: "420px", lineHeight: 1.45, marginTop: "3px" }}>

      <span style={{ whiteSpace: isExpanded ? "pre-wrap" : "normal" }}>

        {needsTruncation && !isExpanded ? `${trimmed.slice(0, maxLength).trim()}... ` : trimmed}

      </span>

      {needsTruncation && (

        <button

          type="button"

          onClick={(e) => {

            e.stopPropagation();

            setIsExpanded(!isExpanded);

          }}

          style={{

            background: "transparent",

            border: "none",

            padding: "0 2px",

            color: "var(--primary)",

            fontWeight: 700,

            fontSize: "0.76rem",

            cursor: "pointer",

            display: "inline-flex",

            alignItems: "center",

            gap: "2px",

            textDecoration: "underline",

            verticalAlign: "baseline"

          }}

          title={isExpanded ? "Collapse description" : "Expand full description"}

        >

          <span>{isExpanded ? "Show less" : "More"}</span>

          <span

            className="material-symbols-outlined"

            style={{

              fontSize: "13px",

              transform: isExpanded ? "rotate(180deg)" : "none",

              transition: "transform 0.15s ease",

              verticalAlign: "middle"

            }}

          >

            expand_more

          </span>

        </button>

      )}

    </div>

  );

}





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

  const assignedTickets = tickets.filter(t => t.status === "ASSIGNED").length;

  const inProgressTickets = tickets.filter(t => t.status === "IN_PROGRESS").length;

  const inProgressOnlyTickets = inProgressTickets;

  const activeTickets = assignedTickets + inProgressTickets;

  const activeQueueTickets = openTickets + activeTickets;

  const resolvedTickets = tickets.filter(t => t.status === "RESOLVED").length;

  const closedTickets = tickets.filter(t => t.status === "CLOSED").length;

  const resolvedAndClosed = resolvedTickets + closedTickets;

  const unassignedTickets = tickets.filter(t => !t.assigned_to && t.status !== "RESOLVED" && t.status !== "CLOSED").length;



  const criticalTickets = tickets.filter(t => t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED").length;

  const highTickets = tickets.filter(t => t.priority === "HIGH" && t.status !== "RESOLVED" && t.status !== "CLOSED").length;



  // Real ticket categories breakdown (case-insensitive)

  const hardwareTickets = tickets.filter(t => (t.category || "").toUpperCase() === "HARDWARE").length;

  const networkTickets = tickets.filter(t => (t.category || "").toUpperCase() === "NETWORK").length;

  const softwareTickets = tickets.filter(t => (t.category || "").toUpperCase() === "SOFTWARE").length;

  const accessTickets = tickets.filter(t => (t.category || "").toUpperCase() === "ACCESS").length;

  const otherTickets = tickets.filter(t => !["HARDWARE", "NETWORK", "SOFTWARE", "ACCESS"].includes((t.category || "").toUpperCase())).length;



  // Real SLA map and metrics

  const slaMap = useMemo(() => {

    const map = {};

    if (slaReport && Array.isArray(slaReport.individual_ticket_sla)) {

      slaReport.individual_ticket_sla.forEach(item => {

        map[item.ticket_id] = item;

      });

    }

    return map;

  }, [slaReport]);



  const breachedTicketsCount = slaReport?.breached_count ?? tickets.filter(t => t.is_breached || t.sla_status === "BREACHED").length;

  const activeOverdueCount = slaReport?.active_overdue_count ?? tickets.filter(t => (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "ASSIGNED") && (t.is_breached || t.sla_status === "BREACHED")).length;

  const historicalBreachCount = slaReport?.historical_breached_count ?? tickets.filter(t => (t.status === "RESOLVED" || t.status === "CLOSED") && (t.is_breached || t.sla_status === "BREACHED")).length;

  const activeOnTimeCount = slaReport?.active_on_time_count ?? tickets.filter(t => (t.status === "OPEN" || t.status === "IN_PROGRESS" || t.status === "ASSIGNED") && !t.is_breached && t.sla_status !== "BREACHED").length;

  const historicalMetCount = slaReport?.historical_met_count ?? tickets.filter(t => (t.status === "RESOLVED" || t.status === "CLOSED") && !t.is_breached && t.sla_status !== "BREACHED").length;

  const nonBreachedCount = slaReport?.non_breached_count ?? (totalTickets - breachedTicketsCount);

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
  const [createTicketInitialData, setCreateTicketInitialData] = useState(null);

  const [showResolveModal, setShowResolveModal] = useState(null);

  const [resolveModalError, setResolveModalError] = useState("");

  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);



  const [showAssignModal, setShowAssignModal] = useState(null);

  const [assignAssetError, setAssignAssetError] = useState("");

  const [isSubmittingAssignAsset, setIsSubmittingAssignAsset] = useState(false);



  const [showAssignTicketModal, setShowAssignTicketModal] = useState(null);

  const [assignTicketError, setAssignTicketError] = useState("");

  const [isSubmittingAssignTicket, setIsSubmittingAssignTicket] = useState(false);



  const [showInviteModal, setShowInviteModal] = useState(false);

  const [inviteError, setInviteError] = useState("");

  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);



  const [showCreateAssetModal, setShowCreateAssetModal] = useState(false);



  // Monday Deliverables State: Equipment Requests & Ticket Activity History

  const [equipmentRequests, setEquipmentRequests] = useState([]);

  const [showEquipmentModal, setShowEquipmentModal] = useState(false);

  const [showTicketHistoryModal, setShowTicketHistoryModal] = useState(null);

  const [showEquipmentHistoryModal, setShowEquipmentHistoryModal] = useState(null);

  const [showEditAssetModal, setShowEditAssetModal] = useState(null);

  const [showProvisionModal, setShowProvisionModal] = useState(null);

  const [showTicketDetailsModal, setShowTicketDetailsModal] = useState(null);

  const [showVerifyModal, setShowVerifyModal] = useState(null);

  const [showUserDetailsModal, setShowUserDetailsModal] = useState(null);

  const [showEditUserModal, setShowEditUserModal] = useState(null);



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

    setEquipmentRequests([]);

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

    setEquipmentRequests([]);

      }



      // Equipment requests

      const pEquipment = fetch(`${API_BASE}/equipment-requests`, { headers })

        .then(async r => {

          if (r.status === 401) return [];

          if (!r.ok) return [];

          return r.json();

        })

        .then(data => setEquipmentRequests(Array.isArray(data) ? data : []))

        .catch(() => []);



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



      await Promise.all([pTickets, pAssets, pAudit, pSla, pEquipment, ...staffPromises]);

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

        setWsAuthenticated(false); // Transport connected; await backend authentication frame

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

      const matchStat = !filterStatus || (

        filterStatus === "UNASSIGNED"

          ? (!t.assigned_to && t.status !== "RESOLVED" && t.status !== "CLOSED")

          : (t.status || "").toUpperCase() === filterStatus.toUpperCase()

      );



      return matchSearch && matchCat && matchPri && matchStat;

    });

  }, [tickets, search, filterCategory, filterPriority, filterStatus]);



  // Assets assigned specifically to the current logged in user (works for Employee, Support, and Admin)
  const myAssignedAssets = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'EMPLOYEE') return assets;
    const uid = (currentUser.user_id || "").trim().toLowerCase();
    const uemail = (currentUser.email || "").trim().toLowerCase();
    const uname = (currentUser.name || "").trim().toLowerCase();
    return assets.filter(a => {
      const assigned = (a.assigned_to || "").trim().toLowerCase();
      return assigned && (assigned === uid || assigned === uemail || assigned === uname);
    });
  }, [assets, currentUser]);

  const isMyEquipmentView = activeTab === 'my-equipment' || currentUser?.role === 'EMPLOYEE';
  const baseAssetList = isMyEquipmentView ? myAssignedAssets : assets;

  // Filtered Assets (Search & Status & Type)
  const filteredAssets = useMemo(() => {
    return baseAssetList.filter(a => {
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
  }, [baseAssetList, assetSearch, assetStatusFilter, assetTypeFilter]);



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

                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'dashboard' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                onClick={() => setActiveTab('dashboard')}

              >

                <div className="flex items-center gap-3">

                  <span className={`material-symbols-outlined text-[19px] ${activeTab === 'dashboard' ? 'text-primary' : ''}`}>dashboard</span>

                  <span>{currentUser.role === 'EMPLOYEE' ? 'My Workspace' : 'Dashboard'}</span>

                </div>

              </button>



              <button

                type="button"

                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'tickets' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                onClick={() => setActiveTab('tickets')}

              >

                <div className="flex items-center gap-3">

                  <span className={`material-symbols-outlined text-[19px] ${activeTab === 'tickets' ? 'text-primary' : ''}`}>confirmation_number</span>

                  <span>{currentUser.role === 'EMPLOYEE' ? 'My Tickets' : 'Tickets'}</span>

                </div>

                <span className={`px-1.5 py-0.5 text-[11px] font-medium rounded-full font-mono ${activeTab === 'tickets' ? 'bg-primary/20 text-on-primary-fixed' : 'bg-surface-container text-on-surface'}`}>

                  {currentUser.role === 'EMPLOYEE' ? myOpenTickets : currentUser.role === 'SUPPORT' ? myOpenTickets : activeQueueTickets}

                </span>

              </button>



              {/* My Equipment (available to all roles: Employee, IT Support, Admin) */}
              <button
                type="button"
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'my-equipment' || (currentUser.role === 'EMPLOYEE' && activeTab === 'assets') ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                onClick={() => setActiveTab('my-equipment')}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-[19px] ${activeTab === 'my-equipment' || (currentUser.role === 'EMPLOYEE' && activeTab === 'assets') ? 'text-primary' : ''}`}>devices</span>
                  <span>My Equipment</span>
                </div>
                <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface-variant font-mono">
                  {myAssignedAssets.length}
                </span>
              </button>

              {/* Assets (available to Admin and IT Support) */}
              {currentUser && currentUser.role !== 'EMPLOYEE' && (
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'assets' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
                  onClick={() => setActiveTab('assets')}
                >
                  <div className="flex items-center gap-3">
                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'assets' ? 'text-primary' : ''}`}>inventory_2</span>
                    <span>Assets</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-surface-container text-on-surface-variant font-mono">
                    {totalAssets}
                  </span>
                </button>
              )}



              <button

                type="button"

                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'equipment-requests' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                onClick={() => setActiveTab('equipment-requests')}

              >

                <div className="flex items-center gap-3">

                  <span className={`material-symbols-outlined text-[19px] ${activeTab === 'equipment-requests' ? 'text-primary' : ''}`}>inventory_2</span>

                  <span>Equipment Requests</span>

                </div>

                {equipmentRequests.filter(r => r.status === 'PENDING').length > 0 && (

                  <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-primary/20 text-on-primary-fixed font-mono">

                    {equipmentRequests.filter(r => r.status === 'PENDING').length}

                  </span>

                )}

              </button>



              {currentUser && currentUser.role === 'ADMIN' && (

                <button

                  type="button"

                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'employees' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                  onClick={() => setActiveTab('employees')}

                >

                  <div className="flex items-center gap-3">

                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'employees' ? 'text-primary' : ''}`}>badge</span>

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

                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'sla' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                  onClick={() => setActiveTab('sla')}

                >

                  <div className="flex items-center gap-3">

                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'sla' ? 'text-primary' : ''}`}>timelapse</span>

                    <span>SLA &amp; Performance</span>

                  </div>

                  {activeOverdueCount > 0 ? (

                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-error-container text-on-error-container font-mono" title={`${activeOverdueCount} active overdue SLA incident(s)`}>

                      {activeOverdueCount}

                    </span>

                  ) : breachedTicketsCount > 0 ? (

                    <span className="px-1.5 py-0.5 text-[11px] font-medium rounded-full bg-error-container text-on-error-container font-mono">

                      {breachedTicketsCount}

                    </span>

                  ) : null}

                </button>

              )}



              {currentUser && currentUser.role === 'ADMIN' && (

                <button

                  type="button"

                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors text-left cursor-pointer ${activeTab === 'audit' ? 'bg-primary-fixed text-on-primary-fixed font-semibold border-l-2 border-primary shadow-[0_1px_3px_rgba(0,0,0,0.03)]' : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}

                  onClick={() => setActiveTab('audit')}

                >

                  <div className="flex items-center gap-3">

                    <span className={`material-symbols-outlined text-[19px] ${activeTab === 'audit' ? 'text-primary' : ''}`}>history</span>

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
                   activeTab === 'my-equipment' ? 'My Assigned Equipment' :
                   activeTab === 'assets' ? (currentUser.role === 'EMPLOYEE' ? 'My Assigned Equipment' : 'Assets') :
                   activeTab === 'equipment-requests' ? (currentUser.role === 'EMPLOYEE' ? 'My Hardware Requests' : 'Hardware Provisioning Queue') :
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

            {currentUser && (
              <button
                className="inline-flex items-center gap-1.5 bg-surface-container-high hover:bg-surface-container-highest text-on-surface px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-outline-variant/30"
                type="button"
                onClick={() => setShowEquipmentModal(true)}
                title="Submit a request for company hardware or workstation gear"
              >
                <span className="material-symbols-outlined text-[17px] text-primary">inventory_2</span>
                <span>Request Equipment</span>
              </button>
            )}

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

              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-semibold text-xs shadow-sm"

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

              {/* Context Bar & Title Area */}

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-2">

                <div className="space-y-2">

                  <div className="flex items-center gap-3">

                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-mono text-[11px] font-medium tracking-wide">

                      <span className={`w-1.5 h-1.5 rounded-full ${wsConnected && wsAuthenticated ? "bg-tertiary animate-pulse" : "bg-amber-500"}`}></span>

                      {wsConnected && wsAuthenticated ? "Live Stream Authenticated" : wsConnected ? "Stream Connecting (Auth Pending)" : "Live Database Connected"}

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

                          <span className={`material-symbols-outlined text-[19px] ${activeTab === 'assets' ? 'text-primary' : ''}`}>devices</span>

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

                                <td className="py-3 px-3 font-mono font-medium text-primary cursor-pointer hover:underline" onClick={() => setShowTicketDetailsModal(t)} title="Click to view ticket details">#{t.ticket_id}</td>

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

                                      style={{ borderColor: "var(--primary)", color: "var(--primary)", fontWeight: 600 }}

                                      onClick={() => setShowVerifyModal(t)}

                                      title="Verify resolution and close ticket or report issue still exists"

                                    >

                                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>verified</span>

                                      <span>Verify Resolution</span>

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

                          <div key={a.id || a.asset_id} className="equipment-card-item">

                            <div className="flex items-center gap-3">

                              <div className="equipment-card-icon">

                                <span className="material-symbols-outlined text-[20px]">

                                  {a.type === 'Laptop' ? 'laptop_mac' : a.type === 'Monitor' ? 'desktop_windows' : a.type === 'Keyboard' ? 'keyboard' : 'devices'}

                                </span>

                              </div>

                              <div>

                                <div className="equipment-card-title">{a.brand} {a.model}</div>

                                <div className="equipment-card-subtitle font-mono">SN: {a.serial_number}</div>

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

                        <div className="text-2xl font-headline font-medium text-on-surface">{activeQueueTickets}</div>

                        <span className="text-[11px] text-on-surface-variant mt-0.5 block">{openTickets} open, {activeTickets} active ({assignedTickets} assigned, {inProgressTickets} in-prog)</span>

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

                                  <td className="py-3 px-3 font-mono font-medium text-primary cursor-pointer hover:underline" onClick={() => setShowTicketDetailsModal(t)} title="Click to view ticket details">#{t.ticket_id}</td>

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

                                      <button type="button" className="table-btn" onClick={() => setShowTicketDetailsModal(t)} title="View Ticket Details">Details</button>

                                      <button type="button" className="table-btn" onClick={() => setShowTicketHistoryModal(t)} title="View Activity Trail">History</button>

                                      {currentUser.role === "ADMIN" && t.status !== "CLOSED" && (

                                        <button type="button" className="table-btn" onClick={() => setShowAssignTicketModal(t)}>Assign</button>

                                      )}

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
                        <button
                          type="button"
                          className="text-xs font-medium text-on-surface hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('my-equipment')}
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">devices</span>
                          <span>My Equipment ({myAssignedAssets.length})</span>
                        </button>

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

                        <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant font-label">Active Assigned</span>

                        <span className="material-symbols-outlined text-[16px] text-primary">inbox</span>

                      </div>

                      <div className="mt-2.5">

                        <div className="text-2xl font-headline font-medium text-on-surface">{myOpenTickets}</div>

                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{myOpenTickets} active tickets in your queue</span>

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

                        <span className="text-[10px] text-on-surface-variant block mt-0.5">{nonBreachedCount} compliant ({activeOnTimeCount} active on-time)</span>

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

                      <div className="mt-6 pt-3 flex items-center justify-between border-t border-surface-container-highest/40">
                        <button
                          type="button"
                          className="text-xs font-medium text-on-surface hover:text-primary flex items-center gap-1.5 transition-colors cursor-pointer"
                          onClick={() => setActiveTab('my-equipment')}
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">devices</span>
                          <span>My Equipment ({myAssignedAssets.length})</span>
                        </button>

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

                                  <td className="py-3 px-3 font-mono font-medium text-primary cursor-pointer hover:underline" onClick={() => setShowTicketDetailsModal(t)} title="Click to view ticket details">#{t.ticket_id}</td>

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

                              {log.timestamp ? formatLocalTime(log.timestamp) : 'Live'}

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

                  <option value="">All Statuses ({totalTickets})</option>

                  {unassignedTickets > 0 && (

                    <option value="UNASSIGNED" style={{ color: "#dc2626", fontWeight: 600 }}>⚠️ Unassigned Queue ({unassignedTickets})</option>

                  )}

                  <option value="OPEN">Open ({openTickets})</option>

                  <option value="ASSIGNED">Assigned ({assignedTickets})</option>

                  <option value="IN_PROGRESS">In Progress ({inProgressTickets})</option>

                  <option value="RESOLVED">Resolved ({resolvedTickets})</option>

                  <option value="CLOSED">Closed ({closedTickets})</option>

                </select>



                <button

                  type="button"

                  className="btn-primary-teal"

                  onClick={() => setShowCreateModal(true)}

                  style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}

                >

                  <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add_circle</span>

                  <span>+ New Ticket</span>

                </button>

              </div>



              {currentUser.role === "ADMIN" && unassignedTickets > 0 && filterStatus !== "UNASSIGNED" && (

                <div style={{

                  marginBottom: "1rem",

                  padding: "0.75rem 1.2rem",

                  borderRadius: "8px",

                  background: "rgba(239, 68, 68, 0.08)",

                  border: "1px solid rgba(239, 68, 68, 0.25)",

                  display: "flex",

                  alignItems: "center",

                  justifyContent: "space-between",

                  flexWrap: "wrap",

                  gap: "0.75rem"

                }}>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", color: "#dc2626", fontSize: "0.86rem", fontWeight: 500 }}>

                    <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>warning</span>

                    <span><strong>Action Required:</strong> {unassignedTickets} active ticket{unassignedTickets > 1 ? 's are' : ' is'} currently unassigned. Please assign to an IT Support specialist.</span>

                  </div>

                  <button

                    type="button"

                    className="table-btn"

                    style={{ borderColor: "#dc2626", color: "#dc2626", fontWeight: 600, fontSize: "0.8rem", padding: "0.35rem 0.75rem" }}

                    onClick={() => setFilterStatus("UNASSIGNED")}

                  >

                    View Unassigned Queue

                  </button>

                </div>

              )}



              <div className="table-card">

                <div className="table-header-box">

                  <div>

                    <div className="table-header-title">{currentUser.role === 'EMPLOYEE' ? 'My Support Incident Requests' : currentUser.role === 'SUPPORT' ? 'My Assigned Incident Queue' : 'Enterprise Incident Queue'}</div>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>

                      Showing {filteredTickets.length} of {tickets.length} {currentUser.role === 'SUPPORT' ? 'assigned tickets' : 'total tickets from database'} ({openTickets} Open, {assignedTickets} Assigned, {inProgressTickets} In Progress{unassignedTickets > 0 ? `, ${unassignedTickets} Unassigned` : ''}, {resolvedTickets} Resolved, {closedTickets} Closed)

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



                <div className="table-responsive">

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

                          <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)", cursor: "pointer" }} onClick={() => setShowTicketDetailsModal(t)} title="Click to view ticket details">

                            #{t.ticket_id}

                          </td>

                          <td>

                            <div style={{ fontWeight: 600 }}>{t.title}</div>

                            <ExpandableDescription text={t.description} maxLength={80} />

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

                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>

                              <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>

                                {t.status}

                              </span>

                              {t.status === "RESOLVED" && (

                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium font-mono bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300" title="Ticket is resolved by specialist and awaiting employee confirmation">

                                  Awaiting Verification

                                </span>

                              )}

                              {(t.is_breached || slaMap[t.ticket_id]?.is_breached) && (

                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono bg-error-container text-on-error-container" title={slaMap[t.ticket_id]?.time_description || "SLA Deadline Breached"}>

                                  BREACHED

                                </span>

                              )}

                            </div>

                          </td>

                          <td>

                            {t.assigned_to ? (

                              <span>{t.assigned_to}</span>

                            ) : (

                              <span

                                style={{

                                  display: "inline-flex",

                                  alignItems: "center",

                                  gap: "3px",

                                  padding: "2px 8px",

                                  borderRadius: "4px",

                                  fontSize: "0.74rem",

                                  fontWeight: 600,

                                  backgroundColor: "rgba(239, 68, 68, 0.12)",

                                  color: "#dc2626",

                                  border: "1px solid rgba(239, 68, 68, 0.3)"

                                }}

                                title="No specialist assigned. Awaiting assignment."

                              >

                                <span className="material-symbols-outlined" style={{ fontSize: "12px" }}>warning</span>

                                Unassigned

                              </span>

                            )}

                          </td>

                          <td>

                            <div style={{ display: "flex", gap: "0.4rem" }}>

                              <button className="table-btn" onClick={() => setShowTicketDetailsModal(t)} title="View Ticket Details">

                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>visibility</span>

                                <span>Details</span>

                              </button>

                              <button className="table-btn" onClick={() => setShowTicketHistoryModal(t)} title="View Activity History">

                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>history</span>

                                <span>History</span>

                              </button>

                              {(currentUser.role === "ADMIN" || (currentUser.role === "SUPPORT" && currentUser.user_id === t.assigned_to)) && t.status === "ASSIGNED" && (

                                <button

                                  type="button"

                                  className="table-btn"

                                  style={{ color: "var(--primary)", borderColor: "var(--primary-border)" }}

                                  onClick={async () => {

                                    try {

                                      const res = await fetch(`${API_BASE}/tickets/${t.ticket_id}`, {

                                        method: "PUT",

                                        headers: {

                                          "Content-Type": "application/json",

                                          "Authorization": `Bearer ${token}`

                                        },

                                        body: JSON.stringify({ status: "IN_PROGRESS" })

                                      });

                                      if (res.ok) {

                                        addToast(`Ticket #${t.ticket_id} moved to In Progress!`, "success");

                                        fetchData();

                                      } else {

                                        const err = await res.json().catch(() => null);

                                        addToast(parseApiError(err, res.status, "Failed to start ticket"), "error");

                                      }

                                    } catch (e) {

                                      addToast("Network failure.", "error");

                                    }

                                  }}

                                  title="Move status to In Progress"

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>play_arrow</span>

                                  <span>Start</span>

                                </button>

                              )}

                              {currentUser.role === "ADMIN" && t.status !== "CLOSED" && (

                                <button className="table-btn" onClick={() => setShowAssignTicketModal(t)}>

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>person_add</span>

                                  <span>Assign</span>

                                </button>

                              )}

                              {(currentUser.role === "ADMIN" || (currentUser.role === "SUPPORT" && currentUser.user_id === t.assigned_to)) && t.status !== "RESOLVED" && t.status !== "CLOSED" && (

                                <button className="table-btn" onClick={() => setShowResolveModal(t)}>

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check</span>

                                  <span>Resolve</span>

                                </button>

                              )}

                              {t.status === "RESOLVED" && (currentUser.role === "ADMIN" || currentUser.user_id === t.created_by) && (

                                <button

                                  type="button"

                                  className="table-btn"

                                  style={{ color: "var(--primary)", borderColor: "var(--primary-border)", fontWeight: 600 }}

                                  onClick={() => setShowVerifyModal(t)}

                                  title="Verify resolution and close ticket or report issue still exists"

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>verified</span>

                                  <span>Verify Resolution</span>

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

            </div>

          )}



          {/* TAB 2: ASSET INVENTORY & MY EQUIPMENT */}

          {(activeTab === "assets" || activeTab === "asset-management" || activeTab === "my-equipment") && (

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



                {!isMyEquipmentView && (
                  <select className="filter-select" value={assetStatusFilter} onChange={e => setAssetStatusFilter(e.target.value)}>
                    <option value="">All Statuses ({totalAssets})</option>
                    <option value="ASSIGNED">Assigned ({assignedAssets})</option>
                    <option value="AVAILABLE">Available ({availableAssets})</option>
                    <option value="UNDER_REPAIR">Under Repair ({underRepairAssets})</option>
                    <option value="RETIRED">Retired ({retiredAssets})</option>
                  </select>
                )}

                <select className="filter-select" value={assetTypeFilter} onChange={e => setAssetTypeFilter(e.target.value)}>
                  <option value="">All Device Types</option>
                  <option value="Laptop">Laptop Workstations</option>
                  <option value="Monitor">External Monitors</option>
                  <option value="Keyboard">Keyboards</option>
                  <option value="Server">Edge Servers</option>
                </select>

                {isMyEquipmentView ? (
                  <button
                    type="button"
                    className="btn-primary-teal"
                    onClick={() => setShowEquipmentModal(true)}
                    style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>inventory_2</span>
                    <span>+ Request Equipment</span>
                  </button>
                ) : (
                  currentUser && currentUser.role !== "EMPLOYEE" && (
                    <button
                      type="button"
                      className="btn-primary-teal"
                      onClick={() => setShowCreateAssetModal(true)}
                      style={{ padding: "0.6rem 1.1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>add_circle</span>
                      <span>+ Register Device</span>
                    </button>
                  )
                )}

              </div>

              <div className="table-card">

                <div className="table-header-box">

                  <div>

                    <div className="table-header-title">{isMyEquipmentView ? 'My Assigned Hardware Equipment' : 'Assets'}</div>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>

                      {isMyEquipmentView ? (
                        `Showing ${filteredAssets.length} of ${myAssignedAssets.length} devices in your personal custody (${currentUser ? currentUser.user_id : ''})`
                      ) : (
                        `Showing ${filteredAssets.length} of ${assets.length} tracked devices in database (${assignedAssets} Assigned, ${availableAssets} In Stock, ${underRepairAssets} In Repair, ${retiredAssets} Retired)`
                      )}

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



                <div className="table-responsive">

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
                              {isMyEquipmentView ? (
                                myAssignedAssets.length === 0
                                  ? `No hardware devices currently assigned to your account (${currentUser ? currentUser.user_id : ''}).`
                                  : "No assigned devices match the selected filters"
                              ) : (
                                assets.length === 0 ? "No hardware devices registered in database" : "No hardware devices match the selected filters"
                              )}
                            </span>

                            {isMyEquipmentView && myAssignedAssets.length === 0 ? (
                              <button
                                type="button"
                                className="btn-primary-teal"
                                onClick={() => setShowEquipmentModal(true)}
                                style={{ marginTop: "0.75rem", padding: "0.55rem 1.15rem", fontSize: "0.84rem" }}
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>inventory_2</span>
                                <span>Request Equipment</span>
                              </button>
                            ) : (
                              assets.length > 0 && (assetSearch || assetStatusFilter || assetTypeFilter) && (
                                <button
                                  type="button"
                                  className="table-btn"
                                  onClick={() => { setAssetSearch(""); setAssetStatusFilter(""); setAssetTypeFilter(""); }}
                                  style={{ marginTop: "0.5rem" }}
                                >
                                  Clear Filters
                                </button>
                              )
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
                              {/* Report Issue shortcut for any user viewing their equipment */}
                              {(isMyEquipmentView || a.assigned_to === currentUser?.user_id) && (
                                <button
                                  type="button"
                                  className="table-btn"
                                  onClick={() => {
                                    setCreateTicketInitialData({
                                      asset_id: a.asset_id,
                                      title: `Hardware issue with ${a.brand || ''} ${a.model || a.type} (${a.asset_id})`,
                                      desc: `Reporting a hardware issue for device ${a.type} (Asset ID: ${a.asset_id}, Serial: ${a.serial_number || 'N/A'}).`
                                    });
                                    setShowCreateModal(true);
                                  }}
                                  title="Open Support Ticket for this device"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: "14px", color: "var(--status-critical)" }}>report_problem</span>
                                  <span>Report Issue</span>
                                </button>
                              )}

                              {currentUser.role !== "EMPLOYEE" && !isMyEquipmentView && (
                                <button className="table-btn" onClick={() => setShowEditAssetModal(a)} title="Edit Hardware Details">
                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>
                                  <span>Edit</span>
                                </button>
                              )}

                              {currentUser.role !== "EMPLOYEE" && !isMyEquipmentView && a.status === "AVAILABLE" && (
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

            </div>

          )}



          {/* TAB: EQUIPMENT REQUESTS */}

          {activeTab === "equipment-requests" && (

            <div>

              <div className="table-card">

                <div className="table-header-box">

                  <div>

                    <div className="table-header-title">

                      {currentUser.role === 'EMPLOYEE' ? 'My Hardware Provisioning Requests' : 'Hardware Provisioning Queue'}

                    </div>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>

                      {currentUser.role === 'EMPLOYEE'

                        ? 'Track the status of your equipment requests from review through provisioning and physical receipt.'

                        : 'Review, approve, and provision company hardware for staff.'}

                    </div>

                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>

                    {currentUser.role === 'EMPLOYEE' && (

                      <button

                        type="button"

                        className="btn-primary-teal"

                        onClick={() => setShowEquipmentModal(true)}

                        style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}

                      >

                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>add_circle</span>

                        <span>Request Equipment</span>

                      </button>

                    )}

                    <button

                      type="button"

                      className="table-btn"

                      onClick={fetchData}

                      title="Sync requests from database"

                    >

                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>refresh</span>

                      <span>Sync</span>

                    </button>

                  </div>

                </div>



                <div className="table-responsive">

                <table className="data-table">

                  <thead>

                    <tr>

                      <th>Request ID</th>

                      <th>Requested By</th>

                      <th>Equipment Type</th>

                      <th>Business Justification</th>

                      <th>Status</th>

                      <th>Provisioned Asset</th>

                      <th>Actions</th>

                    </tr>

                  </thead>

                  <tbody>

                    {equipmentRequests.length === 0 ? (

                      <tr>

                        <td colSpan="7" style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>

                            <span className="material-symbols-outlined" style={{ fontSize: "32px", color: "var(--text-dim)" }}>inventory_2</span>

                            <span style={{ fontSize: "0.92rem", fontWeight: 500, color: "var(--text-secondary)" }}>

                              {currentUser.role === 'EMPLOYEE'

                                ? "You have not submitted any equipment requests yet."

                                : "No equipment requests in the queue."}

                            </span>

                            {currentUser.role === 'EMPLOYEE' && (

                              <button

                                type="button"

                                className="btn-primary-teal"

                                onClick={() => setShowEquipmentModal(true)}

                                style={{ marginTop: "0.75rem", padding: "0.5rem 1rem", fontSize: "0.82rem" }}

                              >

                                Submit First Request

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    ) : (

                      equipmentRequests.map(r => (

                        <tr key={r.id || r.request_id}>

                          <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>

                            {r.request_id}

                          </td>

                          <td style={{ fontWeight: 500 }}>

                            {r.requested_by}

                          </td>

                          <td>

                            <span className="badge-status" style={{ background: "var(--bg-subtle)", color: "var(--text-main)", fontWeight: 600 }}>

                              {r.equipment_type}

                            </span>

                          </td>

                          <td style={{ maxWidth: "260px", fontSize: "0.82rem", color: "var(--text-secondary)" }}>

                            {r.reason}

                            {r.admin_notes && (

                              <div style={{ fontSize: "0.75rem", color: "var(--primary)", marginTop: "0.2rem" }}>

                                <strong>Admin:</strong> {r.admin_notes}

                              </div>

                            )}

                            {r.employee_notes && (

                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>

                                <strong>Notes:</strong> {r.employee_notes}

                              </div>

                            )}

                          </td>

                          <td>

                            <span className={`badge-status ${

                              r.status === 'PENDING' ? 'open' :

                              r.status === 'APPROVED' ? 'assigned' :

                              r.status === 'PROVISIONED' ? 'in-progress' :

                              r.status === 'VERIFIED' ? 'resolved' :

                              r.status === 'CLOSED' ? 'closed' : 'critical'

                            }`}>

                              {r.status}

                            </span>

                          </td>

                          <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.82rem" }}>

                            {r.provisioned_asset_id ? (

                              <span style={{ color: "var(--primary)", fontWeight: 600 }}>{r.provisioned_asset_id}</span>

                            ) : (

                              <span style={{ color: "var(--text-muted)" }}>None</span>

                            )}

                          </td>

                          <td>

                            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>

                              {/* ADMIN Actions */}

                              {currentUser.role === 'ADMIN' && r.status === 'PENDING' && (

                                <>

                                  <button

                                    type="button"

                                    className="table-btn"

                                    style={{ color: "var(--status-resolved)", borderColor: "var(--status-resolved)" }}

                                    onClick={async () => {

                                      try {

                                        const res = await fetch(`${API_BASE}/equipment-requests/${r.request_id}/approve`, {

                                          method: "POST",

                                          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

                                          body: JSON.stringify({ admin_notes: "Approved by Administrator" })

                                        });

                                        if (res.ok) {

                                          addToast(`Approved request ${r.request_id}`, "success");

                                          fetchData();

                                        } else {

                                          addToast("Failed to approve request", "error");

                                        }

                                      } catch (e) {

                                        addToast("Network error", "error");

                                      }

                                    }}

                                  >

                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>thumb_up</span>

                                    <span>Approve</span>

                                  </button>

                                  <button

                                    type="button"

                                    className="table-btn"

                                    style={{ color: "var(--status-critical)", borderColor: "var(--status-critical)" }}

                                    onClick={async () => {

                                      try {

                                        const res = await fetch(`${API_BASE}/equipment-requests/${r.request_id}/reject`, {

                                          method: "POST",

                                          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

                                          body: JSON.stringify({ admin_notes: "Rejected due to policy / inventory limitations" })

                                        });

                                        if (res.ok) {

                                          addToast(`Rejected request ${r.request_id}`, "info");

                                          fetchData();

                                        } else {

                                          addToast("Failed to reject request", "error");

                                        }

                                      } catch (e) {

                                        addToast("Network error", "error");

                                      }

                                    }}

                                  >

                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>thumb_down</span>

                                    <span>Reject</span>

                                  </button>

                                </>

                              )}



                              {currentUser.role === 'ADMIN' && r.status === 'APPROVED' && (

                                <button

                                  type="button"

                                  className="table-btn"

                                  style={{ color: "var(--primary)", borderColor: "var(--primary)", fontWeight: 600 }}

                                  onClick={() => setShowProvisionModal(r)}

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>devices</span>

                                  <span>Provision Device</span>

                                </button>

                              )}



                              {/* EMPLOYEE Actions */}

                              {currentUser.role === 'EMPLOYEE' && r.status === 'PROVISIONED' && (

                                <button

                                  type="button"

                                  className="table-btn"

                                  style={{ color: "var(--primary)", borderColor: "var(--primary)", fontWeight: 600 }}

                                  onClick={async () => {

                                    try {

                                      const res = await fetch(`${API_BASE}/equipment-requests/${r.request_id}/verify`, {

                                        method: "POST",

                                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

                                        body: JSON.stringify({ employee_notes: "Physical hardware verified in good condition" })

                                      });

                                      if (res.ok) {

                                        addToast(`Verified receipt of equipment for ${r.request_id}!`, "success");

                                        fetchData();

                                      } else {

                                        addToast("Failed to verify request", "error");

                                      }

                                    } catch (e) {

                                      addToast("Network error", "error");

                                    }

                                  }}

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>verified</span>

                                  <span>Confirm Receipt</span>

                                </button>

                              )}



                              {((currentUser.role === 'EMPLOYEE' && r.status === 'VERIFIED') || (currentUser.role === 'ADMIN' && r.status === 'VERIFIED')) && (

                                <button

                                  type="button"

                                  className="table-btn"

                                  onClick={async () => {

                                    try {

                                      const res = await fetch(`${API_BASE}/equipment-requests/${r.request_id}/close`, {

                                        method: "POST",

                                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

                                        body: JSON.stringify({ employee_notes: "Request fulfilled and closed." })

                                      });

                                      if (res.ok) {

                                        addToast(`Closed equipment request ${r.request_id}`, "success");

                                        fetchData();

                                      } else {

                                        addToast("Failed to close request", "error");

                                      }

                                    } catch (e) {

                                      addToast("Network error", "error");

                                    }

                                  }}

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>lock</span>

                                  <span>Close</span>

                                </button>

                              )}



                              {/* Equipment Request Audit Trail */}

                              <button

                                type="button"

                                className="table-btn"

                                onClick={() => setShowEquipmentHistoryModal(r)}

                                title="View Equipment Request Audit Trail"

                              >

                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>history</span>

                                <span>History</span>

                              </button>

                            </div>

                          </td>

                        </tr>

                      ))

                    )}

                  </tbody>

                </table>

                </div>

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

                    Active Overdue

                  </div>

                  <div className="text-3xl font-headline font-semibold text-error mt-2">

                    {activeOverdueCount}

                  </div>

                  <div className="text-xs text-on-surface-variant mt-1">

                    Requiring priority response ({historicalBreachCount} past)

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

                    {activeOverdueCount} Active Overdue ({breachedTicketsCount} Total Breaches)

                  </span>

                </div>



                <div className="table-responsive">

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

                      .filter(t => {

                        const sla = slaMap[t.ticket_id];

                        if (sla) return sla.is_breached || sla.is_active_overdue;

                        return t.is_breached || t.sla_status === "BREACHED" || (t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED");

                      })

                      .map(t => {

                        const slaInfo = slaMap[t.ticket_id];

                        const isOverdue = slaInfo ? slaInfo.is_active_overdue : (t.status !== "RESOLVED" && t.status !== "CLOSED");

                        const timeDesc = slaInfo?.time_description || (t.is_breached ? "BREACHED" : "ON TRACK");

                        return (

                          <tr key={t.id || t.ticket_id}>

                            <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)", cursor: "pointer" }} onClick={() => setShowTicketDetailsModal(t)} title="Click to view details">

                              #{t.ticket_id}

                            </td>

                            <td>

                              <div style={{ fontWeight: 600 }}>{t.title}</div>

                              <ExpandableDescription text={t.description} maxLength={75} />

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

                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${isOverdue ? 'bg-error-container text-on-error-container' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'}`}>

                                {timeDesc}

                              </span>

                            </td>

                            <td style={{ fontSize: "0.84rem", color: t.assigned_to ? "var(--text-main)" : "var(--text-muted)" }}>

                              {t.assigned_to || "Unassigned"}

                            </td>

                            <td>

                              <div style={{ display: "flex", gap: "0.4rem" }}>

                                <button className="table-btn" onClick={() => setShowTicketDetailsModal(t)} title="View Details">

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>visibility</span>

                                  <span>Details</span>

                                </button>

                                {(currentUser.role === "ADMIN" || (currentUser.role === "SUPPORT" && currentUser.user_id === t.assigned_to)) && t.status !== "RESOLVED" && t.status !== "CLOSED" && (

                                  <button className="table-btn" onClick={() => setShowResolveModal(t)}>

                                    <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>check</span>

                                    <span>Resolve</span>

                                  </button>

                                )}

                              </div>

                            </td>

                          </tr>

                        );

                      })}

                    {tickets.filter(t => {

                      const sla = slaMap[t.ticket_id];

                      if (sla) return sla.is_breached || sla.is_active_overdue;

                      return t.is_breached || t.sla_status === "BREACHED" || (t.priority === "CRITICAL" && t.status !== "RESOLVED" && t.status !== "CLOSED");

                    }).length === 0 && (

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

                    className="btn-primary-teal"

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



                <div className="table-responsive">

                <table className="data-table">

                  <thead>

                    <tr>

                      <th>User ID</th>

                      <th>Full Name</th>

                      <th>Work Email</th>

                      <th>Role</th>

                      <th>Status</th>

                      <th>Actions & Credentials</th>

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

                          <td style={{ fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)", cursor: "pointer" }} onClick={() => setShowUserDetailsModal(u)} title="Click to view user profile and assigned assets">

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

                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>

                              <button

                                className="table-btn"

                                onClick={() => setShowUserDetailsModal(u)}

                                title="View User Details & Custody Assets"

                              >

                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>visibility</span>

                                <span>Details</span>

                              </button>

                              <button

                                className="table-btn"

                                onClick={() => setShowEditUserModal(u)}

                                title="Edit User Information & Role"

                              >

                                <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>

                                <span>Edit</span>

                              </button>

                              {u.status === "PENDING" && (

                                <button

                                  className="table-btn"

                                  title="Re-generate and copy invitation token"

                                  onClick={async () => {

                                    try {

                                      const res = await fetch(`${API_BASE}/users/${u.user_id}/reinvite`, {

                                        method: "POST",

                                        headers: { "Authorization": `Bearer ${token}` }

                                      });

                                      if (res.ok) {

                                        const data = await res.json();

                                        if (navigator.clipboard && data.invitation_token) {

                                          navigator.clipboard.writeText(data.invitation_token);

                                        }

                                        addToast(`Re-invited ${u.name}! New token copied to clipboard.`, "success");

                                        fetchData();

                                      } else {

                                        const err = await res.json().catch(() => ({}));

                                        addToast(parseApiError(err, res.status, "Failed to re-invite user"), "error");

                                      }

                                    } catch (e) {

                                      addToast("Network error contacting directory service.", "error");

                                    }

                                  }}

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>mark_email_read</span>

                                  <span>Re-invite</span>

                                </button>

                              )}

                              {u.invitation_token && (

                                <button

                                  className="table-btn"

                                  title="Copy invitation token to clipboard"

                                  onClick={() => {

                                    if (navigator.clipboard) {

                                      navigator.clipboard.writeText(u.invitation_token);

                                    }

                                    addToast(`Copied token for ${u.name}`, "success");

                                  }}

                                >

                                  <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>content_copy</span>

                                  <span>Token</span>

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



                <div className="table-responsive">

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

                            {log.timestamp ? formatLocalDateTime(log.timestamp) : "Live"}

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
          onClose={() => {
            setShowCreateModal(false);
            setCreateTicketInitialData(null);
          }}
          token={token}
          currentUser={currentUser}
          userAssets={myAssignedAssets}
          allAssets={assets}
          initialData={createTicketInitialData}
          onSuccess={() => {
            setShowCreateModal(false);
            setCreateTicketInitialData(null);
            fetchData();
            addToast("Ticket created successfully!", "success");
          }}
          addToast={addToast}
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

                <button type="submit" className="btn-primary-teal" disabled={isSubmittingInvite}>

                  {isSubmittingInvite ? "Generating..." : "Generate Invitation Token"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* RESOLVE TICKET MODAL */}

      {showResolveModal && (

        <ResolveTicketModal

          ticket={showResolveModal}

          assets={assets}

          token={token}

          onClose={() => { setShowResolveModal(null); setResolveModalError(""); }}

          onSuccess={() => {

            setShowResolveModal(null);

            fetchData();

          }}

          addToast={addToast}

        />

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

                  {usersList.filter(u => u.role === "SUPPORT" && (u.status || "ACTIVE").toUpperCase() === "ACTIVE").length > 0 ? (

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

                <button type="submit" className="btn-primary-teal" disabled={isSubmittingAssignTicket || usersList.filter(u => u.role === "SUPPORT" && (u.status || "ACTIVE").toUpperCase() === "ACTIVE").length === 0}>

                  {isSubmittingAssignTicket ? "Assigning..." : "Assign Engineer"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* TICKET DETAILS MODAL */}

      {showTicketDetailsModal && (

        <TicketDetailsModal

          ticket={showTicketDetailsModal}

          assets={assets}

          currentUser={currentUser}

          token={token}

          onClose={() => setShowTicketDetailsModal(null)}

          onStartProgress={async (ticket) => {

            try {

              const res = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}`, {

                method: "PUT",

                headers: {

                  "Content-Type": "application/json",

                  "Authorization": `Bearer ${token}`

                },

                body: JSON.stringify({ status: "IN_PROGRESS" })

              });

              if (res.ok) {

                setShowTicketDetailsModal(null);

                addToast(`Ticket #${ticket.ticket_id} moved to In Progress!`, "success");

                fetchData();

              } else {

                const err = await res.json().catch(() => null);

                addToast(parseApiError(err, res.status, "Failed to start ticket"), "error");

              }

            } catch (e) {

              addToast("Network failure.", "error");

            }

          }}

          onAssign={(ticket) => {

            setShowTicketDetailsModal(null);

            setShowAssignTicketModal(ticket);

          }}

          onResolve={(ticket) => {

            setShowTicketDetailsModal(null);

            setShowResolveModal(ticket);

          }}

          onCloseTicket={async (ticket) => {

            try {

              const res = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}/close`, {

                method: "POST",

                headers: { "Authorization": `Bearer ${token}` }

              });

              if (res.ok) {

                setShowTicketDetailsModal(null);

                addToast(`Closed ticket ${ticket.ticket_id}`, "success");

                fetchData();

              } else {

                const err = await res.json().catch(() => null);

                const msg = parseApiError(err, res.status, `Failed to close ticket ${ticket.ticket_id}`);

                if (res.status === 401) handleLogout(msg);

                else addToast(msg, "error");

              }

            } catch (e) {

              addToast("Network failure. Could not reach server.", "error");

            }

          }}

          onViewHistory={(ticket) => {

            setShowTicketDetailsModal(null);

            setShowTicketHistoryModal(ticket);

          }}

          onVerify={(ticket) => {

            setShowTicketDetailsModal(null);

            setShowVerifyModal(ticket);

          }}

        />

      )}



      {/* VERIFY RESOLUTION MODAL */}

      {showVerifyModal && (

        <VerifyResolutionModal

          ticket={showVerifyModal}

          currentUser={currentUser}

          token={token}

          onClose={() => setShowVerifyModal(null)}

          onSuccess={() => {

            setShowVerifyModal(null);

            fetchData();

          }}

          addToast={addToast}

        />

      )}



      {/* USER DETAILS MODAL */}

      {showUserDetailsModal && (

        <UserDetailsModal

          user={showUserDetailsModal}

          assets={assets}

          tickets={tickets}

          currentUser={currentUser}

          onClose={() => setShowUserDetailsModal(null)}

          onEditUser={(u) => {

            setShowUserDetailsModal(null);

            setShowEditUserModal(u);

          }}

          onReinviteUser={async (u) => {

            try {

              const res = await fetch(`${API_BASE}/users/${u.user_id}/reinvite`, {

                method: "POST",

                headers: { "Authorization": `Bearer ${token}` }

              });

              if (res.ok) {

                const data = await res.json();

                if (navigator.clipboard && data.invitation_token) {

                  navigator.clipboard.writeText(data.invitation_token);

                }

                addToast(`Regenerated invitation token for ${u.name} (copied to clipboard)`, "success");

                fetchData();

                setShowUserDetailsModal(null);

              } else {

                const err = await res.json().catch(() => ({}));

                addToast(parseApiError(err, res.status, "Failed to re-invite user"), "error");

              }

            } catch (e) {

              addToast("Network error contacting directory service.", "error");

            }

          }}

        />

      )}



      {/* EDIT USER MODAL */}

      {showEditUserModal && (

        <EditUserModal

          user={showEditUserModal}

          token={token}

          onClose={() => setShowEditUserModal(null)}

          onSuccess={() => {

            setShowEditUserModal(null);

            fetchData();

            addToast(`Updated user profile for ${showEditUserModal.name}`, "success");

          }}

          addToast={addToast}

        />

      )}



      {/* TICKET HISTORY MODAL */}

      {showTicketHistoryModal && (

        <TicketHistoryModal

          ticket={showTicketHistoryModal}

          token={token}

          onClose={() => setShowTicketHistoryModal(null)}

        />

      )}



      {showEquipmentHistoryModal && (

        <EquipmentHistoryModal

          request={showEquipmentHistoryModal}

          token={token}

          onClose={() => setShowEquipmentHistoryModal(null)}

        />

      )}



      {/* EQUIPMENT REQUEST MODAL */}

      {showEquipmentModal && (

        <EquipmentRequestModal

          token={token}

          onClose={() => setShowEquipmentModal(false)}

          onSuccess={() => {

            setShowEquipmentModal(false);

            fetchData();

            addToast("Equipment request submitted successfully!", "success");

          }}

          addToast={addToast}

        />

      )}



      {/* EDIT ASSET MODAL */}

      {showEditAssetModal && (

        <EditAssetModal

          asset={showEditAssetModal}

          token={token}

          onClose={() => setShowEditAssetModal(null)}

          onSuccess={() => {

            setShowEditAssetModal(null);

            fetchData();

            addToast(`Hardware asset ${showEditAssetModal.asset_id} updated successfully!`, "success");

          }}

          addToast={addToast}

        />

      )}



      {/* PROVISION EQUIPMENT MODAL */}

      {showProvisionModal && (

        <ProvisionEquipmentModal

          request={showProvisionModal}

          availableAssets={assets.filter(a => a.status === 'AVAILABLE')}

          token={token}

          onClose={() => setShowProvisionModal(null)}

          onSuccess={(allocatedAssetId) => {

            setShowProvisionModal(null);

            fetchData();

            addToast(`Allocated asset ${allocatedAssetId} for request ${showProvisionModal.request_id}!`, "success");

          }}

          addToast={addToast}

        />

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

                <button type="submit" className="btn-primary-teal" disabled={isSubmittingAssignAsset || usersList.length === 0}>

                  {isSubmittingAssignAsset ? "Authorizing..." : "Authorize Custody"}

                </button>

              </div>

            </form>

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

              className="btn-primary-teal"

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

function CreateTicketModal({ onClose, token, onSuccess, addToast, userAssets = [], allAssets = [], currentUser = null, initialData = null }) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [desc, setDesc] = useState(initialData?.desc || "");
  const [selectedAssetId, setSelectedAssetId] = useState(initialData?.asset_id || "");
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

      priority: inferredPriority,

      asset_id: selectedAssetId || null

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



          {/* Hardware Device Selection (Available for Employee, IT Support, and Admin) */}
          {currentUser && (
            <div className="form-field-group">
              <label className="form-field-label">Assigned Hardware Device (Optional)</label>
              <select
                className="apex-form-input"
                style={{ paddingLeft: "1rem" }}
                value={selectedAssetId}
                onChange={e => setSelectedAssetId(e.target.value)}
              >
                <option value="">No specific device (Software / Access / General)</option>
                {currentUser.role === 'EMPLOYEE' ? (
                  userAssets && userAssets.length > 0 && userAssets.map(a => (
                    <option key={a.asset_id} value={a.asset_id}>
                      {a.asset_id} — {a.brand} {a.model} ({a.type})
                    </option>
                  ))
                ) : (
                  <>
                    {userAssets && userAssets.length > 0 && (
                      <optgroup label="My Assigned Equipment">
                        {userAssets.map(a => (
                          <option key={`my-${a.asset_id}`} value={a.asset_id}>
                            {a.asset_id} — {a.brand} {a.model} ({a.type}) [My Equipment]
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {allAssets && allAssets.length > 0 && (
                      <optgroup label="All Company Assets">
                        {allAssets.map(a => (
                          <option key={`all-${a.asset_id}`} value={a.asset_id}>
                            {a.asset_id} — {a.brand} {a.model} ({a.type}) {a.assigned_to ? `[Assigned: ${a.assigned_to}]` : '[In Depository]'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                )}
              </select>

              {currentUser.role === 'EMPLOYEE' && (!userAssets || userAssets.length === 0) && (
                <div style={{
                  padding: "0.6rem 0.85rem",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  border: "1px dashed var(--border-light)",
                  marginTop: "0.4rem"
                }}>
                  No hardware devices currently assigned to your account. You may submit software, network, access, or general tickets.
                </div>
              )}

              {selectedAssetId && (
                <div style={{
                  fontSize: "0.78rem",
                  color: "var(--primary)",
                  marginTop: "0.35rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem"
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>link</span>
                  <span>Ticket linked to Hardware Asset: <strong>{selectedAssetId}</strong></span>
                </div>
              )}
            </div>
          )}



          {/* AI Regex Auto-Classification Preview */}

          <div style={{ padding: "0.75rem 1rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", marginBottom: "1.25rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--border-light)" }}>

            <span style={{ fontWeight: 600, color: "var(--primary)" }}>AI Classifier:</span>

            <span>Category: <strong>{inferredCategory}</strong></span>

            <span style={{ color: "#d5d2cb" }}>|</span>

            <span>Priority: <strong style={{ color: inferredPriority === 'CRITICAL' ? 'var(--status-critical)' : 'inherit' }}>{inferredPriority}</strong></span>

          </div>



          <div className="modal-actions-row">

            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>Cancel</button>

            <button type="submit" className="btn-primary-teal" disabled={submitting}>

              {submitting ? "Submitting..." : "Submit to Queue"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}





// =====================================================================

// Ticket Activity History Modal

// =====================================================================

function TicketHistoryModal({ ticket, token, onClose }) {

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  useEffect(() => {

    if (!ticket) return;

    setLoading(true);

    fetch(`${API_BASE}/tickets/${ticket.ticket_id}/history`, {

      headers: { "Authorization": `Bearer ${token}` }

    })

      .then(async r => {

        if (!r.ok) {

          const err = await r.json().catch(() => ({}));

          throw new Error(err.detail || "Failed to load audit history.");

        }

        return r.json();

      })

      .then(data => setHistory(Array.isArray(data) ? data : []))

      .catch(e => setError(e.message))

      .finally(() => setLoading(false));

  }, [ticket, token]);



  if (!ticket) return null;



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "620px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>

          <div>

            <h2 className="modal-title">Ticket Activity History</h2>

            <p className="modal-desc" style={{ marginBottom: 0 }}>

              Immutable audit ledger for <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>{ticket.ticket_id}</span> — {ticket.title}

            </p>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.25rem 0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", fontSize: "0.82rem" }}>

          <span className="badge-status" style={{ background: "var(--bg-subtle)", color: "var(--text-main)" }}>Category: {ticket.category}</span>

          <span className={`badge-priority ${(ticket.priority || "").toLowerCase()}`}>Priority: {ticket.priority}</span>

          <span className={`badge-status ${(ticket.status || "").toLowerCase().replace('_', '-')}`}>Current: {ticket.status}</span>

          {ticket.asset_id && <span className="badge-status" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>Asset: {ticket.asset_id}</span>}

        </div>



        {error && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", marginBottom: "1rem", color: "var(--status-critical)", fontSize: "0.84rem" }}>

            {error}

          </div>

        )}



        <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "0.5rem" }}>

          {loading ? (

            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>

              <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "24px", color: "var(--primary)" }}>sync</span>

              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>Retrieving audit ledger...</p>

            </div>

          ) : history.length === 0 ? (

            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>

              No recorded history events found for this incident.

            </div>

          ) : (

            <div style={{ position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid var(--border-light)" }}>

              {history.map((h, i) => (

                <div key={h.id || i} style={{ marginBottom: "1.25rem", position: "relative" }}>

                  <div style={{

                    position: "absolute",

                    left: "-1.9rem",

                    top: "0.25rem",

                    width: "12px",

                    height: "12px",

                    borderRadius: "50%",

                    background: h.changed_by === "SYSTEM" ? "var(--primary)" : "var(--primary-hover)",

                    border: "2px solid var(--surface-bg)"

                  }} />



                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>

                      {h.changed_by === "SYSTEM" ? (

                        <span style={{

                          display: "inline-flex",

                          alignItems: "center",

                          gap: "0.25rem",

                          background: "var(--primary-subtle)",

                          color: "var(--primary-dark)",

                          padding: "0.15rem 0.5rem",

                          borderRadius: "var(--radius-sm)",

                          fontSize: "0.75rem",

                          fontWeight: 600,

                          fontFamily: "var(--font-mono)"

                        }}>

                          <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>smart_toy</span>

                          SYSTEM (Auto-Policy)

                        </span>

                      ) : (

                        <span style={{

                          display: "inline-flex",

                          alignItems: "center",

                          gap: "0.25rem",

                          background: "var(--bg-subtle)",

                          color: "var(--text-main)",

                          padding: "0.15rem 0.5rem",

                          borderRadius: "var(--radius-sm)",

                          fontSize: "0.75rem",

                          fontWeight: 600,

                          fontFamily: "var(--font-mono)"

                        }}>

                          <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>person</span>

                          {h.changed_by}

                        </span>

                      )}

                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>

                        {h.old_status === "NONE" ? "Initial State" : `${h.old_status} → ${h.new_status}`}

                      </span>

                    </div>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>

                      {h.timestamp ? formatLocalDateTime(h.timestamp) : ""}

                    </span>

                  </div>



                  {h.assignment_method && (

                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.3rem", paddingLeft: "0.2rem", fontSize: "0.78rem" }}>

                      <span style={{

                        padding: "0.15rem 0.5rem",

                        borderRadius: "var(--radius-sm)",

                        background: h.assignment_method === "AUTOMATIC" ? "var(--primary-soft)" : "var(--bg-subtle)",

                        color: h.assignment_method === "AUTOMATIC" ? "var(--primary)" : "var(--text-main)",

                        border: "1px solid " + (h.assignment_method === "AUTOMATIC" ? "var(--primary-border)" : "var(--border-light)"),

                        fontWeight: 600,

                        fontFamily: "var(--font-mono)"

                      }}>

                        {h.assignment_method === "AUTOMATIC" ? "⚡ AUTOMATIC" : "👤 MANUAL"}

                      </span>

                      <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>

                        {h.previous_assignee ? `${h.previous_assignee} → ${h.new_assignee}` : `Assigned to: ${h.new_assignee}`}

                      </span>

                    </div>

                  )}



                  {h.comment && (

                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.25rem", paddingLeft: "0.2rem" }}>

                      {h.comment}

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>



        <div className="modal-actions-row" style={{ marginTop: "1.25rem" }}>

          <button type="button" className="btn-secondary-parchment" onClick={onClose}>Close</button>

        </div>

      </div>

    </div>

  );

}



// =====================================================================

// Equipment Request Audit History Modal

// =====================================================================

function EquipmentHistoryModal({ request, token, onClose }) {

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");



  useEffect(() => {

    if (!request) return;

    setLoading(true);

    fetch(`${API_BASE}/equipment-requests/${request.request_id}/history`, {

      headers: { "Authorization": `Bearer ${token}` }

    })

      .then(async r => {

        if (!r.ok) {

          const err = await r.json().catch(() => ({}));

          throw new Error(err.detail || "Failed to load audit history.");

        }

        return r.json();

      })

      .then(data => setHistory(Array.isArray(data) ? data : []))

      .catch(e => setError(e.message))

      .finally(() => setLoading(false));

  }, [request, token]);



  if (!request) return null;



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "620px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>

          <div>

            <h2 className="modal-title">Equipment Request Audit Trail</h2>

            <p className="modal-desc" style={{ marginBottom: 0 }}>

              Immutable audit ledger for <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>{request.request_id}</span> ({request.equipment_type})

            </p>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.25rem 0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", fontSize: "0.82rem" }}>

          <span className="badge-status" style={{ background: "var(--bg-subtle)", color: "var(--text-main)" }}>Requested by: {request.requested_by}</span>

          <span className={`badge-status ${(request.status || "").toLowerCase().replace('_', '-')}`}>Current: {request.status}</span>

          {request.provisioned_asset_id && (

            <span className="badge-status" style={{ background: "var(--primary-soft)", color: "var(--primary)" }}>Asset: {request.provisioned_asset_id}</span>

          )}

        </div>



        {error && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", marginBottom: "1rem", color: "var(--status-critical)", fontSize: "0.84rem" }}>

            {error}

          </div>

        )}



        <div style={{ maxHeight: "360px", overflowY: "auto", paddingRight: "0.5rem" }}>

          {loading ? (

            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>

              <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "24px", color: "var(--primary)" }}>sync</span>

              <p style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>Retrieving audit ledger...</p>

            </div>

          ) : history.length === 0 ? (

            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>

              No recorded history events found for this request.

            </div>

          ) : (

            <div style={{ position: "relative", paddingLeft: "1.5rem", borderLeft: "2px solid var(--border-light)" }}>

              {history.map((h, i) => (

                <div key={h.id || i} style={{ marginBottom: "1.25rem", position: "relative" }}>

                  <div style={{

                    position: "absolute",

                    left: "-1.9rem",

                    top: "0.25rem",

                    width: "12px",

                    height: "12px",

                    borderRadius: "50%",

                    background: "var(--primary)",

                    border: "2px solid var(--bg-canvas)"

                  }} />



                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>

                      <span style={{

                        display: "inline-flex",

                        alignItems: "center",

                        gap: "0.25rem",

                        background: "var(--bg-subtle)",

                        color: "var(--text-main)",

                        padding: "0.15rem 0.5rem",

                        borderRadius: "var(--radius-sm)",

                        fontSize: "0.75rem",

                        fontWeight: 600,

                        fontFamily: "var(--font-mono)"

                      }}>

                        <span className="material-symbols-outlined" style={{ fontSize: "13px" }}>person</span>

                        {h.actor}

                      </span>

                      <span style={{

                        padding: "0.15rem 0.5rem",

                        borderRadius: "var(--radius-sm)",

                        background: "var(--primary-soft)",

                        color: "var(--primary)",

                        border: "1px solid var(--primary-border)",

                        fontSize: "0.75rem",

                        fontWeight: 600,

                        fontFamily: "var(--font-mono)"

                      }}>

                        {h.action}

                      </span>

                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>

                        {h.old_status ? `${h.old_status} → ${h.new_status}` : `→ ${h.new_status}`}

                      </span>

                    </div>

                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>

                      {h.timestamp ? formatLocalDateTime(h.timestamp) : ""}

                    </span>

                  </div>



                  {h.asset_id && (

                    <div style={{ fontSize: "0.8rem", color: "var(--primary)", fontFamily: "var(--font-mono)", marginTop: "0.2rem" }}>

                      Allocated Asset: {h.asset_id}

                    </div>

                  )}



                  {h.notes && (

                    <div style={{ fontSize: "0.84rem", color: "var(--text-secondary)", marginTop: "0.2rem", paddingLeft: "0.2rem" }}>

                      {h.notes}

                    </div>

                  )}

                </div>

              ))}

            </div>

          )}

        </div>



        <div className="modal-actions-row" style={{ marginTop: "1.25rem" }}>

          <button type="button" className="btn-secondary-parchment" onClick={onClose}>Close</button>

        </div>

      </div>

    </div>

  );

}



// =====================================================================

// Equipment Request Modal (Employee)

// =====================================================================

function EquipmentRequestModal({ onClose, token, onSuccess, addToast }) {

  const [equipmentType, setEquipmentType] = useState("Laptop");

  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [apiError, setApiError] = useState("");



  const types = ["Laptop", "Monitor", "Keyboard", "Mouse", "Printer", "Headset", "Webcam", "Docking Station", "Other"];



  const handleSubmit = async (e) => {

    e.preventDefault();

    setApiError("");

    if (!reason.trim() || reason.trim().length < 5) {

      setApiError("Business reason must be at least 5 characters.");

      return;

    }

    setSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/equipment-requests`, {

        method: "POST",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify({ equipment_type: equipmentType, reason: reason.trim() })

      });

      if (res.ok) {

        onSuccess();

      } else {

        const err = await res.json().catch(() => ({}));

        const msg = parseApiError(err, res.status, "Failed to submit equipment request.");

        setApiError(msg);

      }

    } catch (err) {

      setApiError("Network error: Could not reach server to submit equipment request.");

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="modal-backdrop">

      <div className="modal-surface">

        <h2 className="modal-title">Request Hardware Equipment</h2>

        <p className="modal-desc">Submit a hardware provisioning request for administrator review and approval.</p>



        {apiError && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", marginBottom: "1.15rem", color: "var(--status-critical)", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>

            <span>{apiError}</span>

          </div>

        )}



        <form onSubmit={handleSubmit}>

          <div className="form-field-group">

            <label className="form-field-label">Equipment Type *</label>

            <select

              className="apex-form-input"

              style={{ paddingLeft: "1rem" }}

              value={equipmentType}

              onChange={e => setEquipmentType(e.target.value)}

              required

            >

              {types.map(t => (

                <option key={t} value={t}>{t}</option>

              ))}

            </select>

          </div>



          <div className="form-field-group">

            <label className="form-field-label">Business Justification &amp; Requirements *</label>

            <textarea

              className="apex-form-input"

              style={{ height: "100px", padding: "0.75rem 1rem" }}

              placeholder="Explain project requirements, device specifications needed, and business impact..."

              value={reason}

              onChange={e => setReason(e.target.value)}

              required

              minLength="5"

            />

          </div>



          <div className="modal-actions-row">

            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>Cancel</button>

            <button type="submit" className="btn-primary-teal" disabled={submitting}>

              {submitting ? "Submitting Request..." : "Submit Request"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



// =====================================================================

// Edit Asset Modal (Admin / Support)

// =====================================================================

function EditAssetModal({ asset, token, onClose, onSuccess, addToast }) {

  const [brand, setBrand] = useState(asset.brand || "");

  const [model, setModel] = useState(asset.model || "");

  const [assetType, setAssetType] = useState(asset.type || "Laptop");

  const [serial, setSerial] = useState(asset.serial_number || "");

  const [statusVal, setStatusVal] = useState(asset.status || "AVAILABLE");

  const [submitting, setSubmitting] = useState(false);

  const [apiError, setApiError] = useState("");



  const handleSubmit = async (e) => {

    e.preventDefault();

    setApiError("");

    setSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/assets/${asset.asset_id}`, {

        method: "PUT",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify({

          brand: brand.trim(),

          model: model.trim(),

          type: assetType,

          serial_number: serial.trim(),

          status: statusVal

        })

      });

      if (res.ok) {

        onSuccess();

      } else {

        const err = await res.json().catch(() => ({}));

        const msg = parseApiError(err, res.status, "Failed to update asset.");

        setApiError(msg);

      }

    } catch (err) {

      setApiError("Network error: Could not reach server to update asset.");

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="modal-backdrop">

      <div className="modal-surface">

        <h2 className="modal-title">Edit Hardware Asset ({asset.asset_id})</h2>

        <p className="modal-desc">Modify hardware specifications, device classifications, or maintenance status.</p>



        {apiError && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", marginBottom: "1.15rem", color: "var(--status-critical)", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>

            <span>{apiError}</span>

          </div>

        )}



        <form onSubmit={handleSubmit}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            <div className="form-field-group">

              <label className="form-field-label">Brand *</label>

              <input type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} value={brand} onChange={e => setBrand(e.target.value)} required />

            </div>

            <div className="form-field-group">

              <label className="form-field-label">Model *</label>

              <input type="text" className="apex-form-input" style={{ paddingLeft: "1rem" }} value={model} onChange={e => setModel(e.target.value)} required />

            </div>

          </div>



          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            <div className="form-field-group">

              <label className="form-field-label">Device Type *</label>

              <select className="apex-form-input" style={{ paddingLeft: "1rem" }} value={assetType} onChange={e => setAssetType(e.target.value)} required>

                <option value="Laptop">Laptop</option>

                <option value="Monitor">Monitor</option>

                <option value="Keyboard">Keyboard</option>

                <option value="Mouse">Mouse</option>

                <option value="Printer">Printer</option>

                <option value="Server">Server</option>

                <option value="Other">Other</option>

              </select>

            </div>

            <div className="form-field-group">

              <label className="form-field-label">Operational Status *</label>

              <select className="apex-form-input" style={{ paddingLeft: "1rem" }} value={statusVal} onChange={e => setStatusVal(e.target.value)} required>

                <option value="AVAILABLE">Available (In Depository)</option>

                <option value="ASSIGNED">Assigned (In Custody)</option>

                <option value="UNDER_REPAIR">Under Repair</option>

                <option value="RETIRED">Retired / Decommissioned</option>

              </select>

            </div>

          </div>



          <div className="form-field-group">

            <label className="form-field-label">Serial Number *</label>

            <input type="text" className="apex-form-input" style={{ paddingLeft: "1rem", fontFamily: "var(--font-mono)" }} value={serial} onChange={e => setSerial(e.target.value)} required />

          </div>



          <div className="modal-actions-row">

            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>Cancel</button>

            <button type="submit" className="btn-primary-teal" disabled={submitting}>

              {submitting ? "Saving..." : "Save Asset Changes"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



// =====================================================================

// Provision Equipment Modal (Admin)

// =====================================================================

function ProvisionEquipmentModal({ request, availableAssets = [], token, onClose, onSuccess, addToast }) {

  const [selectedAssetId, setSelectedAssetId] = useState(availableAssets[0]?.asset_id || "");

  const [adminNotes, setAdminNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [apiError, setApiError] = useState("");



  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!selectedAssetId) {

      setApiError("Please select a hardware asset to provision.");

      return;

    }

    setSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/equipment-requests/${request.request_id}/provision`, {

        method: "POST",

        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },

        body: JSON.stringify({

          provisioned_asset_id: selectedAssetId,

          admin_notes: adminNotes.trim() || undefined

        })

      });

      if (res.ok) {

        onSuccess(selectedAssetId);

      } else {

        const err = await res.json().catch(() => ({}));

        const msg = parseApiError(err, res.status, "Failed to provision equipment.");

        setApiError(msg);

      }

    } catch (err) {

      setApiError("Network error: Could not reach server to provision equipment.");

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="modal-backdrop">

      <div className="modal-surface">

        <h2 className="modal-title">Provision Equipment ({request.request_id})</h2>

        <p className="modal-desc">

          Allocate physical hardware for <strong>{request.requested_by}</strong> ({request.equipment_type}).

        </p>



        {apiError && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", marginBottom: "1.15rem", color: "var(--status-critical)", fontSize: "0.84rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>error</span>

            <span>{apiError}</span>

          </div>

        )}



        <form onSubmit={handleSubmit}>

          <div className="form-field-group">

            <label className="form-field-label">Requested Item &amp; Reason</label>

            <div style={{ padding: "0.75rem 1rem", background: "var(--bg-subtle)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", border: "1px solid var(--border-light)" }}>

              <div><strong>Type:</strong> {request.equipment_type}</div>

              <div style={{ marginTop: "0.25rem", color: "var(--text-secondary)" }}><strong>Reason:</strong> {request.reason}</div>

            </div>

          </div>



          <div className="form-field-group">

            <label className="form-field-label">Select Available Asset from Depository *</label>

            <select

              className="apex-form-input"

              style={{ paddingLeft: "1rem" }}

              value={selectedAssetId}

              onChange={e => setSelectedAssetId(e.target.value)}

              required

            >

              {availableAssets.length > 0 ? (

                availableAssets.map(a => (

                  <option key={a.asset_id} value={a.asset_id}>

                    {a.asset_id} — {a.brand} {a.model} ({a.type}) [SN: {a.serial_number}]

                  </option>

                ))

              ) : (

                <option value="">No available assets in depository</option>

              )}

            </select>

          </div>



          <div className="form-field-group">

            <label className="form-field-label">Provisioning Notes (Optional)</label>

            <input

              type="text"

              className="apex-form-input"

              style={{ paddingLeft: "1rem" }}

              placeholder="e.g., Asset configured with standard engineering bundle"

              value={adminNotes}

              onChange={e => setAdminNotes(e.target.value)}

            />

          </div>



          <div className="modal-actions-row">

            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>Cancel</button>

            <button type="submit" className="btn-primary-teal" disabled={submitting || !selectedAssetId}>

              {submitting ? "Provisioning..." : "Confirm Provisioning"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



// Render React 18 Application

ReactDOM.createRoot(document.getElementById("root")).render(<App />);





// =====================================================================

// TICKET DETAILS DRAWER / MODAL (Tuesday Requirement)

// =====================================================================

function TicketDetailsModal({ ticket, assets = [], currentUser, token, onClose, onAssign, onResolve, onCloseTicket, onViewHistory, onStartProgress, onVerify }) {

  if (!ticket) return null;



  const matchedAsset = ticket.asset_id ? assets.find(a => a.asset_id === ticket.asset_id) : null;

  const createdDate = (ticket.created_date || ticket.created_at) ? formatLocalDateTime(ticket.created_date || ticket.created_at) : "Unknown";

  const closedDate = (ticket.closed_date || ticket.closed_at) ? formatLocalDateTime(ticket.closed_date || ticket.closed_at) : null;



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "680px" }}>

        {/* Header */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

            <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "22px" }}>confirmation_number</span>

            </div>

            <div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

                <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>

                  #{ticket.ticket_id}

                </span>

                <span className={`badge-priority ${(ticket.priority || "").toLowerCase()}`}>

                  {ticket.priority}

                </span>

                <span className={`badge-status ${(ticket.status || "").toLowerCase().replace('_', '-')}`}>

                  {ticket.status}

                </span>

              </div>

              <h2 className="modal-title" style={{ fontSize: "1.25rem", margin: "0.2rem 0 0 0" }}>

                {ticket.title}

              </h2>

            </div>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.3rem 0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        {/* Metadata Details Grid */}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.85rem", marginBottom: "1.25rem" }}>

          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Requester</div>

            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", marginTop: "0.15rem", fontFamily: "var(--font-mono)" }}>

              {ticket.created_by}

            </div>

          </div>



          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Assigned Specialist</div>

            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: ticket.assigned_to ? "var(--primary)" : "var(--text-muted)", marginTop: "0.15rem", fontFamily: "var(--font-mono)" }}>

              {ticket.assigned_to || "Unassigned"}

            </div>

          </div>



          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Category</div>

            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-main)", marginTop: "0.15rem" }}>

              {ticket.category}

            </div>

          </div>



          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Submitted On</div>

            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>

              {createdDate}

            </div>

          </div>



          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>SLA Status</div>

            <div style={{ fontSize: "0.85rem", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>

              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono ${ticket.is_breached ? 'bg-error-container text-on-error-container' : 'bg-primary/10 text-primary'}`}>

                {ticket.is_breached ? "SLA BREACHED" : "WITHIN SLA"}

              </span>

              {ticket.sla_deadline && (

                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>

                  Target: {formatLocalDateTime(ticket.sla_deadline)}

                </span>

              )}

            </div>

          </div>

        </div>



        {/* Associated Hardware Asset (if attached) */}

        {ticket.asset_id && (

          <div style={{ background: "var(--primary-subtle)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", marginBottom: "1.25rem" }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--primary)" }}>devices</span>

              <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--primary)" }}>

                Linked Hardware Custody

              </span>

            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

              <div>

                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)", marginRight: "0.5rem" }}>

                  {ticket.asset_id}

                </span>

                <span style={{ fontWeight: 500, fontSize: "0.88rem" }}>

                  {matchedAsset ? `${matchedAsset.brand} ${matchedAsset.model} (${matchedAsset.type})` : "Inventory Asset"}

                </span>

              </div>

              {matchedAsset && (

                <span className={`badge-status ${(matchedAsset.status || "").toLowerCase()}`}>

                  {matchedAsset.status}

                </span>

              )}

            </div>

          </div>

        )}



        {/* Incident Description */}

        <div style={{ marginBottom: "1.25rem" }}>

          <div style={{ fontSize: "0.78rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.35rem" }}>

            Issue Description &amp; Business Impact

          </div>

          <div style={{

            background: "var(--bg-canvas)",

            border: "1px solid var(--border-light)",

            borderRadius: "var(--radius-md)",

            padding: "1rem",

            fontSize: "0.9rem",

            lineHeight: 1.6,

            color: "var(--text-main)",

            whiteSpace: "pre-wrap"

          }}>

            {ticket.description}

          </div>

        </div>



        {/* Resolution Information Panel */}

        {(ticket.resolution || ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (

          <div style={{

            background: "var(--status-resolved-bg)",

            border: "1px solid var(--status-resolved-border)",

            borderRadius: "var(--radius-md)",

            padding: "1rem",

            marginBottom: "1.25rem"

          }}>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "20px", color: "var(--status-resolved-text)" }}>check_circle</span>

              <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--status-resolved-text)" }}>

                Resolution Information

              </span>

            </div>

            <div style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.5, marginBottom: "0.5rem" }}>

              {ticket.resolution || "Service specialist verified and marked resolution."}

            </div>

            {closedDate && (

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>

                Closure Recorded: {closedDate}

              </div>

            )}

          </div>

        )}



        {/* Modal Actions Bar */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem", borderTop: "1px solid var(--border-light)", paddingTop: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>

          <button

            type="button"

            className="table-btn"

            onClick={() => onViewHistory(ticket)}

            title="View Immutable Audit Trail"

            style={{ fontWeight: 600 }}

          >

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>history</span>

            <span>View Activity History</span>

          </button>



          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>

            {currentUser && currentUser.role === "ADMIN" && ticket.status !== "CLOSED" && (

              <button

                type="button"

                className="table-btn"

                onClick={() => onAssign(ticket)}

                title="Manually assign or reassign ticket"

              >

                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>person_add</span>

                <span>{ticket.assigned_to ? "Reassign Specialist" : "Assign Specialist"}</span>

              </button>

            )}



            {currentUser && (currentUser.role === "ADMIN" || currentUser.user_id === ticket.assigned_to) && ticket.status === "ASSIGNED" && onStartProgress && (

              <button

                type="button"

                className="table-btn"

                style={{ borderColor: "var(--primary)", color: "var(--primary)", fontWeight: 600 }}

                onClick={() => onStartProgress(ticket)}

                title="Move ticket status to IN_PROGRESS"

              >

                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>play_arrow</span>

                <span>Start Working</span>

              </button>

            )}



            {currentUser && (currentUser.role === "ADMIN" || (currentUser.role === "SUPPORT" && currentUser.user_id === ticket.assigned_to)) && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (

              <button

                type="button"

                className="table-btn"

                style={{ borderColor: "var(--primary)", color: "var(--primary)", fontWeight: 600 }}

                onClick={() => onResolve(ticket)}

              >

                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>check</span>

                <span>Resolve Ticket</span>

              </button>

            )}



            {ticket.status === "RESOLVED" && (currentUser.role === "ADMIN" || currentUser.user_id === ticket.created_by) && (

              <button

                type="button"

                className="btn-primary-teal"

                style={{ padding: "0.5rem 1rem", fontSize: "0.84rem" }}

                onClick={() => onVerify ? onVerify(ticket) : onCloseTicket(ticket)}

                title="Verify resolution and close ticket or report issue still exists"

              >

                <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>verified</span>

                <span>Verify Resolution</span>

              </button>

            )}



            <button type="button" className="btn-secondary-parchment" onClick={onClose}>

              Dismiss

            </button>

          </div>

        </div>

      </div>

    </div>

  );

}



// =====================================================================

// USER PROFILE & ASSIGNED ASSETS DETAILS MODAL (Tuesday Requirement)

// =====================================================================

function UserDetailsModal({ user, assets = [], tickets = [], currentUser, onClose, onEditUser, onReinviteUser }) {

  if (!user) return null;



  const userAssets = assets.filter(a => a.assigned_to === user.user_id);

  const userTickets = tickets.filter(t => t.created_by === user.user_id || t.assigned_to === user.user_id);



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "660px" }}>

        {/* Header */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.75rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>badge</span>

            </div>

            <div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>

                <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)" }}>

                  {user.user_id}

                </span>

                <span className={`badge-priority ${(user.role || "").toLowerCase() === 'admin' ? 'critical' : (user.role || "").toLowerCase() === 'support' ? 'high' : 'medium'}`}>

                  {user.role}

                </span>

                <span className={`badge-status ${user.status === 'ACTIVE' ? 'resolved' : 'closed'}`}>

                  {user.status}

                </span>

              </div>

              <h2 className="modal-title" style={{ fontSize: "1.25rem", margin: "0.2rem 0 0 0" }}>

                {user.name}

              </h2>

            </div>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.3rem 0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        {/* User Info Grid */}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>

          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Work Email</div>

            <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-main)", marginTop: "0.15rem" }}>

              {user.email}

            </div>

          </div>

          <div style={{ background: "var(--bg-subtle)", padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-light)" }}>

            <div style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", fontWeight: 600 }}>Department</div>

            <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-main)", marginTop: "0.15rem" }}>

              {user.department || "Enterprise Workforce"}

            </div>

          </div>

        </div>



        {/* Assigned Hardware Assets Section */}

        <div style={{ marginBottom: "1.25rem" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>

            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary)" }}>devices</span>

              <span>Assigned Hardware Custody ({userAssets.length})</span>

            </div>

          </div>

          {userAssets.length === 0 ? (

            <div style={{ padding: "1rem", background: "var(--bg-subtle)", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>

              No hardware devices currently in custody for this employee account.

            </div>

          ) : (

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "160px", overflowY: "auto" }}>

              {userAssets.map(a => (

                <div key={a.id || a.asset_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.85rem", background: "var(--bg-canvas)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>

                  <div>

                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)", marginRight: "0.5rem" }}>{a.asset_id}</span>

                    <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{a.brand} {a.model} ({a.type})</span>

                  </div>

                  <span className={`badge-status ${(a.status || "").toLowerCase()}`}>{a.status}</span>

                </div>

              ))}

            </div>

          )}

        </div>



        {/* Associated ServiceDesk Tickets */}

        <div style={{ marginBottom: "1.25rem" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>

            <div style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "0.4rem" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary)" }}>confirmation_number</span>

              <span>Recent ServiceDesk Incidents ({userTickets.length})</span>

            </div>

          </div>

          {userTickets.length === 0 ? (

            <div style={{ padding: "1rem", background: "var(--bg-subtle)", border: "1px dashed var(--border-light)", borderRadius: "var(--radius-md)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>

              No active or historical tickets recorded for this workforce account.

            </div>

          ) : (

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "160px", overflowY: "auto" }}>

              {userTickets.slice(0, 5).map(t => (

                <div key={t.id || t.ticket_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.85rem", background: "var(--bg-canvas)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)" }}>

                  <div>

                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)", marginRight: "0.5rem" }}>#{t.ticket_id}</span>

                    <span style={{ fontWeight: 500, fontSize: "0.85rem" }}>{t.title}</span>

                  </div>

                  <div style={{ display: "flex", gap: "0.4rem" }}>

                    <span className={`badge-priority ${(t.priority || "").toLowerCase()}`}>{t.priority}</span>

                    <span className={`badge-status ${(t.status || "").toLowerCase().replace('_', '-')}`}>{t.status}</span>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>



        {/* Modal Actions */}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", borderTop: "1px solid var(--border-light)", paddingTop: "1rem" }}>

          {currentUser && currentUser.role === "ADMIN" && user.status === "PENDING" && (

            <button

              type="button"

              className="table-btn"

              onClick={() => onReinviteUser(user)}

              title="Generate new invitation token and copy to clipboard"

            >

              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>mark_email_read</span>

              <span>Re-send Invite Token</span>

            </button>

          )}



          {currentUser && currentUser.role === "ADMIN" && (

            <button

              type="button"

              className="btn-primary-teal"

              style={{ padding: "0.5rem 1rem", fontSize: "0.84rem" }}

              onClick={() => onEditUser(user)}

            >

              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>edit</span>

              <span>Edit User Profile</span>

            </button>

          )}



          <button type="button" className="btn-secondary-parchment" onClick={onClose}>

            Close

          </button>

        </div>

      </div>

    </div>

  );

}



// =====================================================================

// EDIT USER MODAL (Tuesday Requirement - PUT /users/{user_id})

// =====================================================================

function EditUserModal({ user, token, onClose, onSuccess, addToast }) {

  if (!user) return null;



  const [name, setName] = useState(user.name || "");

  const [role, setRole] = useState(user.role || "EMPLOYEE");

  const [department, setDepartment] = useState(user.department || "Engineering");

  const [status, setStatus] = useState(user.status || "ACTIVE");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");



  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");

    if (!name.trim()) {

      setError("Full name is required.");

      return;

    }

    setIsSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/users/${user.user_id}`, {

        method: "PUT",

        headers: {

          "Content-Type": "application/json",

          "Authorization": `Bearer ${token}`

        },

        body: JSON.stringify({

          name: name.trim(),

          role,

          department: department.trim(),

          status

        })

      });

      if (res.ok) {

        onSuccess();

      } else {

        const err = await res.json().catch(() => ({}));

        const msg = parseApiError(err, res.status, "Failed to update user profile");

        setError(msg);

        addToast(msg, "error");

      }

    } catch (e) {

      setError("Network failure updating user profile.");

      addToast("Network failure updating user profile.", "error");

    } finally {

      setIsSubmitting(false);

    }

  };



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "520px" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>

          <div>

            <h2 className="modal-title">Edit Workforce Profile</h2>

            <p className="modal-desc" style={{ marginBottom: 0 }}>

              Update directory attributes for <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--primary)" }}>{user.user_id}</span>

            </p>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.25rem 0.5rem" }}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        {error && (

          <div style={{ padding: "0.75rem 1rem", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "var(--radius-md)", margin: "1rem 0", color: "var(--status-critical)", fontSize: "0.84rem" }}>

            {error}

          </div>

        )}



        <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>

          <div className="form-field-group">

            <label className="form-field-label">Full Name</label>

            <input

              type="text"

              className="apex-form-input"

              value={name}

              onChange={e => setName(e.target.value)}

              required

            />

          </div>



          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

            <div className="form-field-group">

              <label className="form-field-label">System Role</label>

              <select

                className="apex-form-input"

                value={role}

                onChange={e => setRole(e.target.value)}

              >

                <option value="EMPLOYEE">EMPLOYEE</option>

                <option value="SUPPORT">SUPPORT</option>

                <option value="ADMIN">ADMIN</option>

              </select>

            </div>



            <div className="form-field-group">

              <label className="form-field-label">Account Status</label>

              <select

                className="apex-form-input"

                value={status}

                onChange={e => setStatus(e.target.value)}

              >

                <option value="ACTIVE">ACTIVE</option>

                <option value="PENDING">PENDING</option>

                <option value="DISABLED">DISABLED</option>

              </select>

            </div>

          </div>



          <div className="form-field-group">

            <label className="form-field-label">Department</label>

            <input

              type="text"

              className="apex-form-input"

              value={department}

              onChange={e => setDepartment(e.target.value)}

              placeholder="e.g. Engineering, IT Support, Operations"

            />

          </div>



          <div className="modal-actions-row">

            <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={isSubmitting}>

              Cancel

            </button>

            <button type="submit" className="btn-primary-teal" disabled={isSubmitting}>

              {isSubmitting ? "Saving Updates..." : "Save Changes"}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}





function ResolveTicketModal({ ticket, assets, token, onClose, onSuccess, addToast }) {

  const [notes, setNotes] = useState("");

  const [isNonRepairable, setIsNonRepairable] = useState(false);

  const [oldAssetId, setOldAssetId] = useState(ticket?.asset_id || "");

  const [allocationMode, setAllocationMode] = useState("auto"); // 'auto' or 'manual'

  const [replacementAssetId, setReplacementAssetId] = useState("");

  const [filterByTypeOnly, setFilterByTypeOnly] = useState(true);

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);



  // All available assets in inventory

  const allAvailableAssets = useMemo(() => {

    return (assets || []).filter(a => a.status === "AVAILABLE");

  }, [assets]);



  // Assets currently assigned to the ticket creator

  const employeeAssets = useMemo(() => {

    return (assets || []).filter(a => a.assigned_to === ticket?.created_by);

  }, [assets, ticket]);



  // Fallback: If ticket had no asset_id, default to employee's first assigned asset if available

  useEffect(() => {

    if (!oldAssetId && employeeAssets.length === 1) {

      setOldAssetId(employeeAssets[0].asset_id);

    }

  }, [employeeAssets, oldAssetId]);



  // Identify damaged/old asset and detect its type (Laptop, Monitor, Mouse, Keyboard, Printer)

  const currentOldAsset = useMemo(() => {

    return (assets || []).find(a => a.asset_id === oldAssetId);

  }, [assets, oldAssetId]);



  const detectedType = useMemo(() => {

    if (currentOldAsset?.type) return currentOldAsset.type;

    const aid = (oldAssetId || ticket?.asset_id || "").toUpperCase();

    if (aid.startsWith("LAP")) return "Laptop";

    if (aid.startsWith("MON")) return "Monitor";

    if (aid.startsWith("MOU")) return "Mouse";

    if (aid.startsWith("KEY")) return "Keyboard";

    if (aid.startsWith("PRN")) return "Printer";

    const titleLower = (ticket?.title || "").toLowerCase();

    if (titleLower.includes("laptop") || titleLower.includes("macbook") || titleLower.includes("thinkpad")) return "Laptop";

    if (titleLower.includes("monitor") || titleLower.includes("screen") || titleLower.includes("display")) return "Monitor";

    if (titleLower.includes("mouse")) return "Mouse";

    if (titleLower.includes("keyboard")) return "Keyboard";

    if (titleLower.includes("printer")) return "Printer";

    return null;

  }, [currentOldAsset, oldAssetId, ticket]);



  // Available assets strictly matching the damaged asset type

  const matchingTypeAssets = useMemo(() => {

    if (!detectedType) return allAvailableAssets;

    const target = detectedType.trim().toLowerCase();

    return allAvailableAssets.filter(a => (a.type || "").trim().toLowerCase() === target);

  }, [allAvailableAssets, detectedType]);



  // Assets to display in manual dropdown: filtered to matching type by default, or all if toggled

  const dropdownAssets = useMemo(() => {

    if (filterByTypeOnly && matchingTypeAssets.length > 0) {

      return matchingTypeAssets;

    }

    return allAvailableAssets;

  }, [filterByTypeOnly, matchingTypeAssets, allAvailableAssets]);



  // Auto-Assign best matching asset when non-repairable is enabled or mode is auto

  useEffect(() => {

    if (isNonRepairable) {

      if (allocationMode === "auto") {

        const bestMatch = matchingTypeAssets.length > 0 ? matchingTypeAssets[0] : allAvailableAssets[0];

        if (bestMatch) {

          setReplacementAssetId(bestMatch.asset_id);

        }

      }

    } else {

      setReplacementAssetId("");

    }

  }, [isNonRepairable, allocationMode, matchingTypeAssets, allAvailableAssets]);



  const selectedNewAsset = useMemo(() => {

    return (assets || []).find(a => a.asset_id === replacementAssetId);

  }, [assets, replacementAssetId]);



  const handleAutoFillNotes = () => {

    const oldName = currentOldAsset ? `${currentOldAsset.brand} ${currentOldAsset.model} (#${currentOldAsset.asset_id})` : (oldAssetId ? `#${oldAssetId}` : "Hardware device");

    const newName = selectedNewAsset ? `${selectedNewAsset.brand} ${selectedNewAsset.model} (#${selectedNewAsset.asset_id})` : (replacementAssetId ? `#${replacementAssetId}` : "replacement hardware");

    const replacementText = `Diagnosed ${oldName} as non-repairable and decommissioned (RETIRED). Allocated and deployed replacement ${detectedType || "asset"} ${newName} to employee ${ticket.created_by}. Verified device functionality and operational readiness.`;

    setNotes(prev => prev ? `${prev.trim()}\n${replacementText}` : replacementText);

  };



  const handleSubmit = async (e) => {

    e.preventDefault();

    setError("");



    const trimmedNotes = notes.trim();

    if (!trimmedNotes || trimmedNotes.length < 5) {

      setError("Resolution notes must be at least 5 characters.");

      return;

    }



    if (isNonRepairable && !replacementAssetId) {

      setError("Please select or auto-assign an available replacement asset from inventory.");

      return;

    }



    setSubmitting(true);

    try {

      const payload = {

        resolution: trimmedNotes,

        is_non_repairable: isNonRepairable,

        replacement_asset_id: isNonRepairable ? replacementAssetId : undefined,

        old_asset_id: isNonRepairable ? (oldAssetId || undefined) : undefined

      };



      const res = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}/resolve`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization": `Bearer ${token}`

        },

        body: JSON.stringify(payload)

      });



      if (res.ok) {

        if (isNonRepairable && replacementAssetId) {

          addToast(`Ticket #${ticket.ticket_id} resolved! Replacement asset #${replacementAssetId} assigned to ${ticket.created_by}.`, "success");

        } else {

          addToast(`Ticket #${ticket.ticket_id} resolved successfully!`, "success");

        }

        onSuccess();

      } else {

        const err = await res.json().catch(() => null);

        const msg = parseApiError(err, res.status, "Failed to resolve ticket.");

        setError(msg);

        addToast(msg, "error");

      }

    } catch (err) {

      const msg = "Network failure: Could not reach server to resolve ticket.";

      setError(msg);

      addToast(msg, "error");

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "640px", width: "100%", boxSizing: "border-box" }}>

        {/* Header */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.85rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>

            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>task_alt</span>

            </div>

            <div>

              <h2 className="modal-title" style={{ fontSize: "1.22rem", margin: 0 }}>Resolve Incident (#{ticket.ticket_id})</h2>

              <p className="modal-desc" style={{ margin: "0.2rem 0 0 0", fontSize: "0.84rem" }}>

                Record diagnostic findings, resolution actions, and close SLA timers.

              </p>

            </div>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.3rem 0.55rem" }} disabled={submitting}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        {error && (

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

            <span>{error}</span>

          </div>

        )}



        {/* Ticket Context Overview */}

        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", marginBottom: "1.15rem", fontSize: "0.82rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>

          <div>

            <span style={{ color: "var(--text-muted)" }}>Incident: </span>

            <strong style={{ color: "var(--text-main)" }}>{ticket.title}</strong>

          </div>

          <div style={{ display: "flex", gap: "0.75rem" }}>

            <span>Requester: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>{ticket.created_by}</strong></span>

            {ticket.asset_id && <span>Linked Asset: <strong style={{ fontFamily: "var(--font-mono)", color: "var(--primary)" }}>#{ticket.asset_id}</strong></span>}

          </div>

        </div>



        <form onSubmit={handleSubmit}>

          {/* NON-REPAIRABLE ASSET REPLACEMENT OPTION CARD */}

          <div style={{

            border: isNonRepairable ? "1.5px solid var(--status-critical)" : "1px solid var(--border-light)",

            background: isNonRepairable ? "rgba(186, 26, 26, 0.04)" : "var(--bg-card)",

            borderRadius: "10px",

            padding: "14px",

            marginBottom: "1.15rem",

            transition: "all 0.15s ease",

            boxSizing: "border-box"

          }}>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer", margin: 0 }}>

              <input

                type="checkbox"

                checked={isNonRepairable}

                onChange={e => setIsNonRepairable(e.target.checked)}

                style={{ marginTop: "3px", width: "18px", height: "18px", accentColor: "var(--status-critical)", cursor: "pointer" }}

                disabled={submitting}

              />

              <div style={{ flex: 1 }}>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>

                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: isNonRepairable ? "var(--status-critical)" : "var(--text-main)" }}>

                    Asset is Non-Repairable — Assign Replacement Asset

                  </span>

                  <span style={{

                    fontSize: "0.65rem",

                    fontWeight: 700,

                    padding: "2px 6px",

                    borderRadius: "4px",

                    background: isNonRepairable ? "var(--status-critical)" : "var(--bg-subtle)",

                    color: isNonRepairable ? "#ffffff" : "var(--text-muted)",

                    letterSpacing: "0.04em",

                    border: "1px solid " + (isNonRepairable ? "var(--status-critical)" : "var(--border-light)")

                  }}>

                    HARDWARE SWAP

                  </span>

                </div>

                <span style={{ display: "block", fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.35 }}>

                  Decommission the damaged device as RETIRED and immediately allocate an available inventory asset to employee <strong>{ticket.created_by}</strong>.

                </span>

              </div>

            </label>



            {/* EXPANDED REPLACEMENT CONTROLS */}

            {isNonRepairable && (

              <div style={{

                marginTop: "12px",

                paddingTop: "12px",

                borderTop: "1px dashed rgba(186, 26, 26, 0.25)",

                display: "flex",

                flexDirection: "column",

                gap: "14px"

              }}>

                {/* 1. Old Asset Identification */}

                <div>

                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "4px" }}>

                    1. Damaged / Non-Repairable Asset (Will be Marked RETIRED)

                  </label>

                  {ticket.asset_id ? (

                    <div style={{

                      padding: "8px 12px",

                      borderRadius: "6px",

                      background: "rgba(186, 26, 26, 0.08)",

                      border: "1px solid rgba(186, 26, 26, 0.2)",

                      display: "flex",

                      alignItems: "center",

                      justifyContent: "space-between",

                      fontSize: "0.84rem"

                    }}>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>

                        <span className="material-symbols-outlined" style={{ fontSize: "18px", color: "var(--status-critical)" }}>devices_other</span>

                        <span>

                          <strong style={{ fontFamily: "var(--font-mono)" }}>#{ticket.asset_id}</strong>

                          {" — "}

                          {currentOldAsset ? `${currentOldAsset.brand} ${currentOldAsset.model} (${currentOldAsset.type})` : (detectedType || "Hardware Asset")}

                        </span>

                      </div>

                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "var(--status-critical)", color: "#fff" }}>

                        TO RETIRE

                      </span>

                    </div>

                  ) : (

                    <select

                      className="filter-select"

                      style={{ width: "100%", height: "38px" }}

                      value={oldAssetId}

                      onChange={e => setOldAssetId(e.target.value)}

                      disabled={submitting}

                    >

                      <option value="">-- Select Damaged Asset to Decommission --</option>

                      {employeeAssets.map(a => (

                        <option key={a.asset_id} value={a.asset_id}>

                          {a.asset_id} — {a.brand} {a.model} ({a.type}) [Assigned to {a.assigned_to}]

                        </option>

                      ))}

                    </select>

                  )}

                </div>



                {/* 2. Replacement Mode Switcher (Auto-Assign vs Choose Manually) */}

                <div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>

                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)", margin: 0 }}>

                      2. Allocation Method for Replacement {detectedType ? detectedType : "Asset"} <span style={{ color: "var(--status-critical)" }}>*</span>

                    </label>

                    <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>

                      {matchingTypeAssets.length} Available {detectedType ? `${detectedType}s` : "Assets"}

                    </span>

                  </div>



                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>

                    <button

                      type="button"

                      onClick={() => setAllocationMode("auto")}

                      style={{

                        padding: "8px 12px",

                        borderRadius: "8px",

                        border: allocationMode === "auto" ? "2px solid var(--primary)" : "1px solid var(--border-light)",

                        background: allocationMode === "auto" ? "rgba(15, 118, 110, 0.1)" : "var(--bg-subtle)",

                        color: allocationMode === "auto" ? "var(--primary)" : "var(--text-main)",

                        fontWeight: allocationMode === "auto" ? 700 : 500,

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        gap: "6px",

                        fontSize: "0.82rem",

                        transition: "all 0.15s ease"

                      }}

                    >

                      <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>auto_awesome</span>

                      <span>Auto-Assign ({detectedType || "Asset"})</span>

                      {allocationMode === "auto" && (

                        <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "3px", background: "var(--primary)", color: "#fff", fontWeight: 700 }}>

                          ACTIVE

                        </span>

                      )}

                    </button>



                    <button

                      type="button"

                      onClick={() => setAllocationMode("manual")}

                      style={{

                        padding: "8px 12px",

                        borderRadius: "8px",

                        border: allocationMode === "manual" ? "2px solid var(--primary)" : "1px solid var(--border-light)",

                        background: allocationMode === "manual" ? "rgba(15, 118, 110, 0.1)" : "var(--bg-subtle)",

                        color: allocationMode === "manual" ? "var(--primary)" : "var(--text-main)",

                        fontWeight: allocationMode === "manual" ? 700 : 500,

                        cursor: "pointer",

                        display: "flex",

                        alignItems: "center",

                        justifyContent: "center",

                        gap: "6px",

                        fontSize: "0.82rem",

                        transition: "all 0.15s ease"

                      }}

                    >

                      <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>tune</span>

                      <span>Choose Manually from List</span>

                      {allocationMode === "manual" && (

                        <span style={{ fontSize: "0.62rem", padding: "1px 5px", borderRadius: "3px", background: "var(--primary)", color: "#fff", fontWeight: 700 }}>

                          ACTIVE

                        </span>

                      )}

                    </button>

                  </div>



                  {/* AUTO-ASSIGN VIEW */}

                  {allocationMode === "auto" && (

                    <div>

                      {selectedNewAsset ? (

                        <div style={{

                          padding: "10px 14px",

                          borderRadius: "8px",

                          background: "rgba(15, 118, 110, 0.08)",

                          border: "1.5px solid var(--primary-border)",

                          display: "flex",

                          alignItems: "center",

                          justifyContent: "space-between",

                          gap: "10px"

                        }}>

                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>

                            <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--primary)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>

                              <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>auto_awesome</span>

                            </div>

                            <div>

                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

                                <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>

                                  #{selectedNewAsset.asset_id} — {selectedNewAsset.brand} {selectedNewAsset.model}

                                </span>

                                <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "var(--primary)", color: "#fff" }}>

                                  AUTO-SELECTED

                                </span>

                              </div>

                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>

                                Type: <strong>{selectedNewAsset.type}</strong> &bull; S/N: {selectedNewAsset.serial_number} &bull; Matched from available database inventory

                              </span>

                            </div>

                          </div>

                          <button

                            type="button"

                            onClick={() => setAllocationMode("manual")}

                            style={{

                              padding: "4px 8px",

                              fontSize: "0.74rem",

                              fontWeight: 600,

                              background: "var(--bg-card)",

                              color: "var(--primary)",

                              border: "1px solid var(--primary-border)",

                              borderRadius: "4px",

                              cursor: "pointer",

                              whiteSpace: "nowrap"

                            }}

                          >

                            Change Device

                          </button>

                        </div>

                      ) : (

                        <div style={{ padding: "10px 12px", background: "var(--status-critical-bg)", border: "1px solid var(--status-critical)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--status-critical)" }}>

                          No available {detectedType ? detectedType : "hardware"} assets found in inventory for auto-assignment. Please switch to manual selection or register new inventory.

                        </div>

                      )}

                    </div>

                  )}



                  {/* MANUAL SELECTION VIEW (Strictly filtered by matching asset type) */}

                  {allocationMode === "manual" && (

                    <div>

                      {/* Filter indicator & toggle */}

                      {detectedType && (

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "0.75rem" }}>

                          <span style={{ color: "var(--text-main)", display: "flex", alignItems: "center", gap: "4px" }}>

                            <span className="material-symbols-outlined" style={{ fontSize: "15px", color: "var(--primary)" }}>filter_alt</span>

                            <span>List filtered to: <strong>{detectedType}s only</strong> ({dropdownAssets.length} found)</span>

                          </span>

                          <button

                            type="button"

                            onClick={() => setFilterByTypeOnly(prev => !prev)}

                            style={{

                              background: "transparent",

                              border: "none",

                              color: "var(--primary)",

                              cursor: "pointer",

                              fontSize: "0.73rem",

                              textDecoration: "underline",

                              padding: 0

                            }}

                          >

                            {filterByTypeOnly ? "Show All Asset Types" : `Filter to ${detectedType}s Only`}

                          </button>

                        </div>

                      )}



                      {dropdownAssets.length === 0 ? (

                        <div style={{ padding: "8px 12px", background: "var(--status-warning-bg)", border: "1px solid var(--status-warning)", borderRadius: "6px", fontSize: "0.8rem", color: "var(--status-warning)" }}>

                          Warning: No {detectedType ? detectedType : ""} assets currently available in inventory.

                          <button

                            type="button"

                            onClick={() => setFilterByTypeOnly(false)}

                            style={{ marginLeft: "6px", color: "var(--primary)", background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}

                          >

                            View other asset categories

                          </button>

                        </div>

                      ) : (

                        <select

                          className="filter-select"

                          style={{ width: "100%", height: "40px", fontSize: "0.85rem", background: "var(--bg-input)" }}

                          value={replacementAssetId}

                          onChange={e => setReplacementAssetId(e.target.value)}

                          disabled={submitting}

                          required={isNonRepairable}

                        >

                          <option value="">-- Choose from Available {detectedType ? `${detectedType}s` : "Assets"} ({dropdownAssets.length} Available) --</option>

                          {dropdownAssets.map(a => (

                            <option key={a.asset_id} value={a.asset_id}>

                              {a.asset_id} — {a.brand} {a.model} ({a.type}) • S/N: {a.serial_number}

                            </option>

                          ))}

                        </select>

                      )}

                    </div>

                  )}

                </div>



                {/* 3. Replacement Impact Card & Auto-fill Button */}

                {selectedNewAsset && (

                  <div style={{

                    padding: "10px 12px",

                    borderRadius: "6px",

                    background: "rgba(15, 118, 110, 0.08)",

                    border: "1px solid var(--primary-border)",

                    display: "flex",

                    alignItems: "center",

                    justifyContent: "space-between",

                    gap: "10px",

                    flexWrap: "wrap"

                  }}>

                    <div style={{ fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>

                      <span style={{ color: "var(--primary)", fontWeight: 700 }}>✓ Ready for Assignment: </span>

                      <span>Asset <strong>#{selectedNewAsset.asset_id}</strong> ({selectedNewAsset.brand} {selectedNewAsset.model}) will be assigned to <strong>{ticket.created_by}</strong>.</span>

                    </div>

                    <button

                      type="button"

                      onClick={handleAutoFillNotes}

                      style={{

                        padding: "4px 8px",

                        fontSize: "0.74rem",

                        fontWeight: 600,

                        background: "var(--primary)",

                        color: "#ffffff",

                        border: "none",

                        borderRadius: "4px",

                        cursor: "pointer",

                        display: "inline-flex",

                        alignItems: "center",

                        gap: "4px"

                      }}

                      title="Append replacement details into resolution summary"

                    >

                      <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit_note</span>

                      <span>Auto-fill Note</span>

                    </button>

                  </div>

                )}

              </div>

            )}

          </div>



          {/* RESOLUTION SUMMARY TEXTAREA */}

          <div className="form-field-group" style={{ marginBottom: "1.15rem" }}>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>

              <label className="form-field-label" style={{ margin: 0, fontWeight: 600 }}>

                Resolution Summary <span style={{ color: "var(--status-critical)" }}>*</span>

              </label>

              <span style={{ fontSize: "0.74rem", color: notes.trim().length >= 5 ? "var(--primary)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>

                {notes.length} chars (min 5)

              </span>

            </div>

            <textarea

              name="notes"

              className="apex-form-input"

              style={{

                width: "100%",

                minHeight: "110px",

                height: "110px",

                padding: "10px 12px",

                boxSizing: "border-box",

                resize: "vertical",

                display: "block",

                lineHeight: 1.5

              }}

              placeholder="Detail diagnosis, replacement actions taken, and verification of operational fix..."

              value={notes}

              onChange={e => setNotes(e.target.value)}

              required

              minLength={5}

              disabled={submitting}

            />

          </div>



          {/* ACTIONS ROW */}

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

              className="btn-primary-teal"

              disabled={submitting || notes.trim().length < 5 || (isNonRepairable && !replacementAssetId)}

              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}

            >

              {submitting ? (

                <>

                  <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "16px" }}>sync</span>

                  <span>Resolving &amp; Updating Assets...</span>

                </>

              ) : (

                <>

                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>

                    {isNonRepairable ? "published_with_changes" : "task_alt"}

                  </span>

                  <span>{isNonRepairable ? "Resolve & Replace Asset" : "Confirm Resolution"}</span>

                </>

              )}

            </button>

          </div>

        </form>

      </div>

    </div>

  );

}



function VerifyResolutionModal({ ticket, currentUser, token, onClose, onSuccess, addToast }) {

  const [feedback, setFeedback] = useState("");

  const [reopenReason, setReopenReason] = useState("");

  const [activeMode, setActiveMode] = useState("confirm_close"); // 'confirm_close' (Yes) or 'still_exists' (No)

  const [submitting, setSubmitting] = useState(false);



  if (!ticket) return null;



  const handleConfirmClose = async () => {

    setSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}/close`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization": `Bearer ${token}`

        },

        body: JSON.stringify({ feedback: feedback.trim() || undefined })

      });

      if (res.ok) {

        addToast(`Ticket #${ticket.ticket_id} verified and closed successfully!`, "success");

        onSuccess();

      } else {

        const err = await res.json().catch(() => null);

        addToast(parseApiError(err, res.status, "Failed to close ticket."), "error");

      }

    } catch (e) {

      addToast("Network error verifying ticket.", "error");

    } finally {

      setSubmitting(false);

    }

  };



  const handleReportIssueExists = async () => {

    if (!reopenReason.trim() || reopenReason.trim().length < 5) {

      addToast("Please provide details explaining why the issue still exists (minimum 5 characters).", "warning");

      return;

    }

    setSubmitting(true);

    try {

      const res = await fetch(`${API_BASE}/tickets/${ticket.ticket_id}/reopen`, {

        method: "POST",

        headers: {

          "Content-Type": "application/json",

          "Authorization": `Bearer ${token}`

        },

        body: JSON.stringify({ reason: reopenReason.trim() })

      });

      if (res.ok) {

        addToast(`Ticket #${ticket.ticket_id} returned to In Progress for further investigation.`, "info");

        onSuccess();

      } else {

        const err = await res.json().catch(() => null);

        addToast(parseApiError(err, res.status, "Failed to return ticket to In Progress."), "error");

      }

    } catch (e) {

      addToast("Network error reporting issue.", "error");

    } finally {

      setSubmitting(false);

    }

  };



  const isReopenValid = reopenReason.trim().length >= 5;



  return (

    <div className="modal-backdrop">

      <div className="modal-surface" style={{ maxWidth: "640px", width: "100%", boxSizing: "border-box" }}>

        {/* Header */}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.1rem", borderBottom: "1px solid var(--border-light)", paddingBottom: "0.85rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>

            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>

              <span className="material-symbols-outlined" style={{ fontSize: "24px" }}>verified</span>

            </div>

            <div>

              <h2 className="modal-title" style={{ fontSize: "1.22rem", margin: 0 }}>Verify Incident Resolution</h2>

              <p className="modal-desc" style={{ margin: "0.2rem 0 0 0", fontSize: "0.84rem" }}>

                Incident <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--primary)" }}>#{ticket.ticket_id}</span> &mdash; {ticket.title}

              </p>

            </div>

          </div>

          <button type="button" className="table-btn" onClick={onClose} style={{ padding: "0.3rem 0.55rem" }} disabled={submitting}>

            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>close</span>

          </button>

        </div>



        {/* Resolution Information Card */}

        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)", borderRadius: "var(--radius-md)", padding: "1rem 1.15rem", marginBottom: "1.2rem" }}>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.55rem" }}>

            <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--primary)" }}>

              IT Support Resolution Summary

            </span>

            <span className="badge-status resolved">RESOLVED</span>

          </div>

          <div style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.55, background: "var(--bg-card)", padding: "0.85rem 1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-light)" }}>

            {ticket.resolution || "IT Support reported this issue as resolved."}

          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.55rem", flexWrap: "wrap", gap: "0.35rem" }}>

            <span>Resolved By: <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)" }}>{ticket.assigned_to || "IT Specialist"}</strong></span>

            <span>Category: <strong style={{ color: "var(--text-main)" }}>{ticket.category}</strong></span>

          </div>

        </div>



        {/* Question & Interactive Yes / No Option Cards */}

        <div style={{ marginBottom: "1.1rem" }}>

          <p style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--text-main)", margin: "0 0 0.65rem 0" }}>

            Has the reported issue been resolved to your satisfaction?

          </p>



          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>

            {/* Yes Box Option */}

            <div

              role="button"

              tabIndex={0}

              onClick={() => setActiveMode("confirm_close")}

              style={{

                display: "flex",

                alignItems: "center",

                gap: "12px",

                padding: "12px 14px",

                borderRadius: "10px",

                cursor: "pointer",

                border: activeMode === "confirm_close" ? "2px solid var(--primary)" : "1.5px solid var(--border-light)",

                background: activeMode === "confirm_close" ? "rgba(15, 118, 110, 0.08)" : "var(--bg-subtle)",

                boxShadow: activeMode === "confirm_close" ? "0 0 0 1px var(--primary)" : "none",

                transition: "all 0.15s ease",

                boxSizing: "border-box"

              }}

            >

              <div style={{

                width: "36px",

                height: "36px",

                minWidth: "36px",

                borderRadius: "50%",

                background: activeMode === "confirm_close" ? "var(--primary)" : "rgba(15, 118, 110, 0.12)",

                color: activeMode === "confirm_close" ? "#ffffff" : "var(--primary)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center"

              }}>

                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>

                  {activeMode === "confirm_close" ? "check_circle" : "task_alt"}

                </span>

              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--text-main)" }}>Yes, Issue Fixed</span>

                  {activeMode === "confirm_close" && (

                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "var(--primary)", color: "#ffffff", letterSpacing: "0.04em" }}>

                      SELECTED

                    </span>

                  )}

                </div>

                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.3 }}>

                  Verify fix &amp; close ticket

                </span>

              </div>

            </div>



            {/* No Box Option */}

            <div

              role="button"

              tabIndex={0}

              onClick={() => setActiveMode("still_exists")}

              style={{

                display: "flex",

                alignItems: "center",

                gap: "12px",

                padding: "12px 14px",

                borderRadius: "10px",

                cursor: "pointer",

                border: activeMode === "still_exists" ? "2px solid var(--status-critical)" : "1.5px solid var(--border-light)",

                background: activeMode === "still_exists" ? "rgba(186, 26, 26, 0.08)" : "var(--bg-subtle)",

                boxShadow: activeMode === "still_exists" ? "0 0 0 1px var(--status-critical)" : "none",

                transition: "all 0.15s ease",

                boxSizing: "border-box"

              }}

            >

              <div style={{

                width: "36px",

                height: "36px",

                minWidth: "36px",

                borderRadius: "50%",

                background: activeMode === "still_exists" ? "var(--status-critical)" : "rgba(186, 26, 26, 0.12)",

                color: activeMode === "still_exists" ? "#ffffff" : "var(--status-critical)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center"

              }}>

                <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>

                  {activeMode === "still_exists" ? "report" : "error_outline"}

                </span>

              </div>

              <div style={{ flex: 1, minWidth: 0 }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: activeMode === "still_exists" ? "var(--status-critical)" : "var(--text-main)" }}>

                    No, Issue Exists

                  </span>

                  {activeMode === "still_exists" && (

                    <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: "var(--status-critical)", color: "#ffffff", letterSpacing: "0.04em" }}>

                      SELECTED

                    </span>

                  )}

                </div>

                <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px", lineHeight: 1.3 }}>

                  Reopen &amp; return to IT

                </span>

              </div>

            </div>

          </div>

        </div>



        {/* Option A: Confirm & Close Flow (Yes Box) */}

        {activeMode === "confirm_close" && (

          <div style={{

            background: "var(--bg-card)",

            border: "1px solid var(--border-light)",

            borderRadius: "12px",

            padding: "16px 18px",

            display: "flex",

            flexDirection: "column",

            gap: "14px",

            boxSizing: "border-box"

          }}>

            {/* Styled Confirmation Banner */}

            <div style={{

              display: "flex",

              alignItems: "flex-start",

              gap: "12px",

              padding: "12px 14px",

              borderRadius: "8px",

              background: "rgba(15, 118, 110, 0.08)",

              border: "1px solid var(--primary-border)",

              borderLeft: "4px solid var(--primary)"

            }}>

              <div style={{

                width: "28px",

                height: "28px",

                minWidth: "28px",

                borderRadius: "6px",

                background: "rgba(15, 118, 110, 0.16)",

                color: "var(--primary)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center"

              }}>

                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>task_alt</span>

              </div>

              <div style={{ fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.55 }}>

                <strong style={{ color: "var(--primary)" }}>Confirming Resolution:</strong> You are confirming that this issue is fully resolved. The ticket status will transition to <strong style={{ color: "var(--primary)" }}>CLOSED</strong> with your verification record and timestamp.

              </div>

            </div>



            {/* Full-Width Long Description / Feedback Field */}

            <div style={{ width: "100%", boxSizing: "border-box" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>

                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px", margin: 0 }}>

                  <span>Optional Verification Note (Feedback for IT Specialist)</span>

                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

                  <span style={{ fontSize: "0.74rem", fontFamily: "var(--font-mono)", padding: "2px 7px", borderRadius: "4px", background: "rgba(15, 118, 110, 0.12)", color: "var(--primary)", fontWeight: 700 }}>

                    {feedback.length} / 500

                  </span>

                </div>

              </div>



              <textarea

                style={{

                  width: "100%",

                  minHeight: "120px",

                  height: "120px",

                  padding: "12px 14px",

                  fontSize: "0.88rem",

                  fontFamily: "var(--font-sans)",

                  lineHeight: 1.55,

                  color: "var(--text-main)",

                  background: "var(--bg-input)",

                  border: "1.5px solid var(--border-light)",

                  borderRadius: "8px",

                  outline: "none",

                  boxSizing: "border-box",

                  resize: "vertical",

                  display: "block",

                  transition: "border-color 0.15s ease, box-shadow 0.15s ease"

                }}

                onFocus={e => {

                  e.target.style.borderColor = "var(--primary)";

                  e.target.style.boxShadow = "0 0 0 3px var(--primary-glow)";

                }}

                onBlur={e => {

                  e.target.style.borderColor = "var(--border-light)";

                  e.target.style.boxShadow = "none";

                }}

                placeholder="e.g., Tested and working properly now. Hardware connection is secure and stable. Thank you!"

                value={feedback}

                onChange={e => setFeedback(e.target.value)}

                maxLength={500}

                disabled={submitting}

              />



              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "0.76rem", color: "var(--text-muted)" }}>

                <span className="material-symbols-outlined" style={{ fontSize: "16px", color: "var(--primary)" }}>history_edu</span>

                <span>Feedback will be recorded in the immutable audit history and shared with the engineer.</span>

              </div>

            </div>



            {/* Action Buttons */}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "4px" }}>

              <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>

                Cancel

              </button>

              <button type="button" className="btn-primary-teal" onClick={handleConfirmClose} disabled={submitting} style={{ padding: "0.65rem 1.35rem" }}>

                {submitting ? (

                  <>

                    <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "16px" }}>sync</span>

                    <span>Closing Ticket...</span>

                  </>

                ) : (

                  <>

                    <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>task_alt</span>

                    <span>Confirm &amp; Close Ticket</span>

                  </>

                )}

              </button>

            </div>

          </div>

        )}



        {/* Option B: Issue Still Exists Flow (No Box) */}

        {activeMode === "still_exists" && (

          <div style={{

            background: "var(--bg-card)",

            border: "1px solid var(--border-light)",

            borderRadius: "12px",

            padding: "16px 18px",

            display: "flex",

            flexDirection: "column",

            gap: "14px",

            boxSizing: "border-box"

          }}>

            {/* Styled Reopen Header Banner */}

            <div style={{

              display: "flex",

              alignItems: "flex-start",

              gap: "12px",

              padding: "12px 14px",

              borderRadius: "8px",

              background: "rgba(186, 26, 26, 0.08)",

              border: "1px solid rgba(186, 26, 26, 0.25)",

              borderLeft: "4px solid var(--status-critical)"

            }}>

              <div style={{

                width: "28px",

                height: "28px",

                minWidth: "28px",

                borderRadius: "6px",

                background: "rgba(186, 26, 26, 0.16)",

                color: "var(--status-critical)",

                display: "flex",

                alignItems: "center",

                justifyContent: "center"

              }}>

                <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>warning</span>

              </div>

              <div style={{ fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.55 }}>

                <strong style={{ color: "var(--status-critical)" }}>Reopening Ticket:</strong> The ticket will be returned to <strong>IN PROGRESS</strong> status and remain assigned to specialist <strong style={{ fontFamily: "var(--font-mono)", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: "4px" }}>{ticket.assigned_to || "IT Specialist"}</strong> for immediate re-investigation.

              </div>

            </div>



            {/* Full-Width Long Description / Symptoms Field */}

            <div style={{ width: "100%", boxSizing: "border-box" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>

                <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "4px", margin: 0 }}>

                  <span>Please describe what is still not working</span>

                  <span style={{ color: "var(--status-critical)", fontWeight: 700 }}>*</span>

                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

                  <span style={{

                    fontSize: "0.74rem",

                    fontFamily: "var(--font-mono)",

                    padding: "2px 7px",

                    borderRadius: "4px",

                    background: isReopenValid ? "rgba(15, 118, 110, 0.12)" : "rgba(186, 26, 26, 0.12)",

                    color: isReopenValid ? "var(--primary)" : "var(--status-critical)",

                    fontWeight: 700

                  }}>

                    {reopenReason.length} / 500

                  </span>

                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>(min 5 chars)</span>

                </div>

              </div>



              <textarea

                style={{

                  width: "100%",

                  minHeight: "120px",

                  height: "120px",

                  padding: "12px 14px",

                  fontSize: "0.88rem",

                  fontFamily: "var(--font-sans)",

                  lineHeight: 1.55,

                  color: "var(--text-main)",

                  background: "var(--bg-input)",

                  border: reopenReason.length > 0 && !isReopenValid

                    ? "1.5px solid var(--status-critical)"

                    : "1.5px solid var(--border-light)",

                  borderRadius: "8px",

                  outline: "none",

                  boxSizing: "border-box",

                  resize: "vertical",

                  display: "block",

                  transition: "border-color 0.15s ease, box-shadow 0.15s ease"

                }}

                onFocus={e => {

                  e.target.style.borderColor = "var(--status-critical)";

                  e.target.style.boxShadow = "0 0 0 3px rgba(186, 26, 26, 0.15)";

                }}

                onBlur={e => {

                  e.target.style.borderColor = reopenReason.length > 0 && !isReopenValid ? "var(--status-critical)" : "var(--border-light)";

                  e.target.style.boxShadow = "none";

                }}

                placeholder="Explain why the problem persists so the IT specialist can investigate..."

                value={reopenReason}

                onChange={e => setReopenReason(e.target.value)}

                maxLength={500}

                disabled={submitting}

                required

              />



              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "0.76rem" }}>

                <span className="material-symbols-outlined" style={{

                  fontSize: "16px",

                  color: isReopenValid ? "var(--status-active)" : "var(--status-critical)"

                }}>

                  {isReopenValid ? "check_circle" : "info"}

                </span>

                <span style={{

                  color: isReopenValid ? "var(--status-active)" : "var(--text-muted)",

                  fontWeight: isReopenValid ? 600 : 400

                }}>

                  {isReopenValid

                    ? "Detail requirement met. Ready to return ticket to IT Support."

                    : "Minimum 5 characters required describing the ongoing issue."}

                </span>

              </div>

            </div>



            {/* Action Buttons */}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "4px" }}>

              <button type="button" className="btn-secondary-parchment" onClick={onClose} disabled={submitting}>

                Cancel

              </button>

              <button

                type="button"

                className="btn-primary-teal"

                style={{

                  background: isReopenValid ? "var(--status-critical)" : "var(--border-light)",

                  borderColor: isReopenValid ? "var(--status-critical)" : "var(--border-light)",

                  color: isReopenValid ? "#ffffff" : "var(--text-muted)",

                  fontWeight: 600,

                  cursor: isReopenValid ? "pointer" : "not-allowed",

                  boxShadow: isReopenValid ? "0 4px 12px rgba(186, 26, 26, 0.25)" : "none",

                  padding: "0.65rem 1.35rem"

                }}

                onClick={handleReportIssueExists}

                disabled={submitting || !isReopenValid}

              >

                {submitting ? (

                  <>

                    <span className="material-symbols-outlined apex-spinner" style={{ fontSize: "16px" }}>sync</span>

                    <span>Submitting Feedback...</span>

                  </>

                ) : (

                  <>

                    <span className="material-symbols-outlined" style={{ fontSize: "17px" }}>restart_alt</span>

                    <span>Submit &amp; Return to In Progress</span>

                  </>

                )}

              </button>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}

