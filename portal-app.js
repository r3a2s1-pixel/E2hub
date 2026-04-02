// --- Supabase Configuration ---
const SUPABASE_URL = "https://ytyuigcylsjasiwneytt.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_oiuImVgo9JUTfTe5A6MNWw_y3OjqE7q";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Constants ---
const SECTIONS = [
  { id: "quotation_received", title: "Quotation Received", icon: "fa-envelope-open-text", profileKey: "quotation_received" },
  { id: "quotation_breakdown", title: "Cost Analysis", icon: "fa-calculator", profileKey: "quotation_breakdown" },
  { id: "inventory", title: "Inventory Control", icon: "fa-boxes-stacked", profileKey: "inventory" },
  { id: "project_status", title: "Project Status", icon: "fa-bars-progress", profileKey: "project_status" }
];

const DEFAULT_LINKS = {
  quotation_received: "https://eumeconn-my.sharepoint.com/:f:/g/personal/mur_eumecon_ae/IgAPlhb8DCDaTZrB4UO3uEZPAeakBCVbYYxSNR3lBC_lae0?e=OKv4nz",
  quotation_breakdown: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQAm8ZTtLMvkTLT09nEXPpXZAZY-QBduU8vIkv0phmrVIQ0",
  inventory: "https://eumeconn-my.sharepoint.com/:x:/g/personal/mur_eumecon_ae/IQCRw7fzXtuTRp-Gc88IMfzkAWkcBv0AOhzO6ORiLMER29Y",
  project_status: "#"
};

const PROJECTS_LIST = [
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
  loading: document.getElementById('loading-view'),
  login: document.getElementById('login-view'),
  app: document.getElementById('app-view')
};

const sections = {
  dashboard: document.getElementById('dashboard-section'),
  projects: document.getElementById('projects-section'),
  admin: document.getElementById('admin-section')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initAuthListener();
});

// --- Routing & UI Updates ---
function switchView(viewName) {
  Object.values(views).forEach(el => el.classList.remove('active'));
  views[viewName].classList.add('active');
}

function switchSection(sectionName) {
  Object.values(sections).forEach(el => el.classList.remove('active'));
  sections[sectionName].classList.add('active');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-check-circle' : 'fa-circle-exclamation'}"></i> ${message}`;
  
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

// --- Auth & Data Fetching ---
async function initAuthListener() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session?.user) {
    await loadApplicationData(session.user);
  } else {
    switchView('login');
  }

  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      await loadApplicationData(session.user);
    } else {
      currentUser = null;
      switchView('login');
    }
  });
}

async function loadApplicationData(authUser) {
  try {
    // Fetch Profile
    const { data: profile, error: profileErr } = await supabaseClient
      .from('user_profiles').select('*').eq('id', authUser.id).single();
    
    if (profileErr) throw new Error("Profile not found. Contact administrator.");

    currentUser = {
      id: authUser.id,
      email: authUser.email,
      name: profile.full_name || 'User',
      role: profile.role || 'User',
      canManage: !!profile.can_manage_users,
      permissions: SECTIONS.filter(s => !!profile[s.profileKey]).map(s => s.id)
    };

    // Fetch Links
    const { data: linksData } = await supabaseClient.from('portal_links').select('*');
    portalLinks = { ...DEFAULT_LINKS };
    if (linksData) linksData.forEach(row => { portalLinks[row.section_key] = row.url; });

    // Fetch Admin Data if privileged
    if (currentUser.canManage) {
      const { data: profilesData } = await supabaseClient.from('user_profiles').select('*').order('created_at');
      adminProfiles = profilesData || [];
      document.getElementById('nav-admin-btn').classList.remove('hidden');
      renderAdminPanel();
    } else {
      document.getElementById('nav-admin-btn').classList.add('hidden');
    }

    // Render UI
    renderDashboard();
    renderProjects();
    switchView('app');
    switchSection('dashboard');

  } catch (error) {
    showToast(error.message, 'error');
    supabaseClient.auth.signOut();
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  // Login Form
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('login-btn');
    btn.disabled = true;
    btn.textContent = "Signing In...";
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) showToast(error.message, 'error');
    
    btn.disabled = false;
    btn.textContent = "Sign In";
  });

  // Navigation
  document.getElementById('nav-logout-btn').addEventListener('click', () => supabaseClient.auth.signOut());
  document.getElementById('nav-logo-btn').addEventListener('click', () => switchSection('dashboard'));
  document.getElementById('nav-admin-btn').addEventListener('click', () => switchSection('admin'));
  document.getElementById('back-to-dashboard-btn').addEventListener('click', () => switchSection('dashboard'));

  // Admin Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById(e.target.dataset.target).classList.add('active');
    });
  });

  // Admin Form Submit (Save Profile)
  document.getElementById('admin-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-profile-btn');
    btn.disabled = true;
    btn.textContent = "Saving...";

    const payload = {
      id: document.getElementById('form-uid').value.trim(),
      full_name: document.getElementById('form-name').value.trim() || null,
      role: document.getElementById('form-role').value,
      can_manage_users: document.getElementById('form-manage-users').checked,
      quotation_received: formPermissions.includes("quotation_received"),
      quotation_breakdown: formPermissions.includes("quotation_breakdown"),
      inventory: formPermissions.includes("inventory"),
      project_status: formPermissions.includes("project_status")
    };

    const { error } = await supabaseClient.from('user_profiles').upsert(payload);
    
    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast("Profile saved successfully");
      document.getElementById('admin-user-form').reset();
      formPermissions = SECTIONS.map(s => s.id);
      renderPermissionPills();
      loadApplicationData(currentUser); // Refresh data
    }
    
    btn.disabled = false;
    btn.textContent = "Save Profile";
  });

  // Admin Form Submit (Save Links)
  document.getElementById('admin-links-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('save-links-btn');
    btn.disabled = true;
    btn.textContent = "Saving...";

    const rows = SECTIONS.map(s => ({
      section_key: s.id,
      url: document.getElementById(`link-input-${s.id}`).value
    }));

    const { error } = await supabaseClient.from('portal_links').upsert(rows, { onConflict: "section_key" });

    if (error) {
      showToast(error.message, 'error');
    } else {
      showToast("Links updated successfully");
      loadApplicationData(currentUser); // Refresh data
    }

    btn.disabled = false;
    btn.textContent = "Save Links";
  });
}

