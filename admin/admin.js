const cfg = window.DEVI_CMS_CONFIG;

const sb = supabase.createClient(
  cfg.supabaseUrl,
  cfg.supabaseKey
);

let currentView = "dashboard";


// =====================================================
// HELPERS
// =====================================================

function $(id) {
  return document.getElementById(id);
}

function show(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hide(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}

function msg(id, text, error = false) {
  const el = $(id);

  if (!el) return;

  el.textContent = text;
  el.className =
    "text-sm mt-3 text-center " +
    (error ? "text-red-600" : "text-green-600");
}


// =====================================================
// ADMIN URL
// =====================================================

function adminUrl() {
  return window.location.origin +
    window.location.pathname;
}


// =====================================================
// LOGIN
// =====================================================

async function login(e) {

  e.preventDefault();

  const email = $("email").value.trim();
  const password = $("password").value;

  if (!email || !password) {
    msg("loginMessage", "Enter email and password.", true);
    return;
  }

  msg("loginMessage", "Signing in...");

  const { data, error } =
    await sb.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    msg(
      "loginMessage",
      error.message,
      true
    );

    return;
  }

  if (!data.session) {

    msg(
      "loginMessage",
      "Login failed. No session created.",
      true
    );

    return;
  }

  await bootAdmin();
}


// =====================================================
// FORGOT PASSWORD
// =====================================================

function showResetBox() {

  show("resetBox");

  const email = $("email").value.trim();

  if (email) {
    $("resetEmail").value = email;
  }

  msg(
    "loginMessage",
    "Enter your email below to reset your password."
  );
}


async function sendReset() {

  const email =
    $("resetEmail").value.trim();

  if (!email) {

    msg(
      "resetMessage",
      "Please enter your email.",
      true
    );

    return;
  }

  msg(
    "resetMessage",
    "Sending reset email..."
  );

  const { error } =
    await sb.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: adminUrl()
      }
    );

  if (error) {

    msg(
      "resetMessage",
      error.message,
      true
    );

    return;
  }

  msg(
    "resetMessage",
    "Password reset email sent. Check your inbox."
  );
}


// =====================================================
// PASSWORD RECOVERY
// =====================================================

function showRecovery() {

  hide("loginPage");
  hide("adminPage");

  show("recoveryPage");
}


async function updatePassword() {

  const password =
    $("newPassword").value;

  const confirm =
    $("confirmPassword").value;

  if (!password) {

    msg(
      "recoveryMessage",
      "Enter new password.",
      true
    );

    return;
  }

  if (password.length < 6) {

    msg(
      "recoveryMessage",
      "Password must be at least 6 characters.",
      true
    );

    return;
  }

  if (password !== confirm) {

    msg(
      "recoveryMessage",
      "Passwords do not match.",
      true
    );

    return;
  }

  msg(
    "recoveryMessage",
    "Updating password..."
  );

  const { error } =
    await sb.auth.updateUser({
      password: password
    });

  if (error) {

    msg(
      "recoveryMessage",
      error.message,
      true
    );

    return;
  }

  msg(
    "recoveryMessage",
    "Password updated successfully. Redirecting..."
  );

  setTimeout(
    () => {
      window.location.href =
        adminUrl();
    },
    1500
  );
}


// =====================================================
// AUTH STATE
// =====================================================

sb.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );

    if (
      event === "PASSWORD_RECOVERY"
    ) {

      showRecovery();

      return;
    }

    if (
      session &&
      event !== "SIGNED_OUT"
    ) {

      await bootAdmin();
    }

  }
);


// =====================================================
// BOOT
// =====================================================

async function boot() {

  try {

    const {
      data: {
        session
      }
    } = await sb.auth.getSession();

    const hash =
      window.location.hash || "";

    if (
      hash.includes("type=recovery")
    ) {

      showRecovery();

      return;
    }

    if (session) {

      await bootAdmin();

    } else {

      show("loginPage");
      hide("adminPage");
      hide("recoveryPage");

    }

  } catch (err) {

    console.error(err);

    show("loginPage");

  }
}


// =====================================================
// ADMIN BOOT
// =====================================================

async function bootAdmin() {

  hide("loginPage");
  hide("recoveryPage");
  show("adminPage");

  await renderView(
    currentView
  );
}


