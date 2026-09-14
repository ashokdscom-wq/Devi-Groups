/* =========================================================
   DEVI GROUPS ADMIN PANEL
   PART 1 — CONFIG + AUTH + LOGIN + LOGOUT + PASSWORD RESET
========================================================= */

const cfg = window.DEVI_CMS_CONFIG;

if (!cfg || !cfg.supabaseUrl || !cfg.supabaseKey) {
  alert("Supabase configuration not found. Check cms-config.js");
  throw new Error("DEVI_CMS_CONFIG missing");
}

const sb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseKey
);

let currentView = "dashboard";

/* =========================
   HELPERS
========================= */

const $ = (selector) =>
  document.querySelector(selector);

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (m) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[m]
  );
}

function showMessage(selector, message, type = "error") {
  const el = $(selector);
  if (!el) return;

  el.textContent = message;

  el.className =
    type === "success"
      ? "text-sm mt-3 text-emerald-600"
      : "text-sm mt-3 text-rose-600";
}


/* =========================================================
   LOGIN
========================================================= */

async function loginUser(event) {
  event.preventDefault();

  const email = $("#email")?.value?.trim();
  const password = $("#password")?.value;

  if (!email || !password) {
    showMessage(
      "#loginMsg",
      "Please enter email and password."
    );
    return;
  }

  showMessage(
    "#loginMsg",
    "Signing in...",
    "success"
  );

  const { data, error } =
    await sb.auth.signInWithPassword({
      email,
      password
    });

  if (error) {
    showMessage(
      "#loginMsg",
      error.message
    );
    return;
  }

  if (data?.session) {
    await showApp(data.session);
  }
}


/* =========================================================
   SHOW ADMIN APP
========================================================= */

async function showApp(session) {

  const login = $("#login");
  const app = $("#app");

  if (login) {
    login.classList.add("hidden");
  }

  if (app) {
    app.classList.remove("hidden");
  }

  const userEmail = $("#userEmail");

  if (userEmail) {
    userEmail.textContent =
      session?.user?.email || "";
  }

  await render();
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser() {

  const { error } =
    await sb.auth.signOut();

  if (error) {
    console.error(
      "Logout error:",
      error
    );
  }
}


/* =========================================================
   FORGOT PASSWORD BOX
========================================================= */

function showResetBox() {

  let box = document.getElementById(
    "resetBox"
  );

  if (box) {
    box.remove();
    return;
  }

  const loginForm =
    document.getElementById("loginForm");

  if (!loginForm) return;

  box = document.createElement("div");

  box.id = "resetBox";

  box.className =
    "mt-5 p-5 border rounded-2xl bg-slate-50";

  box.innerHTML = `
    <h3 class="font-bold text-lg mb-2">
      Reset Password
    </h3>

    <p class="text-sm text-slate-500 mb-4">
      Enter your admin email and we will send
      you a password reset link.
    </p>

    <input
      id="resetEmail"
      type="email"
      placeholder="Admin email"
      class="w-full border rounded-xl p-3 mb-3"
    >

    <button
      type="button"
      id="resetButton"
      class="w-full bg-slate-900 text-white rounded-xl p-3 font-bold"
    >
      Send Reset Email
    </button>

    <p
      id="resetMessage"
      class="text-sm mt-3"
    ></p>
  `;

  loginForm.parentNode.appendChild(box);

  document
    .getElementById("resetButton")
    .onclick = function () {
      sendReset(this);
    };
}


/* =========================================================
   SEND PASSWORD RESET EMAIL
========================================================= */

async function sendReset(button) {

  const email =
    document
      .getElementById("resetEmail")
      ?.value
      ?.trim();

  const message =
    document.getElementById(
      "resetMessage"
    );

  if (!email) {

    if (message) {
      message.textContent =
        "Please enter your email address.";
      message.className =
        "text-sm mt-3 text-rose-600";
    }

    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent =
      "Sending reset email...";
  }

  if (message) {
    message.textContent = "";
  }

  try {

    /*
      IMPORTANT:
      This redirect goes to the Admin Panel,
      not the public homepage.
    */

    const redirectTo =
      window.location.origin +
      window.location.pathname
        .replace(/\/?$/, "/");

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

    if (message) {
      message.textContent =
        "Reset email sent. Check your inbox.";
      message.className =
        "text-sm mt-3 text-emerald-600";
    }

  } catch (error) {

    console.error(
      "Password reset error:",
      error
    );

    if (message) {
      message.textContent =
        error.message ||
        "Failed to send reset email.";
      message.className =
        "text-sm mt-3 text-rose-600";
    }

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Send Reset Email";
    }

  }
}


/* =========================================================
   PASSWORD UPDATE
========================================================= */

async function updatePassword(event) {

  if (event) {
    event.preventDefault();
  }

  const password =
    document.getElementById(
      "newPassword"
    )?.value;

  const confirmPassword =
    document.getElementById(
      "confirmPassword"
    )?.value;

  const message =
    document.getElementById(
      "recoveryMessage"
    );

  if (!password || !confirmPassword) {

    if (message) {
      message.textContent =
        "Please enter both password fields.";
      message.className =
        "text-sm mt-3 text-rose-600";
    }

    return;
  }

  if (password.length < 6) {

    if (message) {
      message.textContent =
        "Password must be at least 6 characters.";
      message.className =
        "text-sm mt-3 text-rose-600";
    }

    return;
  }

  if (password !== confirmPassword) {

    if (message) {
      message.textContent =
        "Passwords do not match.";
      message.className =
        "text-sm mt-3 text-rose-600";
    }

    return;
  }

  if (message) {
    message.textContent =
      "Updating password...";
  }

  const { error } =
    await sb.auth.updateUser({
      password
    });

  if (error) {

    if (message) {
      message.textContent =
        error.message;
      message.className =
        "text-sm mt-3 text-rose-600";
    }

    return;
  }

  if (message) {
    message.textContent =
      "Password updated successfully. You can login now.";
    message.className =
      "text-sm mt-3 text-emerald-600";
  }

  setTimeout(() => {

    const recovery =
      document.getElementById(
        "recoveryPage"
      );

    const login =
      document.getElementById(
        "login"
      );

    if (recovery) {
      recovery.classList.add(
        "hidden"
      );
    }

    if (login) {
      login.classList.remove(
        "hidden"
      );
    }

  }, 1500);
}


