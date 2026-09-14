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
/* =========================
   PRODUCTS
========================= */

async function crudProducts() {

  const {
    data,
    error
  } = await sb
    .from('products')
    .select('*')
    .order('sort_order', {
      ascending:true,
      nullsFirst:false
    })
    .order('id', {
      ascending:false
    });

  if (error) {

    setMain(`
      <div class="card">
        <h2>Products</h2>
        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>
      </div>
    `);

    return;
  }


  setMain(`

    <h2 class="page-title">
      Products
    </h2>

    <div class="card">

      <h3>Add / Edit Product</h3>

      <form id="productForm">

        <input
          type="hidden"
          id="productId"
        >

        <div class="form-grid">

          <div class="form-group">

            <label>Product Name</label>

            <input
              id="productName"
              required
            >

          </div>


          <div class="form-group">

            <label>Business Unit</label>

            <input
              id="productUnit"
              placeholder="DEVI Chemicals"
            >

          </div>


          <div class="form-group full">

            <label>Description</label>

            <textarea
              id="productDescription"
            ></textarea>

          </div>


          <div class="form-group">

            <label>Packing</label>

            <input
              id="productPacking"
              placeholder="25 KG / 50 KG"
            >

          </div>


          <div class="form-group">

            <label>Sort Order</label>

            <input
              type="number"
              id="productSort"
              value="0"
            >

          </div>


          <div class="form-group">

            <label>Product Photo</label>

            <input
              type="file"
              id="productPhoto"
              accept="image/*"
            >

            <input
              id="productImageUrl"
              placeholder="Or paste image URL"
              style="margin-top:7px"
            >

          </div>


          <div class="form-group">

            <label>Brochure / PDF</label>

            <input
              type="file"
              id="productBrochure"
              accept=".pdf,.doc,.docx"
            >

            <input
              id="productBrochureUrl"
              placeholder="Or paste brochure URL"
              style="margin-top:7px"
            >

          </div>


          <div class="form-group">

            <label>Active</label>

            <select id="productActive">

              <option value="true">
                Yes
              </option>

              <option value="false">
                No
              </option>

            </select>

          </div>

        </div>


        <div style="
          display:flex;
          gap:10px;
          flex-wrap:wrap
        ">

          <button
            type="submit"
            class="btn btn-primary"
          >
            Save Product
          </button>

          <button
            type="button"
            id="productCancel"
            class="btn btn-secondary"
          >
            Clear
          </button>

        </div>

        <p id="productMsg"></p>

      </form>

    </div>


    <div class="card">

      <h3>
        Products List
        (${data?.length || 0})
      </h3>

      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Photo</th>
              <th>Name</th>
              <th>Business Unit</th>
              <th>Packing</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            ${(data || []).map(p => {

              const img =
                p.image_url ||
                p.photo_url ||
                '';

              return `

                <tr>

                  <td>
                    ${esc(p.id)}
                  </td>

                  <td>

                    ${
                      img
                      ?
                      `<img
                        src="${esc(img)}"
                        style="
                          width:65px;
                          height:65px;
                          object-fit:contain;
                          border:1px solid #ddd;
                          border-radius:6px
                        "
                      >`
                      :
                      '-'
                    }

                  </td>

                  <td>
                    <b>
                      ${esc(p.name)}
                    </b>
                  </td>

                  <td>
                    ${esc(p.business_unit)}
                  </td>

                  <td>
                    ${esc(p.packing)}
                  </td>

                  <td>
                    ${p.active === false
                      ? 'No'
                      : 'Yes'}
                  </td>

                  <td>

                    <button
                      class="btn btn-primary"
                      data-edit-product="${esc(p.id)}"
                    >
                      Edit
                    </button>

                    <button
                      class="btn btn-danger"
                      data-delete-product="${esc(p.id)}"
                    >
                      Delete
                    </button>

                  </td>

                </tr>

              `;

            }).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $('#productForm')?.addEventListener(
    'submit',
    saveProduct
  );


  $('#productCancel')?.addEventListener(
    'click',
    clearProductForm
  );


  $$('[data-edit-product]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          editProduct(
            btn.dataset.editProduct
          )
      );

    });


  $$('[data-delete-product]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteProduct(
            btn.dataset.deleteProduct
          )
      );

    });

}


async function saveProduct(e) {

  e.preventDefault();

  const msg =
    $('#productMsg');

  if (msg)
    msg.textContent =
      'Saving...';


  const id =
    $('#productId').value;


  let imageUrl =
    $('#productImageUrl').value.trim();


  let brochureUrl =
    $('#productBrochureUrl').value.trim();


  try {

    const photo =
      $('#productPhoto').files[0];

    if (photo) {

      const uploaded =
        await uploadMedia(
          photo,
          'products'
        );

      imageUrl =
        uploaded.url;

    }


    const brochure =
      $('#productBrochure').files[0];

    if (brochure) {

      const uploaded =
        await uploadMedia(
          brochure,
          'brochures'
        );

      brochureUrl =
        uploaded.url;

    }


    const payload = {

      name:
        $('#productName').value.trim(),

      business_unit:
        $('#productUnit').value.trim(),

      description:
        $('#productDescription').value.trim(),

      packing:
        $('#productPacking').value.trim(),

      image_url:
        imageUrl || null,

      brochure_url:
        brochureUrl || null,

      sort_order:
        Number(
          $('#productSort').value || 0
        ),

      active:
        $('#productActive').value === 'true'

    };


    let result;


    if (id) {

      result =
        await sb
          .from('products')
          .update(payload)
          .eq('id', id);

    } else {

      result =
        await sb
          .from('products')
          .insert(payload);

    }


    if (result.error)
      throw result.error;


    if (msg) {

      msg.style.color =
        '#166534';

      msg.textContent =
        'Product saved successfully.';

    }


    clearProductForm();

    await crudProducts();


  } catch (err) {

    if (msg) {

      msg.style.color =
        '#dc2626';

      msg.textContent =
        err.message;

    }

  }

}


async function editProduct(id) {

  const {
    data,
    error
  } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  $('#productId').value =
    data.id || '';

  $('#productName').value =
    data.name || '';

  $('#productUnit').value =
    data.business_unit || '';

  $('#productDescription').value =
    data.description || '';

  $('#productPacking').value =
    data.packing || '';

  $('#productSort').value =
    data.sort_order || 0;

  $('#productImageUrl').value =
    data.image_url ||
    data.photo_url ||
    '';

  $('#productBrochureUrl').value =
    data.brochure_url ||
    '';

  $('#productActive').value =
    data.active === false
      ? 'false'
      : 'true';


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


async function deleteProduct(id) {

  if (
    !confirm(
      'Delete this product?'
    )
  ) return;


  const {
    data,
    error
  } = await sb
    .from('products')
    .select(
      'image_url,brochure_url'
    )
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  const result =
    await sb
      .from('products')
      .delete()
      .eq('id', id);


  if (result.error) {

    alert(
      result.error.message
    );

    return;

  }


  try {

    await deleteMediaUrl(
      data.image_url
    );

    await deleteMediaUrl(
      data.brochure_url
    );

  } catch (_) {}


  await crudProducts();

}


function clearProductForm() {

  if (!$('#productForm'))
    return;

  $('#productForm').reset();

  $('#productId').value =
    '';

  $('#productSort').value =
    '0';

}


/* =========================
   BUSINESS UNITS
========================= */

async function crudUnits() {

  const {
    data,
    error
  } = await sb
    .from('business_units')
    .select('*')
    .order('sort_order', {
      ascending:true,
      nullsFirst:false
    });


  if (error) {

    setMain(`
      <div class="card">
        <h2>Business Units</h2>
        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>
      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Business Units
    </h2>


    <div class="card">

      <h3>Add / Edit Business Unit</h3>

      <form id="unitForm">

        <input
          type="hidden"
          id="unitId"
        >

        <div class="form-grid">

          <div class="form-group">

            <label>Name</label>

            <input
              id="unitName"
              required
            >

          </div>


          <div class="form-group">

            <label>Website</label>

            <input
              id="unitWebsite"
              placeholder="https://..."
            >

          </div>


          <div class="form-group full">

            <label>Description</label>

            <textarea
              id="unitDescription"
            ></textarea>

          </div>


          <div class="form-group">

            <label>Image</label>

            <input
              type="file"
              id="unitImage"
              accept="image/*"
            >

            <input
              id="unitImageUrl"
              placeholder="Or paste image URL"
              style="margin-top:7px"
            >

          </div>


          <div class="form-group">

            <label>Sort Order</label>

            <input
              type="number"
              id="unitSort"
              value="0"
            >

          </div>

        </div>


        <button
          class="btn btn-primary"
          type="submit"
        >
          Save Business Unit
        </button>


        <button
          class="btn btn-secondary"
          type="button"
          id="unitCancel"
        >
          Clear
        </button>


        <p id="unitMsg"></p>

      </form>

    </div>


    <div class="card">

      <h3>
        Business Units
      </h3>

      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Image</th>
              <th>Name</th>
              <th>Website</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            ${(data || []).map(u => `

              <tr>

                <td>
                  ${esc(u.id)}
                </td>

                <td>

                  ${
                    u.image_url
                    ?
                    `<img
                      src="${esc(u.image_url)}"
                      style="
                        width:70px;
                        height:55px;
                        object-fit:contain
                      "
                    >`
                    :
                    '-'
                  }

                </td>

                <td>
                  <b>
                    ${esc(u.name)}
                  </b>
                </td>

                <td>
                  ${esc(u.website_url)}
                </td>

                <td>

                  <button
                    class="btn btn-primary"
                    data-edit-unit="${esc(u.id)}"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-danger"
                    data-delete-unit="${esc(u.id)}"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $('#unitForm')?.addEventListener(
    'submit',
    saveUnit
  );


  $('#unitCancel')?.addEventListener(
    'click',
    clearUnitForm
  );


  $$('[data-edit-unit]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          editUnit(
            btn.dataset.editUnit
          )
      );

    });


  $$('[data-delete-unit]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteUnit(
            btn.dataset.deleteUnit
          )
      );

    });

}


async function saveUnit(e) {

  e.preventDefault();

  const msg =
    $('#unitMsg');

  if (msg)
    msg.textContent =
      'Saving...';


  try {

    let imageUrl =
      $('#unitImageUrl')
        .value
        .trim();


    const file =
      $('#unitImage').files[0];


    if (file) {

      const uploaded =
        await uploadMedia(
          file,
          'business-units'
        );

      imageUrl =
        uploaded.url;

    }


    const payload = {

      name:
        $('#unitName')
          .value
          .trim(),

      description:
        $('#unitDescription')
          .value
          .trim(),

      image_url:
        imageUrl || null,

      website_url:
        $('#unitWebsite')
          .value
          .trim() || null,

      sort_order:
        Number(
          $('#unitSort').value || 0
        )

    };


    const id =
      $('#unitId').value;


    const result =
      id
      ?
      await sb
        .from('business_units')
        .update(payload)
        .eq('id', id)
      :
      await sb
        .from('business_units')
        .insert(payload);


    if (result.error)
      throw result.error;


    if (msg) {

      msg.style.color =
        '#166534';

      msg.textContent =
        'Business unit saved.';

    }


    clearUnitForm();

    await crudUnits();


  } catch (err) {

    if (msg) {

      msg.style.color =
        '#dc2626';

      msg.textContent =
        err.message;

    }

  }

}


async function editUnit(id) {

  const {
    data,
    error
  } = await sb
    .from('business_units')
    .select('*')
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  $('#unitId').value =
    data.id || '';

  $('#unitName').value =
    data.name || '';

  $('#unitDescription').value =
    data.description || '';

  $('#unitImageUrl').value =
    data.image_url || '';

  $('#unitWebsite').value =
    data.website_url || '';

  $('#unitSort').value =
    data.sort_order || 0;


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


async function deleteUnit(id) {

  if (
    !confirm(
      'Delete this business unit?'
    )
  ) return;


  const result =
    await sb
      .from('business_units')
      .delete()
      .eq('id', id);


  if (result.error) {

    alert(
      result.error.message
    );

    return;

  }


  await crudUnits();

}


function clearUnitForm() {

  $('#unitForm')?.reset();

  if ($('#unitId'))
    $('#unitId').value = '';

  if ($('#unitSort'))
    $('#unitSort').value = '0';

}


/* =========================
   HOMEPAGE
========================= */

async function homepage() {

  const {
    data,
    error
  } = await sb
    .from('site_content')
    .select('*')
    .order('id');


  if (error) {

    setMain(`
      <div class="card">
        <h2>Homepage</h2>
        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>
      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Homepage Content
    </h2>


    <div class="card">

      <p>
        Edit homepage content below.
      </p>

      <div id="homepageItems">

        ${(data || []).map(item => `

          <div
            class="card"
            style="
              border:1px solid #e5e7eb;
              margin-bottom:12px
            "
          >

            <input
              type="hidden"
              class="site-id"
              value="${esc(item.id)}"
            >

            <div class="form-group">

              <label>
                Key
              </label>

              <input
                class="site-key"
                value="${esc(
                  item.key ||
                  item.section_key ||
                  ''
                )}"
              >

            </div>


            <div class="form-group">

              <label>
                Title
              </label>

              <input
                class="site-title"
                value="${esc(
                  item.title || ''
                )}"
              >

            </div>


            <div class="form-group">

              <label>
                Value
              </label>

              <textarea
                class="site-value"
              >${esc(
                item.value || ''
              )}</textarea>

            </div>


            <button
              class="btn btn-primary"
              data-save-site="${esc(item.id)}"
            >
              Save
            </button>

          </div>

        `).join('')}

      </div>

    </div>

  `);


  $$('[data-save-site]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          saveSiteContent(
            btn.dataset.saveSite
          )
      );

    });

}


async function saveSiteContent(id) {

  const card =
    $$('[data-save-site]')
      .find(
        b =>
          b.dataset.saveSite ===
          String(id)
      )
      ?.closest('.card');


  if (!card) return;


  const payload = {

    key:
      $('.site-key', card)
        ?.value
        .trim(),

    title:
      $('.site-title', card)
        ?.value
        .trim(),

    value:
      $('.site-value', card)
        ?.value || ''

  };


  const {
    error
  } = await sb
    .from('site_content')
    .update(payload)
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;

  }


  alert(
    'Homepage content updated.'
  );

}


/* =========================
   ENQUIRIES
========================= */

async function enquiries() {

  const {
    data,
    error
  } = await sb
    .from('enquiries')
    .select('*')
    .order('created_at', {
      ascending:false
    });


  if (error) {

    setMain(`
      <div class="card">
        <h2>Customer Enquiries</h2>
        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>
      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Customer Enquiries
    </h2>

    <div class="card">

      <div class="table-wrap">

        <table>

          <thead>

            <tr>

              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Products</th>
              <th>Message</th>
              <th>Status</th>
              <th>Action</th>

            </tr>

          </thead>

          <tbody>

            ${(data || []).map(e => `

              <tr>

                <td>
                  ${e.created_at
                    ? new Date(
                        e.created_at
                      ).toLocaleString()
                    : ''}
                </td>

                <td>
                  ${esc(e.name)}
                </td>

                <td>
                  ${esc(e.email)}
                </td>

                <td>
                  ${esc(e.phone)}
                </td>

                <td>
                  ${esc(
                    Array.isArray(e.products)
                      ? e.products.join(', ')
                      : e.products
                  )}
                </td>

                <td>
                  ${esc(e.message)}
                </td>

                <td>

                  <select
                    data-enquiry-status="${esc(e.id)}"
                  >

                    ${[
                      'new',
                      'contacted',
                      'quoted',
                      'closed',
                      'spam'
                    ].map(s => `

                      <option
                        value="${s}"
                        ${e.status === s
                          ? 'selected'
                          : ''}
                      >
                        ${s}
                      </option>

                    `).join('')}

                  </select>

                </td>

                <td>

                  <button
                    class="btn btn-danger"
                    data-delete-enquiry="${esc(e.id)}"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $$('[data-enquiry-status]')
    .forEach(select => {

      select.addEventListener(
        'change',
        () =>
          updateEnquiryStatus(
            select.dataset.enquiryStatus,
            select.value
          )
      );

    });


  $$('[data-delete-enquiry]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteEnquiry(
            btn.dataset.deleteEnquiry
          )
      );

    });

}


async function updateEnquiryStatus(
  id,
  status
) {

  const {
    error
  } = await sb
    .from('enquiries')
    .update({status})
    .eq('id', id);


  if (error)
    alert(error.message);

}


async function deleteEnquiry(id) {

  if (
    !confirm(
      'Delete this enquiry?'
    )
  ) return;


  const {
    error
  } = await sb
    .from('enquiries')
    .delete()
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;

  }


  await enquiries();

}
/* =========================
   REVIEWS
========================= */

async function reviews() {

  const {
    data,
    error
  } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', {
      ascending:false
    });


  if (error) {

    setMain(`
      <div class="card">

        <h2>Reviews</h2>

        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>

      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Reviews
    </h2>

    <div class="card">

      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Rating</th>
              <th>Message</th>
              <th>Status</th>
              <th>Action</th>
            </tr>

          </thead>

          <tbody>

            ${(data || []).map(r => `

              <tr>

                <td>
                  ${r.created_at
                    ? new Date(
                        r.created_at
                      ).toLocaleString()
                    : ''}
                </td>

                <td>
                  <b>
                    ${esc(
                      r.customer_name
                    )}
                  </b>
                </td>

                <td>
                  ${'★'.repeat(
                    Math.max(
                      0,
                      Math.min(
                        5,
                        Number(r.rating || 0)
                      )
                    )
                  )}
                </td>

                <td>
                  ${esc(r.message)}
                </td>

                <td>

                  <select
                    data-review-status="${esc(r.id)}"
                  >

                    <option
                      value="pending"
                      ${r.status === 'pending'
                        ? 'selected'
                        : ''}
                    >
                      Pending
                    </option>

                    <option
                      value="approved"
                      ${r.status === 'approved'
                        ? 'selected'
                        : ''}
                    >
                      Approved
                    </option>

                    <option
                      value="rejected"
                      ${r.status === 'rejected'
                        ? 'selected'
                        : ''}
                    >
                      Rejected
                    </option>

                  </select>

                </td>

                <td>

                  <button
                    class="btn btn-danger"
                    data-delete-review="${esc(r.id)}"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $$('[data-review-status]')
    .forEach(select => {

      select.addEventListener(
        'change',
        () =>
          updateReviewStatus(
            select.dataset.reviewStatus,
            select.value
          )
      );

    });


  $$('[data-delete-review]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteReview(
            btn.dataset.deleteReview
          )
      );

    });

}


async function updateReviewStatus(
  id,
  status
) {

  const {
    error
  } = await sb
    .from('reviews')
    .update({status})
    .eq('id', id);


  if (error)
    alert(error.message);

}


async function deleteReview(id) {

  if (
    !confirm(
      'Delete this review?'
    )
  ) return;


  const {
    error
  } = await sb
    .from('reviews')
    .delete()
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;

  }


  await reviews();

}


/* =========================
   COMPANY INFO
========================= */

async function company() {

  const {
    data,
    error
  } = await sb
    .from('company_info')
    .select('*')
    .eq('id', 1)
    .maybeSingle();


  if (error) {

    setMain(`
      <div class="card">

        <h2>Company Info</h2>

        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>

      </div>
    `);

    return;

  }


  const c = data || {};


  setMain(`

    <h2 class="page-title">
      Company Information
    </h2>


    <div class="card">

      <form id="companyForm">

        <div class="form-grid">

          <div class="form-group">

            <label>
              Company Name
            </label>

            <input
              id="companyName"
              value="${esc(
                c.company_name
              )}"
            >

          </div>


          <div class="form-group">

            <label>
              Email
            </label>

            <input
              type="email"
              id="companyEmail"
              value="${esc(
                c.email
              )}"
            >

          </div>


          <div class="form-group">

            <label>
              Phone
            </label>

            <input
              id="companyPhone"
              value="${esc(
                c.phone
              )}"
            >

          </div>


          <div class="form-group">

            <label>
              WhatsApp
            </label>

            <input
              id="companyWhatsapp"
              value="${esc(
                c.whatsapp
              )}"
            >

          </div>


          <div class="form-group full">

            <label>
              Address
            </label>

            <textarea
              id="companyAddress"
            >${esc(
              c.address
            )}</textarea>

          </div>


          <div class="form-group full">

            <label>
              Website
            </label>

            <input
              id="companyWebsite"
              value="${esc(
                c.website
              )}"
              placeholder="https://..."
            >

          </div>

        </div>


        <button
          class="btn btn-primary"
          type="submit"
        >
          Save Company Info
        </button>


        <p id="companyMsg"></p>

      </form>

    </div>

  `);


  $('#companyForm')
    ?.addEventListener(
      'submit',
      saveCompany
    );

}


async function saveCompany(e) {

  e.preventDefault();


  const payload = {

    id: 1,

    company_name:
      $('#companyName')
        .value
        .trim(),

    email:
      $('#companyEmail')
        .value
        .trim(),

    phone:
      $('#companyPhone')
        .value
        .trim(),

    whatsapp:
      $('#companyWhatsapp')
        .value
        .trim(),

    address:
      $('#companyAddress')
        .value
        .trim(),

    website:
      $('#companyWebsite')
        .value
        .trim()

  };


  const {
    error
  } = await sb
    .from('company_info')
    .upsert(
      payload,
      { onConflict:'id' }
    );


  if (error) {

    $('#companyMsg').textContent =
      error.message;

    $('#companyMsg').style.color =
      '#dc2626';

    return;

  }


  $('#companyMsg').textContent =
    'Company information saved.';

  $('#companyMsg').style.color =
    '#166534';

}


/* =========================
   DOCUMENTS
========================= */

async function documents() {

  const {
    data,
    error
  } = await sb
    .from('documents')
    .select('*')
    .order('id', {
      ascending:false
    });


  if (error) {

    setMain(`
      <div class="card">

        <h2>Documents</h2>

        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>

      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Documents / Brochures / TDS / MSDS
    </h2>


    <div class="card">

      <h3>
        Add / Edit Document
      </h3>


      <form id="documentForm">

        <input
          type="hidden"
          id="documentId"
        >


        <div class="form-grid">

          <div class="form-group">

            <label>
              Title
            </label>

            <input
              id="documentTitle"
              required
            >

          </div>


          <div class="form-group">

            <label>
              Category
            </label>

            <select id="documentCategory">

              <option value="brochure">
                Brochure
              </option>

              <option value="tds">
                TDS
              </option>

              <option value="msds">
                MSDS
              </option>

              <option value="other">
                Other
              </option>

            </select>

          </div>


          <div class="form-group full">

            <label>
              Product ID (optional)
            </label>

            <input
              type="number"
              id="documentProductId"
              placeholder="Product ID"
            >

          </div>


          <div class="form-group full">

            <label>
              Upload File
            </label>

            <input
              type="file"
              id="documentFile"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
            >

            <input
              id="documentUrl"
              placeholder="Or paste file URL"
              style="margin-top:7px"
            >

          </div>

        </div>


        <button
          class="btn btn-primary"
          type="submit"
        >
          Save Document
        </button>


        <button
          class="btn btn-secondary"
          type="button"
          id="documentCancel"
        >
          Clear
        </button>


        <p id="documentMsg"></p>

      </form>

    </div>


    <div class="card">

      <h3>
        Document List
      </h3>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>ID</th>
              <th>Title</th>
              <th>Category</th>
              <th>Product</th>
              <th>File</th>
              <th>Actions</th>
            </tr>

          </thead>


          <tbody>

            ${(data || []).map(d => `

              <tr>

                <td>
                  ${esc(d.id)}
                </td>

                <td>
                  <b>
                    ${esc(d.title)}
                  </b>
                </td>

                <td>
                  ${esc(d.category)}
                </td>

                <td>
                  ${esc(d.product_id)}
                </td>

                <td>

                  ${
                    d.file_url
                    ?
                    `<a
                      href="${esc(d.file_url)}"
                      target="_blank"
                      rel="noopener"
                    >
                      Open File
                    </a>`
                    :
                    '-'
                  }

                </td>

                <td>

                  <button
                    class="btn btn-primary"
                    data-edit-document="${esc(d.id)}"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-danger"
                    data-delete-document="${esc(d.id)}"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $('#documentForm')
    ?.addEventListener(
      'submit',
      saveDocument
    );


  $('#documentCancel')
    ?.addEventListener(
      'click',
      clearDocumentForm
    );


  $$('[data-edit-document]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          editDocument(
            btn.dataset.editDocument
          )
      );

    });


  $$('[data-delete-document]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteDocument(
            btn.dataset.deleteDocument
          )
      );

    });

}


async function saveDocument(e) {

  e.preventDefault();


  const msg =
    $('#documentMsg');

  if (msg)
    msg.textContent =
      'Saving...';


  try {

    let fileUrl =
      $('#documentUrl')
        .value
        .trim();


    const file =
      $('#documentFile')
        .files[0];


    if (file) {

      const uploaded =
        await uploadMedia(
          file,
          'documents'
        );

      fileUrl =
        uploaded.url;

    }


    const payload = {

      title:
        $('#documentTitle')
          .value
          .trim(),

      category:
        $('#documentCategory')
          .value,

      file_url:
        fileUrl || null,

      product_id:
        $('#documentProductId')
          .value
          ? Number(
              $('#documentProductId')
                .value
            )
          : null

    };


    const id =
      $('#documentId')
        .value;


    const result =
      id
      ?
      await sb
        .from('documents')
        .update(payload)
        .eq('id', id)
      :
      await sb
        .from('documents')
        .insert(payload);


    if (result.error)
      throw result.error;


    if (msg) {

      msg.style.color =
        '#166534';

      msg.textContent =
        'Document saved successfully.';

    }


    clearDocumentForm();

    await documents();


  } catch (err) {

    if (msg) {

      msg.style.color =
        '#dc2626';

      msg.textContent =
        err.message;

    }

  }

}


async function editDocument(id) {

  const {
    data,
    error
  } = await sb
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  $('#documentId').value =
    data.id || '';

  $('#documentTitle').value =
    data.title || '';

  $('#documentCategory').value =
    data.category || 'other';

  $('#documentProductId').value =
    data.product_id || '';

  $('#documentUrl').value =
    data.file_url || '';


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


async function deleteDocument(id) {

  if (
    !confirm(
      'Delete this document?'
    )
  ) return;


  const {
    data,
    error
  } = await sb
    .from('documents')
    .select('file_url')
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  const result =
    await sb
      .from('documents')
      .delete()
      .eq('id', id);


  if (result.error) {

    alert(
      result.error.message
    );

    return;

  }


  try {

    await deleteMediaUrl(
      data.file_url
    );

  } catch (_) {}


  await documents();

}


function clearDocumentForm() {

  $('#documentForm')?.reset();

  if ($('#documentId'))
    $('#documentId').value = '';

}


/* =========================
   TRACKING
========================= */

async function tracking() {

  const {
    data,
    error
  } = await sb
    .from('tracking')
    .select('*')
    .order('id', {
      ascending:false
    });


  if (error) {

    setMain(`
      <div class="card">

        <h2>Tracking</h2>

        <p style="color:#dc2626">
          ${esc(error.message)}
        </p>

      </div>
    `);

    return;

  }


  setMain(`

    <h2 class="page-title">
      Tracking Information
    </h2>


    <div class="card">

      <h3>
        Add / Edit Tracking
      </h3>


      <form id="trackingForm">

        <input
          type="hidden"
          id="trackingId"
        >


        <div class="form-grid">

          <div class="form-group">

            <label>
              Reference No
            </label>

            <input
              id="trackingReference"
              required
            >

          </div>


          <div class="form-group">

            <label>
              Customer Name
            </label>

            <input
              id="trackingCustomer"
            >

          </div>


          <div class="form-group">

            <label>
              Product
            </label>

            <input
              id="trackingProduct"
            >

          </div>


          <div class="form-group">

            <label>
              Status
            </label>

            <input
              id="trackingStatus"
              placeholder="In Transit"
            >

          </div>


          <div class="form-group">

            <label>
              Location
            </label>

            <input
              id="trackingLocation"
            >

          </div>


          <div class="form-group">

            <label>
              ETA
            </label>

            <input
              id="trackingEta"
            >

          </div>


          <div class="form-group">

            <label>
              Step 1
            </label>

            <input
              id="trackingStep1"
            >

          </div>


          <div class="form-group">

            <label>
              Step 2
            </label>

            <input
              id="trackingStep2"
            >

          </div>


          <div class="form-group">

            <label>
              Step 3
            </label>

            <input
              id="trackingStep3"
            >

          </div>


          <div class="form-group">

            <label>
              Step 4
            </label>

            <input
              id="trackingStep4"
            >

          </div>

        </div>


        <button
          class="btn btn-primary"
          type="submit"
        >
          Save Tracking
        </button>


        <button
          class="btn btn-secondary"
          type="button"
          id="trackingCancel"
        >
          Clear
        </button>


        <p id="trackingMsg"></p>

      </form>

    </div>


    <div class="card">

      <h3>
        Tracking List
      </h3>


      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Status</th>
              <th>Location</th>
              <th>ETA</th>
              <th>Actions</th>
            </tr>

          </thead>


          <tbody>

            ${(data || []).map(t => `

              <tr>

                <td>
                  <b>
                    ${esc(t.reference_no)}
                  </b>
                </td>

                <td>
                  ${esc(t.customer_name)}
                </td>

                <td>
                  ${esc(t.product)}
                </td>

                <td>
                  ${esc(t.status)}
                </td>

                <td>
                  ${esc(t.location)}
                </td>

                <td>
                  ${esc(t.eta)}
                </td>

                <td>

                  <button
                    class="btn btn-primary"
                    data-edit-tracking="${esc(t.id)}"
                  >
                    Edit
                  </button>

                  <button
                    class="btn btn-danger"
                    data-delete-tracking="${esc(t.id)}"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join('')}

          </tbody>

        </table>

      </div>

    </div>

  `);


  $('#trackingForm')
    ?.addEventListener(
      'submit',
      saveTracking
    );


  $('#trackingCancel')
    ?.addEventListener(
      'click',
      clearTrackingForm
    );


  $$('[data-edit-tracking]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          editTracking(
            btn.dataset.editTracking
          )
      );

    });


  $$('[data-delete-tracking]')
    .forEach(btn => {

      btn.addEventListener(
        'click',
        () =>
          deleteTracking(
            btn.dataset.deleteTracking
          )
      );

    });

}


