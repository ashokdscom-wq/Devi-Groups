console.log("DEVI CONFIG CHECK:", window.DEVI_CMS_CONFIG);

console.log(
  "SUPABASE SDK:",
  window.supabase
    ? "LOADED"
    : "NOT LOADED"
);

const cfg = window.DEVI_CMS_CONFIG;

if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey) {
  document.body.innerHTML =
    '<div style="font-family:Arial;padding:40px;color:#b91c1c">' +
    '<h2>Supabase configuration not found.</h2>' +
    '<p>Check admin/cms-config.js</p>' +
    '</div>';

  throw new Error('Supabase configuration not found');
}

const sb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseKey
);

const BUCKET = 'devi-media';

let currentView = 'dashboard';

const $ = (s, root = document) =>
  root.querySelector(s);

const $$ = (s, root = document) =>
  [...root.querySelectorAll(s)];

const esc = v =>
  String(v ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])
  );

const safeJson = value => {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
};

function showToast(message, type = 'success') {
  let toast = $('#devi-toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'devi-toast';

    toast.style.cssText = `
      position:fixed;
      right:20px;
      bottom:20px;
      z-index:99999;
      padding:14px 18px;
      border-radius:10px;
      color:#fff;
      font-family:Arial,sans-serif;
      font-size:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.2);
      max-width:380px;
    `;

    document.body.appendChild(toast);
  }

  toast.textContent = message;

  toast.style.background =
    type === 'error'
      ? '#dc2626'
      : type === 'warning'
        ? '#d97706'
        : '#16a34a';

  clearTimeout(toast._timer);

  toast._timer = setTimeout(() => {
    toast.remove();
  }, 3500);
}

