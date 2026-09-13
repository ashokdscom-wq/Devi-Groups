const cfg = window.DEVI_CMS_CONFIG;

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

  $('#loginMsg').textContent = 'Signing in...';

  const {
    error
  } = await sb.auth.signInWithPassword({

    email: $('#email').value,
    password: $('#password').value

  });

  if (error) {

    $('#loginMsg').textContent =
      error.message;

  }

};


/* LOGOUT */

$('#logout').onclick = () =>
  sb.auth.signOut();


/* TABS */

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

  main.innerHTML =
    '<div class="p-10 text-center">Loading…</div>';

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
      count
    } = await sb
      .from(table)
      .select('*', {
        count: 'exact',
        head: true
      });

    nums[table] = count || 0;

  }


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-6">
      Dashboard
    </h2>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

      ${tables.map(t => `

        <div class="border rounded-2xl p-5">

          <div class="text-slate-500 uppercase text-xs font-bold">
            ${t}
          </div>

          <div class="text-4xl font-black mt-2">
            ${nums[t]}
          </div>

        </div>

      `).join('')}

    </div>
  `;

}


/* =========================
   PRODUCTS
========================= */

function formHtml(type, item = {}) {

  if (type === 'product') {

    return `

      <form
        id="editForm"
        data-type="product"
        class="space-y-3"
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
          class="w-full border rounded-xl p-3"
        >

        <input
          name="business_unit"
          required
          placeholder="Business Unit"
          value="${esc(item.business_unit || 'DEVI CHEMICALS')}"
          class="w-full border rounded-xl p-3"
        >

        <textarea
          name="description"
          placeholder="Description"
          class="w-full border rounded-xl p-3"
        >${esc(item.description)}</textarea>

        <input
          name="packing"
          placeholder="Packing"
          value="${esc(item.packing)}"
          class="w-full border rounded-xl p-3"
        >

        <input
          name="photo_url"
          placeholder="Photo URL"
          value="${esc(item.photo_url)}"
          class="w-full border rounded-xl p-3"
        >

        <input
          name="brochure_url"
          placeholder="Brochure URL"
          value="${esc(item.brochure_url)}"
          class="w-full border rounded-xl p-3"
        >

        <input
          name="sort_order"
          type="number"
          value="${item.sort_order || 0}"
          class="w-full border rounded-xl p-3"
        >

        <label class="flex gap-2">

          <input
            name="active"
            type="checkbox"
            ${item.active !== false ? 'checked' : ''}
          >

          Active

        </label>

        <button
          class="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold"
        >
          Save Product
        </button>

      </form>

    `;

  }

}


/* PRODUCT LIST */

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

    $('#main').innerHTML =
      `<p class="text-red-600">${esc(error.message)}</p>`;

    return;

  }


  $('#main').innerHTML = `

    <div class="flex justify-between items-center mb-5">

      <h2 class="text-3xl font-black">
        Products
      </h2>

      <button
        id="new"
        class="bg-slate-900 text-white px-4 py-2 rounded-xl"
      >
        + Add Product
      </button>

    </div>

    <div
      id="editor"
      class="hidden border rounded-2xl p-5 mb-5"
    ></div>

    <div class="overflow-auto">

      <table class="w-full text-sm">

        <thead>

          <tr class="text-left border-b">

            <th class="p-2">
              Product
            </th>

            <th>
              Unit
            </th>

            <th>
              Packing
            </th>

            <th>
              Active
            </th>

            <th></th>

          </tr>

        </thead>

        <tbody>

          ${(data || []).map(p => `

            <tr class="border-b">

              <td class="p-2 font-bold">
                ${esc(p.name)}
              </td>

              <td>
                ${esc(p.business_unit)}
              </td>

              <td>
                ${esc(p.packing)}
              </td>

              <td>
                ${p.active ? 'Yes' : 'No'}
              </td>

              <td class="text-right">

                <button
                  class="edit text-blue-700 mr-3"
                  data-id="${p.id}"
                >
                  Edit
                </button>

                <button
                  class="del text-rose-600"
                  data-id="${p.id}"
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
          data
        } = await sb
          .from('products')
          .select('*')
          .eq('id', button.dataset.id)
          .single();

        openProduct(data);

      };

    });


  document
    .querySelectorAll('.del')
    .forEach(button => {

      button.onclick = async () => {

        if (
          confirm('Delete this product?')
        ) {

          await sb
            .from('products')
            .delete()
            .eq('id', button.dataset.id);

          render();

        }

      };

    });

}


/* OPEN PRODUCT */

function openProduct(item) {

  const editor = $('#editor');

  editor.classList.remove('hidden');

  editor.innerHTML =
    formHtml('product', item);


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

        await sb
          .from('products')
          .update(obj)
          .eq('id', obj.id);

      } else {

        delete obj.id;

        await sb
          .from('products')
          .insert(obj);

      }

      render();

    };

}


/* =========================
   BUSINESS UNITS
========================= */

async function crudUnits() {

  const {
    data
  } = await sb
    .from('business_units')
    .select('*')
    .order('sort_order');


  $('#main').innerHTML = `

    <div class="flex justify-between items-center mb-5">

      <h2 class="text-3xl font-black">
        Business Units
      </h2>

      <button
        id="new"
        class="bg-slate-900 text-white px-4 py-2 rounded-xl"
      >
        + Add Unit
      </button>

    </div>

    <div
      id="editor"
      class="hidden border rounded-2xl p-5 mb-5"
    ></div>

    <div class="grid md:grid-cols-2 gap-4">

      ${(data || []).map(u => `

        <div class="border rounded-2xl p-4">

          <h3 class="font-black">
            ${esc(u.name)}
          </h3>

          <p class="text-sm text-slate-500 mt-1">
            ${esc(u.description)}
          </p>

          <div class="mt-3">

            <button
              class="edit text-blue-700 mr-3"
              data-id="${u.id}"
            >
              Edit
            </button>

            <button
              class="del text-rose-600"
              data-id="${u.id}"
            >
              Delete
            </button>

          </div>

        </div>

      `).join('')}

    </div>

  `;


  $('#new').onclick =
    () => openUnit({});


  document
    .querySelectorAll('.edit')
    .forEach(button => {

      button.onclick = async () => {

        const {
          data
        } = await sb
          .from('business_units')
          .select('*')
          .eq('id', button.dataset.id)
          .single();

        openUnit(data);

      };

    });


  document
    .querySelectorAll('.del')
    .forEach(button => {

      button.onclick = async () => {

        if (
          confirm('Delete this unit?')
        ) {

          await sb
            .from('business_units')
            .delete()
            .eq('id', button.dataset.id);

          render();

        }

      };

    });

}


function openUnit(x) {

  const editor = $('#editor');

  editor.classList.remove('hidden');

  editor.innerHTML = `

    <form
      id="unitForm"
      class="space-y-3"
    >

      <input
        name="id"
        type="hidden"
        value="${esc(x.id)}"
      >

      <input
        name="name"
        required
        placeholder="Unit name"
        value="${esc(x.name)}"
        class="w-full border rounded-xl p-3"
      >

      <textarea
        name="description"
        placeholder="Description"
        class="w-full border rounded-xl p-3"
      >${esc(x.description)}</textarea>

      <input
        name="image_url"
        placeholder="Image URL"
        value="${esc(x.image_url)}"
        class="w-full border rounded-xl p-3"
      >

      <input
        name="website_url"
        placeholder="Website URL"
        value="${esc(x.website_url)}"
        class="w-full border rounded-xl p-3"
      >

      <button
        class="bg-slate-900 text-white px-5 py-3 rounded-xl"
      >
        Save
      </button>

    </form>

  `;


  $('#unitForm').onsubmit =
    async event => {

      event.preventDefault();

      const obj =
        Object.fromEntries(
          new FormData(event.target)
        );


      if (obj.id) {

        await sb
          .from('business_units')
          .update(obj)
          .eq('id', obj.id);

      } else {

        delete obj.id;

        await sb
          .from('business_units')
          .insert(obj);

      }

      render();

    };

}


/* =========================
   HOMEPAGE
========================= */

async function homepage() {

  const {
    data
  } = await sb
    .from('site_content')
    .select('*')
    .order('key');


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-5">
      Homepage Content
    </h2>

    <form
      id="homeForm"
      class="space-y-4"
    >

      ${(data || []).map(x => `

        <div>

          <label
            class="text-xs font-bold uppercase"
          >
            ${esc(x.key)}
          </label>

          ${
            x.value_type === 'text'
            ? `
              <textarea
                name="${esc(x.key)}"
                class="w-full border rounded-xl p-3 mt-1"
              >${esc(x.value)}</textarea>
            `
            : `
              <input
                name="${esc(x.key)}"
                value="${esc(x.value)}"
                class="w-full border rounded-xl p-3 mt-1"
              >
            `
          }

        </div>

      `).join('')}


      <button
        class="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold"
      >
        Save Homepage
      </button>

    </form>

  `;


  $('#homeForm').onsubmit =
    async e => {

      e.preventDefault();

      for (
        const [key, value]
        of new FormData(e.target)
      ) {

        await sb
          .from('site_content')
          .upsert({
            key,
            value
          });

      }

      alert('Homepage saved.');

    };

}


/* =========================
   ENQUIRIES
========================= */

async function enquiries() {

  const {
    data
  } = await sb
    .from('enquiries')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-5">
      Customer Enquiries
    </h2>

    <div class="space-y-3">

      ${(data || []).map(x => `

        <article
          class="border rounded-2xl p-4"
        >

          <div class="flex justify-between">

            <b>
              ${esc(x.name)}
            </b>

            <span class="text-xs">
              ${new Date(
                x.created_at
              ).toLocaleString()}
            </span>

          </div>

          <p class="text-sm">
            ${esc(x.email)}
            ${x.phone
              ? ` · ${esc(x.phone)}`
              : ''}
          </p>

          <p class="mt-2">
            ${esc(x.message)}
          </p>

          <p class="text-xs mt-2">
            Products:
            ${esc(
              (x.products || []).join(', ')
            )}
          </p>

          <select
            class="status mt-3 border rounded-lg p-2"
            data-id="${x.id}"
          >

            <option
              ${x.status === 'new'
                ? 'selected'
                : ''}
            >
              new
            </option>

            <option
              ${x.status === 'contacted'
                ? 'selected'
                : ''}
            >
              contacted
            </option>

            <option
              ${x.status === 'quoted'
                ? 'selected'
                : ''}
            >
              quoted
            </option>

            <option
              ${x.status === 'closed'
                ? 'selected'
                : ''}
            >
              closed
            </option>

            <option
              ${x.status === 'spam'
                ? 'selected'
                : ''}
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

          await sb
            .from('enquiries')
            .update({
              status: select.value
            })
            .eq(
              'id',
              select.dataset.id
            );

        };

    });

}


/* =========================
   REVIEWS
========================= */

async function reviews() {

  const {
    data
  } = await sb
    .from('reviews')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-5">
      Reviews
    </h2>

    <div class="space-y-3">

      ${(data || []).map(x => `

        <article
          class="border rounded-2xl p-4"
        >

          <b>
            ${esc(x.customer_name)}
          </b>

          ·

          ${'★'.repeat(x.rating)}

          <p class="mt-2">
            ${esc(x.message)}
          </p>

          <select
            class="rv mt-3 border rounded-lg p-2"
            data-id="${x.id}"
          >

            <option
              ${x.status === 'pending'
                ? 'selected'
                : ''}
            >
              pending
            </option>

            <option
              ${x.status === 'approved'
                ? 'selected'
                : ''}
            >
              approved
            </option>

            <option
              ${x.status === 'rejected'
                ? 'selected'
                : ''}
            >
              rejected
            </option>

          </select>

          <button
            class="rdel text-rose-600 ml-3"
            data-id="${x.id}"
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

          await sb
            .from('reviews')
            .update({
              status: select.value
            })
            .eq(
              'id',
              select.dataset.id
            );

        };

    });


  document
    .querySelectorAll('.rdel')
    .forEach(button => {

      button.onclick = async () => {

        if (
          confirm('Delete review?')
        ) {

          await sb
            .from('reviews')
            .delete()
            .eq(
              'id',
              button.dataset.id
            );

          render();

        }

      };

    });

}