/* =========================================================
   AUTH STATE
========================================================= */

async function checkAuth() {

  const {
    data: {
      session
    }
  } = await sb.auth.getSession();

  /*
    Password recovery session
  */

  if (
    window.location.hash.includes(
      "type=recovery"
    )
  ) {

    const recovery =
      document.getElementById(
        "recoveryPage"
      );

    const login =
      document.getElementById(
        "login"
      );

    const app =
      document.getElementById(
        "app"
      );

    if (login) {
      login.classList.add(
        "hidden"
      );
    }

    if (app) {
      app.classList.add(
        "hidden"
      );
    }

    if (recovery) {
      recovery.classList.remove(
        "hidden"
      );
    }

    return;
  }


  if (session) {

    await showApp(session);

  } else {

    const login =
      document.getElementById(
        "login"
      );

    const app =
      document.getElementById(
        "app"
      );

    if (login) {
      login.classList.remove(
        "hidden"
      );
    }

    if (app) {
      app.classList.add(
        "hidden"
      );
    }

  }
}


/* =========================================================
   AUTH LISTENER
========================================================= */

sb.auth.onAuthStateChange(
  async (_event, session) => {

    if (session) {
      await showApp(session);
    }

  }
);


/* =========================================================
   STARTUP
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    /*
      Login form
    */

    const loginForm =
      document.getElementById(
        "loginForm"
      );

    if (loginForm) {

      loginForm.addEventListener(
        "submit",
        loginUser
      );

    }


    /*
      Logout
    */

    const logout =
      document.getElementById(
        "logout"
      );

    if (logout) {

      logout.addEventListener(
        "click",
        logoutUser
      );

    }


    /*
      Recovery form
    */

    const recoveryForm =
      document.getElementById(
        "recoveryForm"
      );

    if (recoveryForm) {

      recoveryForm.addEventListener(
        "submit",
        updatePassword
      );

    }


    /*
      Check existing login
    */

    checkAuth();

  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   =========================================================
   These are kept global so inline buttons
   in admin/index.html can call them.
========================================================= */

window.showResetBox =
  showResetBox;

window.sendReset =
  sendReset;

window.updatePassword =
  updatePassword;

window.loginUser =
  loginUser;

window.logoutUser =
  logoutUser;


/*
   PART 1 END
*/
/* =========================================================
   PART 2 — PRODUCTS + BUSINESS UNITS
   ========================================================= */


/* =========================
   PRODUCTS
   ========================= */