function showLoading(message = 'Loading...') {
  let loader = $('#devi-loading');

  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'devi-loading';

    loader.style.cssText = `
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.45);
      z-index:99998;
      display:flex;
      align-items:center;
      justify-content:center;
      font-family:Arial,sans-serif;
    `;

    loader.innerHTML = `
      <div style="
        background:#fff;
        padding:25px 30px;
        border-radius:14px;
        box-shadow:0 10px 40px rgba(0,0,0,.25);
        text-align:center;
      ">
        <div style="
          width:32px;
          height:32px;
          border:4px solid #e5e7eb;
          border-top-color:#2563eb;
          border-radius:50%;
          animation:deviSpin 1s linear infinite;
          margin:0 auto 14px;
        "></div>

        <div id="devi-loading-text">
          Loading...
        </div>
      </div>
    `;

    if (!$('#devi-spin-style')) {
      const style = document.createElement('style');
      style.id = 'devi-spin-style';
      style.textContent = `
        @keyframes deviSpin {
          to { transform:rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(loader);
  }

  const text = $('#devi-loading-text', loader);

  if (text) {
    text.textContent = message;
  }

  loader.style.display = 'flex';
}

function hideLoading() {
  const loader = $('#devi-loading');

  if (loader) {
    loader.style.display = 'none';
  }
}

function formatDate(value) {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch {
    return String(value);
  }
}

function fileNameFromUrl(url) {
  if (!url) return '';

  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(
      pathname.split('/').pop() || ''
    );
  } catch {
    return String(url).split('/').pop() || '';
  }
}

function publicStorageUrl(path) {
  if (!path) return '';

  const clean = String(path).replace(/^\/+/, '');

  return `${cfg.supabaseUrl}/storage/v1/object/public/${BUCKET}/${clean}`;
}

async function uploadMedia(file, folder = 'uploads') {
  if (!file) return '';

  if (!(file instanceof File)) {
    throw new Error('Invalid file selected');
  }

  const extension =
    file.name.includes('.')
      ? file.name.split('.').pop().toLowerCase()
      : '';

  const baseName =
    file.name
      .replace(/\.[^/.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'file';

  const random =
    Math.random().toString(36).slice(2, 10);

  const timestamp = Date.now();

  const path =
    `${folder}/${timestamp}-${random}-${baseName}` +
    (extension ? `.${extension}` : '');

  const { error } = await sb.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Storage upload error:', error);
    throw error;
  }

  return publicStorageUrl(path);
}

async function deleteMediaByUrl(url) {
  if (!url) return;

  try {
    const marker =
      `/storage/v1/object/public/${BUCKET}/`;

    const index = String(url).indexOf(marker);

    if (index === -1) return;

    const path = String(url).slice(
      index + marker.length
    );

    if (!path) return;

    const { error } = await sb.storage
      .from(BUCKET)
      .remove([path]);

    if (error) {
      console.warn(
        'Storage delete warning:',
        error
      );
    }
  } catch (error) {
    console.warn(
      'Unable to delete storage file:',
      error
    );
  }
}

async function listStorageFiles(folder = '') {
  const { data, error } = await sb.storage
    .from(BUCKET)
    .list(folder, {
      limit: 100,
      offset: 0,
      sortBy: {
        column: 'created_at',
        order: 'desc'
      }
    });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getSession() {
  const { data, error } =
    await sb.auth.getSession();

  if (error) {
    console.error(error);
    return null;
  }

  return data?.session || null;
}

async function getCurrentUser() {
  const { data, error } =
    await sb.auth.getUser();

  if (error) {
    console.error(error);
    return null;
  }

  return data?.user || null;
}

async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  /*
   * Primary admin account.
   * This UID is the authorized DEVI GROUPS admin.
   */
  if (
    user.id ===
    'c588a994-3fcb-46ed-9991-63ab20d65ac0'
  ) {
    return user;
  }

  /*
   * Also allow an explicit admin role if later
   * added to user metadata.
   */
  const role =
    user.user_metadata?.role ||
    user.app_metadata?.role;

  if (role === 'admin') {
    return user;
  }

  throw new Error(
    'This account is not authorized as an admin.'
  );
}

async function signOut() {
  await sb.auth.signOut();
  window.location.reload();
}

function getAdminRoot() {
  return $('#admin-app') ||
    $('#app') ||
    document.body;
}

function renderLogin() {
  document.body.innerHTML = `
    <div style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      background:
        linear-gradient(
          135deg,
          #0f172a,
          #1e3a8a
        );
      font-family:Arial,sans-serif;
      padding:20px;
      box-sizing:border-box;
    ">

      <div style="
        width:100%;
        max-width:430px;
        background:#fff;
        border-radius:18px;
        padding:35px;
        box-shadow:0 20px 70px rgba(0,0,0,.35);
        box-sizing:border-box;
      ">

        <div style="
          text-align:center;
          margin-bottom:28px;
        ">

          <div style="
            width:70px;
            height:70px;
            margin:0 auto 15px;
            border-radius:18px;
            background:#1d4ed8;
            color:#fff;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:25px;
            font-weight:800;
          ">
            DG
          </div>

          <h1 style="
            margin:0;
            font-size:25px;
            color:#0f172a;
          ">
            DEVI GROUPS
          </h1>

          <p style="
            margin:8px 0 0;
            color:#64748b;
          ">
            Secure Admin Panel
          </p>
        </div>

        <form id="login-form">

          <label style="
            display:block;
            margin-bottom:7px;
            font-weight:600;
            color:#334155;
          ">
            Email
          </label>

          <input
            id="login-email"
            type="email"
            required
            autocomplete="username"
            placeholder="Admin email"
            style="
              width:100%;
              padding:13px 14px;
              border:1px solid #cbd5e1;
              border-radius:9px;
              box-sizing:border-box;
              margin-bottom:18px;
              font-size:15px;
            "
          />

          <label style="
            display:block;
            margin-bottom:7px;
            font-weight:600;
            color:#334155;
          ">
            Password
          </label>

          <input
            id="login-password"
            type="password"
            required
            autocomplete="current-password"
            placeholder="Password"
            style="
              width:100%;
              padding:13px 14px;
              border:1px solid #cbd5e1;
              border-radius:9px;
              box-sizing:border-box;
              margin-bottom:18px;
              font-size:15px;
            "
          />

          <button
            type="submit"
            style="
              width:100%;
              border:0;
              padding:14px;
              border-radius:9px;
              background:#1d4ed8;
              color:#fff;
              font-size:15px;
              font-weight:700;
              cursor:pointer;
            "
          >
            Login
          </button>

        </form>

        <button
          id="forgot-password"
          type="button"
          style="
            display:block;
            width:100%;
            border:0;
            background:none;
            color:#2563eb;
            margin-top:18px;
            cursor:pointer;
            font-size:14px;
          "
        >
          Forgot password?
        </button>

        <div
          id="login-message"
          style="
            margin-top:15px;
            text-align:center;
            font-size:14px;
          "
        ></div>

      </div>
    </div>
  `;

  const form = $('#login-form');

  if (form) {
    form.addEventListener(
      'submit',
      handleLogin
    );
  }

  const forgot =
    $('#forgot-password');

  if (forgot) {
    forgot.addEventListener(
      'click',
      handleForgotPassword
    );
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const email =
    $('#login-email')?.value.trim();

  const password =
    $('#login-password')?.value || '';

  const message =
    $('#login-message');

  if (!email || !password) {
    if (message) {
      message.style.color = '#dc2626';
      message.textContent =
        'Please enter email and password.';
    }

    return;
  }

  if (message) {
    message.style.color = '#475569';
    message.textContent = 'Signing in...';
  }

  const { data, error } =
    await sb.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    console.error(
      'Login error:',
      error
    );

    if (message) {
      message.style.color = '#dc2626';
      message.textContent =
        error.message ||
        'Invalid login credentials.';
    }

    return;
  }

  if (!data?.user) {
    if (message) {
      message.style.color = '#dc2626';
      message.textContent =
        'Login failed.';
    }

    return;
  }

  try {
    await requireAdmin();
  } catch (adminError) {
    await sb.auth.signOut();

    if (message) {
      message.style.color = '#dc2626';
      message.textContent =
        adminError.message ||
        'This account is not authorized.';
    }

    return;
  }

  window.location.reload();
}

async function handleForgotPassword() {
  const email =
    $('#login-email')?.value.trim();

  if (!email) {
    showToast(
      'Enter your admin email first.',
      'warning'
    );
    return;
  }

  showLoading(
    'Sending password reset email...'
  );

  try {
    const redirectTo =
      `${window.location.origin}` +
      `${window.location.pathname.replace(
        /\/?$/,
        '/'
      )}`;

    const { error } =
      await sb.auth.resetPasswordForEmail(
        email,
        {
          redirectTo
        }
      );

    if (error) {
      throw error;
    }

    showToast(
      'Password reset email sent. Check your inbox.'
    );
  } catch (error) {
    console.error(
      'Password reset error:',
      error
    );

    showToast(
      error.message ||
      'Unable to send password reset email.',
      'error'
    );
  } finally {
    hideLoading();
  }
}

function renderShell(user) {
  document.body.innerHTML = `
    <div
      id="admin-app"
      style="
        min-height:100vh;
        background:#f1f5f9;
        font-family:Arial,sans-serif;
        color:#0f172a;
      "
    >

      <header style="
        background:#0f172a;
        color:#fff;
        padding:0 22px;
        min-height:68px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:20px;
      ">

        <div>
          <div style="
            font-size:20px;
            font-weight:800;
          ">
            DEVI GROUPS
          </div>

          <div style="
            font-size:12px;
            color:#94a3b8;
            margin-top:3px;
          ">
            ADMIN PANEL
          </div>
        </div>

        <div style="
          display:flex;
          align-items:center;
          gap:12px;
        ">

          <span style="
            color:#cbd5e1;
            font-size:13px;
          ">
            ${esc(user?.email || '')}
          </span>

          <button
            id="logout-btn"
            style="
              border:1px solid #475569;
              background:#1e293b;
              color:#fff;
              padding:9px 13px;
              border-radius:8px;
              cursor:pointer;
            "
          >
            Logout
          </button>

        </div>

      </header>

      <div style="
        display:flex;
        min-height:calc(100vh - 68px);
      ">

        <aside
          id="admin-sidebar"
          style="
            width:235px;
            background:#fff;
            border-right:1px solid #e2e8f0;
            padding:18px 12px;
            box-sizing:border-box;
          "
        >
          ${renderNavigation()}
        </aside>

        <main
          id="admin-main"
          style="
            flex:1;
            min-width:0;
            padding:25px;
            box-sizing:border-box;
          "
        >
        </main>

      </div>

    </div>
  `;

  const logout =
    $('#logout-btn');

  if (logout) {
    logout.addEventListener(
      'click',
      signOut
    );
  }

  setupNavigation();

  navigateTo('dashboard');
}

function renderNavigation() {
  const items = [
    ['dashboard', 'Dashboard'],
    ['products', 'Products'],
    ['business-units', 'Business Units'],
    ['homepage', 'Homepage'],
    ['enquiries', 'Customer Enquiries'],
    ['reviews', 'Reviews'],
    ['company-info', 'Company Info'],
    ['documents', 'Documents'],
    ['tracking', 'Tracking'],
    ['media', 'Media Library']
  ];

  return `
    <nav>

      <div style="
        padding:8px 10px 12px;
        color:#94a3b8;
        font-size:11px;
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.08em;
      ">
        Management
      </div>

      ${items.map(
        ([key, label]) => `
          <button
            class="admin-nav-btn"
            data-view="${esc(key)}"
            style="
              display:block;
              width:100%;
              text-align:left;
              border:0;
              background:transparent;
              color:#334155;
              padding:11px 12px;
              border-radius:8px;
              margin-bottom:3px;
              cursor:pointer;
              font-size:14px;
            "
          >
            ${esc(label)}
          </button>
        `
      ).join('')}

    </nav>
  `;
}

function setupNavigation() {
  $$('.admin-nav-btn').forEach(
    button => {
      button.addEventListener(
        'click',
        () => {
          const view =
            button.dataset.view;

          navigateTo(view);
        }
      );
    }
  );
}

function setActiveNavigation(view) {
  $$('.admin-nav-btn').forEach(
    button => {
      const active =
        button.dataset.view === view;

      button.style.background =
        active
          ? '#dbeafe'
          : 'transparent';

      button.style.color =
        active
          ? '#1d4ed8'
          : '#334155';

      button.style.fontWeight =
        active
          ? '700'
          : '400';
    }
  );
}

async function navigateTo(view) {
  currentView = view;

  setActiveNavigation(view);

  const main =
    $('#admin-main');

  if (!main) return;

  main.innerHTML = `
    <div style="
      padding:60px;
      text-align:center;
      color:#64748b;
    ">
      Loading...
    </div>
  `;

  try {
    switch (view) {
      case 'dashboard':
        await renderDashboard();
        break;

      case 'products':
        await renderProducts();
        break;

      case 'business-units':
        await renderBusinessUnits();
        break;

      case 'homepage':
        await renderHomepage();
        break;

      case 'enquiries':
        await renderEnquiries();
        break;

      case 'reviews':
        await renderReviews();
        break;

      case 'company-info':
        await renderCompanyInfo();
        break;

      case 'documents':
        await renderDocuments();
        break;

      case 'tracking':
        await renderTracking();
        break;

      case 'media':
        await renderMediaLibrary();
        break;

      default:
        main.innerHTML = `
          <h2>Page not found</h2>
        `;
    }
  } catch (error) {
    console.error(
      `Error loading ${view}:`,
      error
    );

    main.innerHTML = `
      <div style="
        background:#fee2e2;
        border:1px solid #fecaca;
        color:#991b1b;
        padding:18px;
        border-radius:10px;
      ">
        <strong>
          Unable to load this section.
        </strong>

        <div style="
          margin-top:8px;
          font-size:13px;
        ">
          ${esc(error.message || error)}
        </div>
      </div>
    `;
  }
}

function pageHeader(
  title,
  description = '',
  actionHtml = ''
) {
  return `
    <div style="
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:20px;
      margin-bottom:25px;
      flex-wrap:wrap;
    ">

      <div>
        <h1 style="
          margin:0;
          font-size:28px;
          color:#0f172a;
        ">
          ${esc(title)}
        </h1>

        ${
          description
            ? `
              <p style="
                margin:7px 0 0;
                color:#64748b;
                font-size:14px;
              ">
                ${esc(description)}
              </p>
            `
            : ''
        }
      </div>

      ${
        actionHtml
          ? `
            <div>
              ${actionHtml}
            </div>
          `
          : ''
      }

    </div>
  `;
}

function cardHtml(
  content,
  extraStyle = ''
) {
  return `
    <div style="
      background:#fff;
      border:1px solid #e2e8f0;
      border-radius:12px;
      padding:20px;
      box-sizing:border-box;
      ${extraStyle}
    ">
      ${content}
    </div>
  `;
}

function statCard(
  title,
  value,
  subtitle = ''
) {
  return `
    <div style="
      background:#fff;
      border:1px solid #e2e8f0;
      border-radius:12px;
      padding:20px;
    ">

      <div style="
        color:#64748b;
        font-size:13px;
        font-weight:600;
      ">
        ${esc(title)}
      </div>

      <div style="
        font-size:30px;
        font-weight:800;
        color:#0f172a;
        margin-top:7px;
      ">
        ${esc(value)}
      </div>

      ${
        subtitle
          ? `
            <div style="
              color:#94a3b8;
              font-size:12px;
              margin-top:5px;
            ">
              ${esc(subtitle)}
            </div>
          `
          : ''
      }

    </div>
  `;
}

function inputStyle() {
  return `
    width:100%;
    box-sizing:border-box;
    padding:11px 12px;
    border:1px solid #cbd5e1;
    border-radius:8px;
    font-size:14px;
    background:#fff;
  `;
}

function buttonStyle(
  type = 'primary'
) {
  if (type === 'danger') {
    return `
      border:0;
      background:#dc2626;
      color:#fff;
      padding:10px 14px;
      border-radius:8px;
      cursor:pointer;
      font-weight:600;
    `;
  }

  if (type === 'secondary') {
    return `
      border:1px solid #cbd5e1;
      background:#fff;
      color:#334155;
      padding:10px 14px;
      border-radius:8px;
      cursor:pointer;
      font-weight:600;
    `;
  }

  return `
    border:0;
    background:#2563eb;
    color:#fff;
    padding:10px 14px;
    border-radius:8px;
    cursor:pointer;
    font-weight:600;
  `;
}
/* =========================================================
   PART 2 — DASHBOARD + PRODUCTS
   ========================================================= */

async function renderDashboard() {
  const main = $('#admin-main');

  const [
    productsResult,
    unitsResult,
    enquiriesResult,
    reviewsResult,
    documentsResult,
    trackingResult
  ] = await Promise.all([
    sb.from('products')
      .select('id', { count: 'exact', head: true }),

    sb.from('business_units')
      .select('id', { count: 'exact', head: true }),

    sb.from('customer_enquiries')
      .select('id', { count: 'exact', head: true }),

    sb.from('reviews')
      .select('id', { count: 'exact', head: true }),

    sb.from('documents')
      .select('id', { count: 'exact', head: true }),

    sb.from('tracking')
      .select('id', { count: 'exact', head: true })
  ]);

  const errors = [
    productsResult,
    unitsResult,
    enquiriesResult,
    reviewsResult,
    documentsResult,
    trackingResult
  ].filter(x => x.error);

  if (errors.length) {
    console.error(
      'Dashboard query errors:',
      errors
    );
  }

  const productsCount =
    productsResult.count || 0;

  const unitsCount =
    unitsResult.count || 0;

  const enquiriesCount =
    enquiriesResult.count || 0;

  const reviewsCount =
    reviewsResult.count || 0;

  const documentsCount =
    documentsResult.count || 0;

  const trackingCount =
    trackingResult.count || 0;

  main.innerHTML = `
    ${pageHeader(
      'Dashboard',
      'DEVI GROUPS CMS overview and management.'
    )}

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(180px,1fr));
      gap:15px;
      margin-bottom:25px;
    ">

      ${statCard(
        'Products',
        productsCount,
        'Products in catalog'
      )}

      ${statCard(
        'Business Units',
        unitsCount,
        'Active business units'
      )}

      ${statCard(
        'Customer Enquiries',
        enquiriesCount,
        'Received enquiries'
      )}

      ${statCard(
        'Reviews',
        reviewsCount,
        'Customer reviews'
      )}

      ${statCard(
        'Documents',
        documentsCount,
        'Uploaded documents'
      )}

      ${statCard(
        'Tracking',
        trackingCount,
        'Tracking records'
      )}

    </div>

    ${cardHtml(`
      <h2 style="
        margin:0 0 10px;
        font-size:20px;
      ">
        DEVI GROUPS Admin CMS
      </h2>

      <p style="
        margin:0;
        color:#64748b;
        line-height:1.7;
      ">
        Use the menu to manage products,
        business units, homepage content,
        customer enquiries, reviews,
        company information, documents
        and shipment tracking.
      </p>
    `)}
  `;
}


/* =========================================================
   PRODUCTS
   ========================================================= */

async function getProducts() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('id', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return data || [];
}


async function renderProducts() {
  const main = $('#admin-main');

  const products =
    await getProducts();

  main.innerHTML = `
    ${pageHeader(
      'Products',
      'Add, edit and delete products from the live catalog.',
      `
        <button
          id="add-product-btn"
          style="${buttonStyle('primary')}"
        >
          + Add Product
        </button>
      `
    )}

    <div id="product-form-container"></div>

    <div id="products-list">

      ${
        products.length
          ? products.map(renderProductRow).join('')
          : cardHtml(`
              <div style="
                text-align:center;
                color:#64748b;
                padding:30px;
              ">
                No products found.
              </div>
            `)
      }

    </div>
  `;

  $('#add-product-btn')
    ?.addEventListener(
      'click',
      () => showProductForm()
    );

  setupProductActions();
}


function renderProductRow(product) {
  const image =
    product.image_url || '';

  const name =
    product.name ||
    product.product_name ||
    'Unnamed Product';

  const description =
    product.description || '';

  const packing =
    product.packing || '';

  const category =
    product.category || '';

  return `
    <div
      class="product-row"
      data-id="${esc(product.id)}"
      style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:18px;
        margin-bottom:12px;
        display:flex;
        gap:18px;
        align-items:flex-start;
        flex-wrap:wrap;
      "
    >

      <div style="
        width:100px;
        height:100px;
        flex:0 0 100px;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        border-radius:10px;
        overflow:hidden;
        display:flex;
        align-items:center;
        justify-content:center;
      ">

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(name)}"
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              />
            `
            : `
              <span style="
                color:#94a3b8;
                font-size:12px;
              ">
                No Image
              </span>
            `
        }

      </div>

      <div style="
        flex:1;
        min-width:250px;
      ">

        <div style="
          font-size:18px;
          font-weight:700;
          color:#0f172a;
          margin-bottom:5px;
        ">
          ${esc(name)}
        </div>

        ${
          category
            ? `
              <div style="
                display:inline-block;
                background:#eff6ff;
                color:#1d4ed8;
                border-radius:999px;
                padding:4px 9px;
                font-size:11px;
                font-weight:700;
                margin-bottom:8px;
              ">
                ${esc(category)}
              </div>
            `
            : ''
        }

        <div style="
          color:#64748b;
          font-size:13px;
          line-height:1.6;
          margin-bottom:7px;
        ">
          ${esc(description)}
        </div>

        ${
          packing
            ? `
              <div style="
                color:#475569;
                font-size:12px;
              ">
                <strong>Packing:</strong>
                ${esc(packing)}
              </div>
            `
            : ''
        }

      </div>

      <div style="
        display:flex;
        gap:8px;
        align-items:center;
      ">

        <button
          class="edit-product-btn"
          data-id="${esc(product.id)}"
          style="${buttonStyle('secondary')}"
        >
          Edit
        </button>

        <button
          class="delete-product-btn"
          data-id="${esc(product.id)}"
          style="${buttonStyle('danger')}"
        >
          Delete
        </button>

      </div>

    </div>
  `;
}


