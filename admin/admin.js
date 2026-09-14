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
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[m])
  );


function notice(msg, type = 'ok') {
  alert(msg);
}


function setMain(html) {
  const main = $('#main');

  if (main) {
    main.innerHTML = html;
  }
}


/* =========================
   PASSWORD RESET
========================= */

const resetLink = $('#forgotPassword');
const resetBox = $('#resetBox');
const resetForm = $('#resetForm');
const resetMsg = $('#resetMsg');
const backToLogin = $('#backToLogin');


resetLink?.addEventListener('click', e => {

  e.preventDefault();

  $('#loginForm')?.classList.add('hidden');

  resetBox?.classList.remove('hidden');

  if (resetMsg) {
    resetMsg.textContent = '';
  }

});


backToLogin?.addEventListener('click', e => {

  e.preventDefault();

  resetBox?.classList.add('hidden');

  $('#loginForm')?.classList.remove('hidden');

  if (resetMsg) {
    resetMsg.textContent = '';
  }

});


resetForm?.addEventListener('submit', async e => {

  e.preventDefault();

  const email =
    $('#resetEmail')?.value.trim();

  if (!email) return;

  if (resetMsg) {
    resetMsg.textContent =
      'Sending reset email...';
  }

  const redirectTo =
    new URL(
      'index.html',
      window.location.href
    ).href;

  const { error } =
    await sb.auth.resetPasswordForEmail(
      email,
      {
        redirectTo
      }
    );

  if (error) {

    if (resetMsg) {
      resetMsg.textContent =
        error.message;
    }

    return;
  }

  if (resetMsg) {

    resetMsg.textContent =
      'Reset email sent. Please check your inbox.';

  }

});


sb.auth.onAuthStateChange(
  async (event) => {

    if (event === 'PASSWORD_RECOVERY') {

      const newPassword =
        prompt(
          'Enter your new admin password:'
        );

      if (!newPassword) return;

      if (newPassword.length < 6) {

        alert(
          'Password must be at least 6 characters.'
        );

        return;
      }

      const { error } =
        await sb.auth.updateUser({
          password: newPassword
        });

      if (error) {

        alert(error.message);

      } else {

        alert(
          'Password updated successfully. Please login again.'
        );

      }

    }

  }
);


/* =========================
   AUTH
========================= */

async function boot() {

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session) {

    await showApp(session);

  } else {

    $('#login')?.classList.remove('hidden');

  }


  sb.auth.onAuthStateChange(
    async (_event, session) => {

      if (session) {

        await showApp(session);

      } else {

        $('#app')?.classList.add('hidden');

        $('#login')?.classList.remove('hidden');

      }

    }
  );

}


async function showApp(session) {

  $('#login')?.classList.add('hidden');

  $('#app')?.classList.remove('hidden');

  if ($('#userEmail')) {

    $('#userEmail').textContent =
      session.user.email || 'Admin';

  }

  addMediaTab();

  await render();

}


$('#loginForm')?.addEventListener(
  'submit',
  async e => {

    e.preventDefault();

    const msg = $('#loginMsg');

    if (msg) {
      msg.textContent = 'Signing in...';
    }

    const email =
      $('#email').value.trim();

    const password =
      $('#password').value;

    const { error } =
      await sb.auth.signInWithPassword({
        email,
        password
      });

    if (error) {

      if (msg) {
        msg.textContent =
          error.message;
      }

      return;
    }

    if (msg) {
      msg.textContent = '';
    }

  }
);


$('#logout')?.addEventListener(
  'click',
  async () => {

    await sb.auth.signOut();

  }
);


/* =========================
   NAVIGATION
========================= */

function addMediaTab() {

  const sidebar =
    $('.sidebar');

  if (!sidebar) return;

  if (
    sidebar.querySelector(
      '[data-view="media"]'
    )
  ) return;

  const b =
    document.createElement('button');

  b.className = 'tab';

  b.type = 'button';

  b.dataset.view = 'media';

  b.textContent =
    'Media Library';

  sidebar.appendChild(b);

  b.addEventListener(
    'click',
    () => selectView('media', b)
  );

}


function selectView(view, button) {

  currentView = view;

  $$('.tab').forEach(x => {

    x.classList.remove('active');

  });

  button?.classList.add('active');

  render();

}


