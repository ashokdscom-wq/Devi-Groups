/* =========================================================
   DEVI GROUPS ADMIN PANEL
   Supabase + Password Reset
   ========================================================= */

const SUPABASE_URL = 'https://bgkymxdbmvbplnlehakd.supabase.co';

const SUPABASE_KEY =
  'sb_publishable_J3m0j2EknLIDDQW9ZRLJ-Q_FxOlUFN7';

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function loginMessage(text, type = 'info') {
  const box = $('loginMessage');

  if (!box) return;

  box.textContent = text;

  box.className =
    'text-sm mt-4 text-center ' +
    (type === 'error'
      ? 'text-red-600'
      : type === 'success'
        ? 'text-green-600'
        : 'text-gray-600');
}

function resetMessage(text, type = 'info') {
  const box = $('resetMessage');

  if (!box) return;

  box.textContent = text;

  box.className =
    'text-sm mt-3 text-center ' +
    (type === 'error'
      ? 'text-red-600'
      : type === 'success'
        ? 'text-green-600'
        : 'text-gray-600');
}

function recoveryMessage(text, type = 'info') {
  const box = $('recoveryMessage');

  if (!box) return;

  box.textContent = text;

  box.className =
    'text-sm mt-4 text-center ' +
    (type === 'error'
      ? 'text-red-600'
      : type === 'success'
        ? 'text-green-600'
        : 'text-gray-600');
}


/* =========================================================
   ADMIN URL
   ========================================================= */

function adminUrl() {
  return window.location.origin +
    window.location.pathname.replace(/\/+$/, '') +
    '/';
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function showResetBox() {

  console.log('Forgot password clicked');

  const box = $('resetBox');

  if (!box) {
    alert('ERROR: resetBox not found in index.html');
    return;
  }

  box.classList.remove('hidden');
  box.style.display = 'block';

  const loginEmail = $('email');

  const resetEmail = $('resetEmail');

  if (
    loginEmail &&
    resetEmail &&
    loginEmail.value.trim() !== ''
  ) {
    resetEmail.value =
      loginEmail.value.trim();
  }

  resetMessage('');

  if (resetEmail) {
    setTimeout(() => {
      resetEmail.focus();
    }, 100);
  }
}


/* =========================================================
   SEND RESET EMAIL
   ========================================================= */

async function sendReset() {

  console.log('SEND RESET CLICKED');

  const emailBox = $('resetEmail');

  if (!emailBox) {
    alert('ERROR: resetEmail not found');
    return;
  }

  const email = emailBox.value.trim();

  if (!email) {
    resetMessage(
      'Please enter your admin email.',
      'error'
    );
    return;
  }

  const button =
    event?.currentTarget || null;

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  resetMessage(
    'Sending reset email...'
  );

  console.log(
    'Reset email:',
    email
  );

  console.log(
    'Redirect URL:',
    adminUrl()
  );

  try {

    const resetPromise =
      sb.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: adminUrl()
        }
      );

    const timeoutPromise =
      new Promise((_, reject) => {

        setTimeout(() => {

          reject(
            new Error(
              'Request timed out after 15 seconds. Please check Supabase Authentication settings.'
            )
          );

        }, 15000);

      });

    const result =
      await Promise.race([
        resetPromise,
        timeoutPromise
      ]);

    console.log(
      'Supabase reset response:',
      result
    );

    if (result.error) {

      console.error(
        'Supabase reset error:',
        result.error
      );

      resetMessage(
        result.error.message ||
        'Unable to send reset email.',
        'error'
      );

      return;
    }

    resetMessage(
      'Reset email sent successfully. Please check your Inbox and Spam/Junk folder.',
      'success'
    );

  } catch (error) {

    console.error(
      'RESET ERROR:',
      error
    );

    resetMessage(
      'ERROR: ' +
      (error.message || String(error)),
      'error'
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        'Send Reset Email';
    }

  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

  loginMessage(
    'Signing in...'
  );

  try {

    const {
      data,
      error
    } =
      await sb.auth.signInWithPassword({
        email: email,
        password: password
      });

    if (error) {

      console.error(
        'LOGIN ERROR:',
        error
      );

      loginMessage(
        error.message,
        'error'
      );

      return;
    }

    console.log(
      'LOGIN SUCCESS:',
      data
    );

    loginMessage(
      'Login successful.',
      'success'
    );

    showAdmin();

  } catch (error) {

    console.error(
      'LOGIN EXCEPTION:',
      error
    );

    loginMessage(
      error.message ||
      String(error),
      'error'
    );
  }
}


