async function sendReset() {
  const email = document.getElementById('email').value.trim();

  if (!email) {
    alert('Enter your email first.');
    return;
  }

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.href
  });

  if (error) {
    alert(error.message);
    return;
  }

  alert('Password reset email sent.');
}
