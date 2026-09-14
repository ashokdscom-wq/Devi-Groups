const cfg = window.DEVI_CMS_CONFIG;

if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey) {
  document.body.innerHTML = `
    <div style="font-family:Arial;padding:40px;color:#b91c1c">
      <h2>Supabase configuration not found.</h2>
      <p>Check admin/cms-config.js</p>
    </div>
  `;
  throw new Error('Supabase configuration not found');
}

const sb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseKey
);

let currentView = 'dashboard';

const $ = s => document.querySelector(s);

const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])
  );


/* =========================
   AUTH
========================= */

async function boot() {

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (session) {
    showApp(session);
  } else {
    $('#login').classList.remove('hidden');
  }

  sb.auth.onAuthStateChange((_event, session) => {

    if (session) {
      showApp(session);
    } else {
      location.reload();
    }

  });

}


/* SHOW APP */

async function showApp(session) {

  $('#login').classList.add('hidden');
  $('#app').classList.remove('hidden');

  $('#userEmail').textContent =
    session.user.email || '';

  render();

}


/* LOGIN */

$('#loginForm').onsubmit = async e => {

  e.preventDefault();

  $('#loginMsg').textContent =
    'Signing in...';

  const {
    error
  } = await sb.auth.signInWithPassword({

    email: $('#email').value.trim(),

    password: $('#password').value

  });

  if (error) {

    $('#loginMsg').textContent =
      error.message;

  } else {

    $('#loginMsg').textContent = '';

  }

};


/* LOGOUT */

$('#logout').onclick = async () => {

  await sb.auth.signOut();

};


/* =========================
   TABS
========================= */

document
  .querySelectorAll('.tab')
  .forEach(button => {

    button.onclick = () => {

      document
        .querySelectorAll('.tab')
        .forEach(x =>
          x.classList.remove('active')
        );

      button.classList.add('active');

      currentView =
        button.dataset.view;

      render();

    };

  });


/* =========================
   RENDER
========================= */

async function render() {

  const main = $('#main');

  if (!main) return;

  main.innerHTML =
    '<div style="padding:40px;text-align:center">Loading...</div>';

  if (currentView === 'dashboard')
    return dashboard();

  if (currentView === 'products')
    return crudProducts();

  if (currentView === 'units')
    return crudUnits();

  if (currentView === 'homepage')
    return homepage();

  if (currentView === 'enquiries')
    return enquiries();

  if (currentView === 'reviews')
    return reviews();

  if (currentView === 'company')
    return company();

  if (currentView === 'documents')
    return documents();

  if (currentView === 'tracking')
    return tracking();

}


/* =========================
   DASHBOARD
========================= */

async function dashboard() {

  const tables = [
    'products',
    'business_units',
    'enquiries',
    'reviews',
    'documents',
    'tracking'
  ];

  const nums = {};

  for (const table of tables) {

    const {
      count,
      error
    } = await sb
      .from(table)
      .select('*', {
        count: 'exact',
        head: true
      });

    nums[table] =
      error ? 0 : (count || 0);

  }


  $('#main').innerHTML = `

    <h2 style="font-size:30px;font-weight:800;margin-bottom:25px">
      Dashboard
    </h2>

    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:16px;
    ">

      ${tables.map(t => `

        <div style="
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:22px;
          background:#fff;
        ">

          <div style="
            color:#64748b;
            text-transform:uppercase;
            font-size:12px;
            font-weight:700;
          ">
            ${esc(t.replace('_',' '))}
          </div>

          <div style="
            font-size:38px;
            font-weight:900;
            margin-top:8px;
          ">
            ${nums[t]}
          </div>

        </div>

      `).join('')}

    </div>
  `;

}


/* =========================
   PRODUCT FORM
========================= */