// =====================================================
// LOGOUT
// =====================================================

async function logout() {

  await sb.auth.signOut();

  hide("adminPage");
  hide("recoveryPage");
  show("loginPage");

}


// =====================================================
// NAVIGATION
// =====================================================

async function renderView(view) {

  currentView = view;

  const titleMap = {

    dashboard: "Dashboard",
    products: "Products",
    business: "Business Units",
    homepage: "Homepage",
    enquiries: "Customer Enquiries",
    reviews: "Reviews",
    company: "Company / Contact",
    documents: "Documents",
    tracking: "Tracking"

  };

  $("pageTitle").textContent =
    titleMap[view] || "Dashboard";


  document
    .querySelectorAll(".navBtn")
    .forEach(btn => {

      btn.classList.remove(
        "bg-gray-700"
      );

      if (
        btn.dataset.view === view
      ) {

        btn.classList.add(
          "bg-gray-700"
        );

      }

    });


  if (view === "dashboard")
    return dashboard();

  if (view === "products")
    return products();

  if (view === "business")
    return business();

  if (view === "homepage")
    return homepage();

  if (view === "enquiries")
    return enquiries();

  if (view === "reviews")
    return reviews();

  if (view === "company")
    return company();

  if (view === "documents")
    return documents();

  if (view === "tracking")
    return tracking();

}


// =====================================================
// DASHBOARD
// =====================================================

async function dashboard() {

  const [
    productsResult,
    businessResult,
    enquiriesResult,
    reviewsResult
  ] = await Promise.all([

    sb.from("products")
      .select("*", {
        count: "exact",
        head: true
      }),

    sb.from("business_units")
      .select("*", {
        count: "exact",
        head: true
      }),

    sb.from("enquiries")
      .select("*", {
        count: "exact",
        head: true
      }),

    sb.from("reviews")
      .select("*", {
        count: "exact",
        head: true
      })

  ]);


  $("app").innerHTML = `

    <div class="grid md:grid-cols-4 gap-5">

      <div class="bg-white p-6 rounded-xl shadow">
        <div class="text-gray-500">Products</div>
        <div class="text-3xl font-bold mt-2">
          ${productsResult.count || 0}
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow">
        <div class="text-gray-500">Business Units</div>
        <div class="text-3xl font-bold mt-2">
          ${businessResult.count || 0}
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow">
        <div class="text-gray-500">Enquiries</div>
        <div class="text-3xl font-bold mt-2">
          ${enquiriesResult.count || 0}
        </div>
      </div>

      <div class="bg-white p-6 rounded-xl shadow">
        <div class="text-gray-500">Reviews</div>
        <div class="text-3xl font-bold mt-2">
          ${reviewsResult.count || 0}
        </div>
      </div>

    </div>

  `;

}


// =====================================================
// PRODUCTS
// =====================================================