function setupProductActions() {
  $$('.edit-product-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          const id =
            button.dataset.id;

          await showProductForm(id);
        }
      );
    });

  $$('.delete-product-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          const id =
            button.dataset.id;

          await deleteProduct(id);
        }
      );
    });
}


async function showProductForm(id = null) {
  const container =
    $('#product-form-container');

  if (!container) return;

  let product = null;

  if (id) {
    const { data, error } =
      await sb
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      showToast(
        error.message,
        'error'
      );
      return;
    }

    product = data;
  }

  container.innerHTML = `
    ${cardHtml(`
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
        gap:15px;
      ">

        <h2 style="
          margin:0;
          font-size:20px;
        ">
          ${
            product
              ? 'Edit Product'
              : 'Add Product'
          }
        </h2>

        <button
          id="close-product-form"
          type="button"
          style="${buttonStyle('secondary')}"
        >
          Close
        </button>

      </div>

      <form id="product-form">

        <input
          type="hidden"
          id="product-id"
          value="${esc(product?.id || '')}"
        />

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(240px,1fr));
          gap:16px;
        ">

          <div>
            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Product Name *
            </label>

            <input
              id="product-name"
              required
              value="${esc(
                product?.name ||
                product?.product_name ||
                ''
              )}"
              style="${inputStyle()}"
              placeholder="Product name"
            />
          </div>

          <div>
            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Category
            </label>

            <input
              id="product-category"
              value="${esc(
                product?.category || ''
              )}"
              style="${inputStyle()}"
              placeholder="e.g. Chemicals"
            />
          </div>

          <div>
            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Packing
            </label>

            <input
              id="product-packing"
              value="${esc(
                product?.packing || ''
              )}"
              style="${inputStyle()}"
              placeholder="e.g. 25 KG Bag"
            />
          </div>

          <div>
            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Product Code
            </label>

            <input
              id="product-code"
              value="${esc(
                product?.product_code || ''
              )}"
              style="${inputStyle()}"
              placeholder="Optional product code"
            />
          </div>

        </div>

        <div style="margin-top:16px;">

          <label style="
            display:block;
            margin-bottom:6px;
            font-size:13px;
            font-weight:700;
          ">
            Description
          </label>

          <textarea
            id="product-description"
            rows="5"
            style="${inputStyle()}resize:vertical;"
            placeholder="Product description"
          >${esc(
            product?.description || ''
          )}</textarea>

        </div>

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(260px,1fr));
          gap:16px;
          margin-top:16px;
        ">

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Product Photo
            </label>

            <input
              id="product-image-file"
              type="file"
              accept="image/*"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #cbd5e1;
                border-radius:8px;
              "
            />

            ${
              product?.image_url
                ? `
                  <div style="
                    margin-top:10px;
                  ">
                    <img
                      src="${esc(
                        product.image_url
                      )}"
                      alt=""
                      style="
                        width:120px;
                        height:120px;
                        object-fit:cover;
                        border-radius:9px;
                        border:1px solid #e2e8f0;
                      "
                    />
                  </div>
                `
                : ''
            }

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Brochure / PDF
            </label>

            <input
              id="product-brochure-file"
              type="file"
              accept=".pdf,.doc,.docx"
              style="
                width:100%;
                box-sizing:border-box;
                padding:9px;
                border:1px solid #cbd5e1;
                border-radius:8px;
              "
            />

            ${
              product?.brochure_url
                ? `
                  <div style="
                    margin-top:9px;
                    font-size:12px;
                  ">
                    Existing:
                    <a
                      href="${esc(
                        product.brochure_url
                      )}"
                      target="_blank"
                      rel="noopener"
                    >
                      ${esc(
                        fileNameFromUrl(
                          product.brochure_url
                        )
                      ) || 'Open file'}
                    </a>
                  </div>
                `
                : ''
            }

          </div>

        </div>

        <div style="
          display:flex;
          gap:10px;
          margin-top:22px;
        ">

          <button
            type="submit"
            style="${buttonStyle('primary')}"
          >
            ${
              product
                ? 'Update Product'
                : 'Save Product'
            }
          </button>

          <button
            id="cancel-product-form"
            type="button"
            style="${buttonStyle('secondary')}"
          >
            Cancel
          </button>

        </div>

      </form>
    `)}
  `;

  $('#close-product-form')
    ?.addEventListener(
      'click',
      () => {
        container.innerHTML = '';
      }
    );

  $('#cancel-product-form')
    ?.addEventListener(
      'click',
      () => {
        container.innerHTML = '';
      }
    );

  $('#product-form')
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        await saveProduct(product);
      }
    );

  container.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}


async function saveProduct(existingProduct) {
  const id =
    $('#product-id')?.value ||
    null;

  const name =
    $('#product-name')?.value.trim() ||
    '';

  const category =
    $('#product-category')?.value.trim() ||
    '';

  const packing =
    $('#product-packing')?.value.trim() ||
    '';

  const productCode =
    $('#product-code')?.value.trim() ||
    '';

  const description =
    $('#product-description')?.value.trim() ||
    '';

  const imageFile =
    $('#product-image-file')?.files?.[0] ||
    null;

  const brochureFile =
    $('#product-brochure-file')?.files?.[0] ||
    null;

  if (!name) {
    showToast(
      'Product name is required.',
      'warning'
    );
    return;
  }

  showLoading(
    existingProduct
      ? 'Updating product...'
      : 'Adding product...'
  );

  try {
    let imageUrl =
      existingProduct?.image_url ||
      '';

    let brochureUrl =
      existingProduct?.brochure_url ||
      '';

    if (imageFile) {
      imageUrl =
        await uploadMedia(
          imageFile,
          'products'
        );
    }

    if (brochureFile) {
      brochureUrl =
        await uploadMedia(
          brochureFile,
          'documents/products'
        );
    }

    const payload = {
      name,
      description,
      packing,
      category,
      product_code: productCode,
      image_url: imageUrl,
      brochure_url: brochureUrl
    };

    /*
     * IMPORTANT:
     * Products use bigint "id".
     * Update must use .eq('id', id),
     * NOT .eq('key', originalKey).
     */

    if (id) {
      const { error } =
        await sb
          .from('products')
          .update(payload)
          .eq('id', id);

      if (error) {
        throw error;
      }

      showToast(
        'Product updated successfully.'
      );

    } else {
      const { error } =
        await sb
          .from('products')
          .insert(payload);

      if (error) {
        throw error;
      }

      showToast(
        'Product added successfully.'
      );
    }

    const container =
      $('#product-form-container');

    if (container) {
      container.innerHTML = '';
    }

    await renderProducts();

  } catch (error) {
    console.error(
      'Save product error:',
      error
    );

    showToast(
      error.message ||
      'Unable to save product.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


async function deleteProduct(id) {
  if (!id) return;

  const confirmed =
    window.confirm(
      'Are you sure you want to delete this product?'
    );

  if (!confirmed) {
    return;
  }

  showLoading(
    'Deleting product...'
  );

  try {
    const { data: product } =
      await sb
        .from('products')
        .select(
          'id,image_url,brochure_url'
        )
        .eq('id', id)
        .maybeSingle();

    /*
     * Delete database record first.
     */

    const { error } =
      await sb
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }

    /*
     * Remove associated files when possible.
     */
    if (product?.image_url) {
      await deleteMediaByUrl(
        product.image_url
      );
    }

    if (product?.brochure_url) {
      await deleteMediaByUrl(
        product.brochure_url
      );
    }

    showToast(
      'Product deleted successfully.'
    );

    await renderProducts();

  } catch (error) {
    console.error(
      'Delete product error:',
      error
    );

    showToast(
      error.message ||
      'Unable to delete product.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   PRODUCT SEARCH / FILTER HELPERS
   ========================================================= */

function filterProductRows(searchTerm) {
  const term =
    String(searchTerm || '')
      .trim()
      .toLowerCase();

  $$('.product-row')
    .forEach(row => {
      const text =
        row.textContent
          .toLowerCase();

      row.style.display =
        !term || text.includes(term)
          ? ''
          : 'none';
    });
}


function addProductSearchBox() {
  const list =
    $('#products-list');

  if (!list) return;

  const wrapper =
    document.createElement('div');

  wrapper.style.cssText = `
    margin-bottom:15px;
  `;

  wrapper.innerHTML = `
    <input
      id="product-search"
      type="search"
      placeholder="Search products..."
      style="
        width:100%;
        max-width:500px;
        ${inputStyle()}
      "
    />
  `;

  list.parentNode.insertBefore(
    wrapper,
    list
  );

  $('#product-search')
    ?.addEventListener(
      'input',
      event => {
        filterProductRows(
          event.target.value
        );
      }
    );
}


/* =========================================================
   PRODUCT TABLE EXPORT
   ========================================================= */

function productsToCSV(products) {
  const headers = [
    'ID',
    'Name',
    'Category',
    'Packing',
    'Description',
    'Product Code',
    'Image URL',
    'Brochure URL'
  ];

  const rows = products.map(
    product => [
      product.id,
      product.name ||
        product.product_name ||
        '',
      product.category || '',
      product.packing || '',
      product.description || '',
      product.product_code || '',
      product.image_url || '',
      product.brochure_url || ''
    ]
  );

  const csv = [
    headers,
    ...rows
  ]
    .map(row =>
      row.map(value => {
        const text =
          String(value ?? '');

        return `"${text.replace(
          /"/g,
          '""'
        )}"`;
      }).join(',')
    )
    .join('\n');

  return csv;
}


function downloadTextFile(
  filename,
  content,
  mime = 'text/plain'
) {
  const blob =
    new Blob(
      [content],
      { type: mime }
    );

  const url =
    URL.createObjectURL(blob);

  const a =
    document.createElement('a');

  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}


/* =========================================================
   PRODUCT IMAGE PREVIEW
   ========================================================= */

function setupProductImagePreview() {
  const input =
    $('#product-image-file');

  if (!input) return;

  input.addEventListener(
    'change',
    event => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast(
          'Please select an image file.',
          'warning'
        );

        event.target.value = '';

        return;
      }

      const existing =
        $('#new-product-image-preview');

      if (existing) {
        existing.remove();
      }

      const preview =
        document.createElement('img');

      preview.id =
        'new-product-image-preview';

      preview.style.cssText = `
        width:120px;
        height:120px;
        object-fit:cover;
        margin-top:10px;
        border-radius:9px;
        border:1px solid #e2e8f0;
      `;

      preview.src =
        URL.createObjectURL(file);

      input.parentNode.appendChild(
        preview
      );
    }
  );
}


/* =========================================================
   PRODUCT BROCHURE VALIDATION
   ========================================================= */

function validateDocumentFile(file) {
  if (!file) {
    return true;
  }

  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const extension =
    file.name
      .split('.')
      .pop()
      .toLowerCase();

  const allowedExtensions = [
    'pdf',
    'doc',
    'docx'
  ];

  if (
    !allowed.includes(file.type) &&
    !allowedExtensions.includes(
      extension
    )
  ) {
    showToast(
      'Only PDF, DOC or DOCX files are allowed.',
      'warning'
    );

    return false;
  }

  return true;
}
/* =========================================================
   PART 3 — BUSINESS UNITS + HOMEPAGE CMS
   ========================================================= */


/* =========================================================
   BUSINESS UNITS
   ========================================================= */

async function getBusinessUnits() {
  const { data, error } = await sb
    .from('business_units')
    .select('*')
    .order('id', {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data || [];
}


async function renderBusinessUnits() {
  const main = $('#admin-main');

  const units =
    await getBusinessUnits();

  main.innerHTML = `
    ${pageHeader(
      'Business Units',
      'Manage DEVI GROUPS business units.',
      `
        <button
          id="add-unit-btn"
          style="${buttonStyle('primary')}"
        >
          + Add Business Unit
        </button>
      `
    )}

    <div id="business-unit-form-container"></div>

    <div id="business-units-list">

      ${
        units.length
          ? units
              .map(renderBusinessUnitRow)
              .join('')
          : cardHtml(`
              <div style="
                text-align:center;
                color:#64748b;
                padding:30px;
              ">
                No business units found.
              </div>
            `)
      }

    </div>
  `;

  $('#add-unit-btn')
    ?.addEventListener(
      'click',
      () => showBusinessUnitForm()
    );

  setupBusinessUnitActions();
}


function renderBusinessUnitRow(unit) {
  const name =
    unit.name ||
    unit.title ||
    'Unnamed Business Unit';

  const description =
    unit.description || '';

  const image =
    unit.image_url || '';

  const website =
    unit.website ||
    unit.website_url ||
    '';

  return `
    <div
      class="business-unit-row"
      data-id="${esc(unit.id)}"
      style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:18px;
        margin-bottom:12px;
        display:flex;
        gap:18px;
        align-items:flex-start;
        flex-wrap:wrap;
      "
    >

      <div style="
        width:110px;
        height:90px;
        flex:0 0 110px;
        border-radius:10px;
        overflow:hidden;
        background:#f8fafc;
        border:1px solid #e2e8f0;
        display:flex;
        align-items:center;
        justify-content:center;
      ">

        ${
          image
            ? `
              <img
                src="${esc(image)}"
                alt="${esc(name)}"
                style="
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              />
            `
            : `
              <span style="
                color:#94a3b8;
                font-size:11px;
              ">
                No Image
              </span>
            `
        }

      </div>

      <div style="
        flex:1;
        min-width:250px;
      ">

        <div style="
          font-size:18px;
          font-weight:700;
          margin-bottom:7px;
        ">
          ${esc(name)}
        </div>

        <div style="
          color:#64748b;
          font-size:13px;
          line-height:1.6;
          margin-bottom:8px;
        ">
          ${esc(description)}
        </div>

        ${
          website
            ? `
              <a
                href="${esc(website)}"
                target="_blank"
                rel="noopener"
                style="
                  color:#2563eb;
                  font-size:12px;
                "
              >
                ${esc(website)}
              </a>
            `
            : ''
        }

      </div>

      <div style="
        display:flex;
        gap:8px;
      ">

        <button
          class="edit-unit-btn"
          data-id="${esc(unit.id)}"
          style="${buttonStyle('secondary')}"
        >
          Edit
        </button>

        <button
          class="delete-unit-btn"
          data-id="${esc(unit.id)}"
          style="${buttonStyle('danger')}"
        >
          Delete
        </button>

      </div>

    </div>
  `;
}


function setupBusinessUnitActions() {
  $$('.edit-unit-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          await showBusinessUnitForm(
            button.dataset.id
          );
        }
      );
    });

  $$('.delete-unit-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          await deleteBusinessUnit(
            button.dataset.id
          );
        }
      );
    });
}


