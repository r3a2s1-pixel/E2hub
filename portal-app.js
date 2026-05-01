/* ============================================================
   E2HUB ENTERPRISE PORTAL — APPLICATION LOGIC
   ============================================================ */

"use strict";

// ============================================================
//  SUPABASE CONFIGURATION
// ============================================================
const SUPABASE_URL     = "https://ytyuigcylsjasiwneytt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oiuImVgo9JUTfTe5A6MNWw_y3OjqE7q";
const supabaseClient   = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================
//  CONSTANTS
// ============================================================
const SECTIONS = [
  { id: "quotation_received",  title: "Quotation Received", icon: "fa-envelope-open-text", profileKey: "quotation_received"  },
  { id: "quotation_breakdown", title: "Cost Analysis",      icon: "fa-calculator",         profileKey: "quotation_breakdown" },
  { id: "inventory",           title: "Inventory Control",  icon: "fa-boxes-stacked",      profileKey: "inventory"           },
  { id: "project_status",      title: "Project Status",     icon: "fa-bars-progress",      profileKey: "project_status"      }
];

const DEFAULT_LINKS = {
  quotation_received:  "https://eumeconn-my.sharepoint.com/:f:/g/personal/mur_eumecon_ae/IgAPlhb8DCDaTZrB4UO3uEZPAeakBCVbYYxSNR3lBC_lae0?e=OKv4nz",
  quotation_breakdown: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQAm8ZTtLMvkTLT09nEXPpXZAZY-QBduU8vIkv0phmrVIQ0",
  inventory:           "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQCRw7fzXtuTRp-Gc88IMfzkAWkcBv0AOhzO6ORiLMER29Y",
  project_status:      "#"
};

const PROJECTS_LIST = [
  { id: "PRJ-01", name: "LULU ICAD Musaffah" },
  { id: "PRJ-02", name: "Y Tower Capital Centre (ADNEC)" },
  { id: "PRJ-03", name: "Pixel Tower Reem" },
  { id: "PRJ-04", name: "LULU Hypermarket (MBZ)" },
  { id: "PRJ-05", name: "Y Tower – Al Nahyan – LuLu" },
  { id: "PRJ-06", name: "AL Falah Plaza Residential Complex" },
  { id: "PRJ-07", name: "Y Tower Reem" },
  { id: "PRJ-08", name: "Forsan Central Mall" },
  { id: "PRJ-09", name: "Village Mall" },
  { id: "PRJ-10", name: "Workers Village" }
];

// ============================================================
//  APPLICATION STATE
// ============================================================
let currentUser    = null;
let portalLinks    = { ...DEFAULT_LINKS };
let adminProfiles  = [];
let formPermissions = SECTIONS.map(s => s.id);

// ============================================================
//  DOM ELEMENT REFERENCES
// ============================================================
const DOM = {
  views: {
    loading: document.getElementById("loading-view"),
    login:   document.getElementById("login-view"),
    app:     document.getElementById("app-view")
  },
  sections: {
    dashboard: document.getElementById("dashboard-section"),
    projects:  document.getElementById("projects-section"),
    admin:     document.getElementById("admin-section")
  },
  loginForm:          document.getElementById("login-form"),
  loginBtn:           document.getElementById("login-btn"),
  loginError:         document.getElementById("login-error"),
  navLogoutBtn:       document.getElementById("nav-logout-btn"),
  navLogoBtn:         document.getElementById("nav-logo-btn"),
  navAdminBtn:        document.getElementById("nav-admin-btn"),
  backToDashboardBtn: document.getElementById("back-to-dashboard-btn"),
  dashboardGrid:      document.getElementById("dashboard-grid"),
  projectsGrid:       document.getElementById("projects-grid"),
  adminUserForm:      document.getElementById("admin-user-form"),
  saveProfileBtn:     document.getElementById("save-profile-btn"),
  formClearBtn:       document.getElementById("form-clear-btn"),
  formModeLabel:      document.getElementById("form-mode-label"),
  formUid:            document.getElementById("form-uid"),
  formName:           document.getElementById("form-name"),
  formRole:           document.getElementById("form-role"),
  formManageUsers:    document.getElementById("form-manage-users"),
  formPermContainer:  document.getElementById("form-permissions-container"),
  usersTableBody:     document.getElementById("users-table-body"),
  usersEmptyState:    document.getElementById("users-empty-state"),
  adminUserSearch:    document.getElementById("admin-user-search"),
  userCountLabel:     document.getElementById("user-count-label"),
  statTotalUsers:     document.getElementById("stat-total-users"),
  statAdminUsers:     document.getElementById("stat-admin-users"),
  adminLinksForm:     document.getElementById("admin-links-form"),
  saveLinksBtn:       document.getElementById("save-links-btn"),
  linksInputContainer: document.getElementById("links-input-container"),
  toastContainer:     document.getElementById("toast-container")
};