/* =========================
   COMPANY
========================= */

async function company() {

  const {
    data
  } = await sb
    .from('company_info')
    .select('*')
    .eq('id', 1)
    .single();


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-5">
      Company / Contact
    </h2>

    <form
      id="co"
      class="space-y-3"
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
            class="w-full border rounded-xl p-3"
          >

        `).join('')
      }

      <button
        class="bg-slate-900 text-white px-5 py-3 rounded-xl"
      >
        Save
      </button>

    </form>

  `;


  $('#co').onsubmit =
    async e => {

      e.preventDefault();

      await sb
        .from('company_info')
        .update(
          Object.fromEntries(
            new FormData(e.target)
          )
        )
        .eq('id', 1);

      alert('Saved.');

    };

}


/* =========================
   DOCUMENTS
========================= */

async function documents() {

  const {
    data
  } = await sb
    .from('documents')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  $('#main').innerHTML = `

    <h2 class="text-3xl font-black mb-5">
      PDF / Brochure / TDS / MSDS
    </h2>

    <form
      id="doc"
      class="border rounded-2xl p-4 mb-5 grid md:grid-cols-2 gap-3"
    >

      <input
        name="title"
        required
        placeholder="Title"
        class="border rounded-xl p-3"
      >

      <select
        name="category"
        class="border rounded-xl p-3"
      >

        <option>PDF</option>
        <option>Brochure</option>
        <option>TDS</option>
        <option>MSDS</option>
        <option>Other</option>

      </select>

      <input
        name="file_url"
        required
        placeholder="Public file URL"
        class="border rounded-xl p-3 md:col-span-2"
      >

      <button
        class="bg-slate-900 text-white px-5 py-3 rounded-xl md:col-span-2"
      >
        Add Document
      </button>

    </form>


    <div class="space-y-2">

      ${(data || []).map(x => `

        <div
          class="border rounded-xl p-3 flex justify-between"
        >

          <span>
            <b>${esc(x.title)}</b>
            ·
            ${esc(x.category)}
          </span>

          <button
            class="dd text-rose-600"
            data-id="${x.id}"
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

      await sb
        .from('documents')
        .insert(
          Object.fromEntries(
            new FormData(e.target)
          )
        );

      render();

    };


  document
    .querySelectorAll('.dd')
    .forEach(button => {

      button.onclick = async () => {

        await sb
          .from('documents')
          .delete()
          .eq(
            'id',
            button.dataset.id
          );

        render();

      };

    });

}