async function saveTracking(e) {

  e.preventDefault();


  const payload = {

    reference_no:
      $('#trackingReference')
        .value
        .trim(),

    customer_name:
      $('#trackingCustomer')
        .value
        .trim(),

    product:
      $('#trackingProduct')
        .value
        .trim(),

    status:
      $('#trackingStatus')
        .value
        .trim(),

    location:
      $('#trackingLocation')
        .value
        .trim(),

    eta:
      $('#trackingEta')
        .value
        .trim(),

    step1:
      $('#trackingStep1')
        .value
        .trim(),

    step2:
      $('#trackingStep2')
        .value
        .trim(),

    step3:
      $('#trackingStep3')
        .value
        .trim(),

    step4:
      $('#trackingStep4')
        .value
        .trim()

  };


  const id =
    $('#trackingId')
      .value;


  const result =
    id
    ?
    await sb
      .from('tracking')
      .update(payload)
      .eq('id', id)
    :
    await sb
      .from('tracking')
      .insert(payload);


  if (result.error) {

    $('#trackingMsg').textContent =
      result.error.message;

    $('#trackingMsg').style.color =
      '#dc2626';

    return;

  }


  $('#trackingMsg').textContent =
    'Tracking saved successfully.';

  $('#trackingMsg').style.color =
    '#166534';


  clearTrackingForm();

  await tracking();

}