// ============================================================
//  UTILITY — XSS-SAFE TEXT
// ============================================================

/**
 * Safely creates a text node. NEVER use innerHTML with user data.
 */
function safeText(str) {
  return String(str == null ? "" : str);
}

/**
 * Sets textContent on an element — safe for user-provided values.
 */
function setText(el, value) {
  if (el) el.textContent = safeText(value);
}

/**
 * Creates an element with optional properties.
 */
function createElement(tag, props = {}) {
  const el = document.createElement(tag);
  if (props.className) el.className = props.className;
  if (props.text != null) el.textContent = safeText(props.text);
  if (props.attrs) {
    Object.entries(props.attrs).forEach(([k, v]) => el.setAttribute(k, v));
  }
  if (props.style) el.setAttribute("style", props.style);
  return el;
}

// ============================================================
//  UTILITY — ROUTER / VIEW SWITCHER
// ============================================================
function switchView(viewName) {
  Object.entries(DOM.views).forEach(([name, el]) => {
    el.classList.toggle("active", name === viewName);
  });
}

function switchSection(sectionName) {
  Object.entries(DOM.sections).forEach(([name, el]) => {
    el.classList.toggle("active", name === sectionName);
  });
  // Scroll to top of content on section change
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============================================================
//  UTILITY — TOAST
// ============================================================
function showToast(message, type = "success") {
  const toast = createElement("div", { className: `toast ${type}` });

  const icon = createElement("i", {
    className: `fa-solid ${type === "success" ? "fa-check-circle" : "fa-circle-exclamation"}`,
    attrs: { "aria-hidden": "true" }
  });

  const span = createElement("span", { text: message });

  toast.appendChild(icon);
  toast.appendChild(span);
  DOM.toastContainer.appendChild(toast);

  // Auto-dismiss
  const dismiss = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    setTimeout(() => toast.remove(), 300);
  };

  const timer = setTimeout(dismiss, 3500);
  toast.addEventListener("click", () => { clearTimeout(timer); dismiss(); });
}

