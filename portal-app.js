// --- Supabase Configuration ---
const SUPABASE_URL = "https://ytyuigcylsjasiwneytt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oiuImVgo9JUTfTe5A6MNWw_y3OjqE7q";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const SECTIONS = [
  { id: "quotation_received", title: "Quotation Received", icon: "fa-envelope-open-text", profileKey: "quotation_received" },
  { id: "quotation_breakdown", title: "Quotation Breakdown Details", icon: "fa-calculator", profileKey: "quotation_breakdown" },
  { id: "inventory", title: "Inventory Control", icon: "fa-boxes-stacked", profileKey: "inventory" },
  { id: "project_status", title: "Project Status", icon: "fa-bars-progress", profileKey: "project_status" }
];

const DEFAULT_LINKS = {
  quotation_received: "https://eumeconn-my.sharepoint.com/:f:/g/personal/mur_eumecon_ae/IgAPlhb8DCDaTZrB4UO3uEZPAeakBCVbYYxSNR3lBC_lae0?e=OKv4nz",
  quotation_breakdown: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQBcRC3Bly0vT5PNvJGEBUwIAR3JG4psdYcwG1Fg7jqVSzk",
  inventory: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQCRw7fzXtuTRp-Gc88IMfzkAWkcBv0AOhzO6ORiLMER29Y",
  project_status: "#"
};

const SEEDED_PROFILES = [
  {
    id: "ab0dc39e-084d-437f-b035-092dc5a0ab19",
    full_name: "Mia",
    role: "User",
    can_manage_users: false,
    quotation_received: true,
    quotation_breakdown: true,
    inventory: true,
    project_status: true
  },
  {
    id: "cb8e514f-6e93-44dc-ba32-8f78bc9c2db7",
    full_name: "edk",
    role: "User",
    can_manage_users: false,
    quotation_received: false,
    quotation_breakdown: true,
    inventory: true,
    project_status: true
  },
  {
    id: "2b865259-3df4-4a5e-a8f6-03092bb638d8",
    full_name: "sha",
    role: "User",
    can_manage_users: false,
    quotation_received: true,
    quotation_breakdown: true,
    inventory: true,
    project_status: true
  }
];

const DEFAULT_PROJECTS = [
  { id: "PRJ-01", name: "LULU ICAD Musaffah", status: "active" },
  { id: "PRJ-02", name: "Y Tower Capital centre (ADNEC)", status: "pending" },
  { id: "PRJ-03", name: "Pixel Tower Reem", status: "active" },
  { id: "PRJ-04", name: "LULU Hypermarket(MBZ)", status: "pending" },
  { id: "PRJ-05", name: "Y Tower - Al Nahyan - LuLu", status: "active" },
  { id: "PRJ-06", name: "AL Falah Plaza Residentaial complex", status: "pending" },
  { id: "PRJ-07", name: "Y Tower Reem", status: "active" },
  { id: "PRJ-08", name: "Forsan central mall", status: "pending" },
  { id: "PRJ-09", name: "Village mall", status: "active" },
  { id: "PRJ-10", name: "Workers village", status: "pending" }
];

// --- State Variables ---
let currentUser = null;
let portalLinks = { ...DEFAULT_LINKS };
let adminProfiles = [];
let formPermissions = SECTIONS.map(s => s.id);

// --- DOM Elements ---
const views = {
  loading: document.getElementById("loading-view"),
  login: document.getElementById("login-view"),
  app: document.getElementById("app-view")
};

const sections = {
  dashboard: document.getElementById("dashboard-section"),
  projects: document.getElementById("projects-section"),
  admin: document.getElementById("admin-section")
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initAuthListener();
});

// --- Helpers ---
function switchView(viewName) {
  Object.values(views).forEach(el => el.classList.remove("active"));
  views[viewName].classList.add("active");
}

function switchSection(sectionName) {
  Object.values(sections).forEach(el => el.classList.remove("active"));
  sections[sectionName].classList.add("active");
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === "success" ? "fa-check-circle" : "fa-circle-exclamation"}"></i> ${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function getSectionTitle(id) {
  return SECTIONS.find(s => s.id === id)?.title || id;
}

function profileToPermissions(profile) {
  if (!profile) return [];
  return SECTIONS.filter(s => !!profile[s.profileKey]).map(s => s.id);
}