async function editTracking(id) {

  const {
    data,
    error
  } = await sb
    .from('tracking')
    .select('*')
    .eq('id', id)
    .single();


  if (error) {

    alert(error.message);

    return;

  }


  $('#trackingId').value =
    data.id || '';

  $('#trackingReference').value =
    data.reference_no || '';

  $('#trackingCustomer').value =
    data.customer_name || '';

  $('#trackingProduct').value =
    data.product || '';

  $('#trackingStatus').value =
    data.status || '';

  $('#trackingLocation').value =
    data.location || '';

  $('#trackingEta').value =
    data.eta || '';

  $('#trackingStep1').value =
    data.step1 || '';

  $('#trackingStep2').value =
    data.step2 || '';

  $('#trackingStep3').value =
    data.step3 || '';

  $('#trackingStep4').value =
    data.step4 || '';


  window.scrollTo({
    top:0,
    behavior:'smooth'
  });

}


async function deleteTracking(id) {

  if (
    !confirm(
      'Delete this tracking record?'
    )
  ) return;


  const {
    error
  } = await sb
    .from('tracking')
    .delete()
    .eq('id', id);


  if (error) {

    alert(error.message);

    return;

  }


  await tracking();

}


function clearTrackingForm() {

  $('#trackingForm')?.reset();

  if ($('#trackingId'))
    $('#trackingId').value = '';

}