// ============================================================
//  UTILITY — BUTTON LOADING STATE
// ============================================================
function setButtonLoading(btn, loading, loadingText = "Processing...", restoreHTML = null) {
  if (!btn) return;
  if (loading) {
    btn._originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>${loadingText ? `<span>${loadingText}</span>` : ""}`;
  } else {
    btn.disabled = false;
    if (restoreHTML) {
      btn.innerHTML = restoreHTML;
    } else if (btn._originalHTML) {
      btn.innerHTML = btn._originalHTML;
      delete btn._originalHTML;
    }
  }
}

// ============================================================
//  AUTH — INITIALIZATION
// ============================================================
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initAuth();
});

async function initAuth() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      await loadApplicationData(session.user);
    } else {
      switchView("login");
    }
  } catch (err) {
    console.error("Auth init error:", err);
    switchView("login");
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      await loadApplicationData(session.user);
    } else if (event === "SIGNED_OUT") {
      currentUser = null;
      switchView("login");
    }
  });
}

// ============================================================
//  DATA — LOAD APPLICATION
// ============================================================
async function loadApplicationData(authUser) {
  try {
    // 1. Fetch user profile
    const { data: profile, error: profileErr } = await supabaseClient
      .from("user_profiles")
      .select("*")
      .eq("id", authUser.id)
      .single();

    if (profileErr) {
      throw new Error("Profile not found. Contact your administrator.");
    }

    // 2. Hydrate current user state
    currentUser = {
      id:         authUser.id,
      email:      authUser.email,
      name:       profile.full_name || "User",
      role:       profile.role || "User",
      canManage:  !!profile.can_manage_users,
      permissions: SECTIONS
        .filter(s => !!profile[s.profileKey])
        .map(s => s.id)
    };

    // 3. Fetch portal links
    const { data: linksData, error: linksErr } = await supabaseClient
      .from("portal_links")
      .select("*");

    portalLinks = { ...DEFAULT_LINKS };
    if (!linksErr && linksData) {
      linksData.forEach(row => {
        if (row.section_key && row.url) {
          portalLinks[row.section_key] = row.url;
        }
      });
    }

    // 4. Fetch admin data if privileged
    if (currentUser.canManage) {
      const { data: profilesData } = await supabaseClient
        .from("user_profiles")
        .select("*")
        .order("created_at");

      adminProfiles = profilesData || [];
      DOM.navAdminBtn.classList.remove("hidden");
      renderAdminPanel();
    } else {
      adminProfiles = [];
      DOM.navAdminBtn.classList.add("hidden");
    }

    // 5. Render UI
    renderDashboard();
    renderProjects();
    switchView("app");
    switchSection("dashboard");

  } catch (error) {
    console.error("Load error:", error);
    showToast(error.message || "Failed to load application.", "error");
    await supabaseClient.auth.signOut();
  }
}

// ============================================================
//  EVENT LISTENERS
// ============================================================
function setupEventListeners() {

  // ── Login form ──────────────────────────────────────────
  DOM.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideLoginError();
    setButtonLoading(DOM.loginBtn, true, "Signing in...");

    const email    = DOM.loginForm.querySelector("#login-email").value.trim();
    const password = DOM.loginForm.querySelector("#login-password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

    setButtonLoading(DOM.loginBtn, false, "", `<span class="uppercase tracking-widest text-xs">Secure Login</span>`);

    if (error) {
      showLoginError(error.message);
    }
  });

  // ── Navigation ──────────────────────────────────────────
  DOM.navLogoutBtn.addEventListener("click", handleSignOut);

  DOM.navLogoBtn.addEventListener("click",  () => switchSection("dashboard"));
  DOM.navLogoBtn.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") switchSection("dashboard"); });

  DOM.navAdminBtn.addEventListener("click", () => switchSection("admin"));
  DOM.backToDashboardBtn.addEventListener("click", () => switchSection("dashboard"));

  // ── Admin tabs ──────────────────────────────────────────
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const target = e.currentTarget;
      document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      target.classList.add("active");
      target.setAttribute("aria-selected", "true");
      document.getElementById(target.dataset.target).classList.add("active");
    });
  });

  // ── Admin user form ─────────────────────────────────────
  DOM.adminUserForm.addEventListener("submit", handleSaveProfile);

  // ── Clear form button ───────────────────────────────────
  DOM.formClearBtn.addEventListener("click", resetAdminForm);

  // ── Admin search/filter ─────────────────────────────────
  if (DOM.adminUserSearch) {
    DOM.adminUserSearch.addEventListener("input", () => renderUsersTable(DOM.adminUserSearch.value));
  }

  // ── Admin links form ────────────────────────────────────
  DOM.adminLinksForm.addEventListener("submit", handleSaveLinks);
}

// ============================================================
//  AUTH — SIGN OUT
// ============================================================
async function handleSignOut() {
  setButtonLoading(DOM.navLogoutBtn, true, "");
  await supabaseClient.auth.signOut();
  // onAuthStateChange will handle the rest
}

// ============================================================
//  LOGIN — ERROR DISPLAY
// ============================================================
function showLoginError(message) {
  DOM.loginError.classList.remove("hidden");
  DOM.loginError.style.display = "flex";
  DOM.loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i>`;
  const span = createElement("span", { text: message });
  DOM.loginError.appendChild(span);
}

function hideLoginError() {
  DOM.loginError.classList.add("hidden");
  DOM.loginError.style.display = "none";
}

// ============================================================
//  ADMIN — SAVE PROFILE
// ============================================================
async function handleSaveProfile(e) {
  e.preventDefault();

  const uid = DOM.formUid.value.trim();
  if (!uid) {
    showToast("Supabase Auth UUID is required.", "error");
    DOM.formUid.focus();
    return;
  }

  // Basic UUID format check
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(uid)) {
    showToast("Invalid UUID format. Expected: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", "error");
    DOM.formUid.focus();
    return;
  }

  setButtonLoading(DOM.saveProfileBtn, true, "Saving...");

  const payload = {
    id:                   uid,
    full_name:            DOM.formName.value.trim() || null,
    role:                 DOM.formRole.value,
    can_manage_users:     DOM.formManageUsers.checked,
    quotation_received:   formPermissions.includes("quotation_received"),
    quotation_breakdown:  formPermissions.includes("quotation_breakdown"),
    inventory:            formPermissions.includes("inventory"),
    project_status:       formPermissions.includes("project_status")
  };

  const { error } = await supabaseClient.from("user_profiles").upsert(payload);

  setButtonLoading(DOM.saveProfileBtn, false, "",
    `<i class="fa-solid fa-floppy-disk mr-sm"></i> Commit Changes`
  );

  if (error) {
    showToast(error.message, "error");
  } else {
    showToast("Profile updated successfully.");
    resetAdminForm();
    // Reload data preserving auth context
    await loadApplicationData({ id: currentUser.id, email: currentUser.email });
  }
}