function productFormHtml(item = {}) {

  return `

    <form
      id="editForm"
      data-type="product"
      style="display:grid;gap:12px"
    >

      <input
        name="id"
        type="hidden"
        value="${esc(item.id)}"
      >

      <input
        name="name"
        required
        placeholder="Product Name"
        value="${esc(item.name)}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="business_unit"
        required
        placeholder="Business Unit"
        value="${esc(item.business_unit || 'DEVI CHEMICALS')}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <textarea
        name="description"
        placeholder="Description"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px;min-height:100px"
      >${esc(item.description)}</textarea>

      <input
        name="packing"
        placeholder="Packing"
        value="${esc(item.packing)}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="photo_url"
        placeholder="Photo URL"
        value="${esc(item.photo_url || item.image_url)}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="brochure_url"
        placeholder="Brochure URL"
        value="${esc(item.brochure_url)}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="sort_order"
        type="number"
        value="${item.sort_order || 0}"
        style="width:100%;padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <label style="display:flex;gap:8px;align-items:center">

        <input
          name="active"
          type="checkbox"
          ${item.active !== false ? 'checked' : ''}
        >

        Active

      </label>

      <button
        type="submit"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:13px 18px;
          border-radius:10px;
          font-weight:700;
          cursor:pointer;
        "
      >
        Save Product
      </button>

    </form>

  `;

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
    .order('business_unit')
    .order('sort_order');


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626;padding:20px">
        <h2>Products Error</h2>
        <p>${esc(error.message)}</p>
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:15px;
      margin-bottom:20px;
    ">

      <h2 style="
        font-size:30px;
        font-weight:800;
        margin:0;
      ">
        Products
      </h2>

      <button
        id="new"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:10px 16px;
          border-radius:10px;
          cursor:pointer;
        "
      >
        + Add Product
      </button>

    </div>

    <div
      id="editor"
      class="hidden"
      style="
        border:1px solid #e5e7eb;
        border-radius:16px;
        padding:20px;
        margin-bottom:20px;
        background:#fff;
      "
    ></div>

    <div style="
      overflow:auto;
      background:#fff;
      border:1px solid #e5e7eb;
      border-radius:14px;
    ">

      <table style="width:100%;border-collapse:collapse">

        <thead>

          <tr style="background:#f8fafc;text-align:left">

            <th style="padding:12px">
              Product
            </th>

            <th style="padding:12px">
              Unit
            </th>

            <th style="padding:12px">
              Packing
            </th>

            <th style="padding:12px">
              Active
            </th>

            <th style="padding:12px">
              Action
            </th>

          </tr>

        </thead>

        <tbody>

          ${(data || []).map(p => `

            <tr style="border-top:1px solid #e5e7eb">

              <td style="padding:12px;font-weight:700">
                ${esc(p.name)}
              </td>

              <td style="padding:12px">
                ${esc(p.business_unit)}
              </td>

              <td style="padding:12px">
                ${esc(p.packing)}
              </td>

              <td style="padding:12px">
                ${p.active ? 'Yes' : 'No'}
              </td>

              <td style="padding:12px">

                <button
                  class="edit"
                  data-id="${p.id}"
                  style="
                    color:#2563eb;
                    background:none;
                    border:0;
                    cursor:pointer;
                    margin-right:12px;
                  "
                >
                  Edit
                </button>

                <button
                  class="del"
                  data-id="${p.id}"
                  style="
                    color:#dc2626;
                    background:none;
                    border:0;
                    cursor:pointer;
                  "
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join('')}

        </tbody>

      </table>

    </div>

  `;


  $('#new').onclick = () =>
    openProduct({});


  document
    .querySelectorAll('.edit')
    .forEach(button => {

      button.onclick = async () => {

        const {
          data,
          error
        } = await sb
          .from('products')
          .select('*')
          .eq('id', button.dataset.id)
          .single();

        if (error) {

          alert(error.message);

          return;

        }

        openProduct(data);

      };

    });


  document
    .querySelectorAll('.del')
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm('Delete this product?'))
          return;

        const {
          error
        } = await sb
          .from('products')
          .delete()
          .eq('id', button.dataset.id);

        if (error) {

          alert(error.message);

          return;

        }

        render();

      };

    });

}


/* OPEN PRODUCT */