async function showBusinessUnitForm(id = null) {
  const container =
    $('#business-unit-form-container');

  if (!container) return;

  let unit = null;

  if (id) {
    const { data, error } =
      await sb
        .from('business_units')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
      showToast(
        error.message,
        'error'
      );
      return;
    }

    unit = data;
  }

  container.innerHTML = `
    ${cardHtml(`
      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:20px;
      ">

        <h2 style="
          margin:0;
          font-size:20px;
        ">
          ${
            unit
              ? 'Edit Business Unit'
              : 'Add Business Unit'
          }
        </h2>

        <button
          id="close-unit-form"
          type="button"
          style="${buttonStyle('secondary')}"
        >
          Close
        </button>

      </div>

      <form id="business-unit-form">

        <input
          type="hidden"
          id="unit-id"
          value="${esc(unit?.id || '')}"
        />

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(240px,1fr));
          gap:16px;
        ">

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Business Unit Name *
            </label>

            <input
              id="unit-name"
              required
              value="${esc(
                unit?.name ||
                unit?.title ||
                ''
              )}"
              style="${inputStyle()}"
              placeholder="Business unit name"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Website
            </label>

            <input
              id="unit-website"
              type="url"
              value="${esc(
                unit?.website ||
                unit?.website_url ||
                ''
              )}"
              style="${inputStyle()}"
              placeholder="https://example.com"
            />

          </div>

        </div>

        <div style="margin-top:16px;">

          <label style="
            display:block;
            margin-bottom:6px;
            font-size:13px;
            font-weight:700;
          ">
            Description
          </label>

          <textarea
            id="unit-description"
            rows="5"
            style="${inputStyle()}resize:vertical;"
            placeholder="Business unit description"
          >${esc(
            unit?.description || ''
          )}</textarea>

        </div>

        <div style="margin-top:16px;">

          <label style="
            display:block;
            margin-bottom:6px;
            font-size:13px;
            font-weight:700;
          ">
            Business Unit Image
          </label>

          <input
            id="unit-image-file"
            type="file"
            accept="image/*"
            style="
              width:100%;
              box-sizing:border-box;
              padding:9px;
              border:1px solid #cbd5e1;
              border-radius:8px;
            "
          />

          ${
            unit?.image_url
              ? `
                <img
                  src="${esc(
                    unit.image_url
                  )}"
                  alt=""
                  style="
                    width:150px;
                    height:100px;
                    object-fit:cover;
                    border-radius:9px;
                    margin-top:10px;
                  "
                />
              `
              : ''
          }

        </div>

        <div style="
          display:flex;
          gap:10px;
          margin-top:22px;
        ">

          <button
            type="submit"
            style="${buttonStyle('primary')}"
          >
            ${
              unit
                ? 'Update Business Unit'
                : 'Save Business Unit'
            }
          </button>

          <button
            id="cancel-unit-form"
            type="button"
            style="${buttonStyle('secondary')}"
          >
            Cancel
          </button>

        </div>

      </form>
    `)}
  `;

  $('#close-unit-form')
    ?.addEventListener(
      'click',
      () => {
        container.innerHTML = '';
      }
    );

  $('#cancel-unit-form')
    ?.addEventListener(
      'click',
      () => {
        container.innerHTML = '';
      }
    );

  $('#business-unit-form')
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        await saveBusinessUnit(unit);
      }
    );
}


async function saveBusinessUnit(existingUnit) {
  const id =
    $('#unit-id')?.value ||
    null;

  const name =
    $('#unit-name')?.value.trim() ||
    '';

  const website =
    $('#unit-website')?.value.trim() ||
    '';

  const description =
    $('#unit-description')?.value.trim() ||
    '';

  const imageFile =
    $('#unit-image-file')?.files?.[0] ||
    null;

  if (!name) {
    showToast(
      'Business unit name is required.',
      'warning'
    );
    return;
  }

  showLoading(
    existingUnit
      ? 'Updating business unit...'
      : 'Adding business unit...'
  );

  try {
    let imageUrl =
      existingUnit?.image_url ||
      '';

    if (imageFile) {
      imageUrl =
        await uploadMedia(
          imageFile,
          'business-units'
        );
    }

    const payload = {
      name,
      description,
      image_url: imageUrl,
      website
    };

    if (id) {
      const { error } =
        await sb
          .from('business_units')
          .update(payload)
          .eq('id', id);

      if (error) {
        throw error;
      }

      showToast(
        'Business unit updated successfully.'
      );

    } else {
      const { error } =
        await sb
          .from('business_units')
          .insert(payload);

      if (error) {
        throw error;
      }

      showToast(
        'Business unit added successfully.'
      );
    }

    await renderBusinessUnits();

  } catch (error) {
    console.error(
      'Business unit save error:',
      error
    );

    showToast(
      error.message ||
      'Unable to save business unit.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


async function deleteBusinessUnit(id) {
  if (!id) return;

  const confirmed =
    window.confirm(
      'Are you sure you want to delete this business unit?'
    );

  if (!confirmed) return;

  showLoading(
    'Deleting business unit...'
  );

  try {
    const { data: unit } =
      await sb
        .from('business_units')
        .select(
          'id,image_url'
        )
        .eq('id', id)
        .maybeSingle();

    const { error } =
      await sb
        .from('business_units')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }

    if (unit?.image_url) {
      await deleteMediaByUrl(
        unit.image_url
      );
    }

    showToast(
      'Business unit deleted successfully.'
    );

    await renderBusinessUnits();

  } catch (error) {
    console.error(
      'Business unit delete error:',
      error
    );

    showToast(
      error.message ||
      'Unable to delete business unit.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   HOMEPAGE CMS
   ========================================================= */

async function getHomepageContent() {
  const { data, error } =
    await sb
      .from('site_content')
      .select('*')
      .order('key', {
        ascending: true
      });

  if (error) {
    throw error;
  }

  return data || [];
}


async function renderHomepage() {
  const main = $('#admin-main');

  const items =
    await getHomepageContent();

  main.innerHTML = `
    ${pageHeader(
      'Homepage',
      'Edit homepage text, images and links used by the CMS.'
    )}

    ${
      items.length
        ? `
          <div id="homepage-content-list">
            ${items
              .map(
                item =>
                  renderHomepageItem(item)
              )
              .join('')}
          </div>
        `
        : cardHtml(`
            <div style="
              text-align:center;
              padding:35px;
              color:#64748b;
            ">
              No homepage content found.
              <br>
              <span style="
                font-size:12px;
              ">
                Add records to
                <strong>site_content</strong>
                in Supabase first.
              </span>
            </div>
          `)
    }
  `;

  setupHomepageActions();
}


function renderHomepageItem(item) {
  /*
   * IMPORTANT:
   *
   * Supabase site_content table uses:
   *   section_key
   *   key
   *   title
   *   subtitle
   *   content
   *   image_url
   *   video_url
   *   button_text
   *   button_url
   *   active
   *
   * The editable text field is "content".
   *
   * Do NOT use item.value here.
   */

  const key =
    item.key ||
    item.section_key ||
    '';

  return `
    <div
      class="homepage-content-card"
      data-id="${esc(item.id)}"
      style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:20px;
        margin-bottom:15px;
      "
    >

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(220px,1fr));
        gap:15px;
      ">

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Key
          </label>

          <input
            class="site-key"
            value="${esc(key)}"
            style="${inputStyle()}"
            readonly
          />

        </div>

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Title
          </label>

          <input
            class="site-title"
            value="${esc(
              item.title || ''
            )}"
            style="${inputStyle()}"
          />

        </div>

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Subtitle
          </label>

          <input
            class="site-subtitle"
            value="${esc(
              item.subtitle || ''
            )}"
            style="${inputStyle()}"
          />

        </div>

      </div>

      <div style="
        margin-top:15px;
      ">

        <label style="
          display:block;
          font-size:12px;
          font-weight:700;
          color:#475569;
          margin-bottom:6px;
        ">
          Content
        </label>

        <textarea
          class="site-content"
          rows="5"
          style="${inputStyle()}resize:vertical;"
        >${esc(
          item.content || ''
        )}</textarea>

      </div>

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(240px,1fr));
        gap:15px;
        margin-top:15px;
      ">

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Image URL
          </label>

          <input
            class="site-image-url"
            value="${esc(
              item.image_url || ''
            )}"
            style="${inputStyle()}"
            placeholder="https://..."
          />

          <input
            class="site-image-file"
            type="file"
            accept="image/*"
            style="
              width:100%;
              margin-top:8px;
              box-sizing:border-box;
            "
          />

          ${
            item.image_url
              ? `
                <img
                  src="${esc(
                    item.image_url
                  )}"
                  alt=""
                  style="
                    width:120px;
                    height:80px;
                    object-fit:cover;
                    border-radius:8px;
                    margin-top:8px;
                    border:1px solid #e2e8f0;
                  "
                />
              `
              : ''
          }

        </div>

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Video URL
          </label>

          <input
            class="site-video-url"
            value="${esc(
              item.video_url || ''
            )}"
            style="${inputStyle()}"
            placeholder="https://..."
          />

        </div>

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Button Text
          </label>

          <input
            class="site-button-text"
            value="${esc(
              item.button_text || ''
            )}"
            style="${inputStyle()}"
            placeholder="Explore Products"
          />

        </div>

        <div>

          <label style="
            display:block;
            font-size:12px;
            font-weight:700;
            color:#475569;
            margin-bottom:6px;
          ">
            Button URL
          </label>

          <input
            class="site-button-url"
            value="${esc(
              item.button_url || ''
            )}"
            style="${inputStyle()}"
            placeholder="#products"
          />

        </div>

      </div>

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-top:18px;
        gap:15px;
        flex-wrap:wrap;
      ">

        <label style="
          display:flex;
          align-items:center;
          gap:8px;
          font-size:13px;
          color:#475569;
          cursor:pointer;
        ">

          <input
            class="site-active"
            type="checkbox"
            ${
              item.active !== false
                ? 'checked'
                : ''
            }
          />

          Active

        </label>

        <button
          class="save-homepage-btn"
          data-id="${esc(item.id)}"
          style="${buttonStyle('primary')}"
        >
          Save
        </button>

      </div>

    </div>
  `;
}


function setupHomepageActions() {
  $$('.save-homepage-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          await saveHomepageItem(
            button.dataset.id
          );
        }
      );
    });

  $$('.site-image-file')
    .forEach(input => {
      input.addEventListener(
        'change',
        event => {
          const file =
            event.target.files?.[0];

          if (!file) return;

          if (
            !file.type.startsWith(
              'image/'
            )
          ) {
            showToast(
              'Please select an image file.',
              'warning'
            );

            event.target.value = '';
          }
        }
      );
    });
}


