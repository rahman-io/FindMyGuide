import { images } from '../experiences/data.js';
import { icon } from '../../components/icons.js';
import { escapeHtml } from '../../utils/html.js';

export function loginView(mode = 'login', error = '') {
  const registering = mode === 'register';
  return `<div class="app-shell auth-shell">
    <div class="auth-photo" style="background-image:url('${images.login}')"><div class="brand"><span class="brand-badge">FMG</span><span class="brand-name">FindMyGuide</span></div></div>
    <div class="auth-content">
      <h1>${registering ? 'Create your traveler account' : 'Welcome back'}</h1>
      <p class="auth-demo-notice">Demo account only. Use a test email and password; Google and Facebook buttons simulate sign-in and are not connected to those services.</p>
      <button class="auth-social" data-action="auth-demo-provider" data-value="google"><span class="google-g">G</span>Continue with Google <small>Demo</small></button>
      <button class="auth-social" data-action="auth-demo-provider" data-value="facebook"><span class="facebook-f">f</span>Continue with Facebook <small>Demo</small></button>
      <div class="or"><span>or continue with email</span></div>
      <form id="demo-auth-form" data-mode="${registering ? 'register' : 'login'}" novalidate>
        ${registering ? '<input name="name" type="text" placeholder="Full name" autocomplete="name" maxlength="80" aria-label="Full name" />' : ''}
        <input name="email" type="email" placeholder="Email address" autocomplete="email" maxlength="254" aria-label="Email address" />
        <input name="password" type="password" placeholder="${registering ? 'Create a password (8+ characters)' : 'Password'}" autocomplete="${registering ? 'new-password' : 'current-password'}" aria-label="Password" />
        ${registering ? '<input name="passwordConfirmation" type="password" placeholder="Confirm password" autocomplete="new-password" aria-label="Confirm password" />' : ''}
        ${error ? `<p class="auth-error" role="alert">${escapeHtml(error)}</p>` : ''}
        <button class="auth-submit" type="submit">${icon('mail', 20)} ${registering ? 'Create traveler account' : 'Sign in'}</button>
      </form>
      <button class="auth-mode-switch" data-action="auth-toggle-mode" data-value="${registering ? 'login' : 'register'}">${registering ? 'Already have an account? Sign in' : 'New here? Create a traveler account'}</button>
      <p>By continuing, you agree to our <u>Terms and Conditions</u> and acknowledge our <u>Privacy Policy</u>.</p>
      <label class="offer-switch"><span>Send me discounts and other offers by email. Opt out any time in your settings</span><input type="checkbox" checked /><i></i></label>
    </div></div>`;
}