function openProduct(item) {

  const editor = $('#editor');

  editor.classList.remove('hidden');

  editor.innerHTML =
    productFormHtml(item);


  $('#editForm').onsubmit =
    async event => {

      event.preventDefault();

      const fd =
        new FormData(event.target);

      const obj =
        Object.fromEntries(fd);

      obj.active =
        fd.has('active');

      obj.sort_order =
        Number(obj.sort_order || 0);


      if (obj.id) {

        const {
          error
        } = await sb
          .from('products')
          .update(obj)
          .eq('id', obj.id);

        if (error) {

          alert(error.message);

          return;

        }

      } else {

        delete obj.id;

        const {
          error
        } = await sb
          .from('products')
          .insert(obj);

        if (error) {

          alert(error.message);

          return;

        }

      }

      render();

    };

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
    .order('sort_order');


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
    ">

      <h2 style="font-size:30px;font-weight:800">
        Business Units
      </h2>

      <button
        id="new"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:10px 16px;
          border-radius:10px;
        "
      >
        + Add Unit
      </button>

    </div>

    <div
      id="editor"
      class="hidden"
      style="
        border:1px solid #ddd;
        border-radius:16px;
        padding:20px;
        margin-bottom:20px;
        background:#fff;
      "
    ></div>

    <div style="
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(280px,1fr));
      gap:16px;
    ">

      ${(data || []).map(u => `

        <div style="
          border:1px solid #e5e7eb;
          border-radius:16px;
          padding:18px;
          background:#fff;
        ">

          <h3 style="
            margin:0;
            font-size:20px;
            font-weight:800;
          ">
            ${esc(u.name)}
          </h3>

          <p style="
            color:#64748b;
            line-height:1.5;
          ">
            ${esc(u.description)}
          </p>

          ${
            u.image_url
              ? `
                <img
                  src="${esc(u.image_url)}"
                  alt="${esc(u.name)}"
                  style="
                    width:100%;
                    max-height:180px;
                    object-fit:cover;
                    border-radius:10px;
                    margin:10px 0;
                  "
                >
              `
              : ''
          }

          <div style="margin-top:12px">

            <button
              class="edit"
              data-id="${u.id}"
              style="
                color:#2563eb;
                border:0;
                background:none;
                cursor:pointer;
                margin-right:12px;
              "
            >
              Edit
            </button>

            <button
              class="del"
              data-id="${u.id}"
              style="
                color:#dc2626;
                border:0;
                background:none;
                cursor:pointer;
              "
            >
              Delete
            </button>

          </div>

        </div>

      `).join('')}

    </div>

  `;


  $('#new').onclick = () =>
    openUnit({});


  document
    .querySelectorAll('.edit')
    .forEach(button => {

      button.onclick = async () => {

        const {
          data,
          error
        } = await sb
          .from('business_units')
          .select('*')
          .eq('id', button.dataset.id)
          .single();

        if (error) {

          alert(error.message);

          return;

        }

        openUnit(data);

      };

    });


  document
    .querySelectorAll('.del')
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm('Delete this business unit?'))
          return;

        const {
          error
        } = await sb
          .from('business_units')
          .delete()
          .eq('id', button.dataset.id);

        if (error) {

          alert(error.message);

          return;

        }

        render();

      };

    });

}


/* UNIT FORM */

function openUnit(item) {

  const editor = $('#editor');

  editor.classList.remove('hidden');

  editor.innerHTML = `

    <form
      id="unitForm"
      style="display:grid;gap:12px"
    >

      <input
        name="id"
        type="hidden"
        value="${esc(item.id)}"
      >

      <input
        name="name"
        required
        placeholder="Business Unit Name"
        value="${esc(item.name)}"
        style="padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <textarea
        name="description"
        placeholder="Description"
        style="padding:12px;border:1px solid #ddd;border-radius:10px;min-height:100px"
      >${esc(item.description)}</textarea>

      <input
        name="image_url"
        placeholder="Image URL"
        value="${esc(item.image_url)}"
        style="padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="website_url"
        placeholder="Website URL"
        value="${esc(item.website_url)}"
        style="padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <input
        name="sort_order"
        type="number"
        value="${item.sort_order || 0}"
        style="padding:12px;border:1px solid #ddd;border-radius:10px"
      >

      <button
        type="submit"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:13px;
          border-radius:10px;
          font-weight:700;
        "
      >
        Save Business Unit
      </button>

    </form>

  `;


  $('#unitForm').onsubmit =
    async event => {

      event.preventDefault();

      const fd =
        new FormData(event.target);

      const obj =
        Object.fromEntries(fd);

      obj.sort_order =
        Number(obj.sort_order || 0);


      if (obj.id) {

        const {
          error
        } = await sb
          .from('business_units')
          .update(obj)
          .eq('id', obj.id);

        if (error) {

          alert(error.message);

          return;

        }

      } else {

        delete obj.id;

        const {
          error
        } = await sb
          .from('business_units')
          .insert(obj);

        if (error) {

          alert(error.message);

          return;

        }

      }

      render();

    };

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
    .order('key');


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        <h2>Homepage Error</h2>
        <p>${esc(error.message)}</p>
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin-bottom:20px;
    ">
      Homepage Content
    </h2>

    <div style="
      display:grid;
      gap:15px;
    ">

      ${(data || []).map(x => `

        <div style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          background:#fff;
        ">

          <div style="
            font-weight:800;
            margin-bottom:8px;
          ">
            ${esc(x.key)}
          </div>

          <textarea
            class="siteValue"
            data-id="${x.id}"
            style="
              width:100%;
              min-height:100px;
              padding:12px;
              border:1px solid #ddd;
              border-radius:10px;
            "
          >${esc(x.value)}</textarea>

          <button
            class="saveSite"
            data-id="${x.id}"
            style="
              margin-top:10px;
              background:#111827;
              color:#fff;
              border:0;
              padding:9px 15px;
              border-radius:8px;
            "
          >
            Save
          </button>

        </div>

      `).join('')}

    </div>

  `;


  document
    .querySelectorAll('.saveSite')
    .forEach(button => {

      button.onclick = async () => {

        const textarea =
          document.querySelector(
            `.siteValue[data-id="${button.dataset.id}"]`
          );

        const {
          error
        } = await sb
          .from('site_content')
          .update({
            value: textarea.value
          })
          .eq('id', button.dataset.id);

        if (error) {

          alert(error.message);

          return;

        }

        alert('Homepage content saved.');

      };

    });

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
      ascending: false
    });


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin-bottom:20px;
    ">
      Customer Enquiries
    </h2>

    <div style="
      display:grid;
      gap:15px;
    ">

      ${(data || []).map(x => `

        <article style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          background:#fff;
        ">

          <h3 style="
            margin:0 0 6px;
            font-size:19px;
          ">
            ${esc(x.name)}
          </h3>

          <div style="color:#64748b">
            ${esc(x.email)}
          </div>

          <div style="color:#64748b">
            ${esc(x.phone)}
          </div>

          ${
            Array.isArray(x.products)
              ? `
                <p>
                  <b>Products:</b>
                  ${esc(x.products.join(', '))}
                </p>
              `
              : ''
          }

          <p style="white-space:pre-wrap">
            ${esc(x.message)}
          </p>

          <select
            class="status"
            data-id="${x.id}"
            style="
              padding:9px;
              border:1px solid #ddd;
              border-radius:8px;
            "
          >

            <option
              value="new"
              ${x.status === 'new' ? 'selected' : ''}
            >
              new
            </option>

            <option
              value="contacted"
              ${x.status === 'contacted' ? 'selected' : ''}
            >
              contacted
            </option>

            <option
              value="quoted"
              ${x.status === 'quoted' ? 'selected' : ''}
            >
              quoted
            </option>

            <option
              value="closed"
              ${x.status === 'closed' ? 'selected' : ''}
            >
              closed
            </option>

            <option
              value="spam"
              ${x.status === 'spam' ? 'selected' : ''}
            >
              spam
            </option>

          </select>

        </article>

      `).join('')}

    </div>

  `;


  document
    .querySelectorAll('.status')
    .forEach(select => {

      select.onchange =
        async () => {

          const {
            error
          } = await sb
            .from('enquiries')
            .update({
              status: select.value
            })
            .eq(
              'id',
              select.dataset.id
            );

          if (error)
            alert(error.message);

        };

    });

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
      ascending: false
    });


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin-bottom:20px;
    ">
      Reviews
    </h2>

    <div style="display:grid;gap:15px">

      ${(data || []).map(x => `

        <article style="
          border:1px solid #e5e7eb;
          border-radius:14px;
          padding:18px;
          background:#fff;
        ">

          <b>
            ${esc(x.customer_name)}
          </b>

          <span>
            ·
            ${'★'.repeat(
              Math.max(0, Math.min(5, Number(x.rating || 0)))
            )}
          </span>

          <p style="white-space:pre-wrap">
            ${esc(x.message)}
          </p>

          <select
            class="rv"
            data-id="${x.id}"
            style="
              padding:9px;
              border:1px solid #ddd;
              border-radius:8px;
            "
          >

            <option
              value="pending"
              ${x.status === 'pending' ? 'selected' : ''}
            >
              pending
            </option>

            <option
              value="approved"
              ${x.status === 'approved' ? 'selected' : ''}
            >
              approved
            </option>

            <option
              value="rejected"
              ${x.status === 'rejected' ? 'selected' : ''}
            >
              rejected
            </option>

          </select>

          <button
            class="rdel"
            data-id="${x.id}"
            style="
              color:#dc2626;
              background:none;
              border:0;
              margin-left:12px;
              cursor:pointer;
            "
          >
            Delete
          </button>

        </article>

      `).join('')}

    </div>

  `;


  document
    .querySelectorAll('.rv')
    .forEach(select => {

      select.onchange =
        async () => {

          const {
            error
          } = await sb
            .from('reviews')
            .update({
              status: select.value
            })
            .eq(
              'id',
              select.dataset.id
            );

          if (error)
            alert(error.message);

        };

    });


  document
    .querySelectorAll('.rdel')
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm('Delete review?'))
          return;

        const {
          error
        } = await sb
          .from('reviews')
          .delete()
          .eq(
            'id',
            button.dataset.id
          );

        if (error) {

          alert(error.message);

          return;

        }

        render();

      };

    });

}