async function saveHomepageItem(id) {
  if (!id) return;

  const card =
    $(
      `.homepage-content-card[data-id="${CSS.escape(String(id))}"]`
    );

  if (!card) {
    showToast(
      'Homepage content row not found.',
      'error'
    );
    return;
  }

  const title =
    $('.site-title', card)?.value || '';

  const subtitle =
    $('.site-subtitle', card)?.value || '';

  const content =
    $('.site-content', card)?.value || '';

  const imageInput =
    $('.site-image-file', card);

  const imageFile =
    imageInput?.files?.[0] || null;

  let imageUrl =
    $('.site-image-url', card)?.value
      .trim() || '';

  const videoUrl =
    $('.site-video-url', card)?.value
      .trim() || '';

  const buttonText =
    $('.site-button-text', card)?.value
      .trim() || '';

  const buttonUrl =
    $('.site-button-url', card)?.value
      .trim() || '';

  const active =
    $('.site-active', card)?.checked !== false;

  showLoading(
    'Saving homepage content...'
  );

  try {
    if (imageFile) {
      imageUrl =
        await uploadMedia(
          imageFile,
          'homepage'
        );

      const imageField =
        $('.site-image-url', card);

      if (imageField) {
        imageField.value =
          imageUrl;
      }
    }

    /*
     * IMPORTANT:
     * Database column is "content",
     * not "value".
     */

    const payload = {
      title,
      subtitle,
      content,
      image_url: imageUrl,
      video_url: videoUrl,
      button_text: buttonText,
      button_url: buttonUrl,
      active,
      updated_at:
        new Date().toISOString()
    };

    const { error } =
      await sb
        .from('site_content')
        .update(payload)
        .eq('id', id);

    if (error) {
      throw error;
    }

    showToast(
      'Homepage content saved successfully.'
    );

  } catch (error) {
    console.error(
      'Homepage save error:',
      error
    );

    showToast(
      error.message ||
      'Unable to save homepage content.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   HOMEPAGE IMAGE UPLOAD
   ========================================================= */

async function uploadHomepageImage(
  file
) {
  if (!file) {
    return '';
  }

  if (
    !file.type.startsWith('image/')
  ) {
    throw new Error(
      'Please select a valid image.'
    );
  }

  return await uploadMedia(
    file,
    'homepage'
  );
}


/* =========================================================
   HOMEPAGE CONTENT REFRESH
   ========================================================= */

async function refreshHomepage() {
  if (
    currentView === 'homepage'
  ) {
    await renderHomepage();
  }
}


/* =========================================================
   CMS CONTENT HELPERS
   ========================================================= */

async function getSiteContentByKey(key) {
  if (!key) return null;

  const { data, error } =
    await sb
      .from('site_content')
      .select('*')
      .eq('key', key)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


async function createSiteContentIfMissing(
  key,
  defaults = {}
) {
  if (!key) {
    throw new Error(
      'Content key is required.'
    );
  }

  const existing =
    await getSiteContentByKey(key);

  if (existing) {
    return existing;
  }

  const payload = {
    key,
    section_key:
      defaults.section_key || key,
    title:
      defaults.title || '',
    subtitle:
      defaults.subtitle || '',
    content:
      defaults.content || '',
    image_url:
      defaults.image_url || '',
    video_url:
      defaults.video_url || '',
    button_text:
      defaults.button_text || '',
    button_url:
      defaults.button_url || '',
    active:
      defaults.active !== false
  };

  const { data, error } =
    await sb
      .from('site_content')
      .insert(payload)
      .select('*')
      .single();

  if (error) {
    throw error;
  }

  return data;
}


/* =========================================================
   DEFAULT HOMEPAGE CONTENT
   ========================================================= */

const DEFAULT_HOMEPAGE_CONTENT = [
  {
    key: 'hero',
    section_key: 'hero',
    title:
      'Global Industrial & Export Powerhouse',
    subtitle:
      'Pioneering Excellence Across Global Markets',
    content:
      'Supplying premium Chemical Intermediates, Heavy Industrial Packaging, FMCG Essentials, and Sustainable Solar Backup Solutions worldwide.',
    active: true
  },

  {
    key: 'about',
    section_key: 'about',
    title:
      'About DEVI GROUPS',
    subtitle:
      'Established in 1989',
    content:
      'Established in 1989, expanding across decades of unmatched manufacturing integrity and market reputation.',
    active: true
  },

  {
    key: 'products',
    section_key: 'products',
    title:
      'Export Product Catalog',
    subtitle:
      'High-definition product showcases',
    content:
      'High-definition product showcases with technical specs, PDF brochures & instant quote generator.',
    active: true
  },

  {
    key: 'contact',
    section_key: 'contact',
    title:
      'Connect With DEVI GROUPS',
    subtitle:
      'Headquarters & Offices',
    content:
      'Shah Nirav (Owner & MD)',
    active: true
  }
];


async function seedDefaultHomepageContent() {
  showLoading(
    'Checking homepage content...'
  );

  try {
    for (
      const item
      of DEFAULT_HOMEPAGE_CONTENT
    ) {
      await createSiteContentIfMissing(
        item.key,
        item
      );
    }

    showToast(
      'Homepage default content is ready.'
    );

    await renderHomepage();

  } catch (error) {
    console.error(
      'Homepage seed error:',
      error
    );

    showToast(
      error.message ||
      'Unable to prepare homepage content.',
      'error'
    );

  } finally {
    hideLoading();
  }
}
/* =========================================================
   PART 4 — CUSTOMER ENQUIRIES + REVIEWS + COMPANY INFO
   ========================================================= */


/* =========================================================
   CUSTOMER ENQUIRIES
   ========================================================= */

async function getEnquiries() {
  const { data, error } = await sb
    .from('customer_enquiries')
    .select('*')
    .order('created_at', {
      ascending: false
    });

  if (error) {
    throw error;
  }

  return data || [];
}


function enquiryValue(
  enquiry,
  ...keys
) {
  for (const key of keys) {
    if (
      enquiry &&
      enquiry[key] !== undefined &&
      enquiry[key] !== null &&
      enquiry[key] !== ''
    ) {
      return enquiry[key];
    }
  }

  return '';
}


function renderEnquiryRow(enquiry) {
  const name =
    enquiryValue(
      enquiry,
      'name',
      'customer_name',
      'full_name'
    ) || 'Unknown';

  const email =
    enquiryValue(
      enquiry,
      'email',
      'customer_email'
    );

  const phone =
    enquiryValue(
      enquiry,
      'phone',
      'phone_number',
      'mobile'
    );

  const company =
    enquiryValue(
      enquiry,
      'company',
      'company_name',
      'organization'
    );

  const product =
    enquiryValue(
      enquiry,
      'product',
      'product_name',
      'subject'
    );

  const message =
    enquiryValue(
      enquiry,
      'message',
      'enquiry',
      'details'
    );

  const status =
    enquiryValue(
      enquiry,
      'status'
    ) || 'new';

  const created =
    enquiryValue(
      enquiry,
      'created_at'
    );

  return `
    <div
      class="enquiry-row"
      data-id="${esc(enquiry.id)}"
      style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:18px;
        margin-bottom:12px;
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:15px;
        flex-wrap:wrap;
      ">

        <div>

          <div style="
            font-size:17px;
            font-weight:700;
            color:#0f172a;
          ">
            ${esc(name)}
          </div>

          ${
            company
              ? `
                <div style="
                  color:#64748b;
                  font-size:12px;
                  margin-top:3px;
                ">
                  ${esc(company)}
                </div>
              `
              : ''
          }

        </div>

        <select
          class="enquiry-status"
          data-id="${esc(enquiry.id)}"
          style="
            padding:8px 10px;
            border:1px solid #cbd5e1;
            border-radius:8px;
            background:#fff;
          "
        >

          <option
            value="new"
            ${
              status === 'new'
                ? 'selected'
                : ''
            }
          >
            New
          </option>

          <option
            value="contacted"
            ${
              status === 'contacted'
                ? 'selected'
                : ''
            }
          >
            Contacted
          </option>

          <option
            value="in_progress"
            ${
              status === 'in_progress'
                ? 'selected'
                : ''
            }
          >
            In Progress
          </option>

          <option
            value="completed"
            ${
              status === 'completed'
                ? 'selected'
                : ''
            }
          >
            Completed
          </option>

          <option
            value="closed"
            ${
              status === 'closed'
                ? 'selected'
                : ''
            }
          >
            Closed
          </option>

        </select>

      </div>

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fit,minmax(200px,1fr));
        gap:10px;
        margin-top:15px;
      ">

        ${
          email
            ? `
              <div style="
                font-size:13px;
                color:#475569;
              ">
                <strong>Email:</strong><br>
                <a
                  href="mailto:${esc(email)}"
                  style="color:#2563eb;"
                >
                  ${esc(email)}
                </a>
              </div>
            `
            : ''
        }

        ${
          phone
            ? `
              <div style="
                font-size:13px;
                color:#475569;
              ">
                <strong>Phone:</strong><br>
                ${esc(phone)}
              </div>
            `
            : ''
        }

        ${
          product
            ? `
              <div style="
                font-size:13px;
                color:#475569;
              ">
                <strong>Product:</strong><br>
                ${esc(product)}
              </div>
            `
            : ''
        }

        ${
          created
            ? `
              <div style="
                font-size:13px;
                color:#475569;
              ">
                <strong>Received:</strong><br>
                ${esc(formatDate(created))}
              </div>
            `
            : ''
        }

      </div>

      ${
        message
          ? `
            <div style="
              margin-top:15px;
              padding:13px;
              background:#f8fafc;
              border-radius:8px;
              color:#475569;
              font-size:13px;
              line-height:1.7;
              white-space:pre-wrap;
            ">
              ${esc(message)}
            </div>
          `
          : ''
      }

      <div style="
        display:flex;
        justify-content:flex-end;
        margin-top:14px;
      ">

        <button
          class="delete-enquiry-btn"
          data-id="${esc(enquiry.id)}"
          style="${buttonStyle('danger')}"
        >
          Delete
        </button>

      </div>

    </div>
  `;
}


async function renderEnquiries() {
  const main = $('#admin-main');

  const enquiries =
    await getEnquiries();

  main.innerHTML = `
    ${pageHeader(
      'Customer Enquiries',
      'View and manage enquiries received from the website.'
    )}

    <div style="
      margin-bottom:15px;
    ">
      <input
        id="enquiry-search"
        type="search"
        placeholder="Search name, email, company or product..."
        style="
          ${inputStyle()}
          max-width:520px;
        "
      />
    </div>

    <div id="enquiries-list">

      ${
        enquiries.length
          ? enquiries
              .map(renderEnquiryRow)
              .join('')
          : cardHtml(`
              <div style="
                text-align:center;
                padding:35px;
                color:#64748b;
              ">
                No customer enquiries found.
              </div>
            `)
      }

    </div>
  `;

  setupEnquiryActions();
}


function setupEnquiryActions() {
  $('#enquiry-search')
    ?.addEventListener(
      'input',
      event => {
        const term =
          event.target.value
            .trim()
            .toLowerCase();

        $$('.enquiry-row')
          .forEach(row => {
            row.style.display =
              !term ||
              row.textContent
                .toLowerCase()
                .includes(term)
                ? ''
                : 'none';
          });
      }
    );

  $$('.enquiry-status')
    .forEach(select => {
      select.addEventListener(
        'change',
        async () => {
          await updateEnquiryStatus(
            select.dataset.id,
            select.value
          );
        }
      );
    });

  $$('.delete-enquiry-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          await deleteEnquiry(
            button.dataset.id
          );
        }
      );
    });
}