/* =========================
   MEDIA LIBRARY
========================= */

async function mediaLibrary() {

  setMain(`

    <h2 class="page-title">
      Media Library
    </h2>


    <div class="card">

      <h3>
        Upload Photo / Video / PDF / Document
      </h3>


      <form id="mediaForm">

        <div class="form-grid">

          <div class="form-group">

            <label>
              Select Folder
            </label>

            <select id="mediaFolder">

              <option value="general">
                General
              </option>

              <option value="images">
                Images
              </option>

              <option value="videos">
                Videos
              </option>

              <option value="brochures">
                Brochures
              </option>

              <option value="documents">
                Documents
              </option>

              <option value="tds">
                TDS
              </option>

              <option value="msds">
                MSDS
              </option>

            </select>

          </div>


          <div class="form-group">

            <label>
              File
            </label>

            <input
              type="file"
              id="mediaFile"
              required
            >

          </div>

        </div>


        <button
          class="btn btn-primary"
          type="submit"
        >
          Upload File
        </button>


        <p id="mediaMsg"></p>

      </form>

    </div>


    <div class="card">

      <h3>
        Uploaded Files
      </h3>

      <div id="mediaList">
        Loading...
      </div>

    </div>

  `);


  $('#mediaForm')
    ?.addEventListener(
      'submit',
      uploadFromMediaLibrary
    );


  await refreshMediaList();

}