async function products() {
  main.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Products</h2>
        <p>Manage website products</p>
      </div>

      <button class="btn primary" id="addProductBtn">
        + Add Product
      </button>
    </div>

    <div id="productFormWrap"></div>

    <div class="card">
      <div id="productsTable">
        Loading products...
      </div>
    </div>
  `;

  document
    .getElementById("addProductBtn")
    .addEventListener("click", () => {
      showProductForm();
    });

  await loadProducts();
}


async function loadProducts() {
  const box = document.getElementById("productsTable");

  if (!box) return;

  const { data, error } = await sb
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = `
      <div class="empty">
        No products found.
      </div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Photo</th>
            <th>Name</th>
            <th>Business Unit</th>
            <th>Packing</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          ${data.map(p => `
            <tr>

              <td>
                ${
                  p.image_url || p.photo_url
                    ? `
                      <img
                        src="${esc(p.image_url || p.photo_url)}"
                        style="
                          width:60px;
                          height:60px;
                          object-fit:contain;
                          border-radius:8px;
                          border:1px solid #ddd;
                        "
                      >
                    `
                    : `
                      <span>No image</span>
                    `
                }
              </td>

              <td>
                <strong>${esc(p.name || "")}</strong>
              </td>

              <td>
                ${esc(p.business_unit || "-")}
              </td>

              <td>
                ${esc(p.packing || "-")}
              </td>

              <td>
                ${
                  p.active === false
                    ? `<span class="badge danger">Inactive</span>`
                    : `<span class="badge success">Active</span>`
                }
              </td>

              <td>
                <button
                  class="btn small"
                  onclick="editProduct(${p.id})"
                >
                  Edit
                </button>

                <button
                  class="btn small danger"
                  onclick="deleteProduct(${p.id})"
                >
                  Delete
                </button>
              </td>

            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}


function showProductForm(product = null) {

  const wrap = document.getElementById("productFormWrap");

  if (!wrap) return;

  const isEdit = !!product;

  wrap.innerHTML = `
    <div class="card form-card">

      <div class="page-head">
        <div>
          <h3>
            ${isEdit ? "Edit Product" : "Add Product"}
          </h3>
        </div>

        <button
          class="btn"
          onclick="closeProductForm()"
        >
          Close
        </button>
      </div>

      <form id="productForm">

        <input
          type="hidden"
          id="productId"
          value="${isEdit ? esc(product.id) : ""}"
        >

        <label>Product Name</label>

        <input
          type="text"
          id="productName"
          required
          value="${isEdit ? esc(product.name || "") : ""}"
          placeholder="Product name"
        >


        <label>Business Unit</label>

        <input
          type="text"
          id="productBusinessUnit"
          value="${isEdit ? esc(product.business_unit || "") : ""}"
          placeholder="Business unit"
        >


        <label>Description</label>

        <textarea
          id="productDescription"
          rows="5"
          placeholder="Product description"
        >${isEdit ? esc(product.description || "") : ""}</textarea>


        <label>Packing</label>

        <input
          type="text"
          id="productPacking"
          value="${isEdit ? esc(product.packing || "") : ""}"
          placeholder="Example: 25 Kg Bag"
        >


        <label>Product Image URL</label>

        <input
          type="url"
          id="productImage"
          value="${isEdit ? esc(product.image_url || product.photo_url || "") : ""}"
          placeholder="https://..."
        >

        ${
          isEdit && (product.image_url || product.photo_url)
            ? `
              <div style="margin:10px 0;">
                <img
                  src="${esc(product.image_url || product.photo_url)}"
                  style="
                    max-width:180px;
                    max-height:150px;
                    object-fit:contain;
                    border:1px solid #ddd;
                    border-radius:8px;
                    padding:5px;
                  "
                >
              </div>
            `
            : ""
        }


        <label>Brochure URL</label>

        <input
          type="url"
          id="productBrochure"
          value="${isEdit ? esc(product.brochure_url || "") : ""}"
          placeholder="PDF brochure URL"
        >


        <label>Sort Order</label>

        <input
          type="number"
          id="productSort"
          value="${isEdit ? esc(product.sort_order ?? 0) : 0}"
        >


        <label class="checkbox-row">

          <input
            type="checkbox"
            id="productActive"
            ${!isEdit || product.active !== false ? "checked" : ""}
          >

          Active

        </label>


        <div style="margin-top:20px;">

          <button
            type="submit"
            class="btn primary"
          >
            ${isEdit ? "Update Product" : "Save Product"}
          </button>

        </div>

        <p id="productFormMsg"></p>

      </form>

    </div>
  `;


  document
    .getElementById("productForm")
    .addEventListener("submit", saveProduct);
}


function closeProductForm() {

  const wrap = document.getElementById("productFormWrap");

  if (wrap) {
    wrap.innerHTML = "";
  }
}


async function editProduct(id) {

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  showProductForm(data);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function saveProduct(e) {

  e.preventDefault();

  const msg = document.getElementById("productFormMsg");

  if (msg) {
    msg.textContent = "Saving...";
  }


  const id = document.getElementById("productId").value;

  const product = {
    name: document.getElementById("productName").value.trim(),

    business_unit:
      document
        .getElementById("productBusinessUnit")
        .value
        .trim(),

    description:
      document
        .getElementById("productDescription")
        .value
        .trim(),

    packing:
      document
        .getElementById("productPacking")
        .value
        .trim(),

    image_url:
      document
        .getElementById("productImage")
        .value
        .trim(),

    brochure_url:
      document
        .getElementById("productBrochure")
        .value
        .trim(),

    sort_order:
      Number(
        document
          .getElementById("productSort")
          .value || 0
      ),

    active:
      document
        .getElementById("productActive")
        .checked
  };


  let result;


  if (id) {

    result = await sb
      .from("products")
      .update(product)
      .eq("id", id);

  } else {

    result = await sb
      .from("products")
      .insert(product);

  }


  if (result.error) {

    if (msg) {
      msg.textContent =
        "Error: " + result.error.message;
    }

    return;
  }


  if (msg) {
    msg.textContent = "Saved successfully.";
  }


  closeProductForm();

  await loadProducts();
}


async function deleteProduct(id) {

  const ok = confirm(
    "Are you sure you want to delete this product?"
  );

  if (!ok) return;


  const { error } = await sb
    .from("products")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadProducts();
}


/* =========================
   BUSINESS UNITS
   ========================= */

async function units() {

  main.innerHTML = `
    <div class="page-head">

      <div>
        <h2>Business Units</h2>
        <p>Manage DEVI GROUPS business units</p>
      </div>

      <button
        class="btn primary"
        id="addUnitBtn"
      >
        + Add Business Unit
      </button>

    </div>

    <div id="unitFormWrap"></div>

    <div class="card">

      <div id="unitsTable">
        Loading business units...
      </div>

    </div>
  `;


  document
    .getElementById("addUnitBtn")
    .addEventListener(
      "click",
      () => showUnitForm()
    );


  await loadUnits();
}


async function loadUnits() {

  const box =
    document.getElementById("unitsTable");

  if (!box) return;


  const { data, error } = await sb
    .from("business_units")
    .select("*")
    .order("sort_order", {
      ascending: true
    })
    .order("id", {
      ascending: true
    });


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No business units found.
      </div>
    `;

    return;
  }


  box.innerHTML = `
    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Image</th>
            <th>Name</th>
            <th>Description</th>
            <th>Website</th>
            <th>Actions</th>
          </tr>

        </thead>


        <tbody>

          ${data.map(unit => `

            <tr>

              <td>

                ${
                  unit.image_url
                    ? `
                      <img
                        src="${esc(unit.image_url)}"
                        style="
                          width:60px;
                          height:60px;
                          object-fit:contain;
                          border-radius:8px;
                          border:1px solid #ddd;
                        "
                      >
                    `
                    : `
                      <span>No image</span>
                    `
                }

              </td>


              <td>
                <strong>
                  ${esc(unit.name || "")}
                </strong>
              </td>


              <td>
                ${esc(unit.description || "-")}
              </td>


              <td>

                ${
                  unit.website_url
                    ? `
                      <a
                        href="${esc(unit.website_url)}"
                        target="_blank"
                        rel="noopener"
                      >
                        Open
                      </a>
                    `
                    : "-"
                }

              </td>


              <td>

                <button
                  class="btn small"
                  onclick="editUnit(${unit.id})"
                >
                  Edit
                </button>


                <button
                  class="btn small danger"
                  onclick="deleteUnit(${unit.id})"
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


function showUnitForm(unit = null) {

  const wrap =
    document.getElementById("unitFormWrap");

  if (!wrap) return;


  const isEdit = !!unit;


  wrap.innerHTML = `

    <div class="card form-card">

      <div class="page-head">

        <h3>
          ${
            isEdit
              ? "Edit Business Unit"
              : "Add Business Unit"
          }
        </h3>


        <button
          class="btn"
          onclick="closeUnitForm()"
        >
          Close
        </button>

      </div>


      <form id="unitForm">


        <input
          type="hidden"
          id="unitId"
          value="${isEdit ? esc(unit.id) : ""}"
        >


        <label>Name</label>

        <input
          type="text"
          id="unitName"
          required
          value="${isEdit ? esc(unit.name || "") : ""}"
          placeholder="Business unit name"
        >


        <label>Description</label>

        <textarea
          id="unitDescription"
          rows="5"
          placeholder="Business unit description"
        >${
          isEdit
            ? esc(unit.description || "")
            : ""
        }</textarea>


        <label>Image URL</label>

        <input
          type="url"
          id="unitImage"
          value="${
            isEdit
              ? esc(unit.image_url || "")
              : ""
          }"
          placeholder="https://..."
        >


        ${
          isEdit && unit.image_url
            ? `
              <div style="margin:10px 0;">

                <img
                  src="${esc(unit.image_url)}"
                  style="
                    max-width:180px;
                    max-height:150px;
                    object-fit:contain;
                    border:1px solid #ddd;
                    border-radius:8px;
                    padding:5px;
                  "
                >

              </div>
            `
            : ""
        }


        <label>Website URL</label>

        <input
          type="url"
          id="unitWebsite"
          value="${
            isEdit
              ? esc(unit.website_url || "")
              : ""
          }"
          placeholder="https://..."
        >


        <label>Sort Order</label>

        <input
          type="number"
          id="unitSort"
          value="${
            isEdit
              ? esc(unit.sort_order ?? 0)
              : 0
          }"
        >


        <div style="margin-top:20px;">

          <button
            type="submit"
            class="btn primary"
          >
            ${
              isEdit
                ? "Update Business Unit"
                : "Save Business Unit"
            }
          </button>

        </div>


        <p id="unitFormMsg"></p>

      </form>

    </div>
  `;


  document
    .getElementById("unitForm")
    .addEventListener(
      "submit",
      saveUnit
    );
}


function closeUnitForm() {

  const wrap =
    document.getElementById("unitFormWrap");

  if (wrap) {
    wrap.innerHTML = "";
  }
}


async function editUnit(id) {

  const { data, error } = await sb
    .from("business_units")
    .select("*")
    .eq("id", id)
    .single();


  if (error) {

    alert(error.message);

    return;
  }


  showUnitForm(data);


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function saveUnit(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      "unitFormMsg"
    );


  if (msg) {
    msg.textContent = "Saving...";
  }


  const id =
    document.getElementById(
      "unitId"
    ).value;


  const unit = {

    name:
      document
        .getElementById("unitName")
        .value
        .trim(),

    description:
      document
        .getElementById("unitDescription")
        .value
        .trim(),

    image_url:
      document
        .getElementById("unitImage")
        .value
        .trim(),

    website_url:
      document
        .getElementById("unitWebsite")
        .value
        .trim(),

    sort_order:
      Number(
        document
          .getElementById("unitSort")
          .value || 0
      )

  };


  let result;


  if (id) {

    result = await sb
      .from("business_units")
      .update(unit)
      .eq("id", id);

  } else {

    result = await sb
      .from("business_units")
      .insert(unit);

  }


  if (result.error) {

    if (msg) {

      msg.textContent =
        "Error: " +
        result.error.message;

    }

    return;
  }


  if (msg) {
    msg.textContent =
      "Saved successfully.";
  }


  closeUnitForm();

  await loadUnits();
}


async function deleteUnit(id) {

  const ok = confirm(
    "Are you sure you want to delete this business unit?"
  );


  if (!ok) return;


  const { error } = await sb
    .from("business_units")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadUnits();
}


/* =========================================================
   PART 2 END
   ========================================================= */
/* =========================================================
   PART 3 — HOMEPAGE + ENQUIRIES + REVIEWS
   ========================================================= */


/* =========================
   HOMEPAGE
   ========================= */

async function homepage() {

  main.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Homepage</h2>
        <p>Manage homepage content</p>
      </div>
    </div>

    <div class="card">
      <div id="homepageContent">
        Loading homepage content...
      </div>
    </div>
  `;

  await loadHomepage();
}


async function loadHomepage() {

  const box =
    document.getElementById("homepageContent");

  if (!box) return;

  const { data, error } = await sb
    .from("site_content")
    .select("*")
    .order("id", { ascending: true });

  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No homepage content found.
      </div>
    `;

    return;
  }

  box.innerHTML = `
    <div class="table-wrap">

      <table>

        <thead>
          <tr>
            <th>Key</th>
            <th>Value</th>
            <th>Type</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(item => `

            <tr>

              <td>
                <strong>
                  ${esc(item.key || item.section_key || "")}
                </strong>
              </td>

              <td>
                <div style="
                  max-width:500px;
                  white-space:pre-wrap;
                  word-break:break-word;
                ">
                  ${esc(item.value || item.title || "")}
                </div>
              </td>

              <td>
                ${esc(item.value_type || "text")}
              </td>

              <td>

                <button
                  class="btn small"
                  onclick="editHomepage(${item.id})"
                >
                  Edit
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


async function editHomepage(id) {

  const { data, error } = await sb
    .from("site_content")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {

    alert(error.message);

    return;
  }

  showHomepageForm(data);

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


function showHomepageForm(item) {

  const wrap =
    document.getElementById("homepageContent");

  if (!wrap) return;

  const key =
    item.key ||
    item.section_key ||
    "";

  const value =
    item.value ||
    item.title ||
    "";

  wrap.innerHTML = `

    <div class="card form-card">

      <div class="page-head">

        <h3>
          Edit Homepage Content
        </h3>

        <button
          class="btn"
          onclick="loadHomepage()"
        >
          Close
        </button>

      </div>


      <form id="homepageForm">

        <label>Key</label>

        <input
          type="text"
          id="homepageKey"
          value="${esc(key)}"
          readonly
        >


        <label>Content</label>

        <textarea
          id="homepageValue"
          rows="8"
        >${esc(value)}</textarea>


        <label>Value Type</label>

        <select id="homepageType">

          <option
            value="text"
            ${
              (item.value_type || "text") === "text"
                ? "selected"
                : ""
            }
          >
            Text
          </option>

          <option
            value="image"
            ${
              item.value_type === "image"
                ? "selected"
                : ""
            }
          >
            Image
          </option>

          <option
            value="html"
            ${
              item.value_type === "html"
                ? "selected"
                : ""
            }
          >
            HTML
          </option>

        </select>


        <div style="margin-top:20px;">

          <button
            type="submit"
            class="btn primary"
          >
            Save Homepage
          </button>

        </div>


        <p id="homepageMsg"></p>

      </form>

    </div>
  `;


  document
    .getElementById("homepageForm")
    .addEventListener(
      "submit",
      saveHomepage
    );
}


async function saveHomepage(e) {

  e.preventDefault();

  const msg =
    document.getElementById(
      "homepageMsg"
    );

  if (msg) {
    msg.textContent = "Saving...";
  }


  const id =
    document.getElementById(
      "homepageForm"
    )
    ? null
    : null;


  const key =
    document
      .getElementById("homepageKey")
      .value;


  const value =
    document
      .getElementById("homepageValue")
      .value;


  const value_type =
    document
      .getElementById("homepageType")
      .value;


  const { error } = await sb
    .from("site_content")
    .update({
      value,
      value_type
    })
    .eq("key", key);


  if (error) {

    if (msg) {
      msg.textContent =
        "Error: " + error.message;
    }

    return;
  }


  if (msg) {
    msg.textContent =
      "Homepage updated successfully.";
  }


  setTimeout(
    loadHomepage,
    700
  );
}


/* =========================
   ENQUIRIES
   ========================= */

async function enquiries() {

  main.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Customer Enquiries</h2>
        <p>View and manage customer enquiries</p>
      </div>

    </div>


    <div class="card">

      <div id="enquiriesTable">
        Loading enquiries...
      </div>

    </div>
  `;


  await loadEnquiries();
}


async function loadEnquiries() {

  const box =
    document.getElementById(
      "enquiriesTable"
    );

  if (!box) return;


  const { data, error } = await sb
    .from("enquiries")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No enquiries found.
      </div>
    `;

    return;
  }


  box.innerHTML = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Products</th>
            <th>Status</th>
            <th>Action</th>
          </tr>

        </thead>


        <tbody>

          ${data.map(item => `

            <tr>

              <td>
                ${formatDate(item.created_at)}
              </td>


              <td>
                <strong>
                  ${esc(item.name || "-")}
                </strong>
              </td>


              <td>
                ${esc(item.email || "-")}
              </td>


              <td>
                ${esc(item.phone || "-")}
              </td>


              <td>
                ${formatProducts(item.products)}
              </td>


              <td>

                <select
                  onchange="
                    updateEnquiryStatus(
                      ${item.id},
                      this.value
                    )
                  "
                >

                  <option
                    value="new"
                    ${
                      item.status === "new"
                        ? "selected"
                        : ""
                    }
                  >
                    New
                  </option>

                  <option
                    value="contacted"
                    ${
                      item.status === "contacted"
                        ? "selected"
                        : ""
                    }
                  >
                    Contacted
                  </option>

                  <option
                    value="quoted"
                    ${
                      item.status === "quoted"
                        ? "selected"
                        : ""
                    }
                  >
                    Quoted
                  </option>

                  <option
                    value="closed"
                    ${
                      item.status === "closed"
                        ? "selected"
                        : ""
                    }
                  >
                    Closed
                  </option>

                  <option
                    value="spam"
                    ${
                      item.status === "spam"
                        ? "selected"
                        : ""
                    }
                  >
                    Spam
                  </option>

                </select>

              </td>


              <td>

                <button
                  class="btn small"
                  onclick="viewEnquiry(${item.id})"
                >
                  View
                </button>

                <button
                  class="btn small danger"
                  onclick="deleteEnquiry(${item.id})"
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


function formatProducts(products) {

  if (!products) return "-";

  if (Array.isArray(products)) {

    return products
      .map(x => esc(String(x)))
      .join(", ");
  }

  if (typeof products === "object") {

    return esc(
      JSON.stringify(products)
    );
  }

  return esc(String(products));
}


function formatDate(date) {

  if (!date) return "-";

  try {

    return new Date(date)
      .toLocaleString();

  } catch {

    return esc(String(date));

  }
}


async function viewEnquiry(id) {

  const { data, error } = await sb
    .from("enquiries")
    .select("*")
    .eq("id", id)
    .single();


  if (error) {

    alert(error.message);

    return;
  }


  const message =
    `
Name: ${data.name || "-"}

Email: ${data.email || "-"}

Phone: ${data.phone || "-"}

Products:
${formatProducts(data.products)}

Message:
${data.message || "-"}

Status:
${data.status || "-"}
    `;


  alert(message);
}


async function updateEnquiryStatus(
  id,
  status
) {

  const { error } = await sb
    .from("enquiries")
    .update({ status })
    .eq("id", id);


  if (error) {

    alert(
      "Status update failed: " +
      error.message
    );

    await loadEnquiries();

    return;
  }
}


async function deleteEnquiry(id) {

  const ok = confirm(
    "Are you sure you want to delete this enquiry?"
  );


  if (!ok) return;


  const { error } = await sb
    .from("enquiries")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadEnquiries();
}


/* =========================
   REVIEWS
   ========================= */

async function reviews() {

  main.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Reviews</h2>
        <p>Manage customer reviews</p>
      </div>

    </div>


    <div class="card">

      <div id="reviewsTable">
        Loading reviews...
      </div>

    </div>
  `;


  await loadReviews();
}


async function loadReviews() {

  const box =
    document.getElementById(
      "reviewsTable"
    );

  if (!box) return;


  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No reviews found.
      </div>
    `;

    return;
  }


  box.innerHTML = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Rating</th>
            <th>Review</th>
            <th>Status</th>
            <th>Action</th>
          </tr>

        </thead>


        <tbody>

          ${data.map(review => `

            <tr>

              <td>
                ${formatDate(review.created_at)}
              </td>


              <td>
                <strong>
                  ${esc(
                    review.customer_name || "-"
                  )}
                </strong>
              </td>


              <td>
                ${renderStars(review.rating)}
              </td>


              <td>

                <div style="
                  max-width:400px;
                  white-space:pre-wrap;
                ">
                  ${esc(review.message || "-")}
                </div>

              </td>


              <td>

                <select
                  onchange="
                    updateReviewStatus(
                      ${review.id},
                      this.value
                    )
                  "
                >

                  <option
                    value="pending"
                    ${
                      review.status === "pending"
                        ? "selected"
                        : ""
                    }
                  >
                    Pending
                  </option>

                  <option
                    value="approved"
                    ${
                      review.status === "approved"
                        ? "selected"
                        : ""
                    }
                  >
                    Approved
                  </option>

                  <option
                    value="rejected"
                    ${
                      review.status === "rejected"
                        ? "selected"
                        : ""
                    }
                  >
                    Rejected
                  </option>

                </select>

              </td>


              <td>

                <button
                  class="btn small danger"
                  onclick="
                    deleteReview(${review.id})
                  "
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


function renderStars(rating) {

  const n =
    Math.max(
      0,
      Math.min(
        5,
        Number(rating || 0)
      )
    );


  return `
    <span
      aria-label="${n} out of 5"
      style="font-size:18px;"
    >
      ${"★".repeat(n)}
      ${"☆".repeat(5 - n)}
    </span>
  `;
}


async function updateReviewStatus(
  id,
  status
) {

  const { error } = await sb
    .from("reviews")
    .update({ status })
    .eq("id", id);


  if (error) {

    alert(
      "Status update failed: " +
      error.message
    );

    await loadReviews();

    return;
  }
}


async function deleteReview(id) {

  const ok = confirm(
    "Are you sure you want to delete this review?"
  );


  if (!ok) return;


  const { error } = await sb
    .from("reviews")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadReviews();
}


/* =========================================================
   PART 3 END
   ========================================================= */
/* =========================================================
   PART 4 — COMPANY + DOCUMENTS + TRACKING + FINAL
   ========================================================= */


/* =========================
   COMPANY INFORMATION
   ========================= */

async function company() {

  main.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Company Information</h2>
        <p>Edit company contact details</p>
      </div>

    </div>

    <div class="card">
      <div id="companyContent">
        Loading company information...
      </div>
    </div>
  `;

  await loadCompany();
}


async function loadCompany() {

  const box =
    document.getElementById(
      "companyContent"
    );

  if (!box) return;


  const { data, error } = await sb
    .from("company_info")
    .select("*")
    .eq("id", 1)
    .maybeSingle();


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  const companyData = data || {};


  box.innerHTML = `

    <form id="companyForm">

      <label>Company Name</label>

      <input
        type="text"
        id="companyName"
        value="${esc(
          companyData.company_name || ""
        )}"
      >


      <label>Email</label>

      <input
        type="email"
        id="companyEmail"
        value="${esc(
          companyData.email || ""
        )}"
      >


      <label>Phone</label>

      <input
        type="text"
        id="companyPhone"
        value="${esc(
          companyData.phone || ""
        )}"
      >


      <label>WhatsApp</label>

      <input
        type="text"
        id="companyWhatsapp"
        value="${esc(
          companyData.whatsapp || ""
        )}"
      >


      <label>Address</label>

      <textarea
        id="companyAddress"
        rows="5"
      >${esc(
        companyData.address || ""
      )}</textarea>


      <label>Website</label>

      <input
        type="url"
        id="companyWebsite"
        value="${esc(
          companyData.website || ""
        )}"
        placeholder="https://..."
      >


      <div style="margin-top:20px;">

        <button
          type="submit"
          class="btn primary"
        >
          Save Company Information
        </button>

      </div>


      <p id="companyMsg"></p>

    </form>
  `;


  document
    .getElementById("companyForm")
    .addEventListener(
      "submit",
      saveCompany
    );
}


async function saveCompany(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      "companyMsg"
    );


  if (msg) {
    msg.textContent = "Saving...";
  }


  const companyData = {

    id: 1,

    company_name:
      document
        .getElementById("companyName")
        .value
        .trim(),

    email:
      document
        .getElementById("companyEmail")
        .value
        .trim(),

    phone:
      document
        .getElementById("companyPhone")
        .value
        .trim(),

    whatsapp:
      document
        .getElementById("companyWhatsapp")
        .value
        .trim(),

    address:
      document
        .getElementById("companyAddress")
        .value
        .trim(),

    website:
      document
        .getElementById("companyWebsite")
        .value
        .trim()

  };


  const { error } = await sb
    .from("company_info")
    .upsert(
      companyData,
      {
        onConflict: "id"
      }
    );


  if (error) {

    if (msg) {
      msg.textContent =
        "Error: " + error.message;
    }

    return;
  }


  if (msg) {
    msg.textContent =
      "Company information saved successfully.";
  }
}


/* =========================
   DOCUMENTS
   ========================= */

async function documents() {

  main.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Documents</h2>
        <p>
          Manage PDF, Brochure, TDS and MSDS files
        </p>
      </div>

      <button
        class="btn primary"
        id="addDocumentBtn"
      >
        + Add Document
      </button>

    </div>


    <div id="documentFormWrap"></div>


    <div class="card">

      <div id="documentsTable">
        Loading documents...
      </div>

    </div>
  `;


  document
    .getElementById("addDocumentBtn")
    .addEventListener(
      "click",
      () => showDocumentForm()
    );


  await loadDocuments();
}