/* =========================
   COMPANY
========================= */

async function company() {

  const {
    data,
    error
  } = await sb
    .from('company_info')
    .select('*')
    .eq('id', 1)
    .single();


  if (error && error.code !== 'PGRST116') {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin-bottom:20px;
    ">
      Company / Contact
    </h2>

    <form
      id="co"
      style="
        display:grid;
        gap:12px;
        max-width:800px;
      "
    >

      ${
        [
          'company_name',
          'email',
          'phone',
          'whatsapp',
          'address',
          'website'
        ].map(k => `

          <input
            name="${k}"
            value="${esc(data?.[k])}"
            placeholder="${k}"
            style="
              padding:12px;
              border:1px solid #ddd;
              border-radius:10px;
            "
          >

        `).join('')
      }

      <button
        type="submit"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:13px;
          border-radius:10px;
          font-weight:700;
        "
      >
        Save Company Information
      </button>

    </form>

  `;


  $('#co').onsubmit =
    async e => {

      e.preventDefault();

      const obj =
        Object.fromEntries(
          new FormData(e.target)
        );

      const {
        error
      } = await sb
        .from('company_info')
        .update(obj)
        .eq('id', 1);

      if (error) {

        alert(error.message);

        return;

      }

      alert('Company information saved.');

    };

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
    .order('created_at', {
      ascending: false
    });


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <h2 style="
      font-size:30px;
      font-weight:800;
      margin-bottom:20px;
    ">
      PDF / Brochure / TDS / MSDS
    </h2>

    <form
      id="doc"
      style="
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:18px;
        margin-bottom:20px;
        display:grid;
        gap:12px;
        background:#fff;
      "
    >

      <input
        name="title"
        required
        placeholder="Title"
        style="
          padding:12px;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

      <select
        name="category"
        style="
          padding:12px;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

        <option value="PDF">
          PDF
        </option>

        <option value="Brochure">
          Brochure
        </option>

        <option value="TDS">
          TDS
        </option>

        <option value="MSDS">
          MSDS
        </option>

        <option value="Other">
          Other
        </option>

      </select>

      <input
        name="product_id"
        type="number"
        placeholder="Product ID (optional)"
        style="
          padding:12px;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

      <input
        name="file_url"
        required
        placeholder="Public file URL"
        style="
          padding:12px;
          border:1px solid #ddd;
          border-radius:10px;
        "
      >

      <button
        type="submit"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:13px;
          border-radius:10px;
          font-weight:700;
        "
      >
        Add Document
      </button>

    </form>


    <div style="display:grid;gap:10px">

      ${(data || []).map(x => `

        <div style="
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:14px;
          background:#fff;
          display:flex;
          justify-content:space-between;
          gap:15px;
        ">

          <span>

            <b>
              ${esc(x.title)}
            </b>

            ·

            ${esc(x.category)}

          </span>

          <button
            class="dd"
            data-id="${x.id}"
            style="
              color:#dc2626;
              background:none;
              border:0;
              cursor:pointer;
            "
          >
            Delete
          </button>

        </div>

      `).join('')}

    </div>

  `;


  $('#doc').onsubmit =
    async e => {

      e.preventDefault();

      const obj =
        Object.fromEntries(
          new FormData(e.target)
        );

      if (!obj.product_id)
        delete obj.product_id;

      else
        obj.product_id =
          Number(obj.product_id);


      const {
        error
      } = await sb
        .from('documents')
        .insert(obj);

      if (error) {

        alert(error.message);

        return;

      }

      render();

    };


  document
    .querySelectorAll('.dd')
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm('Delete this document?'))
          return;

        const {
          error
        } = await sb
          .from('documents')
          .delete()
          .eq(
            'id',
            button.dataset.id
          );

        if (error) {

          alert(error.message);

          return;

        }

        render();

      };

    });

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
    .order('created_at', {
      ascending: false
    });


  if (error) {

    $('#main').innerHTML = `
      <div style="color:#dc2626">
        ${esc(error.message)}
      </div>
    `;

    return;

  }


  $('#main').innerHTML = `

    <div style="
      display:flex;
      justify-content:space-between;
      align-items:center;
      margin-bottom:20px;
    ">

      <h2 style="
        font-size:30px;
        font-weight:800;
      ">
        Tracking
      </h2>

      <button
        id="newT"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:10px 16px;
          border-radius:10px;
        "
      >
        + Add Tracking
      </button>

    </div>


    <div
      id="te"
      class="hidden"
      style="
        border:1px solid #ddd;
        border-radius:14px;
        padding:18px;
        margin-bottom:20px;
        background:#fff;
      "
    ></div>


    <div style="display:grid;gap:10px">

      ${(data || []).map(x => `

        <div style="
          border:1px solid #e5e7eb;
          border-radius:12px;
          padding:14px;
          background:#fff;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:15px;
        ">

          <span>

            <b>
              ${esc(x.reference_no)}
            </b>

            ·

            ${esc(x.status)}

            ·

            ${esc(x.product)}

          </span>


          <span>

            <button
              class="teb"
              data-id="${x.id}"
              style="
                color:#2563eb;
                background:none;
                border:0;
                cursor:pointer;
                margin-right:10px;
              "
            >
              Edit
            </button>

            <button
              class="td"
              data-id="${x.id}"
              style="
                color:#dc2626;
                background:none;
                border:0;
                cursor:pointer;
              "
            >
              Delete
            </button>

          </span>

        </div>

      `).join('')}

    </div>

  `;


  $('#newT').onclick =
    () => trackForm({});


  document
    .querySelectorAll('.teb')
    .forEach(button => {

      button.onclick = async () => {

        const {
          data,
          error
        } = await sb
          .from('tracking')
          .select('*')
          .eq(
            'id',
            button.dataset.id
          )
          .single();

        if (error) {

          alert(error.message);

          return;

        }

        trackForm(data);

      };

    });


  document
    .querySelectorAll('.td')
    .forEach(button => {

      button.onclick = async () => {

        if (!confirm('Delete tracking record?'))
          return;

        const {
          error
        } = await sb
          .from('tracking')
          .delete()
          .eq(
            'id',
            button.dataset.id
          );

        if (error) {

          alert(error.message);

          return;

        }

        render();

      };

    });

}