// ============================================================
//  ADMIN — SAVE LINKS
// ============================================================
async function handleSaveLinks(e) {
  e.preventDefault();

  setButtonLoading(DOM.saveLinksBtn, true, "Deploying...");

  const rows = SECTIONS.map(s => {
    const input = document.getElementById(`link-input-${s.id}`);
    return {
      section_key: s.id,
      url: input ? input.value.trim() : ""
    };
  });

  const { error } = await supabaseClient
    .from("portal_links")
    .upsert(rows, { onConflict: "section_key" });

  setButtonLoading(DOM.saveLinksBtn, false, "",
    `<i class="fa-solid fa-paper-plane mr-sm"></i> Deploy Link Changes`
  );

  if (error) {
    showToast(error.message, "error");
  } else {
    showToast("Routing endpoints deployed.");
    await loadApplicationData({ id: currentUser.id, email: currentUser.email });
  }
}

// ============================================================
//  ADMIN FORM — RESET / POPULATE
// ============================================================
function resetAdminForm() {
  DOM.adminUserForm.reset();
  formPermissions = SECTIONS.map(s => s.id);
  renderPermissionPills();
  setText(DOM.formModeLabel, "Creating new profile");
  DOM.formClearBtn.classList.add("hidden");
}

function populateAdminForm(profile) {
  DOM.formUid.value           = safeText(profile.id);
  DOM.formName.value          = safeText(profile.full_name || "");
  DOM.formRole.value          = profile.role === "Admin" ? "Admin" : "User";
  DOM.formManageUsers.checked = !!profile.can_manage_users;

  formPermissions = SECTIONS
    .filter(s => !!profile[s.profileKey])
    .map(s => s.id);

  renderPermissionPills();
  setText(DOM.formModeLabel, `Editing: ${profile.full_name || profile.id}`);
  DOM.formClearBtn.classList.remove("hidden");

  // Scroll form into view on mobile
  DOM.adminUserForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
//  RENDER — DASHBOARD
// ============================================================
function renderDashboard() {
  const grid = DOM.dashboardGrid;
  grid.innerHTML = "";

  const allowed = SECTIONS.filter(s => currentUser.permissions.includes(s.id));

  if (allowed.length === 0) {
    const empty = createElement("div", { className: "empty-state", style: "grid-column:1/-1;" });
    const icon  = createElement("div", { className: "empty-state-icon" });
    icon.innerHTML = `<i class="fa-solid fa-box-open" aria-hidden="true"></i>`;
    const title = createElement("div", { className: "empty-state-title", text: "No modules assigned" });
    const desc  = createElement("div", { className: "empty-state-desc",  text: "Contact your administrator to request module access." });
    empty.append(icon, title, desc);
    grid.appendChild(empty);
    return;
  }

  allowed.forEach((s, i) => {
    const card = createElement("div", { className: "module-card flex flex-col h-full group" });
    card.style.animationDelay = `${i * 60}ms`;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", `Open ${s.title} module`);

    // Icon
    const iconWrap = createElement("div", { className: "module-icon" });
    const iconEl   = createElement("i",   { className: `fa-solid ${s.icon}`, attrs: { "aria-hidden": "true" } });
    iconWrap.appendChild(iconEl);

    // Title
    const title = createElement("h3", {
      className: "font-bold mb-xs text-white",
      text: s.title,
      style: "font-size:18px;"
    });

    // Description
    const desc = createElement("p", {
      className: "text-sm text-muted line-clamp-2",
      text: "Access secure module and related documents."
    });

    // Footer
    const footer = createElement("div", {
      className: "flex-align mt-auto pt-lg gap-sm text-xs font-bold uppercase tracking-widest text-muted group-hover:text-brand transition-colors",
      style: "margin-top:auto;padding-top:16px;"
    });
    const footerText = createElement("span", { text: "Access Module" });
    const footerIcon = createElement("i",    {
      className: "fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform",
      attrs: { "aria-hidden": "true" }
    });
    footer.append(footerText, footerIcon);

    card.append(iconWrap, title, desc, footer);

    const handleActivate = () => {
      if (s.id === "project_status") {
        switchSection("projects");
      } else {
        const url = portalLinks[s.id];
        if (url && url !== "#") {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          showToast("No URL configured for this module.", "error");
        }
      }
    };

    card.addEventListener("click",   handleActivate);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") handleActivate(); });

    grid.appendChild(card);
  });
}

// ============================================================
//  RENDER — PROJECTS
// ============================================================
function renderProjects() {
  const grid = DOM.projectsGrid;
  grid.innerHTML = "";

  PROJECTS_LIST.forEach((p, i) => {
    const card = createElement("div", { className: "glass-card rounded-2xl p-lg group" });
    card.style.animationDelay = `${i * 40}ms`;

    // Header row
    const header = createElement("div", {
      className: "flex-between items-start mb-md"
    });
    const projIcon = createElement("div", {
      style: "width:40px;height:40px;background:var(--bg-overlay);border-radius:var(--radius-md);border:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--text-muted);flex-shrink:0;"
    });
    const projIconI = createElement("i", {
      className: "fa-solid fa-diagram-project",
      attrs: { "aria-hidden": "true" }
    });
    projIcon.appendChild(projIconI);

    const badge = createElement("span", {
      text: p.id,
      style: "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;background:var(--bg-overlay);border:1px solid var(--border-subtle);color:var(--text-muted);padding:3px 8px;border-radius:var(--radius-sm);"
    });

    header.append(projIcon, badge);

    // Name
    const name = createElement("h3", {
      text: p.name,
      style: "font-size:14px;font-weight:700;color:var(--text-primary);margin-bottom:16px;line-height:1.35;"
    });

    // Footer
    const footer = createElement("div", {
      style: "padding-top:10px;border-top:1px solid var(--border-subtle);display:flex;align-items:center;justify-content:space-between;"
    });
    const statusWrap = createElement("div", {
      style: "display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;"
    });
    const dot = createElement("span", {
      className: "status-dot"
    });
    const statusText = createElement("span", { text: "Pending Setup" });
    statusWrap.append(dot, statusText);

    const lockIcon = createElement("i", {
      className: "fa-solid fa-lock",
      attrs: { "aria-hidden": "true" },
      style: "color:var(--text-muted);font-size:12px;"
    });

    footer.append(statusWrap, lockIcon);
    card.append(header, name, footer);
    grid.appendChild(card);
  });
}

// ============================================================
//  RENDER — ADMIN PANEL
// ============================================================
function renderAdminPanel() {
  // Stats
  setText(DOM.statTotalUsers, adminProfiles.length);
  setText(DOM.statAdminUsers, adminProfiles.filter(u => u.role === "Admin").length);
  setText(DOM.userCountLabel, adminProfiles.length);

  // Users table
  renderUsersTable(DOM.adminUserSearch ? DOM.adminUserSearch.value : "");

  // Permission pills
  renderPermissionPills();

  // Links inputs
  renderLinksForm();
}

function renderUsersTable(filterText = "") {
  const tbody = DOM.usersTableBody;
  tbody.innerHTML = "";

  const query = safeText(filterText).trim().toLowerCase();
  const filteredProfiles = adminProfiles.filter(u => {
    if (!query) return true;
    return safeText(u.full_name).toLowerCase().includes(query) ||
      safeText(u.id).toLowerCase().includes(query) ||
      safeText(u.role).toLowerCase().includes(query);
  });

  setText(DOM.userCountLabel, filteredProfiles.length);

  if (filteredProfiles.length === 0) {
    DOM.usersEmptyState.classList.remove("hidden");
    return;
  }

  DOM.usersEmptyState.classList.add("hidden");

  filteredProfiles.forEach(u => {
    const perms = SECTIONS.filter(s => !!u[s.profileKey]);
    const tr = createElement("tr", { attrs: { title: "Click to edit this profile" } });

    // Identity cell
    const tdIdentity = createElement("td", { className: "py-md px-md whitespace-nowrap" });
    const nameDiv    = createElement("div", {
      className: "font-bold text-white",
      text: u.full_name || "Unassigned"
    });
    const idDiv = createElement("div", {
      className: "text-xs text-muted font-mono mt-xs",
      text: u.id,
      style: "max-width:220px;overflow:hidden;text-overflow:ellipsis;"
    });
    idDiv.title = u.id; // full UUID on hover
    tdIdentity.append(nameDiv, idDiv);

    // Role cell
    const tdRole = createElement("td", { className: "py-md px-md whitespace-nowrap" });
    const roleSpan = createElement("span", {
      className: u.role === "Admin" ? "badge-admin" : "badge-user",
      text: u.role
    });
    tdRole.appendChild(roleSpan);

    // Permissions cell
    const tdPerms = createElement("td", { className: "py-md px-md" });
    if (perms.length === 0) {
      const noAccess = createElement("span", {
        text: "No access",
        style: "font-size:12px;color:var(--text-muted);font-style:italic;"
      });
      tdPerms.appendChild(noAccess);
    } else {
      const permWrap = createElement("div", { style: "display:flex;flex-wrap:wrap;gap:4px;" });
      perms.forEach(p => {
        const badge = createElement("span", { className: "badge-perm", text: p.title });
        permWrap.appendChild(badge);
      });
      tdPerms.appendChild(permWrap);
    }

    // Edit cell
    const tdEdit = createElement("td", { className: "py-md px-md whitespace-nowrap" });
    const editBtn = createElement("button", {
      className: "btn btn-icon btn-sm",
      attrs: { type: "button", title: "Edit profile", "aria-label": `Edit ${u.full_name || "profile"}` },
      style: "width:30px;height:30px;font-size:11px;"
    });
    const editIcon = createElement("i", { className: "fa-solid fa-pen", attrs: { "aria-hidden": "true" } });
    editBtn.appendChild(editIcon);
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      populateAdminForm(u);
      // Switch to users tab if not already active
      document.querySelector('[data-target="admin-users-tab"]').click();
    });
    tdEdit.appendChild(editBtn);

    tr.addEventListener("click", () => {
      populateAdminForm(u);
      document.querySelector('[data-target="admin-users-tab"]').click();
    });

    tr.append(tdIdentity, tdRole, tdPerms, tdEdit);
    tbody.appendChild(tr);
  });
}