/* =========================================================
   SHOW ADMIN
   ========================================================= */

function showAdmin() {

  const loginPage =
    $('loginPage');

  const recoveryPage =
    $('recoveryPage');

  const adminPage =
    $('adminPage');

  if (loginPage) {
    loginPage.classList.add('hidden');
  }

  if (recoveryPage) {
    recoveryPage.classList.add('hidden');
  }

  if (adminPage) {
    adminPage.classList.remove('hidden');
  }

  console.log(
    'Admin panel displayed'
  );
}


/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {

  const loginPage =
    $('loginPage');

  const recoveryPage =
    $('recoveryPage');

  const adminPage =
    $('adminPage');

  if (loginPage) {
    loginPage.classList.remove('hidden');
  }

  if (recoveryPage) {
    recoveryPage.classList.add('hidden');
  }

  if (adminPage) {
    adminPage.classList.add('hidden');
  }
}


/* =========================================================
   PASSWORD RECOVERY PAGE
   ========================================================= */

function showRecoveryPage() {

  console.log(
    'PASSWORD RECOVERY MODE'
  );

  const loginPage =
    $('loginPage');

  const recoveryPage =
    $('recoveryPage');

  const adminPage =
    $('adminPage');

  if (loginPage) {
    loginPage.classList.add('hidden');
  }

  if (adminPage) {
    adminPage.classList.add('hidden');
  }

  if (recoveryPage) {
    recoveryPage.classList.remove('hidden');
  }

  const newPassword =
    $('newPassword');

  if (newPassword) {
    setTimeout(() => {
      newPassword.focus();
    }, 200);
  }
}


/* =========================================================
   UPDATE PASSWORD
   ========================================================= */

async function updatePassword() {

  const password =
    $('newPassword')?.value || '';

  const confirmPassword =
    $('confirmPassword')?.value || '';

  if (!password) {

    recoveryMessage(
      'Please enter a new password.',
      'error'
    );

    return;
  }

  if (password.length < 6) {

    recoveryMessage(
      'Password must be at least 6 characters.',
      'error'
    );

    return;
  }

  if (password !== confirmPassword) {

    recoveryMessage(
      'Passwords do not match.',
      'error'
    );

    return;
  }

  recoveryMessage(
    'Updating password...'
  );

  try {

    const {
      data,
      error
    } =
      await sb.auth.updateUser({
        password: password
      });

    console.log(
      'Password update:',
      data
    );

    if (error) {

      console.error(
        'PASSWORD UPDATE ERROR:',
        error
      );

      recoveryMessage(
        error.message,
        'error'
      );

      return;
    }

    recoveryMessage(
      'Password updated successfully. You can now login.',
      'success'
    );

    setTimeout(() => {

      window.location.href =
        adminUrl();

    }, 2000);

  } catch (error) {

    console.error(
      'PASSWORD UPDATE EXCEPTION:',
      error
    );

    recoveryMessage(
      error.message ||
      String(error),
      'error'
    );
  }
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {

  try {

    await sb.auth.signOut();

  } catch (error) {

    console.error(
      'Logout error:',
      error
    );

  }

  showLogin();
}


/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange(
  (event, session) => {

    console.log(
      'AUTH EVENT:',
      event
    );

    if (
      event === 'PASSWORD_RECOVERY'
    ) {

      showRecoveryPage();

      return;
    }

    if (
      session &&
      session.user
    ) {

      showAdmin();

    } else {

      showLogin();

    }

  }
);


/* =========================================================
   PAGE LOAD
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    console.log(
      'DEVI GROUPS ADMIN LOADED'
    );

    console.log(
      'Current URL:',
      window.location.href
    );

    console.log(
      'Admin URL:',
      adminUrl()
    );

    /*
      Login form
    */

    const loginForm =
      $('loginForm');

    if (loginForm) {

      loginForm.addEventListener(
        'submit',
        async (e) => {

          e.preventDefault();

          const email =
            $('email')?.value.trim();

          const password =
            $('password')?.value || '';

          if (!email || !password) {

            loginMessage(
              'Please enter email and password.',
              'error'
            );

            return;
          }

          await loginUser(
            email,
            password
          );

        }
      );

    }


    /*
      Logout
    */

    const logoutBtn =
      $('logoutBtn');

    if (logoutBtn) {

      logoutBtn.addEventListener(
        'click',
        logout
      );

    }


    /*
      Check URL for recovery
    */

    const hash =
      window.location.hash || '';

    const search =
      window.location.search || '';

    if (
      hash.includes(
        'type=recovery'
      ) ||
      search.includes(
        'type=recovery'
      )
    ) {

      console.log(
        'Recovery link detected in URL'
      );

      showRecoveryPage();

      return;
    }


    /*
      Check existing session
    */

    try {

      const {
        data,
        error
      } =
        await sb.auth.getSession();

      if (error) {

        console.error(
          'SESSION ERROR:',
          error
        );

        showLogin();

        return;
      }

      if (
        data &&
        data.session
      ) {

        console.log(
          'Existing session found'
        );

        showAdmin();

      } else {

        showLogin();

      }

    } catch (error) {

      console.error(
        'BOOT ERROR:',
        error
      );

      showLogin();
    }

  }
);


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.showResetBox =
  showResetBox;