async function seedManagedSetupIfAdmin(profile) {
  if (!profile?.can_manage_users) return;

  try {
    const { error: profileSeedError } = await supabaseClient
      .from("user_profiles")
      .upsert(SEEDED_PROFILES);

    if (profileSeedError) throw profileSeedError;

    const { error: linkSeedError } = await supabaseClient
      .from("portal_links")
      .upsert(
        [
          {
            section_key: "quotation_breakdown",
            url: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQBcRC3Bly0vT5PNvJGEBUwIAR3JG4psdYcwG1Fg7jqVSzk"
          }
        ],
        { onConflict: "section_key" }
      );

    if (linkSeedError) throw linkSeedError;
  } catch (err) {
    console.error("Seed error:", err);
  }
}

// --- Auth & Data Fetching ---
async function initAuthListener() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session?.user) {
      await loadApplicationData(session.user);
    } else {
      switchView("login");
    }

    supabaseClient.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          await loadApplicationData(session.user);
        } else {
          currentUser = null;
          adminProfiles = [];
          portalLinks = { ...DEFAULT_LINKS };
          switchView("login");
        }
      } catch (error) {
        console.error("Auth state change error:", error);
        showToast(error.message || "Failed to load profile.", "error");
        switchView("login");
      }
    });
  } catch (error) {
    console.error("Init auth error:", error);
    showToast(error.message || "Failed to initialize authentication.", "error");
    switchView("login");
  }
}

async function loadApplicationData(authUser) {
  try {
    const { data: profile, error: profileErr } = await supabaseClient
      .from("user_profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profileErr) throw profileErr;
    if (!profile) throw new Error("Profile not found. Contact administrator.");

    await seedManagedSetupIfAdmin(profile);

    const { data: refreshedProfile, error: refreshedProfileErr } = await supabaseClient
      .from("user_profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (refreshedProfileErr) throw refreshedProfileErr;
    if (!refreshedProfile) throw new Error("Profile not found after refresh.");

    currentUser = {
      id: authUser.id,
      email: authUser.email,
      name: refreshedProfile.full_name || authUser.email || "User",
      role: refreshedProfile.role || "User",
      canManage: !!refreshedProfile.can_manage_users,
      permissions: profileToPermissions(refreshedProfile)
    };

    const { data: linksData, error: linksErr } = await supabaseClient
      .from("portal_links")
      .select("*");

    if (linksErr) throw linksErr;

    portalLinks = { ...DEFAULT_LINKS };
    if (linksData) {
      linksData.forEach(row => {
        portalLinks[row.section_key] = row.url;
      });
    }

    if (currentUser.canManage) {
      const { data: profilesData, error: profilesErr } = await supabaseClient
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: true });

      if (profilesErr) throw profilesErr;

      adminProfiles = (profilesData || []).map(row => ({
        ...row,
        permissions: profileToPermissions(row)
      }));

      document.getElementById("nav-admin-btn").classList.remove("hidden");
      renderAdminPanel();
    } else {
      adminProfiles = [];
      document.getElementById("nav-admin-btn").classList.add("hidden");
    }

    renderDashboard();
    renderProjects();
    switchView("app");
    switchSection("dashboard");
  } catch (error) {
    console.error("Load application data error:", error);
    showToast(error.message || "Failed to load application data.", "error");
    await supabaseClient.auth.signOut();
    switchView("login");
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  document.getElementById("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("login-btn");
    btn.disabled = true;
    btn.textContent = "Signing In...";

    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      showToast(error.message || "Login failed.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Sign In";
    }
  });

  document.getElementById("nav-logout-btn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
  });

  document.getElementById("nav-logo-btn").addEventListener("click", () => switchSection("dashboard"));
  document.getElementById("nav-admin-btn").addEventListener("click", () => switchSection("admin"));
  document.getElementById("back-to-dashboard-btn").addEventListener("click", () => switchSection("dashboard"));

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
      e.target.classList.add("active");
      document.getElementById(e.target.dataset.target).classList.add("active");
    });
  });

  document.getElementById("admin-user-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("save-profile-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    const payload = {
      id: document.getElementById("form-uid").value.trim(),
      full_name: document.getElementById("form-name").value.trim() || null,
      role: document.getElementById("form-role").value,
      can_manage_users: document.getElementById("form-manage-users").checked,
      quotation_received: formPermissions.includes("quotation_received"),
      quotation_breakdown: formPermissions.includes("quotation_breakdown"),
      inventory: formPermissions.includes("inventory"),
      project_status: formPermissions.includes("project_status")
    };

    try {
      const { error } = await supabaseClient.from("user_profiles").upsert(payload);
      if (error) throw error;

      showToast("Profile saved successfully");
      document.getElementById("admin-user-form").reset();
      formPermissions = SECTIONS.map(s => s.id);
      renderPermissionPills();
      await loadApplicationData({ id: currentUser.id, email: currentUser.email });
    } catch (error) {
      showToast(error.message || "Failed to save profile.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Profile";
    }
  });

  document.getElementById("admin-links-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const btn = document.getElementById("save-links-btn");
    btn.disabled = true;
    btn.textContent = "Saving...";

    try {
      const rows = SECTIONS.map(s => ({
        section_key: s.id,
        url: document.getElementById(`link-input-${s.id}`).value
      }));

      const { error } = await supabaseClient
        .from("portal_links")
        .upsert(rows, { onConflict: "section_key" });

      if (error) throw error;

      showToast("Links updated successfully");
      await loadApplicationData({ id: currentUser.id, email: currentUser.email });
    } catch (error) {
      showToast(error.message || "Failed to save links.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Save Links";
    }
  });
}