async function uploadFromMediaLibrary(e) {

  e.preventDefault();


  const msg =
    $('#mediaMsg');

  const file =
    $('#mediaFile')
      .files[0];

  const folder =
    $('#mediaFolder')
      .value;


  if (!file) return;


  try {

    if (msg)
      msg.textContent =
        'Uploading...';


    await uploadMedia(
      file,
      folder
    );


    if (msg) {

      msg.style.color =
        '#166534';

      msg.textContent =
        'File uploaded successfully.';

    }


    $('#mediaForm').reset();

    await refreshMediaList();


  } catch (err) {

    if (msg) {

      msg.style.color =
        '#dc2626';

      msg.textContent =
        err.message;

    }

  }

}


async function refreshMediaList() {

  const box =
    $('#mediaList');

  if (!box) return;


  try {

    const files =
      await listAllFiles('');


    if (!files.length) {

      box.innerHTML =
        '<p>No files uploaded yet.</p>';

      return;

    }


    box.innerHTML = `

      <div style="
        display:grid;
        grid-template-columns:
          repeat(auto-fill,minmax(220px,1fr));
        gap:16px
      ">

        ${files.map(file => {

          const {
            data
          } =
            sb.storage
              .from(BUCKET)
              .getPublicUrl(
                file.path
              );

          const url =
            data.publicUrl;


          const type =
            file.metadata?.mimetype ||
            '';


          let preview = '';


          if (
            type.startsWith('image/')
          ) {

            preview = `

              <img
                src="${esc(url)}"
                style="
                  width:100%;
                  height:160px;
                  object-fit:contain;
                  background:#f3f4f6;
                  border-radius:8px
                "
              >

            `;

          } else if (
            type.startsWith('video/')
          ) {

            preview = `

              <video
                src="${esc(url)}"
                controls
                style="
                  width:100%;
                  height:160px;
                  background:#000;
                  border-radius:8px
                "
              ></video>

            `;

          } else if (
            type ===
            'application/pdf' ||
            file.name
              .toLowerCase()
              .endsWith('.pdf')
          ) {

            preview = `

              <iframe
                src="${esc(url)}"
                style="
                  width:100%;
                  height:160px;
                  border:0;
                  border-radius:8px
                "
              ></iframe>

            `;

          } else {

            preview = `

              <div style="
                height:160px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:#f3f4f6;
                border-radius:8px;
                font-size:42px
              ">
                📄
              </div>

            `;

          }


          return `

            <div style="
              border:1px solid #e5e7eb;
              border-radius:10px;
              padding:10px;
              background:#fff
            ">

              ${preview}

              <div style="
                margin-top:9px;
                font-size:13px;
                font-weight:700;
                word-break:break-word
              ">
                ${esc(file.name)}
              </div>

              <div style="
                display:flex;
                gap:7px;
                margin-top:9px
              ">

                <a
                  href="${esc(url)}"
                  target="_blank"
                  rel="noopener"
                  class="btn btn-primary"
                  style="
                    text-decoration:none
                  "
                >
                  Open
                </a>

                <button
                  class="btn btn-danger"
                  data-delete-media="${esc(file.path)}"
                >
                  Delete
                </button>

              </div>

            </div>

          `;

        }).join('')}

      </div>

    `;


    $$('[data-delete-media]')
      .forEach(btn => {

        btn.addEventListener(
          'click',
          () =>
            deleteMediaFile(
              btn.dataset.deleteMedia
            )
        );

      });


  } catch (err) {

    box.innerHTML = `

      <p style="color:#dc2626">
        ${esc(err.message)}
      </p>

    `;

  }

}


async function deleteMediaFile(path) {

  if (
    !confirm(
      'Delete this file?'
    )
  ) return;


  const {
    error
  } = await sb.storage
    .from(BUCKET)
    .remove([path]);


  if (error) {

    alert(error.message);

    return;

  }


  await refreshMediaList();

}


/* =========================
   START
========================= */

boot();