function renderLinksForm() {
  DOM.linksInputContainer.innerHTML = "";

  SECTIONS.forEach(s => {
    const wrapper = createElement("div");
    const label   = createElement("label", {
      className: "form-label",
      attrs: { for: `link-input-${s.id}` }
    });

    const icon = createElement("i", {
      className: `fa-solid ${s.icon}`,
      attrs: { "aria-hidden": "true" },
      style: "margin-right:6px;"
    });
    label.appendChild(icon);
    label.appendChild(document.createTextNode(s.title));

    const input = createElement("input", {
      className: "input-field font-mono text-xs",
      attrs: {
        type: "url",
        id: `link-input-${s.id}`,
        placeholder: "https://...",
        autocomplete: "off"
      }
    });
    // Safe: value is from DB or DEFAULT_LINKS, not user-injected HTML
    input.value = portalLinks[s.id] || "";

    wrapper.append(label, input);
    DOM.linksInputContainer.appendChild(wrapper);
  });
}

// ============================================================
//  RENDER — PERMISSION PILLS
// ============================================================
function renderPermissionPills() {
  const container = DOM.formPermContainer;
  container.innerHTML = "";

  SECTIONS.forEach(s => {
    const isActive = formPermissions.includes(s.id);
    const pill = createElement("button", {
      className: `pill-btn ${isActive ? "active" : ""}`,
      attrs: { type: "button", "aria-pressed": isActive ? "true" : "false" }
    });

    const dot = createElement("div", { className: "pill-dot", attrs: { "aria-hidden": "true" } });
    const label = document.createTextNode(s.title);

    pill.append(dot, label);

    pill.addEventListener("click", () => {
      if (formPermissions.includes(s.id)) {
        formPermissions = formPermissions.filter(id => id !== s.id);
      } else {
        formPermissions.push(s.id);
      }
      renderPermissionPills();
    });

    container.appendChild(pill);
  });
}