// --- Render Functions ---
function renderDashboard() {
  const grid = document.getElementById("dashboard-grid");
  grid.innerHTML = "";

  const allowed = SECTIONS.filter(s => currentUser.permissions.includes(s.id));

  allowed.forEach(s => {
    const card = document.createElement("div");
    card.className = "module-card";
    card.innerHTML = `
      <div class="module-icon"><i class="fa-solid ${s.icon}"></i></div>
      <h3 class="text-lg font-bold mb-md">${s.title}</h3>
      <div class="click-text">Click to Access <i class="fa-solid fa-arrow-right ml-xs"></i></div>
    `;

    card.addEventListener("click", () => {
      if (s.id === "project_status") {
        switchSection("projects");
      } else {
        const url = portalLinks[s.id];
        if (url && url !== "#") window.open(url, "_blank", "noopener,noreferrer");
      }
    });

    grid.appendChild(card);
  });
}

function renderProjects() {
  const grid = document.getElementById("projects-grid");
  grid.innerHTML = "";

  DEFAULT_PROJECTS.forEach((p, index) => {
    const card = document.createElement("div");
    card.className = "module-card";
    card.innerHTML = `
      <div class="flex-between mb-md">
        <div class="module-icon mb-0 h-12 w-12 text-lg"><i class="fa-solid fa-diagram-project"></i></div>
        <div class="relative">
          <select class="input-field text-xs" id="project-status-${index}">
            <option value="active" ${p.status === "active" ? "selected" : ""}>Active</option>
            <option value="pending" ${p.status === "pending" ? "selected" : ""}>Pending</option>
          </select>
        </div>
      </div>
      <h3 class="text-lg font-bold mb-md">${p.name}</h3>
      <div class="mt-auto pt-md border-t border-dark flex-between">
        <span class="text-xxs font-bold uppercase tracking-widest text-muted italic">Details Available Soon</span>
        <i class="fa-solid fa-lock text-xs text-muted"></i>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAdminPanel() {
  document.getElementById("stat-total-users").textContent = adminProfiles.length;
  document.getElementById("stat-admin-users").textContent = adminProfiles.filter(u => u.role === "Admin").length;

  const tbody = document.getElementById("users-table-body");
  tbody.innerHTML = "";

  adminProfiles.forEach(u => {
    const perms = u.permissions || profileToPermissions(u);
    const permHTML = perms.length > 0
      ? perms.map(p => `<span class="badge-perm">${getSectionTitle(p)}</span>`).join("")
      : '<span class="text-xs text-muted italic">No access</span>';

    const tr = document.createElement("tr");
    tr.className = "border-b border-dark hover:bg-dark transition-colors";
    tr.innerHTML = `
      <td class="py-md align-top">
        <div class="font-bold">${u.full_name || "Unassigned"}</div>
        <div class="text-xs text-muted font-mono mt-xs">${u.id}</div>
      </td>
      <td class="py-md align-top">
        <span class="${u.role === "Admin" ? "badge-admin" : "badge-user"}">${u.role}</span>
      </td>
      <td class="py-md align-top">${permHTML}</td>
    `;
    tbody.appendChild(tr);
  });

  renderPermissionPills();

  const linkContainer = document.getElementById("links-input-container");
  linkContainer.innerHTML = "";
  SECTIONS.forEach(s => {
    linkContainer.innerHTML += `
      <div class="bg-dark border-dark p-md rounded-md">
        <label class="block text-sm font-bold mb-xs">${s.title}</label>
        <input type="url" id="link-input-${s.id}" value="${portalLinks[s.id] || ""}" class="input-field text-sm" placeholder="https://..." />
      </div>
    `;
  });
}

function renderPermissionPills() {
  const container = document.getElementById("form-permissions-container");
  container.innerHTML = "";

  SECTIONS.forEach(s => {
    const isActive = formPermissions.includes(s.id);
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = `pill-btn ${isActive ? "active" : ""}`;
    pill.innerHTML = `<div class="pill-dot"></div> ${s.title}`;

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
