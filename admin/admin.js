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
