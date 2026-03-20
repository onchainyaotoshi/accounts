import { YaotoshiAuth } from '@yaotoshi/auth-sdk';

const ACCOUNTS_URL = import.meta.env.VITE_ACCOUNTS_URL || 'http://localhost:7768';
const CLIENT_ID = import.meta.env.VITE_CLIENT_ID || '';

const auth = new YaotoshiAuth({
  clientId: CLIENT_ID,
  redirectUri: `${window.location.origin}/callback`,
  postLogoutRedirectUri: window.location.origin,
  accountsUrl: ACCOUNTS_URL,
});

const $loggedOut = document.getElementById('logged-out')!;
const $loggedIn = document.getElementById('logged-in')!;
const $userData = document.getElementById('user-data')!;
const $userInfo = document.getElementById('user-info')!;
const $status = document.getElementById('status')!;
const $error = document.getElementById('error')!;

function showError(msg: string) {
  $error.textContent = msg;
  $error.style.display = 'block';
}

function showLoggedIn(user: Record<string, unknown>) {
  $loggedOut.style.display = 'none';
  $loggedIn.style.display = 'block';
  $userInfo.style.display = 'block';
  $userData.textContent = JSON.stringify(user, null, 2);
}

function showLoggedOut() {
  $loggedOut.style.display = 'block';
  $loggedIn.style.display = 'none';
}

// Handle callback
async function handleCallback() {
  $status.textContent = 'Exchanging authorization code…';
  try {
    const { user } = await auth.handleCallback();
    // Clean URL
    window.history.replaceState({}, '', '/');
    showLoggedIn(user);
    $status.textContent = '';
  } catch (err) {
    showError(`Callback failed: ${err instanceof Error ? err.message : err}`);
    $status.textContent = '';
  }
}

// Check if we're on a callback
if (window.location.pathname === '/callback' && window.location.search.includes('code=')) {
  handleCallback();
} else if (auth.isAuthenticated()) {
  // Try to load existing session
  $status.textContent = 'Loading user info…';
  auth
    .getUser()
    .then((user) => {
      showLoggedIn(user);
      $status.textContent = '';
    })
    .catch(() => {
      showLoggedOut();
      $status.textContent = '';
    });
} else {
  showLoggedOut();
}

document.getElementById('login-btn')!.addEventListener('click', () => {
  auth.login();
});

document.getElementById('logout-btn')!.addEventListener('click', () => {
  auth.logout();
});