window.sendReset =
  sendReset;

window.updatePassword =
  updatePassword;

window.loginUser =
  loginUser;

window.logout =
  logout;
/* =========================================================
   ADMIN NAVIGATION + PRODUCTS
   ========================================================= */

const adminViews = {
  dashboard: {
    title: 'Dashboard',
    html: `
      <div class="bg-white rounded-2xl shadow p-6">
        <h2 class="text-xl font-bold mb-2">DEVI GROUPS Administration</h2>
        <p class="text-gray-500">
          Select a section from the left menu.
        </p>
      </div>
    `
  }
};

function setAdminView(title, html) {
  const titleBox = document.getElementById('pageTitle');
  const app = document.getElementById('app');

  if (titleBox) titleBox.textContent = title;
  if (app) app.innerHTML = html;
}


/* =========================
   PRODUCTS
   ========================= */

async function openProducts() {

  setAdminView(
    'Products',
    `
    <div class="bg-white rounded-2xl shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold">Products</h2>
          <p class="text-gray-500">
            Manage DEVI GROUPS products.
          </p>
        </div>

        <button
          onclick="showProductForm()"
          class="bg-blue-600 text-white px-5 py-3 rounded-lg"
        >
          + Add Product
        </button>
      </div>

      <div id="productsList">
        Loading products...
      </div>
    </div>
    `
  );

  await loadProducts();
}