async function updateEnquiryStatus(
  id,
  status
) {
  if (!id) return;

  try {
    const { error } =
      await sb
        .from('customer_enquiries')
        .update({
          status,
          updated_at:
            new Date().toISOString()
        })
        .eq('id', id);

    if (error) {
      throw error;
    }

    showToast(
      'Enquiry status updated.'
    );

  } catch (error) {
    console.error(
      'Enquiry status error:',
      error
    );

    showToast(
      error.message ||
      'Unable to update enquiry status.',
      'error'
    );
  }
}


async function deleteEnquiry(id) {
  if (!id) return;

  if (
    !window.confirm(
      'Delete this customer enquiry?'
    )
  ) {
    return;
  }

  showLoading(
    'Deleting enquiry...'
  );

  try {
    const { error } =
      await sb
        .from('customer_enquiries')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }

    showToast(
      'Customer enquiry deleted.'
    );

    await renderEnquiries();

  } catch (error) {
    console.error(
      'Delete enquiry error:',
      error
    );

    showToast(
      error.message ||
      'Unable to delete enquiry.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   REVIEWS
   ========================================================= */

async function getReviews() {
  const { data, error } =
    await sb
      .from('reviews')
      .select('*')
      .order('created_at', {
        ascending: false
      });

  if (error) {
    throw error;
  }

  return data || [];
}


function renderReviewRow(review) {
  const name =
    review.name ||
    review.customer_name ||
    review.author_name ||
    'Customer';

  const company =
    review.company ||
    review.company_name ||
    '';

  const message =
    review.message ||
    review.review ||
    review.content ||
    '';

  const rating =
    Number(
      review.rating ||
      review.stars ||
      5
    );

  const status =
    review.status ||
    (
      review.approved === false
        ? 'pending'
        : 'approved'
    );

  const created =
    review.created_at || '';

  return `
    <div
      class="review-row"
      data-id="${esc(review.id)}"
      style="
        background:#fff;
        border:1px solid #e2e8f0;
        border-radius:12px;
        padding:18px;
        margin-bottom:12px;
      "
    >

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:flex-start;
        gap:15px;
        flex-wrap:wrap;
      ">

        <div>

          <div style="
            font-size:17px;
            font-weight:700;
          ">
            ${esc(name)}
          </div>

          ${
            company
              ? `
                <div style="
                  font-size:12px;
                  color:#64748b;
                  margin-top:3px;
                ">
                  ${esc(company)}
                </div>
              `
              : ''
          }

        </div>

        <div style="
          font-size:18px;
          letter-spacing:2px;
        ">
          ${'★'.repeat(
            Math.max(
              0,
              Math.min(
                5,
                rating
              )
            )
          )}
          <span style="
            color:#cbd5e1;
          ">
            ${'★'.repeat(
              Math.max(
                0,
                5 -
                Math.min(
                  5,
                  rating
                )
              )
            )}
          </span>
        </div>

      </div>

      ${
        message
          ? `
            <div style="
              margin-top:14px;
              padding:13px;
              background:#f8fafc;
              border-radius:8px;
              color:#475569;
              font-size:13px;
              line-height:1.7;
            ">
              ${esc(message)}
            </div>
          `
          : ''
      }

      <div style="
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-top:15px;
        flex-wrap:wrap;
      ">

        <div style="
          color:#94a3b8;
          font-size:12px;
        ">
          ${esc(
            created
              ? formatDate(created)
              : ''
          )}
        </div>

        <div style="
          display:flex;
          gap:8px;
          align-items:center;
        ">

          <select
            class="review-status"
            data-id="${esc(review.id)}"
            style="
              padding:8px 10px;
              border:1px solid #cbd5e1;
              border-radius:8px;
            "
          >

            <option
              value="pending"
              ${
                status === 'pending'
                  ? 'selected'
                  : ''
              }
            >
              Pending
            </option>

            <option
              value="approved"
              ${
                status === 'approved'
                  ? 'selected'
                  : ''
              }
            >
              Approved
            </option>

            <option
              value="rejected"
              ${
                status === 'rejected'
                  ? 'selected'
                  : ''
              }
            >
              Rejected
            </option>

          </select>

          <button
            class="delete-review-btn"
            data-id="${esc(review.id)}"
            style="${buttonStyle('danger')}"
          >
            Delete
          </button>

        </div>

      </div>

    </div>
  `;
}


async function renderReviews() {
  const main = $('#admin-main');

  const reviews =
    await getReviews();

  main.innerHTML = `
    ${pageHeader(
      'Reviews',
      'Approve, reject or delete customer reviews.'
    )}

    <div id="reviews-list">

      ${
        reviews.length
          ? reviews
              .map(renderReviewRow)
              .join('')
          : cardHtml(`
              <div style="
                text-align:center;
                padding:35px;
                color:#64748b;
              ">
                No reviews found.
              </div>
            `)
      }

    </div>
  `;

  setupReviewActions();
}


function setupReviewActions() {
  $$('.review-status')
    .forEach(select => {
      select.addEventListener(
        'change',
        async () => {
          await updateReviewStatus(
            select.dataset.id,
            select.value
          );
        }
      );
    });

  $$('.delete-review-btn')
    .forEach(button => {
      button.addEventListener(
        'click',
        async () => {
          await deleteReview(
            button.dataset.id
          );
        }
      );
    });
}


async function updateReviewStatus(
  id,
  status
) {
  if (!id) return;

  try {
    const payload = {
      status,
      updated_at:
        new Date().toISOString()
    };

    /*
     * Some older review tables use
     * "approved" instead of "status".
     * The primary CMS uses status.
     */

    const { error } =
      await sb
        .from('reviews')
        .update(payload)
        .eq('id', id);

    if (error) {
      throw error;
    }

    showToast(
      'Review status updated.'
    );

  } catch (error) {
    console.error(
      'Review status error:',
      error
    );

    showToast(
      error.message ||
      'Unable to update review.',
      'error'
    );
  }
}


async function deleteReview(id) {
  if (!id) return;

  if (
    !window.confirm(
      'Delete this review?'
    )
  ) {
    return;
  }

  showLoading(
    'Deleting review...'
  );

  try {
    const { error } =
      await sb
        .from('reviews')
        .delete()
        .eq('id', id);

    if (error) {
      throw error;
    }

    showToast(
      'Review deleted successfully.'
    );

    await renderReviews();

  } catch (error) {
    console.error(
      'Delete review error:',
      error
    );

    showToast(
      error.message ||
      'Unable to delete review.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   COMPANY INFORMATION
   ========================================================= */

async function getCompanyInfo() {
  const { data, error } =
    await sb
      .from('company_info')
      .select('*')
      .limit(1)
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}


function companyField(
  company,
  ...keys
) {
  for (const key of keys) {
    if (
      company &&
      company[key] !== undefined &&
      company[key] !== null
    ) {
      return company[key];
    }
  }

  return '';
}


async function renderCompanyInfo() {
  const main = $('#admin-main');

  const company =
    await getCompanyInfo();

  main.innerHTML = `
    ${pageHeader(
      'Company Info',
      'Manage DEVI GROUPS contact and company information.'
    )}

    ${cardHtml(`
      <form id="company-info-form">

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(240px,1fr));
          gap:16px;
        ">

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Company Name
            </label>

            <input
              id="company-name"
              value="${esc(
                companyField(
                  company,
                  'company_name',
                  'name'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Owner / Managing Director
            </label>

            <input
              id="company-owner"
              value="${esc(
                companyField(
                  company,
                  'owner_name',
                  'director_name',
                  'owner'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Email
            </label>

            <input
              id="company-email"
              type="email"
              value="${esc(
                companyField(
                  company,
                  'email',
                  'company_email'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Phone
            </label>

            <input
              id="company-phone"
              value="${esc(
                companyField(
                  company,
                  'phone',
                  'phone_number',
                  'mobile'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              WhatsApp
            </label>

            <input
              id="company-whatsapp"
              value="${esc(
                companyField(
                  company,
                  'whatsapp',
                  'whatsapp_number'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Website
            </label>

            <input
              id="company-website"
              value="${esc(
                companyField(
                  company,
                  'website',
                  'website_url'
                )
              )}"
              style="${inputStyle()}"
            />

          </div>

        </div>

        <div style="
          margin-top:16px;
        ">

          <label style="
            display:block;
            margin-bottom:6px;
            font-size:13px;
            font-weight:700;
          ">
            Address
          </label>

          <textarea
            id="company-address"
            rows="4"
            style="${inputStyle()}resize:vertical;"
          >${esc(
            companyField(
              company,
              'address',
              'company_address'
            )
          )}</textarea>

        </div>

        <div style="
          display:grid;
          grid-template-columns:
            repeat(auto-fit,minmax(240px,1fr));
          gap:16px;
          margin-top:16px;
        ">

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              India Office
            </label>

            <textarea
              id="company-india-office"
              rows="4"
              style="${inputStyle()}resize:vertical;"
            >${esc(
              companyField(
                company,
                'india_office',
                'india_address'
              )
            )}</textarea>

          </div>

          <div>

            <label style="
              display:block;
              margin-bottom:6px;
              font-size:13px;
              font-weight:700;
            ">
              Kenya Office
            </label>

            <textarea
              id="company-kenya-office"
              rows="4"
              style="${inputStyle()}resize:vertical;"
            >${esc(
              companyField(
                company,
                'kenya_office',
                'kenya_address'
              )
            )}</textarea>

          </div>

        </div>

        <div style="
          margin-top:16px;
        ">

          <label style="
            display:block;
            margin-bottom:6px;
            font-size:13px;
            font-weight:700;
          ">
            Company Description
          </label>

          <textarea
            id="company-description"
            rows="6"
            style="${inputStyle()}resize:vertical;"
          >${esc(
            companyField(
              company,
              'description',
              'company_description',
              'about'
            )
          )}</textarea>

        </div>

        <div style="
          margin-top:22px;
        ">

          <button
            type="submit"
            style="${buttonStyle('primary')}"
          >
            Save Company Information
          </button>

        </div>

      </form>
    `)}

  `;

  $('#company-info-form')
    ?.addEventListener(
      'submit',
      async event => {
        event.preventDefault();

        await saveCompanyInfo(
          company
        );
      }
    );
}


async function saveCompanyInfo(
  existingCompany
) {
  const payload = {
    company_name:
      $('#company-name')
        ?.value.trim() || '',

    owner_name:
      $('#company-owner')
        ?.value.trim() || '',

    email:
      $('#company-email')
        ?.value.trim() || '',

    phone:
      $('#company-phone')
        ?.value.trim() || '',

    whatsapp:
      $('#company-whatsapp')
        ?.value.trim() || '',

    website:
      $('#company-website')
        ?.value.trim() || '',

    address:
      $('#company-address')
        ?.value.trim() || '',

    india_office:
      $('#company-india-office')
        ?.value.trim() || '',

    kenya_office:
      $('#company-kenya-office')
        ?.value.trim() || '',

    description:
      $('#company-description')
        ?.value.trim() || '',

    updated_at:
      new Date().toISOString()
  };

  showLoading(
    'Saving company information...'
  );

  try {
    let error = null;

    if (existingCompany?.id) {

      const result =
        await sb
          .from('company_info')
          .update(payload)
          .eq(
            'id',
            existingCompany.id
          );

      error = result.error;

    } else {

      const result =
        await sb
          .from('company_info')
          .insert(payload);

      error = result.error;
    }

    if (error) {
      throw error;
    }

    showToast(
      'Company information saved successfully.'
    );

    await renderCompanyInfo();

  } catch (error) {
    console.error(
      'Company info save error:',
      error
    );

    showToast(
      error.message ||
      'Unable to save company information.',
      'error'
    );

  } finally {
    hideLoading();
  }
}


/* =========================================================
   COMPANY CONTACT QUICK ACTIONS
   ========================================================= */

function normalizePhone(
  phone
) {
  return String(phone || '')
    .replace(/[^\d+]/g, '');
}


function createMailto(email) {
  if (!email) return '';

  return `mailto:${email}`;
}


function createTel(phone) {
  const clean =
    normalizePhone(phone);

  if (!clean) return '';

  return `tel:${clean}`;
}


/* =========================================================
   GENERIC TABLE HELPERS
   ========================================================= */

function emptyState(
  message = 'No records found.'
) {
  return cardHtml(`
    <div style="
      text-align:center;
      padding:35px;
      color:#64748b;
    ">
      ${esc(message)}
    </div>
  `);
}


function confirmAction(
  message
) {
  return window.confirm(
    message
  );
}


/* =========================================================
   ERROR HANDLING
   ========================================================= */

function handleDatabaseError(
  error,
  fallback = 'Database operation failed.'
) {
  console.error(
    'Database error:',
    error
  );

  showToast(
    error?.message ||
    fallback,
    'error'
  );
}


/* =========================================================
   AUTH STATE LISTENER
   ========================================================= */

sb.auth.onAuthStateChange(
  async (event, session) => {

    if (
      event === 'SIGNED_OUT'
    ) {
      return;
    }

    if (
      event === 'TOKEN_REFRESHED'
    ) {
      return;
    }

  }
);
/* =========================================================
   PART 5 — DOCUMENTS / TRACKING / MEDIA
   CLEAN & CORRECTED VERSION
   ========================================================= */


/* =========================================================
   DOCUMENTS
   Brochure / TDS / MSDS / PDF
   ========================================================= */

async function loadDocuments() {

  const box = $('#documentsList');

  if (!box) return;

  box.innerHTML =
    '<div class="loading">Loading documents...</div>';

  try {

    /* ---------------------------------------------
       Load documents
       --------------------------------------------- */

    const { data, error } = await supabaseClient
      .from('documents')
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .order('created_at', {
        ascending: false
      });

    if (error) {
      throw error;
    }


    /* ---------------------------------------------
       No documents
       --------------------------------------------- */

    if (!data || data.length === 0) {

      box.innerHTML =
        '<div class="empty">No documents found.</div>';

      return;
    }


    /* ---------------------------------------------
       Load products separately
       --------------------------------------------- */

    const {
      data: products,
      error: productsError
    } = await supabaseClient
      .from('products')
      .select('id, name')
      .order('name', {
        ascending: true
      });

    if (productsError) {
      throw productsError;
    }


    /* ---------------------------------------------
       Create product options
       --------------------------------------------- */

    const productList =
      products || [];


    /* ---------------------------------------------
       Render documents
       --------------------------------------------- */

    box.innerHTML = data.map(doc => {

      const productOptions =
        productList.map(product => {

          const selected =
            String(product.id) ===
            String(doc.product_id)
              ? 'selected'
              : '';

          return `
            <option
              value="${escapeAttr(product.id)}"
              ${selected}
            >
              ${escapeHtml(product.name || '')}
            </option>
          `;

        }).join('');


      return `

        <div
          class="admin-card document-card"
          data-id="${escapeAttr(doc.id)}"
        >

          <div class="admin-card-header">

            <div>

              <h3>
                ${escapeHtml(
                  doc.title ||
                  doc.file_name ||
                  'Document'
                )}
              </h3>

              <div class="muted">

                ${escapeHtml(
                  doc.document_type ||
                  'Document'
                )}

                ${
                  doc.products?.name
                    ? `
                      ·
                      ${escapeHtml(
                        doc.products.name
                      )}
                    `
                    : ''
                }

              </div>

            </div>


            <button
              type="button"
              class="danger delete-document"
              data-id="${escapeAttr(doc.id)}"
            >
              Delete
            </button>

          </div>


          <div class="form-grid">


            <!-- TITLE -->

            <label>

              Title

              <input
                class="document-title"
                type="text"
                value="${escapeAttr(
                  doc.title || ''
                )}"
              >

            </label>


            <!-- DOCUMENT TYPE -->

            <label>

              Document Type

              <select class="document-type">

                <option
                  value="brochure"
                  ${
                    doc.document_type ===
                    'brochure'
                      ? 'selected'
                      : ''
                  }
                >
                  Brochure
                </option>


                <option
                  value="tds"
                  ${
                    doc.document_type ===
                    'tds'
                      ? 'selected'
                      : ''
                  }
                >
                  TDS
                </option>


                <option
                  value="msds"
                  ${
                    doc.document_type ===
                    'msds'
                      ? 'selected'
                      : ''
                  }
                >
                  MSDS
                </option>


                <option
                  value="pdf"
                  ${
                    doc.document_type ===
                    'pdf'
                      ? 'selected'
                      : ''
                  }
                >
                  PDF
                </option>


                <option
                  value="other"
                  ${
                    doc.document_type ===
                    'other'
                      ? 'selected'
                      : ''
                  }
                >
                  Other
                </option>

              </select>

            </label>


            <!-- PRODUCT -->

            <label>

              Product

              <select class="document-product">

                <option value="">
                  No Product
                </option>

                ${productOptions}

              </select>

            </label>


            <!-- FILE -->

            <label>

              Replace File

              <input
                class="document-file"
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
              >

            </label>


          </div>


          <!-- CURRENT FILE -->

          <div class="document-file-info">

            ${
              doc.file_url
                ? `
                  <a
                    href="${escapeAttr(
                      doc.file_url
                    )}"
                    target="_blank"
                    rel="noopener"
                  >
                    View current file
                  </a>
                `
                : `
                  <span class="muted">
                    No file uploaded
                  </span>
                `
            }


            ${
              doc.file_name
                ? `
                  <span class="muted">
                    ${escapeHtml(
                      doc.file_name
                    )}
                  </span>
                `
                : ''
            }

          </div>


          <!-- ACTION -->

          <div class="admin-card-actions">

            <button
              type="button"
              class="primary save-document"
              data-id="${escapeAttr(doc.id)}"
            >
              Save
            </button>

          </div>


        </div>

      `;

    }).join('');


    /* ---------------------------------------------
       Bind save buttons
       --------------------------------------------- */

    $$('.save-document').forEach(button => {

      button.addEventListener(
        'click',
        saveDocument
      );

    });


    /* ---------------------------------------------
       Bind delete buttons
       --------------------------------------------- */

    $$('.delete-document').forEach(button => {

      button.addEventListener(
        'click',
        deleteDocument
      );

    });


  } catch (error) {

    console.error(
      'Documents error:',
      error
    );

    box.innerHTML = `
      <div class="error">
        Unable to load documents:
        ${escapeHtml(
          error.message ||
          String(error)
        )}
      </div>
    `;
  }
}


/* =========================================================
   SAVE DOCUMENT
   ========================================================= */

async function saveDocument(event) {

  const button =
    event.currentTarget;

  const card =
    button.closest('.document-card');

  if (!card) return;


  const id =
    card.dataset.id;


  const title =
    $('.document-title', card)
      ?.value
      .trim() || '';


  const documentType =
    $('.document-type', card)
      ?.value || 'other';


  const productValue =
    $('.document-product', card)
      ?.value || '';


  const productId =
    productValue
      ? Number(productValue)
      : null;


  const fileInput =
    $('.document-file', card);


  const file =
    fileInput?.files?.[0] || null;


  if (!title) {

    alert(
      'Please enter document title.'
    );

    return;
  }


  button.disabled = true;
  button.textContent =
    'Saving...';


  try {

    const payload = {

      title: title,

      document_type:
        documentType,

      product_id:
        productId

    };


    /* ---------------------------------------------
       Upload replacement file
       --------------------------------------------- */

    if (file) {

      if (
        typeof uploadToStorage !==
        'function'
      ) {

        throw new Error(
          'Storage upload helper is not available.'
        );
      }


      const uploaded =
        await uploadToStorage(
          file,
          'documents'
        );


      if (!uploaded) {

        throw new Error(
          'File upload failed.'
        );
      }


      payload.file_name =
        file.name;


      payload.file_url =
        uploaded.url ||
        uploaded.publicUrl ||
        uploaded.public_url ||
        '';
    }


    /* ---------------------------------------------
       Update database
       --------------------------------------------- */

    const { error } =
      await supabaseClient
        .from('documents')
        .update(payload)
        .eq('id', id);


    if (error) {
      throw error;
    }


    alert(
      'Document saved successfully.'
    );


    await loadDocuments();


  } catch (error) {

    console.error(
      'Save document error:',
      error
    );


    alert(
      'Unable to save document:\n' +
      (
        error.message ||
        String(error)
      )
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      'Save';
  }
}


/* =========================================================
   DELETE DOCUMENT
   ========================================================= */

async function deleteDocument(event) {

  const id =
    event.currentTarget.dataset.id;

  if (!id) return;


  const confirmed =
    confirm(
      'Are you sure you want to delete this document?'
    );


  if (!confirmed) return;


  try {

    /* ---------------------------------------------
       Get document first
       --------------------------------------------- */

    const {
      data: documentRow,
      error: fetchError
    } = await supabaseClient
      .from('documents')
      .select(
        'id, file_name, file_url'
      )
      .eq('id', id)
      .maybeSingle();


    if (fetchError) {
      throw fetchError;
    }


    /* ---------------------------------------------
       Delete database row
       --------------------------------------------- */

    const {
      error: deleteError
    } = await supabaseClient
      .from('documents')
      .delete()
      .eq('id', id);


    if (deleteError) {
      throw deleteError;
    }


    /* ---------------------------------------------
       Try deleting storage file
       --------------------------------------------- */

    if (
      documentRow?.file_name &&
      typeof deleteStorageFile ===
      'function'
    ) {

      try {

        await deleteStorageFile(
          'documents',
          documentRow.file_name
        );

      } catch (storageError) {

        console.warn(
          'Storage delete warning:',
          storageError
        );
      }
    }


    alert(
      'Document deleted successfully.'
    );


    await loadDocuments();


  } catch (error) {

    console.error(
      'Delete document error:',
      error
    );


    alert(
      'Unable to delete document:\n' +
      (
        error.message ||
        String(error)
      )
    );
  }
}


/* =========================================================
   TRACKING
   ========================================================= */

async function loadTracking() {

  const box =
    $('#trackingList');

  if (!box) return;


  box.innerHTML =
    '<div class="loading">Loading tracking records...</div>';


  try {

    const {
      data,
      error
    } = await supabaseClient
      .from('tracking')
      .select('*')
      .order('created_at', {
        ascending: false
      });


    if (error) {
      throw error;
    }


    if (!data || data.length === 0) {

      box.innerHTML =
        '<div class="empty">No tracking records found.</div>';

      return;
    }


    box.innerHTML =
      data.map(row => `

        <div
          class="admin-card tracking-card"
          data-id="${escapeAttr(row.id)}"
        >

          <div class="admin-card-header">

            <div>

              <h3>
                ${escapeHtml(
                  row.tracking_number ||
                  'Tracking'
                )}
              </h3>

              <div class="muted">

                ${escapeHtml(
                  row.customer_name ||
                  ''
                )}

              </div>

            </div>


            <button
              type="button"
              class="danger delete-tracking"
              data-id="${escapeAttr(row.id)}"
            >
              Delete
            </button>

          </div>


          <div class="form-grid">


            <!-- TRACKING NUMBER -->

            <label>

              Tracking Number

              <input
                class="tracking-number"
                type="text"
                value="${escapeAttr(
                  row.tracking_number ||
                  ''
                )}"
              >

            </label>


            <!-- CUSTOMER -->

            <label>

              Customer Name

              <input
                class="tracking-customer"
                type="text"
                value="${escapeAttr(
                  row.customer_name ||
                  ''
                )}"
              >

            </label>


            <!-- DESTINATION -->

            <label>

              Destination

              <input
                class="tracking-destination"
                type="text"
                value="${escapeAttr(
                  row.destination ||
                  ''
                )}"
              >

            </label>


            <!-- STATUS -->

            <label>

              Status

              <select
                class="tracking-status"
              >

                <option
                  value="Pending"
                  ${
                    row.status ===
                    'Pending'
                      ? 'selected'
                      : ''
                  }
                >
                  Pending
                </option>


                <option
                  value="Processing"
                  ${
                    row.status ===
                    'Processing'
                      ? 'selected'
                      : ''
                  }
                >
                  Processing
                </option>


                <option
                  value="Dispatched"
                  ${
                    row.status ===
                    'Dispatched'
                      ? 'selected'
                      : ''
                  }
                >
                  Dispatched
                </option>


                <option
                  value="In Transit"
                  ${
                    row.status ===
                    'In Transit'
                      ? 'selected'
                      : ''
                  }
                >
                  In Transit
                </option>


                <option
                  value="Delivered"
                  ${
                    row.status ===
                    'Delivered'
                      ? 'selected'
                      : ''
                  }
                >
                  Delivered
                </option>


                <option
                  value="Cancelled"
                  ${
                    row.status ===
                    'Cancelled'
                      ? 'selected'
                      : ''
                  }
                >
                  Cancelled
                </option>

              </select>

            </label>


            <!-- DESCRIPTION -->

            <label class="full-width">

              Description

              <textarea
                class="tracking-description"
                rows="4"
              >${escapeHtml(
                row.description ||
                ''
              )}</textarea>

            </label>


          </div>


          <div class="admin-card-actions">

            <button
              type="button"
              class="primary save-tracking"
              data-id="${escapeAttr(row.id)}"
            >
              Save
            </button>

          </div>


        </div>

      `).join('');


    /* ---------------------------------------------
       Bind save
       --------------------------------------------- */

    $$('.save-tracking').forEach(button => {

      button.addEventListener(
        'click',
        saveTracking
      );

    });


    /* ---------------------------------------------
       Bind delete
       --------------------------------------------- */

    $$('.delete-tracking').forEach(button => {

      button.addEventListener(
        'click',
        deleteTracking
      );

    });


  } catch (error) {

    console.error(
      'Tracking error:',
      error
    );


    box.innerHTML = `
      <div class="error">
        Unable to load tracking:
        ${escapeHtml(
          error.message ||
          String(error)
        )}
      </div>
    `;
  }
}


/* =========================================================
   SAVE TRACKING
   ========================================================= */

async function saveTracking(event) {

  const button =
    event.currentTarget;


  const card =
    button.closest(
      '.tracking-card'
    );


  if (!card) return;


  const id =
    card.dataset.id;


  const trackingNumber =
    $('.tracking-number', card)
      ?.value
      .trim() || '';


  const customerName =
    $('.tracking-customer', card)
      ?.value
      .trim() || '';


  const destination =
    $('.tracking-destination', card)
      ?.value
      .trim() || '';


  const status =
    $('.tracking-status', card)
      ?.value || 'Pending';


  const description =
    $('.tracking-description', card)
      ?.value
      .trim() || '';


  if (!trackingNumber) {

    alert(
      'Tracking number is required.'
    );

    return;
  }


  button.disabled =
    true;

  button.textContent =
    'Saving...';


  try {

    const payload = {

      tracking_number:
        trackingNumber,

      customer_name:
        customerName,

      destination:
        destination,

      status:
        status,

      description:
        description,

      updated_at:
        new Date().toISOString()

    };


    const {
      error
    } = await supabaseClient
      .from('tracking')
      .update(payload)
      .eq('id', id);


    if (error) {
      throw error;
    }


    alert(
      'Tracking record saved successfully.'
    );


    await loadTracking();


  } catch (error) {

    console.error(
      'Save tracking error:',
      error
    );


    alert(
      'Unable to save tracking:\n' +
      (
        error.message ||
        String(error)
      )
    );


  } finally {

    button.disabled =
      false;

    button.textContent =
      'Save';
  }
}


/* =========================================================
   DELETE TRACKING
   ========================================================= */

async function deleteTracking(event) {

  const id =
    event.currentTarget.dataset.id;

  if (!id) return;


  if (
    !confirm(
      'Delete this tracking record?'
    )
  ) {
    return;
  }


  try {

    const {
      error
    } = await supabaseClient
      .from('tracking')
      .delete()
      .eq('id', id);


    if (error) {
      throw error;
    }


    alert(
      'Tracking record deleted successfully.'
    );


    await loadTracking();


  } catch (error) {

    console.error(
      'Delete tracking error:',
      error
    );


    alert(
      'Unable to delete tracking:\n' +
      (
        error.message ||
        String(error)
      )
    );
  }
}


/* =========================================================
   MEDIA LIBRARY
   ========================================================= */

async function loadMediaLibrary() {

  const box =
    $('#mediaLibrary');

  if (!box) return;


  box.innerHTML =
    '<div class="loading">Loading media...</div>';


  try {

    if (
      typeof listStorageFiles !==
      'function'
    ) {

      throw new Error(
        'Storage list helper is not available.'
      );
    }


    const files =
      await listStorageFiles();


    if (
      !files ||
      files.length === 0
    ) {

      box.innerHTML =
        '<div class="empty">No media files found.</div>';

      return;
    }


    box.innerHTML =
      files.map(file => {

        const fileName =
          file.name || '';


        let url = '';


        if (
          typeof getStoragePublicUrl ===
          'function'
        ) {

          try {

            url =
              getStoragePublicUrl(
                fileName
              );

          } catch (error) {

            console.warn(
              'Public URL error:',
              error
            );
          }
        }


        const isImage =
          /\.(jpg|jpeg|png|gif|webp|svg)$/i
            .test(fileName);


        return `

          <div
            class="media-item"
            data-name="${escapeAttr(
              fileName
            )}"
          >

            <div class="media-preview">

              ${
                isImage && url
                  ? `
                    <img
                      src="${escapeAttr(
                        url
                      )}"
                      alt="${escapeAttr(
                        fileName
                      )}"
                      loading="lazy"
                    >
                  `
                  : `
                    <div class="file-icon">
                      FILE
                    </div>
                  `
              }

            </div>


            <div class="media-info">

              <div class="media-name">

                ${escapeHtml(
                  fileName
                )}

              </div>


              ${
                url
                  ? `
                    <a
                      href="${escapeAttr(
                        url
                      )}"
                      target="_blank"
                      rel="noopener"
                    >
                      Open
                    </a>
                  `
                  : ''
              }

            </div>


            <button
              type="button"
              class="danger delete-media"
              data-name="${escapeAttr(
                fileName
              )}"
            >
              Delete
            </button>


          </div>

        `;

      }).join('');


    $$('.delete-media').forEach(button => {

      button.addEventListener(
        'click',
        deleteMediaFile
      );

    });


  } catch (error) {

    console.error(
      'Media library error:',
      error
    );


    box.innerHTML = `
      <div class="error">
        Unable to load media:
        ${escapeHtml(
          error.message ||
          String(error)
        )}
      </div>
    `;
  }
}


