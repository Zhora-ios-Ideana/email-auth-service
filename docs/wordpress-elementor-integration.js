/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  WordPress / Elementor — Email Verification Integration
 * 
 *  Add this code to your theme's functions.php, or use a plugin like
 *  "Code Snippets" to insert it safely.
 * 
 *  Workflow:
 *    1. User submits Elementor Pro Registration form  →  /auth/register
 *    2. A verification modal appears asking for the OTP
 *    3. User submits the OTP  →  /auth/verify
 *    4. On success, the JWT is stored in localStorage and the user is
 *       redirected to their dashboard (or any page you choose).
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ════════════════════════════════════════════════════════════════════════════
//  1.  functions.php — enqueue the JS and expose the API URL to JS
// ════════════════════════════════════════════════════════════════════════════
// Paste this into your functions.php:
/*
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_script(
        'email-auth',
        get_template_directory_uri() . '/js/email-auth.js',
        ['jquery'],
        '1.0.0',
        true
    );
    wp_localize_script('email-auth', 'EmailAuth', [
        'apiBase'     => 'https://your-auth-api.com',   // ← your server URL
        'redirectUrl' => home_url('/dashboard/'),
    ]);
});
*/


// ════════════════════════════════════════════════════════════════════════════
//  2.  /wp-content/themes/your-theme/js/email-auth.js
//      (the file enqueued above)
// ════════════════════════════════════════════════════════════════════════════
(function ($) {
  'use strict';

  const API = window.EmailAuth?.apiBase || '';

  // ── Utility ────────────────────────────────────────────────────────────────
  function apiPost(endpoint, data) {
    return fetch(API + endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    }).then(r => r.json());
  }

  // ── Inject verification modal (once) ───────────────────────────────────────
  function injectModal() {
    if ($('#ea-verify-modal').length) return;
    $('body').append(`
      <div id="ea-verify-modal" style="
        display:none; position:fixed; inset:0; z-index:99999;
        background:rgba(0,0,0,.55); align-items:center; justify-content:center;">
        <div style="background:#fff;border-radius:12px;padding:40px 32px;
                    max-width:400px;width:90%;text-align:center;
                    box-shadow:0 8px 32px rgba(0,0,0,.18);">
          <h3 style="margin:0 0 8px;color:#1e1b4b;">Check your email</h3>
          <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">
            Enter the 6-digit code we just sent you.
          </p>
          <input id="ea-code-input" type="text" maxlength="6"
                 inputmode="numeric" autocomplete="one-time-code"
                 placeholder="000000"
                 style="width:100%;text-align:center;font-size:28px;
                        letter-spacing:10px;padding:12px;border:2px solid #e5e7eb;
                        border-radius:8px;outline:none;margin-bottom:16px;" />
          <p id="ea-verify-error" style="color:#dc2626;font-size:13px;min-height:20px;"></p>
          <button id="ea-verify-btn"
                  style="width:100%;background:#4f46e5;color:#fff;
                         border:none;border-radius:8px;padding:14px;
                         font-size:16px;cursor:pointer;margin-bottom:12px;">
            Verify
          </button>
          <button id="ea-resend-btn"
                  style="background:none;border:none;color:#4f46e5;
                         cursor:pointer;font-size:14px;text-decoration:underline;">
            Resend code
          </button>
          <p id="ea-resend-msg" style="color:#059669;font-size:13px;min-height:20px;"></p>
        </div>
      </div>
    `);
  }

  function showModal() {
    $('#ea-verify-modal').css('display', 'flex');
    $('#ea-code-input').val('').focus();
    $('#ea-verify-error, #ea-resend-msg').text('');
  }

  function hideModal() {
    $('#ea-verify-modal').hide();
  }

  // ── State ──────────────────────────────────────────────────────────────────
  let pendingEmail = '';

  // ── Intercept Elementor Pro registration form ──────────────────────────────
  // Adjust the selector to match your Elementor form widget's CSS ID / class.
  $(document).on('submit_success', '.elementor-form', function (e, response) {
    // Only intercept the registration form (check form name or a hidden field)
    const formName = $(this).find('[name="form_name"]').val() || '';
    if (!formName.includes('register')) return;

    // Prevent Elementor's default redirect
    e.stopImmediatePropagation();

    const email    = $(this).find('[name="email"]').val();
    const password = $(this).find('[name="password"]').val();

    pendingEmail = email;

    apiPost('/auth/register', { email, password }).then(data => {
      if (data.success) {
        injectModal();
        showModal();
      } else {
        alert(data.message || 'Registration failed.');
      }
    });

    return false;
  });

  // ── Alternatively: intercept a plain HTML/AJAX Elementor form ─────────────
  //  (Use this block if you built the form without Elementor Pro forms)
  $(document).on('click', '#register-submit-btn', function (e) {
    e.preventDefault();
    const email    = $('#register-email').val();
    const password = $('#register-password').val();
    pendingEmail   = email;

    apiPost('/auth/register', { email, password }).then(data => {
      if (data.success) {
        injectModal();
        showModal();
      } else {
        alert(data.message || 'Registration failed.');
      }
    });
  });

  // ── Verify button ──────────────────────────────────────────────────────────
  $(document).on('click', '#ea-verify-btn', function () {
    const code = $('#ea-code-input').val().trim();
    if (!code) return;

    $(this).text('Verifying…').prop('disabled', true);

    apiPost('/auth/verify', { email: pendingEmail, code }).then(data => {
      if (data.success) {
        // Persist token (or use cookies / WP session as you prefer)
        localStorage.setItem('auth_token', data.token);
        hideModal();
        window.location.href = window.EmailAuth?.redirectUrl || '/dashboard/';
      } else {
        $('#ea-verify-error').text(data.message || 'Invalid code.');
        $('#ea-verify-btn').text('Verify').prop('disabled', false);
      }
    });
  });

  // ── Resend button ──────────────────────────────────────────────────────────
  $(document).on('click', '#ea-resend-btn', function () {
    $(this).prop('disabled', true);
    apiPost('/auth/resend-code', { email: pendingEmail }).then(data => {
      $('#ea-resend-msg').text(data.message);
      setTimeout(() => {
        $('#ea-resend-btn').prop('disabled', false);
        $('#ea-resend-msg').text('');
      }, 30000); // 30-second cooldown
    });
  });

})(jQuery);