$$('.tab').forEach(b => {

  b.addEventListener(
    'click',
    () =>
      selectView(
        b.dataset.view,
        b
      )
  );

});


async function render() {

  setMain(
    '<div style="padding:40px;text-align:center">Loading...</div>'
  );

  const fn = {

    dashboard,

    products: crudProducts,

    units: crudUnits,

    homepage,

    enquiries,

    reviews,

    company,

    documents,

    tracking,

    media: mediaLibrary

  }[currentView];

  if (fn) {

    await fn();

  }

}


/* =========================
   DASHBOARD
========================= */

async function countTable(table) {

  const {
    count,
    error
  } = await sb
    .from(table)
    .select('*', {
      count: 'exact',
      head: true
    });

  return error
    ? 0
    : (count || 0);

}


async function dashboard() {

  const tables = [

    ['products','Products'],

    ['business_units','Business Units'],

    ['enquiries','Enquiries'],

    ['reviews','Reviews'],

    ['documents','Documents'],

    ['tracking','Tracking']

  ];

  const counts =
    await Promise.all(
      tables.map(
        x => countTable(x[0])
      )
    );


  setMain(`

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin:0 0 25px
    ">
      Dashboard
    </h2>

    <div style="
      display:grid;
      grid-template-columns:
        repeat(auto-fit,minmax(210px,1fr));
      gap:16px
    ">

      ${tables.map((x,i) => `

        <div style="
          background:#fff;
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:22px
        ">

          <div style="
            font-size:13px;
            color:#64748b;
            font-weight:700
          ">
            ${esc(x[1])}
          </div>

          <div style="
            font-size:38px;
            font-weight:900;
            margin-top:7px
          ">
            ${counts[i]}
          </div>

        </div>

      `).join('')}

    </div>

    <div style="
      margin-top:20px;
      padding:18px;
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:14px
    ">

      <b>Media Library</b><br>

      Upload photos, videos,
      brochures, PDFs, TDS/MSDS
      and other files from the
      Media Library tab.

    </div>

  `);

}


/* =========================
   STORAGE
========================= */

function safeFileName(name) {

  return name
    .toLowerCase()
    .replace(
      /[^a-z0-9._-]+/g,
      '-'
    )
    .replace(
      /-+/g,
      '-'
    );

}


async function uploadMedia(
  file,
  folder = 'general'
) {

  if (!file) return null;

  const ext =
    file.name.includes('.')
      ? '.' +
        file.name
          .split('.')
          .pop()
          .toLowerCase()
      : '';

  const base =
    safeFileName(
      file.name.replace(
        /\.[^.]+$/,
        ''
      )
    ) || 'file';

  const path =
    `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2,8)}-${base}${ext}`;


  const { error } =
    await sb.storage
      .from(BUCKET)
      .upload(
        path,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType:
            file.type || undefined
        }
      );


  if (error) {
    throw error;
  }


  const { data } =
    sb.storage
      .from(BUCKET)
      .getPublicUrl(path);


  return {
    url: data.publicUrl,
    path
  };

}


function storagePathFromUrl(url) {

  if (!url) return null;

  const marker =
    `/storage/v1/object/public/${BUCKET}/`;

  const i =
    url.indexOf(marker);

  if (i >= 0) {

    return decodeURIComponent(
      url.slice(
        i + marker.length
      )
    );

  }

  return null;

}


async function deleteMediaUrl(url) {

  const path =
    storagePathFromUrl(url);

  if (!path) return;

  await sb.storage
    .from(BUCKET)
    .remove([path]);

}


async function listAllFiles(prefix = '') {

  const out = [];

  const queue = [prefix];


  while (queue.length) {

    const folder =
      queue.shift();

    const {
      data,
      error
    } = await sb.storage
      .from(BUCKET)
      .list(
        folder,
        {
          limit:1000,
          offset:0,
          sortBy:{
            column:'created_at',
            order:'desc'
          }
        }
      );


    if (error) {
      throw error;
    }


    for (
      const item of
      (data || [])
    ) {

      if (!item?.name)
        continue;


      const path =
        folder
          ? `${folder}/${item.name}`
          : item.name;


      if (
        !item.id &&
        !item.metadata
      ) {

        queue.push(path);

      } else {

        out.push({
          ...item,
          path
        });

      }

    }

  }


  return out;

}