/* =========================================================
   DELETE MEDIA
   ========================================================= */

async function deleteMediaFile(event) {

  const name =
    event.currentTarget.dataset.name;

  if (!name) return;


  if (
    !confirm(
      `Delete "${name}" from media library?`
    )
  ) {
    return;
  }


  if (
    typeof deleteStorageFile !==
    'function'
  ) {

    alert(
      'Storage delete helper is not available.'
    );

    return;
  }


  try {

    /*
      Media library files may be stored
      in the root of the bucket or in folders.

      First try the helper with the file name.
    */

    await deleteStorageFile(
      '',
      name
    );


    alert(
      'Media file deleted successfully.'
    );


    await loadMediaLibrary();


  } catch (error) {

    console.error(
      'Delete media error:',
      error
    );


    alert(
      'Unable to delete media:\n' +
      (
        error.message ||
        String(error)
      )
    );
  }
}


/* =========================================================
   SECTION LOADERS
   ========================================================= */

async function loadDocumentsSection() {

  try {

    await loadDocuments();

  } catch (error) {

    console.error(
      'Documents section error:',
      error
    );
  }
}


async function loadTrackingSection() {

  try {

    await loadTracking();

  } catch (error) {

    console.error(
      'Tracking section error:',
      error
    );
  }
}