async function loadDocuments() {

  const box =
    document.getElementById(
      "documentsTable"
    );

  if (!box) return;


  const { data, error } = await sb
    .from("documents")
    .select("*")
    .order("id", {
      ascending: false
    });


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No documents found.
      </div>
    `;

    return;
  }


  box.innerHTML = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Title</th>
            <th>Category</th>
            <th>Product ID</th>
            <th>File</th>
            <th>Action</th>
          </tr>

        </thead>


        <tbody>

          ${data.map(doc => `

            <tr>

              <td>
                <strong>
                  ${esc(doc.title || "-")}
                </strong>
              </td>


              <td>
                ${esc(doc.category || "-")}
              </td>


              <td>
                ${esc(
                  doc.product_id ?? "-"
                )}
              </td>


              <td>

                ${
                  doc.file_url
                    ? `
                      <a
                        href="${esc(doc.file_url)}"
                        target="_blank"
                        rel="noopener"
                      >
                        Open File
                      </a>
                    `
                    : "-"
                }

              </td>


              <td>

                <button
                  class="btn small"
                  onclick="
                    editDocument(${doc.id})
                  "
                >
                  Edit
                </button>


                <button
                  class="btn small danger"
                  onclick="
                    deleteDocument(${doc.id})
                  "
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


function showDocumentForm(doc = null) {

  const wrap =
    document.getElementById(
      "documentFormWrap"
    );

  if (!wrap) return;


  const isEdit = !!doc;


  wrap.innerHTML = `

    <div class="card form-card">

      <div class="page-head">

        <h3>
          ${
            isEdit
              ? "Edit Document"
              : "Add Document"
          }
        </h3>


        <button
          class="btn"
          onclick="closeDocumentForm()"
        >
          Close
        </button>

      </div>


      <form id="documentForm">


        <input
          type="hidden"
          id="documentId"
          value="${
            isEdit
              ? esc(doc.id)
              : ""
          }"
        >


        <label>Document Title</label>

        <input
          type="text"
          id="documentTitle"
          required
          value="${
            isEdit
              ? esc(doc.title || "")
              : ""
          }"
          placeholder="Example: Product Brochure"
        >


        <label>Category</label>

        <select id="documentCategory">

          <option
            value="brochure"
            ${
              doc?.category === "brochure"
                ? "selected"
                : ""
            }
          >
            Brochure
          </option>

          <option
            value="tds"
            ${
              doc?.category === "tds"
                ? "selected"
                : ""
            }
          >
            TDS
          </option>

          <option
            value="msds"
            ${
              doc?.category === "msds"
                ? "selected"
                : ""
            }
          >
            MSDS
          </option>

          <option
            value="pdf"
            ${
              doc?.category === "pdf"
                ? "selected"
                : ""
            }
          >
            PDF
          </option>

          <option
            value="other"
            ${
              doc?.category === "other"
                ? "selected"
                : ""
            }
          >
            Other
          </option>

        </select>


        <label>Product ID</label>

        <input
          type="number"
          id="documentProductId"
          value="${
            isEdit
              ? esc(doc.product_id ?? "")
              : ""
          }"
          placeholder="Optional"
        >


        <label>File URL</label>

        <input
          type="url"
          id="documentFileUrl"
          value="${
            isEdit
              ? esc(doc.file_url || "")
              : ""
          }"
          placeholder="https://..."
        >


        <div style="margin-top:20px;">

          <button
            type="submit"
            class="btn primary"
          >
            ${
              isEdit
                ? "Update Document"
                : "Save Document"
            }
          </button>

        </div>


        <p id="documentMsg"></p>

      </form>

    </div>
  `;


  document
    .getElementById("documentForm")
    .addEventListener(
      "submit",
      saveDocument
    );
}


function closeDocumentForm() {

  const wrap =
    document.getElementById(
      "documentFormWrap"
    );

  if (wrap) {
    wrap.innerHTML = "";
  }
}


async function editDocument(id) {

  const { data, error } = await sb
    .from("documents")
    .select("*")
    .eq("id", id)
    .single();


  if (error) {

    alert(error.message);

    return;
  }


  showDocumentForm(data);


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function saveDocument(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      "documentMsg"
    );


  if (msg) {
    msg.textContent = "Saving...";
  }


  const id =
    document.getElementById(
      "documentId"
    ).value;


  const productIdValue =
    document.getElementById(
      "documentProductId"
    ).value;


  const documentData = {

    title:
      document
        .getElementById("documentTitle")
        .value
        .trim(),

    category:
      document
        .getElementById("documentCategory")
        .value,

    product_id:
      productIdValue
        ? Number(productIdValue)
        : null,

    file_url:
      document
        .getElementById("documentFileUrl")
        .value
        .trim()

  };


  let result;


  if (id) {

    result = await sb
      .from("documents")
      .update(documentData)
      .eq("id", id);

  } else {

    result = await sb
      .from("documents")
      .insert(documentData);

  }


  if (result.error) {

    if (msg) {
      msg.textContent =
        "Error: " +
        result.error.message;
    }

    return;
  }


  if (msg) {
    msg.textContent =
      "Document saved successfully.";
  }


  closeDocumentForm();

  await loadDocuments();
}


async function deleteDocument(id) {

  const ok = confirm(
    "Are you sure you want to delete this document?"
  );


  if (!ok) return;


  const { error } = await sb
    .from("documents")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadDocuments();
}


/* =========================
   TRACKING
   ========================= */

async function tracking() {

  main.innerHTML = `

    <div class="page-head">

      <div>
        <h2>Tracking</h2>
        <p>Manage customer tracking information</p>
      </div>

      <button
        class="btn primary"
        id="addTrackingBtn"
      >
        + Add Tracking
      </button>

    </div>


    <div id="trackingFormWrap"></div>


    <div class="card">

      <div id="trackingTable">
        Loading tracking...
      </div>

    </div>
  `;


  document
    .getElementById("addTrackingBtn")
    .addEventListener(
      "click",
      () => showTrackingForm()
    );


  await loadTracking();
}


async function loadTracking() {

  const box =
    document.getElementById(
      "trackingTable"
    );

  if (!box) return;


  const { data, error } = await sb
    .from("tracking")
    .select("*")
    .order("id", {
      ascending: false
    });


  if (error) {

    box.innerHTML = `
      <div class="error">
        ${esc(error.message)}
      </div>
    `;

    return;
  }


  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="empty">
        No tracking records found.
      </div>
    `;

    return;
  }


  box.innerHTML = `

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
            <th>Action</th>
          </tr>

        </thead>


        <tbody>

          ${data.map(item => `

            <tr>

              <td>
                <strong>
                  ${esc(
                    item.reference_no || "-"
                  )}
                </strong>
              </td>


              <td>
                ${esc(
                  item.customer_name || "-"
                )}
              </td>


              <td>
                ${esc(
                  item.product || "-"
                )}
              </td>


              <td>
                ${esc(
                  item.status || "-"
                )}
              </td>


              <td>
                ${esc(
                  item.location || "-"
                )}
              </td>


              <td>
                ${esc(
                  item.eta || "-"
                )}
              </td>


              <td>

                <button
                  class="btn small"
                  onclick="
                    editTracking(${item.id})
                  "
                >
                  Edit
                </button>


                <button
                  class="btn small danger"
                  onclick="
                    deleteTracking(${item.id})
                  "
                >
                  Delete
                </button>

              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


function showTrackingForm(item = null) {

  const wrap =
    document.getElementById(
      "trackingFormWrap"
    );

  if (!wrap) return;


  const isEdit = !!item;


  wrap.innerHTML = `

    <div class="card form-card">

      <div class="page-head">

        <h3>
          ${
            isEdit
              ? "Edit Tracking"
              : "Add Tracking"
          }
        </h3>


        <button
          class="btn"
          onclick="closeTrackingForm()"
        >
          Close
        </button>

      </div>


      <form id="trackingForm">


        <input
          type="hidden"
          id="trackingId"
          value="${
            isEdit
              ? esc(item.id)
              : ""
          }"
        >


        <label>Reference Number</label>

        <input
          type="text"
          id="trackingReference"
          required
          value="${
            isEdit
              ? esc(item.reference_no || "")
              : ""
          }"
          placeholder="Example: DEV-1001"
        >


        <label>Customer Name</label>

        <input
          type="text"
          id="trackingCustomer"
          value="${
            isEdit
              ? esc(item.customer_name || "")
              : ""
          }"
        >


        <label>Product</label>

        <input
          type="text"
          id="trackingProduct"
          value="${
            isEdit
              ? esc(item.product || "")
              : ""
          }"
        >


        <label>Status</label>

        <input
          type="text"
          id="trackingStatus"
          value="${
            isEdit
              ? esc(item.status || "")
              : ""
          }"
          placeholder="Processing / Shipped / Delivered"
        >


        <label>Location</label>

        <input
          type="text"
          id="trackingLocation"
          value="${
            isEdit
              ? esc(item.location || "")
              : ""
          }"
        >


        <label>ETA</label>

        <input
          type="text"
          id="trackingEta"
          value="${
            isEdit
              ? esc(item.eta || "")
              : ""
          }"
          placeholder="Example: 18 Sep 2026"
        >


        <label>Step 1</label>

        <input
          type="text"
          id="trackingStep1"
          value="${
            isEdit
              ? esc(item.step1 || "")
              : ""
          }"
        >


        <label>Step 2</label>

        <input
          type="text"
          id="trackingStep2"
          value="${
            isEdit
              ? esc(item.step2 || "")
              : ""
          }"
        >


        <label>Step 3</label>

        <input
          type="text"
          id="trackingStep3"
          value="${
            isEdit
              ? esc(item.step3 || "")
              : ""
          }"
        >


        <label>Step 4</label>

        <input
          type="text"
          id="trackingStep4"
          value="${
            isEdit
              ? esc(item.step4 || "")
              : ""
          }"
        >


        <div style="margin-top:20px;">

          <button
            type="submit"
            class="btn primary"
          >
            ${
              isEdit
                ? "Update Tracking"
                : "Save Tracking"
            }
          </button>

        </div>


        <p id="trackingMsg"></p>

      </form>

    </div>
  `;


  document
    .getElementById("trackingForm")
    .addEventListener(
      "submit",
      saveTracking
    );
}


function closeTrackingForm() {

  const wrap =
    document.getElementById(
      "trackingFormWrap"
    );

  if (wrap) {
    wrap.innerHTML = "";
  }
}


async function editTracking(id) {

  const { data, error } = await sb
    .from("tracking")
    .select("*")
    .eq("id", id)
    .single();


  if (error) {

    alert(error.message);

    return;
  }


  showTrackingForm(data);


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


async function saveTracking(e) {

  e.preventDefault();


  const msg =
    document.getElementById(
      "trackingMsg"
    );


  if (msg) {
    msg.textContent = "Saving...";
  }


  const id =
    document.getElementById(
      "trackingId"
    ).value;


  const trackingData = {

    reference_no:
      document
        .getElementById(
          "trackingReference"
        )
        .value
        .trim(),

    customer_name:
      document
        .getElementById(
          "trackingCustomer"
        )
        .value
        .trim(),

    product:
      document
        .getElementById(
          "trackingProduct"
        )
        .value
        .trim(),

    status:
      document
        .getElementById(
          "trackingStatus"
        )
        .value
        .trim(),

    location:
      document
        .getElementById(
          "trackingLocation"
        )
        .value
        .trim(),

    eta:
      document
        .getElementById(
          "trackingEta"
        )
        .value
        .trim(),

    step1:
      document
        .getElementById(
          "trackingStep1"
        )
        .value
        .trim(),

    step2:
      document
        .getElementById(
          "trackingStep2"
        )
        .value
        .trim(),

    step3:
      document
        .getElementById(
          "trackingStep3"
        )
        .value
        .trim(),

    step4:
      document
        .getElementById(
          "trackingStep4"
        )
        .value
        .trim()

  };


  let result;


  if (id) {

    result = await sb
      .from("tracking")
      .update(trackingData)
      .eq("id", id);

  } else {

    result = await sb
      .from("tracking")
      .insert(trackingData);

  }


  if (result.error) {

    if (msg) {
      msg.textContent =
        "Error: " +
        result.error.message;
    }

    return;
  }


  if (msg) {
    msg.textContent =
      "Tracking saved successfully.";
  }


  closeTrackingForm();

  await loadTracking();
}


async function deleteTracking(id) {

  const ok = confirm(
    "Are you sure you want to delete this tracking record?"
  );


  if (!ok) return;


  const { error } = await sb
    .from("tracking")
    .delete()
    .eq("id", id);


  if (error) {

    alert(
      "Delete failed: " +
      error.message
    );

    return;
  }


  await loadTracking();
}


/* =========================================================
   FINAL
   ========================================================= */

console.log(
  "DEVI GROUPS ADMIN PANEL loaded successfully."
);


/* =========================================================
   PART 4 END
   ========================================================= */