/* =========================
   TRACKING
========================= */

async function tracking() {

  const {
    data
  } = await sb
    .from('tracking')
    .select('*')
    .order('created_at', {
      ascending: false
    });


  $('#main').innerHTML = `

    <div class="flex justify-between mb-5">

      <h2 class="text-3xl font-black">
        Tracking
      </h2>

      <button
        id="newT"
        class="bg-slate-900 text-white px-4 py-2 rounded-xl"
      >
        + Add Tracking
      </button>

    </div>


    <div
      id="te"
      class="hidden border rounded-2xl p-4 mb-5"
    ></div>


    <div class="space-y-2">

      ${(data || []).map(x => `

        <div
          class="border rounded-xl p-3 flex justify-between"
        >

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
              class="teb text-blue-700 mr-3"
              data-id="${x.id}"
            >
              Edit
            </button>

            <button
              class="td text-rose-600"
              data-id="${x.id}"
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
          data
        } = await sb
          .from('tracking')
          .select('*')
          .eq(
            'id',
            button.dataset.id
          )
          .single();

        trackForm(data);

      };

    });


  document
    .querySelectorAll('.td')
    .forEach(button => {

      button.onclick = async () => {

        await sb
          .from('tracking')
          .delete()
          .eq(
            'id',
            button.dataset.id
          );

        render();

      };

    });

}


function trackForm(x) {

  const editor = $('#te');

  editor.classList.remove('hidden');


  editor.innerHTML = `

    <form
      id="tf"
      class="grid md:grid-cols-2 gap-3"
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
            class="border rounded-xl p-3"
          >

        `).join('')
      }


      <button
        class="bg-slate-900 text-white px-5 py-3 rounded-xl md:col-span-2"
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

        await sb
          .from('tracking')
          .update(obj)
          .eq('id', obj.id);

      } else {

        delete obj.id;

        await sb
          .from('tracking')
          .insert(obj);

      }

      render();

    };

}


/* START */

boot();