async function loadMediaSection() {

  try {

    await loadMediaLibrary();

  } catch (error) {

    console.error(
      'Media section error:',
      error
    );
  }
}


/* =========================================================
   TAB CLICK HANDLER
   ========================================================= */

document.addEventListener(
  'click',
  async function(event) {

    const tab =
      event.target.closest(
        '[data-section]'
      );


    if (!tab) return;


    const section =
      tab.dataset.section;


    if (!section) return;


    if (
      section === 'documents' ||
      section === 'document'
    ) {

      await loadDocumentsSection();

      return;
    }


    if (
      section === 'tracking'
    ) {

      await loadTrackingSection();

      return;
    }


    if (
      section === 'media' ||
      section === 'media-library'
    ) {

      await loadMediaSection();

      return;
    }

  }
);
/* =========================================================
   DEVI GROUPS ADMIN — STARTUP / LOGIN INITIALIZATION
   ========================================================= */

async function initDeviAdmin() {
  try {
    // Check Supabase library
    if (
      !window.supabase ||
      typeof window.supabase.createClient !== 'function'
    ) {
      throw new Error(
        'Supabase library did not load. Please check the internet connection.'
      );
    }

    // Check existing login session
    const session = await getSession();

    // Not logged in → show login page
    if (!session) {
      renderLogin();
      return;
    }

    // Logged in → verify admin
    try {
      const user = await requireAdmin();

      if (!user) {
        await sb.auth.signOut();
        renderLogin();
        return;
      }

      // Admin authorized → open admin panel
      renderShell(user);

    } catch (adminError) {
      console.error(
        'Admin authorization error:',
        adminError
      );

      try {
        await sb.auth.signOut();
      } catch (signOutError) {
        console.error(
          'Sign-out error:',
          signOutError
        );
      }

      renderLogin();

      const message =
        document.getElementById('login-message');

      if (message) {
        message.style.color = '#dc2626';
        message.textContent =
          adminError?.message ||
          'This account is not authorized as an admin.';
      }
    }

  } catch (error) {
    console.error(
      'Admin startup error:',
      error
    );

    try {
      renderLogin();
    } catch (renderError) {
      console.error(
        'Login render error:',
        renderError
      );
    }

    const message =
      document.getElementById('login-message');

    if (message) {
      message.style.color = '#dc2626';
      message.textContent =
        error?.message ||
        'Unable to start the admin panel.';
    }
  }
}


/* =========================================================
   START ADMIN PANEL
   ========================================================= */

if (document.readyState === 'loading') {
  document.addEventListener(
    'DOMContentLoaded',
    initDeviAdmin,
    { once: true }
  );
} else {
  initDeviAdmin();
}

/* =========================================================
   END OF PART 5
   ========================================================= */
