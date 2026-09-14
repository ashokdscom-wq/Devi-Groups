```javascript
/* =========================================================
   DEVI GROUPS ADMIN PANEL
   Supabase Connected + Password Reset Diagnostic Version
   ========================================================= */

const SUPABASE_URL = 'https://bgkymxdbmvbplnlehakd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_J3m0j2EknLIDDQW9ZRLJ-Q_FxOlUFN7';

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   BASIC HELPERS
   ========================================================= */

function $(id) {
  return document.getElementById(id);
}

function showMessage(message, type = 'info') {
  const box = $('message');

  if (!box) {
    console.log(message);
    return;
  }

  box.textContent = message;
  box.style.display = 'block';

  if (type === 'error') {
    box.style.color = '#b00020';
    box.style.background = '#ffe8e8';
  } else if (type === 'success') {
    box.style.color = '#087f23';
    box.style.background = '#e8f7ec';
  } else {
    box.style.color = '#333';
    box.style.background = '#eeeeee';
  }
}

function hideMessage() {
  const box = $('message');

  if (box) {
    box.style.display = 'none';
    box.textContent = '';
  }
}

function adminUrl() {
  return window.location.origin +
    window.location.pathname.replace(/\/+$/, '') +
    '/';
}

/* =========================================================
   PASSWORD RESET BOX
   ========================================================= */

function showResetBox() {
  const box = $('resetBox');

  if (!box) {
    alert('Reset box not found. Please check admin/index.html');
    return;
  }

  box.classList.remove('hidden');
  box.style.display = 'block';

  const loginEmail = $('email')?.value || '';

  if ($('resetEmail')) {
    $('resetEmail').value = loginEmail;
  }

  hideMessage();

  setTimeout(() => {
    $('resetEmail')?.focus();
  }, 100);
}

/* =========================================================
   SEND PASSWORD RESET EMAIL
   ========================================================= */

async function sendReset() {
  const emailInput = $('resetEmail');

  if (!emailInput) {
    showMessage('Reset email field not found.', 'error');
    return;
  }

  const email = emailInput.value.trim();

  if (!email) {
    showMessage('Please enter your admin email address.', 'error');
    emailInput.focus();
    return;
  }

  const button = $('sendResetBtn');

  if (button) {
    button.disabled = true;
    button.textContent = 'Sending...';
  }

  showMessage('Sending reset email...');

  console.log('=================================');
  console.log('DEVI PASSWORD RESET START');
  console.log('Email:', email);
  console.log('Supabase URL:', SUPABASE_URL);
  console.log('Redirect URL:', adminUrl());
  console.log('=================================');

  try {
    /*
      Timeout protection:
      If Supabase does not respond within 15 seconds,
      we show a useful error instead of staying on
      "Sending reset email..." forever.
    */

    const resetPromise = sb.auth.resetPasswordForEmail(email, {
      redirectTo: adminUrl()
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'Request timed out after 15 seconds. Supabase did not return a response.'
          )
        );
      }, 15000);
    });

    const result = await Promise.race([
      resetPromise,
      timeoutPromise
    ]);

    console.log('Supabase reset result:', result);

    if (result && result.error) {
      console.error('PASSWORD RESET ERROR:', result.error);

      showMessage(
        'Password reset failed: ' +
        (result.error.message || 'Unknown Supabase error'),
        'error'
      );

      return;
    }

    showMessage(
      'Reset email sent successfully. Please check your email inbox and Spam/Junk folder.',
      'success'
    );

    if ($('resetBox')) {
      $('resetBox').style.display = 'block';
    }

  } catch (error) {
    console.error('PASSWORD RESET EXCEPTION:', error);

    let errorText = 'Unknown error';

    if (error && error.message) {
      errorText = error.message;
    } else {
      errorText = String(error);
    }

    showMessage(
      'Password reset error: ' + errorText,
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send Reset Email';
    }
  }
}

/* =========================================================
   UPDATE PASSWORD
   ========================================================= */

async function updatePassword() {
  const passwordInput = $('newPassword');

  if (!passwordInput) {
    showMessage('New password field not found.', 'error');
    return;
  }

  const password = passwordInput.value;

  if (!password || password.length < 6) {
    showMessage(
      'Password must be at least 6 characters.',
      'error'
    );
    return;
  }

  const button = $('updatePasswordBtn');

  if (button) {
    button.disabled = true;
    button.textContent = 'Updating...';
  }

  showMessage('Updating password...');

  try {
    const { data, error } = await sb.auth.updateUser({
      password: password
    });

    console.log('Password update result:', data);

    if (error) {
      console.error('PASSWORD UPDATE ERROR:', error);

      showMessage(
        'Password update failed: ' + error.message,
        'error'
      );

      return;
    }

    showMessage(
      'Password updated successfully. You can now login with your new password.',
      'success'
    );

    passwordInput.value = '';

  } catch (error) {
    console.error('PASSWORD UPDATE EXCEPTION:', error);

    showMessage(
      'Password update error: ' +
      (error.message || String(error)),
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Update Password';
    }
  }
}

/* =========================================================
   LOGIN
   ========================================================= */

async function login() {
  const email = $('email')?.value.trim();
  const password = $('password')?.value;

  if (!email || !password) {
    showMessage(
      'Please enter email and password.',
      'error'
    );
    return;
  }

  const button = $('loginBtn');

  if (button) {
    button.disabled = true;
    button.textContent = 'Logging in...';
  }

  showMessage('Logging in...');

  try {
    const { data, error } =
      await sb.auth.signInWithPassword({
        email: email,
        password: password
      });

    console.log('Login result:', data);

    if (error) {
      console.error('LOGIN ERROR:', error);

      showMessage(
        'Login failed: ' + error.message,
        'error'
      );

      return;
    }

    showMessage(
      'Login successful.',
      'success'
    );

    setTimeout(() => {
      showDashboard();
    }, 500);

  } catch (error) {
    console.error('LOGIN EXCEPTION:', error);

    showMessage(
      'Login error: ' +
      (error.message || String(error)),
      'error'
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Login';
    }
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  await sb.auth.signOut();

  window.location.href = './';
}

/* =========================================================
   SHOW DASHBOARD
   ========================================================= */

function showDashboard() {
  const loginPage = $('loginPage');
  const dashboard = $('dashboard');

  if (loginPage) {
    loginPage.style.display = 'none';
  }

  if (dashboard) {
    dashboard.style.display = 'block';
  }
}

/* =========================================================
   SHOW LOGIN
   ========================================================= */

function showLogin() {
  const loginPage = $('loginPage');
  const dashboard = $('dashboard');

  if (dashboard) {
    dashboard.style.display = 'none';
  }

  if (loginPage) {
    loginPage.style.display = 'block';
  }
}

/* =========================================================
   PASSWORD RECOVERY DETECTION
   ========================================================= */

function isRecoveryMode() {
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  return (
    hash.includes('type=recovery') ||
    search.includes('type=recovery')
  );
}

/* =========================================================
   AUTH STATE
   ========================================================= */

sb.auth.onAuthStateChange((event, session) => {

  console.log('AUTH EVENT:', event);
  console.log('SESSION:', session);

  if (event === 'PASSWORD_RECOVERY') {

    console.log('PASSWORD RECOVERY MODE');

    showRecoveryPage();

    return;
  }

  if (session && session.user) {

    console.log(
      'Authenticated user:',
      session.user.email
    );

    if (!isRecoveryMode()) {
      showDashboard();
    }

  } else {

    if (!isRecoveryMode()) {
      showLogin();
    }
  }
});

/* =========================================================
   RECOVERY PAGE
   ========================================================= */

function showRecoveryPage() {

  const loginPage = $('loginPage');
  const dashboard = $('dashboard');
  const recoveryPage = $('recoveryPage');

  if (loginPage) {
    loginPage.style.display = 'none';
  }

  if (dashboard) {
    dashboard.style.display = 'none';
  }

  if (recoveryPage) {
    recoveryPage.style.display = 'block';
  }

  const passwordInput = $('newPassword');

  if (passwordInput) {
    passwordInput.focus();
  }
}

/* =========================================================
   BOOT
   ========================================================= */

async function boot() {

  console.log('DEVI GROUPS ADMIN BOOT');

  console.log(
    'Current URL:',
    window.location.href
  );

  console.log(
    'Admin redirect URL:',
    adminUrl()
  );

  /*
    If this is a password recovery link,
    show recovery UI.
  */

  if (isRecoveryMode()) {

    console.log(
      'Recovery URL detected.'
    );

    showRecoveryPage();

    return;
  }

  /*
    Otherwise check current session.
  */

  try {

    const { data, error } =
      await sb.auth.getSession();

    if (error) {

      console.error(
        'GET SESSION ERROR:',
        error
      );

      showLogin();

      return;
    }

    if (data.session) {

      console.log(
        'Existing session found.'
      );

      showDashboard();

    } else {

      console.log(
        'No existing session.'
      );

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

/* =========================================================
   GLOBAL BUTTON FALLBACKS
   ========================================================= */

window.showResetBox = showResetBox;
window.sendReset = sendReset;
window.updatePassword = updatePassword;
window.login = login;
window.logout = logout;

/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  'DOMContentLoaded',
  () => {
    boot();
  }
);
```