async function products() {

  const {
    data,
    error
  } = await sb
    .from("products")
    .select("*")
    .order("id", {
      ascending: false
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <div class="flex justify-between items-center mb-5">

        <h2 class="text-xl font-bold">
          Products
        </h2>

        <button
          onclick="addProduct()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Add Product
        </button>

      </div>

      <div class="overflow-x-auto">

        <table class="w-full text-sm">

          <thead>
            <tr class="border-b">
              <th class="text-left p-3">ID</th>
              <th class="text-left p-3">Name</th>
              <th class="text-left p-3">Packing</th>
              <th class="text-left p-3">Active</th>
              <th class="text-left p-3">Action</th>
            </tr>
          </thead>

          <tbody>

            ${data.map(p => `

              <tr class="border-b">

                <td class="p-3">
                  ${p.id}
                </td>

                <td class="p-3 font-medium">
                  ${p.name || ""}
                </td>

                <td class="p-3">
                  ${p.packing || ""}
                </td>

                <td class="p-3">
                  ${p.active ? "Yes" : "No"}
                </td>

                <td class="p-3 space-x-2">

                  <button
                    onclick='editProduct(${JSON.stringify(p)})'
                    class="bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    Edit
                  </button>

                  <button
                    onclick="deleteProduct(${p.id})"
                    class="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>

                </td>

              </tr>

            `).join("")}

          </tbody>

        </table>

      </div>

    </div>

  `;

}


async function addProduct() {

  const name =
    prompt("Product name:");

  if (!name) return;

  const description =
    prompt("Description:") || "";

  const packing =
    prompt("Packing:") || "";

  const photo_url =
    prompt("Photo URL:") || "";

  const { error } =
    await sb
      .from("products")
      .insert({
        name,
        description,
        packing,
        photo_url,
        active: true
      });

  if (error) {

    alert(error.message);
    return;

  }

  await products();

}


async function editProduct(p) {

  const name =
    prompt(
      "Product name:",
      p.name || ""
    );

  if (name === null) return;

  const description =
    prompt(
      "Description:",
      p.description || ""
    );

  const packing =
    prompt(
      "Packing:",
      p.packing || ""
    );

  const photo_url =
    prompt(
      "Photo URL:",
      p.photo_url || ""
    );


  const { error } =
    await sb
      .from("products")
      .update({
        name,
        description,
        packing,
        photo_url
      })
      .eq("id", p.id);


  if (error) {

    alert(error.message);
    return;

  }

  await products();

}


async function deleteProduct(id) {

  if (
    !confirm(
      "Delete this product?"
    )
  ) return;


  const { error } =
    await sb
      .from("products")
      .delete()
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  await products();

}


// =====================================================
// BUSINESS UNITS
// =====================================================

async function business() {

  const {
    data,
    error
  } = await sb
    .from("business_units")
    .select("*")
    .order("sort_order", {
      ascending: true
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <div class="flex justify-between mb-5">

        <h2 class="text-xl font-bold">
          Business Units
        </h2>

        <button
          onclick="addBusiness()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Add
        </button>

      </div>


      ${data.map(b => `

        <div class="border-b py-4 flex justify-between">

          <div>

            <div class="font-bold">
              ${b.name || ""}
            </div>

            <div class="text-gray-500 text-sm">
              ${b.description || ""}
            </div>

          </div>

          <div class="space-x-2">

            <button
              onclick='editBusiness(${JSON.stringify(b)})'
              class="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              Edit
            </button>

            <button
              onclick="deleteBusiness('${b.id}')"
              class="bg-red-600 text-white px-3 py-1 rounded"
            >
              Delete
            </button>

          </div>

        </div>

      `).join("")}

    </div>

  `;

}


async function addBusiness() {

  const name =
    prompt("Business unit name:");

  if (!name) return;

  const description =
    prompt("Description:") || "";

  const { error } =
    await sb
      .from("business_units")
      .insert({
        name,
        description,
        active: true
      });


  if (error) {

    alert(error.message);
    return;

  }

  await business();

}


async function editBusiness(b) {

  const name =
    prompt(
      "Business unit name:",
      b.name || ""
    );

  if (name === null) return;

  const description =
    prompt(
      "Description:",
      b.description || ""
    );


  const { error } =
    await sb
      .from("business_units")
      .update({
        name,
        description
      })
      .eq("id", b.id);


  if (error) {

    alert(error.message);
    return;

  }

  await business();

}


async function deleteBusiness(id) {

  if (
    !confirm(
      "Delete this business unit?"
    )
  ) return;


  const { error } =
    await sb
      .from("business_units")
      .delete()
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  await business();

}


// =====================================================
// HOMEPAGE
// =====================================================

async function homepage() {

  const {
    data,
    error
  } = await sb
    .from("site_content")
    .select("*")
    .order("id", {
      ascending: true
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <h2 class="text-xl font-bold mb-5">
        Homepage Content
      </h2>

      ${data.map(x => `

        <div class="border-b py-4">

          <div class="font-semibold">
            ${x.key || x.section_key || ""}
          </div>

          <textarea
            id="content_${x.id}"
            class="w-full border rounded-lg p-3 mt-2"
            rows="3"
          >${x.value || x.title || ""}</textarea>

          <button
            onclick="saveContent('${x.id}')"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg mt-2"
          >
            Save
          </button>

        </div>

      `).join("")}

    </div>

  `;

}


async function saveContent(id) {

  const value =
    $("content_" + id).value;


  const { error } =
    await sb
      .from("site_content")
      .update({
        value: value
      })
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  alert("Saved.");

}


// =====================================================
// ENQUIRIES
// =====================================================

async function enquiries() {

  const {
    data,
    error
  } = await sb
    .from("enquiries")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <h2 class="text-xl font-bold mb-5">
        Customer Enquiries
      </h2>

      ${data.map(e => `

        <div class="border-b py-5">

          <div class="font-bold">
            ${e.name || ""}
          </div>

          <div class="text-sm text-gray-500">
            ${e.email || ""}
          </div>

          <div class="mt-2">
            ${e.message || e.enquiry || ""}
          </div>

          <div class="text-xs text-gray-400 mt-2">
            ${e.created_at || ""}
          </div>

        </div>

      `).join("")}

    </div>

  `;

}


// =====================================================
// REVIEWS
// =====================================================

async function reviews() {

  const {
    data,
    error
  } = await sb
    .from("reviews")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <h2 class="text-xl font-bold mb-5">
        Reviews
      </h2>

      ${data.map(r => `

        <div class="border-b py-5">

          <div class="font-bold">
            ${r.name || r.customer_name || ""}
          </div>

          <div class="mt-2">
            ${r.review || r.message || ""}
          </div>

          <div class="text-sm text-gray-500 mt-2">
            Status:
            ${r.approved ? "Approved" : "Pending"}
          </div>

          <button
            onclick="toggleReview('${r.id}', ${!r.approved})"
            class="bg-blue-600 text-white px-3 py-1 rounded mt-3"
          >
            ${r.approved ? "Hide" : "Approve"}
          </button>

        </div>

      `).join("")}

    </div>

  `;

}


async function toggleReview(id, approved) {

  const { error } =
    await sb
      .from("reviews")
      .update({
        approved
      })
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  await reviews();

}


// =====================================================
// COMPANY
// =====================================================

async function company() {

  const {
    data,
    error
  } = await sb
    .from("company_info")
    .select("*")
    .limit(1);


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  const c =
    data && data.length
      ? data[0]
      : {};


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6 max-w-3xl">

      <h2 class="text-xl font-bold mb-5">
        Company / Contact
      </h2>

      <input
        id="companyName"
        class="w-full border rounded-lg px-4 py-3 mb-3"
        placeholder="Company Name"
        value="${c.company_name || c.name || ""}"
      >

      <textarea
        id="companyAddress"
        class="w-full border rounded-lg px-4 py-3 mb-3"
        rows="3"
        placeholder="Address"
      >${c.address || ""}</textarea>

      <input
        id="companyPhone"
        class="w-full border rounded-lg px-4 py-3 mb-3"
        placeholder="Phone"
        value="${c.phone || ""}"
      >

      <input
        id="companyEmail"
        class="w-full border rounded-lg px-4 py-3 mb-3"
        placeholder="Email"
        value="${c.email || ""}"
      >

      <button
        onclick="saveCompany('${c.id || ""}')"
        class="bg-blue-600 text-white px-5 py-3 rounded-lg"
      >
        Save Changes
      </button>

    </div>

  `;

}


async function saveCompany(id) {

  const payload = {

    company_name:
      $("companyName").value,

    address:
      $("companyAddress").value,

    phone:
      $("companyPhone").value,

    email:
      $("companyEmail").value

  };


  let result;


  if (id) {

    result =
      await sb
        .from("company_info")
        .update(payload)
        .eq("id", id);

  } else {

    result =
      await sb
        .from("company_info")
        .insert(payload);

  }


  if (result.error) {

    alert(result.error.message);
    return;

  }

  alert("Company information saved.");

}


// =====================================================
// DOCUMENTS
// =====================================================

async function documents() {

  const {
    data,
    error
  } = await sb
    .from("documents")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <div class="flex justify-between mb-5">

        <h2 class="text-xl font-bold">
          Documents
        </h2>

        <button
          onclick="addDocument()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Add Document
        </button>

      </div>


      ${data.map(d => `

        <div class="border-b py-4 flex justify-between">

          <div>

            <div class="font-bold">
              ${d.title || ""}
            </div>

            <div class="text-sm text-gray-500">
              ${d.category || ""}
            </div>

          </div>

          <div class="space-x-2">

            <a
              href="${d.file_url || "#"}"
              target="_blank"
              class="bg-green-600 text-white px-3 py-1 rounded"
            >
              Open
            </a>

            <button
              onclick="deleteDocument('${d.id}')"
              class="bg-red-600 text-white px-3 py-1 rounded"
            >
              Delete
            </button>

          </div>

        </div>

      `).join("")}

    </div>

  `;

}


async function addDocument() {

  const title =
    prompt("Document title:");

  if (!title) return;

  const category =
    prompt(
      "Category: PDF / Brochure / TDS / MSDS / Other"
    );

  if (!category) return;

  const file_url =
    prompt("File URL:");

  if (!file_url) return;


  const { error } =
    await sb
      .from("documents")
      .insert({
        title,
        category,
        file_url,
        active: true
      });


  if (error) {

    alert(error.message);
    return;

  }

  await documents();

}


async function deleteDocument(id) {

  if (
    !confirm(
      "Delete this document?"
    )
  ) return;


  const { error } =
    await sb
      .from("documents")
      .delete()
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  await documents();

}


// =====================================================
// TRACKING
// =====================================================

async function tracking() {

  const {
    data,
    error
  } = await sb
    .from("tracking")
    .select("*")
    .order("created_at", {
      ascending: false
    });


  if (error) {

    $("app").innerHTML =
      `<div class="bg-white p-6 rounded-xl text-red-600">
        ${error.message}
      </div>`;

    return;
  }


  $("app").innerHTML = `

    <div class="bg-white rounded-xl shadow p-6">

      <div class="flex justify-between mb-5">

        <h2 class="text-xl font-bold">
          Tracking
        </h2>

        <button
          onclick="addTracking()"
          class="bg-blue-600 text-white px-4 py-2 rounded-lg"
        >
          + Add Tracking
        </button>

      </div>


      ${data.map(t => `

        <div class="border-b py-5">

          <div class="font-bold">
            ${t.tracking_number || t.reference_no || ""}
          </div>

          <div class="text-sm text-gray-500">
            ${t.courier || ""}
          </div>

          <div class="mt-2">
            Status:
            ${t.status || ""}
          </div>

          <button
            onclick='editTracking(${JSON.stringify(t)})'
            class="bg-yellow-500 text-white px-3 py-1 rounded mt-3"
          >
            Edit
          </button>

          <button
            onclick="deleteTracking('${t.id}')"
            class="bg-red-600 text-white px-3 py-1 rounded mt-3 ml-2"
          >
            Delete
          </button>

        </div>

      `).join("")}

    </div>

  `;

}


async function addTracking() {

  const tracking_number =
    prompt("Tracking number:");

  if (!tracking_number) return;

  const courier =
    prompt("Courier:");

  const status =
    prompt("Status:") || "Pending";


  const { error } =
    await sb
      .from("tracking")
      .insert({
        tracking_number,
        courier,
        status
      });


  if (error) {

    alert(error.message);
    return;

  }

  await tracking();

}


async function editTracking(t) {

  const tracking_number =
    prompt(
      "Tracking number:",
      t.tracking_number || ""
    );

  if (tracking_number === null)
    return;

  const courier =
    prompt(
      "Courier:",
      t.courier || ""
    );

  const status =
    prompt(
      "Status:",
      t.status || ""
    );


  const { error } =
    await sb
      .from("tracking")
      .update({
        tracking_number,
        courier,
        status
      })
      .eq("id", t.id);


  if (error) {

    alert(error.message);
    return;

  }

  await tracking();

}


async function deleteTracking(id) {

  if (
    !confirm(
      "Delete this tracking record?"
    )
  ) return;


  const { error } =
    await sb
      .from("tracking")
      .delete()
      .eq("id", id);


  if (error) {

    alert(error.message);
    return;

  }

  await tracking();

}


// =====================================================
// EVENT LISTENERS
// =====================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    $("loginForm")
      ?.addEventListener(
        "submit",
        login
      );


    $("forgotBtn")
      ?.addEventListener(
        "click",
        showResetBox
      );


    $("sendResetBtn")
      ?.addEventListener(
        "click",
        sendReset
      );


    $("updatePasswordBtn")
      ?.addEventListener(
        "click",
        updatePassword
      );


    $("logoutBtn")
      ?.addEventListener(
        "click",
        logout
      );


    document
      .querySelectorAll(".navBtn")
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            renderView(
              btn.dataset.view
            );

          }
        );

      });


    boot();

  }
);