// --- Render Functions ---
function renderDashboard() {
  const grid = document.getElementById('dashboard-grid');
  grid.innerHTML = '';

  const allowed = SECTIONS.filter(s => currentUser.permissions.includes(s.id));

  allowed.forEach(s => {
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
      <div class="module-icon"><i class="fa-solid ${s.icon}"></i></div>
      <h3 class="text-lg font-bold mb-md">${s.title}</h3>
      <div class="click-text">Click to Access <i class="fa-solid fa-arrow-right ml-xs"></i></div>
    `;
    
    card.addEventListener('click', () => {
      if (s.id === 'project_status') {
        switchSection('projects');
      } else {
        const url = portalLinks[s.id];
        if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
      }
    });

    grid.appendChild(card);
  });
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  grid.innerHTML = '';

  DEFAULT_PROJECTS.forEach(p => {
    const isAct = p.status === 'active';
    const card = document.createElement('div');
    card.className = 'module-card';
    card.innerHTML = `
      <div class="flex-between mb-md">
        <div class="module-icon mb-0 h-12 w-12 text-lg"><i class="fa-solid fa-diagram-project"></i></div>
        <span class="text-xxs font-black uppercase tracking-widest bg-dark border-dark px-sm py-xs rounded-md text-muted">${p.id}</span>
      </div>
      <h3 class="text-lg font-bold mb-md">${p.name}</h3>
      <div class="mt-auto pt-md border-t border-dark flex-between">
        <span class="text-xxs font-bold uppercase tracking-widest text-muted italic">Details Soon</span>
        <i class="fa-solid fa-lock text-xs text-muted"></i>
      </div>
    `;
    grid.appendChild(card);
  });
}

function renderAdminPanel() {
  // Update Stats
  document.getElementById('stat-total-users').textContent = adminProfiles.length;
  document.getElementById('stat-admin-users').textContent = adminProfiles.filter(u => u.role === 'Admin').length;

  // Update Users Table
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = '';
  
  adminProfiles.forEach(u => {
    const perms = SECTIONS.filter(s => !!u[s.profileKey]);
    const permHTML = perms.length > 0 
      ? perms.map(p => `<span class="badge-perm">${p.title}</span>`).join('') 
      : '<span class="text-xs text-muted italic">No access</span>';

    const tr = document.createElement('tr');
    tr.className = 'border-b border-dark hover:bg-dark transition-colors';
    tr.innerHTML = `
      <td class="py-md align-top">
        <div class="font-bold">${u.full_name || 'Unassigned'}</div>
        <div class="text-xs text-muted font-mono mt-xs">${u.id}</div>
      </td>
      <td class="py-md align-top">
        <span class="${u.role === 'Admin' ? 'badge-admin' : 'badge-user'}">${u.role}</span>
      </td>
      <td class="py-md align-top">${permHTML}</td>
    `;
    tbody.appendChild(tr);
  });

  // Update Form Permissions
  renderPermissionPills();

  // Update Links Form
  const linkContainer = document.getElementById('links-input-container');
  linkContainer.innerHTML = '';
  SECTIONS.forEach(s => {
    linkContainer.innerHTML += `
      <div class="bg-dark border-dark p-md rounded-md">
        <label class="block text-sm font-bold mb-xs">${s.title}</label>
        <input type="url" id="link-input-${s.id}" value="${portalLinks[s.id] || ''}" class="input-field text-sm" placeholder="https://..." />
      </div>
    `;
  });
}

function renderPermissionPills() {
  const container = document.getElementById('form-permissions-container');
  container.innerHTML = '';
  
  SECTIONS.forEach(s => {
    const isActive = formPermissions.includes(s.id);
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `pill-btn ${isActive ? 'active' : ''}`;
    pill.innerHTML = `<div class="pill-dot"></div> ${s.title}`;
    
    pill.addEventListener('click', () => {
      if (isActive) formPermissions = formPermissions.filter(id => id !== s.id);
      else formPermissions.push(s.id);
      renderPermissionPills();
    });
    
    container.appendChild(pill);
  });
}