async function loadProducts() {

  const box = document.getElementById('productsList');

  if (!box) return;

  box.innerHTML = 'Loading products...';

  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('id', { ascending: false });

  if (error) {

    console.error('PRODUCT LOAD ERROR:', error);

    box.innerHTML = `
      <div class="text-red-600">
        Error loading products:<br>
        ${error.message}
      </div>
    `;

    return;
  }

  if (!data || data.length === 0) {

    box.innerHTML = `
      <div class="text-gray-500 py-8 text-center">
        No products found.
      </div>
    `;

    return;
  }

  box.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">

        <thead class="bg-gray-50">
          <tr>
            <th class="text-left p-4">Product</th>
            <th class="text-left p-4">Description</th>
            <th class="text-left p-4">Packing</th>
            <th class="text-left p-4">Photo</th>
            <th class="text-left p-4">Action</th>
          </tr>
        </thead>

        <tbody>

          ${data.map(product => `

            <tr class="border-t">

              <td class="p-4 font-semibold">
                ${escapeAdmin(product.name)}
              </td>

              <td class="p-4">
                ${escapeAdmin(product.description)}
              </td>

              <td class="p-4">
                ${escapeAdmin(product.packing)}
              </td>

              <td class="p-4">

                ${
                  product.image_url
                  ?
                  `<img
                    src="${escapeAdmin(product.image_url)}"
                    class="w-16 h-16 object-cover rounded-lg"
                  >`
                  :
                  `<span class="text-gray-400">No image</span>`
                }

              </td>

              <td class="p-4">

                <button
                  onclick="editProduct(${product.id})"
                  class="text-blue-600 mr-4"
                >
                  Edit
                </button>

                <button
                  onclick="removeProduct(${product.id})"
                  class="text-red-600"
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
}


/* =========================
   PRODUCT FORM
   ========================= */

function showProductForm(product = null) {

  setAdminView(
    product ? 'Edit Product' : 'Add Product',
    `
    <div class="bg-white rounded-2xl shadow p-6 max-w-3xl">

      <h2 class="text-xl font-bold mb-6">
        ${product ? 'Edit Product' : 'Add Product'}
      </h2>

      <div class="space-y-4">

        <input
          id="productName"
          class="w-full border rounded-lg px-4 py-3"
          placeholder="Product Name"
          value="${escapeAdmin(product?.name || '')}"
        >

        <textarea
          id="productDescription"
          class="w-full border rounded-lg px-4 py-3"
          rows="6"
          placeholder="Product Description"
        >${escapeAdmin(product?.description || '')}</textarea>

        <input
          id="productPacking"
          class="w-full border rounded-lg px-4 py-3"
          placeholder="Packing"
          value="${escapeAdmin(product?.packing || '')}"
        >

        <input
          id="productImage"
          class="w-full border rounded-lg px-4 py-3"
          placeholder="Photo URL"
          value="${escapeAdmin(product?.image_url || '')}"
        >

        <div class="flex gap-3">

          <button
            onclick="saveProduct(${product ? product.id : 'null'})"
            class="bg-blue-600 text-white px-6 py-3 rounded-lg"
          >
            Save Product
          </button>

          <button
            onclick="openProducts()"
            class="border px-6 py-3 rounded-lg"
          >
            Cancel
          </button>

        </div>

        <div id="productFormMessage"></div>

      </div>

    </div>
    `
  );
}


/* =========================
   EDIT PRODUCT
   ========================= */

async function editProduct(id) {

  const { data, error } = await sb
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {

    alert(error.message);
    return;

  }

  showProductForm(data);
}


/* =========================
   SAVE PRODUCT
   ========================= */

async function saveProduct(id) {

  const name =
    document.getElementById('productName')?.value.trim();

  const description =
    document.getElementById('productDescription')?.value.trim();

  const packing =
    document.getElementById('productPacking')?.value.trim();

  const image_url =
    document.getElementById('productImage')?.value.trim();

  if (!name) {

    alert('Please enter Product Name.');

    return;
  }

  const payload = {
    name: name,
    description: description,
    packing: packing,
    image_url: image_url
  };

  let result;

  if (id) {

    result = await sb
      .from('products')
      .update(payload)
      .eq('id', id);

  } else {

    result = await sb
      .from('products')
      .insert(payload);

  }

  if (result.error) {

    console.error('PRODUCT SAVE ERROR:', result.error);

    const msg =
      document.getElementById('productFormMessage');

    if (msg) {

      msg.className = 'text-red-600 mt-3';
      msg.textContent = result.error.message;

    } else {

      alert(result.error.message);

    }

    return;
  }

  alert(
    id
      ? 'Product updated successfully.'
      : 'Product added successfully.'
  );

  await openProducts();
}


/* =========================
   DELETE PRODUCT
   ========================= */

async function removeProduct(id) {

  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  const { error } = await sb
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {

    alert(error.message);
    return;

  }

  alert('Product deleted successfully.');

  await openProducts();
}


/* =========================
   HTML ESCAPE
   ========================= */

function escapeAdmin(value) {

  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}


/* =========================
   SIDEBAR BUTTONS
   ========================= */

document.addEventListener('DOMContentLoaded', () => {

  document.querySelectorAll('.navBtn').forEach(button => {

    button.addEventListener('click', () => {

      const view = button.getAttribute('data-view');

      console.log('ADMIN VIEW:', view);

      if (view === 'dashboard') {

        setAdminView(
          'Dashboard',
          `
          <div class="bg-white rounded-2xl shadow p-6">
            <h2 class="text-xl font-bold mb-2">
              DEVI GROUPS Administration
            </h2>

            <p class="text-gray-500">
              Welcome to the DEVI GROUPS Admin Panel.
            </p>
          </div>
          `
        );

      }

      else if (view === 'products') {

        openProducts();

      }

      else {

        setAdminView(
          view.charAt(0).toUpperCase() + view.slice(1),
          `
          <div class="bg-white rounded-2xl shadow p-6">
            <h2 class="text-xl font-bold mb-2">
              ${escapeAdmin(
                view.charAt(0).toUpperCase() + view.slice(1)
              )}
            </h2>

            <p class="text-gray-500">
              This section is ready for database connection.
            </p>
          </div>
          `
        );

      }

    });

  });

});


/* =========================
   GLOBAL FUNCTIONS
   ========================= */

window.openProducts = openProducts;
window.loadProducts = loadProducts;
window.showProductForm = showProductForm;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.removeProduct = removeProduct;