/* TRACKING FORM */

function trackForm(x) {

  const editor = $('#te');

  editor.classList.remove('hidden');


  editor.innerHTML = `

    <form
      id="tf"
      style="
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(250px,1fr));
        gap:12px;
      "
    >

      ${
        [
          'id',
          'reference_no',
          'customer_name',
          'product',
          'status',
          'location',
          'eta',
          'step1',
          'step2',
          'step3',
          'step4'
        ].map(k => `

          <input
            name="${k}"
            ${k === 'id'
              ? 'type="hidden"'
              : ''}
            placeholder="${k}"
            value="${esc(x[k])}"
            ${k === 'reference_no'
              ? 'required'
              : ''}
            style="
              padding:12px;
              border:1px solid #ddd;
              border-radius:10px;
            "
          >

        `).join('')
      }


      <button
        type="submit"
        style="
          background:#111827;
          color:#fff;
          border:0;
          padding:13px;
          border-radius:10px;
          font-weight:700;
          grid-column:1/-1;
        "
      >
        Save Tracking
      </button>

    </form>

  `;


  $('#tf').onsubmit =
    async event => {

      event.preventDefault();

      const obj =
        Object.fromEntries(
          new FormData(event.target)
        );


      if (obj.id) {

        const {
          error
        } = await sb
          .from('tracking')
          .update(obj)
          .eq(
            'id',
            obj.id
          );

        if (error) {

          alert(error.message);

          return;

        }

      } else {

        delete obj.id;

        const {
          error
        } = await sb
          .from('tracking')
          .insert(obj);

        if (error) {

          alert(error.message);

          return;

        }

      }

      render();

    };

}


/* =========================
   START
========================= */

boot();
