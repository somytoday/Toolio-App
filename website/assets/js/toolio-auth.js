const SUPABASE_URL = 'https://bhbvzkogznvejhfrveqb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnZ6a29nem52ZWpoZnJ2ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzc3NjQsImV4cCI6MjA5ODg1Mzc2NH0.uj8yYrD-50kkb3lfmSQHs5KSL2rOMLGX92s7xePq9wE';
const AUTH_RETURN_HASH_KEY = 'toolio-auth-return-hash';

export let supabase = null;
let currentSession = null;
let registeredWebCustomerId = null;
let authAvailable = false;
const listeners = new Set();
let resolveReady;
export const ready = new Promise((resolve) => { resolveReady = resolve; });

export function isSupportedOrigin() {
  return location.protocol === 'http:' || location.protocol === 'https:';
}

export function getIdentity(session = currentSession) {
  const user = session?.user;
  if (!user) return null;
  const metadata = user.user_metadata || {};
  const email = typeof user.email === 'string' ? user.email.trim() : '';
  const providerName = metadata.full_name || metadata.name;
  const name = typeof providerName === 'string' && providerName.trim()
    ? providerName.trim()
    : (email.split('@')[0] || 'Toolio User');
  const candidateAvatar = metadata.avatar_url || metadata.picture;
  const avatarUrl = typeof candidateAvatar === 'string' && /^https?:\/\//i.test(candidateAvatar)
    ? candidateAvatar
    : '';

  return {
    id: user.id,
    email,
    name,
    avatarUrl,
    initial: (name || email || 'T').charAt(0).toUpperCase(),
  };
}

export function getSession() {
  return currentSession;
}

function restoreReturnHash() {
  try {
    const returnHash = sessionStorage.getItem(AUTH_RETURN_HASH_KEY) || '';
    sessionStorage.removeItem(AUTH_RETURN_HASH_KEY);
    if (/^#[a-z0-9-]+$/i.test(returnHash) && location.hash !== returnHash) {
      history.replaceState(null, '', `${location.pathname}${location.search}${returnHash}`);
    }
  } catch { /* Hash restoration is optional when browser storage is unavailable. */ }
}

async function registerWebCustomer(session) {
  const userId = session?.user?.id;
  if (!supabase || !userId || registeredWebCustomerId === userId) return;
  const { data, error } = await supabase.rpc('register_web_customer');
  if (!error && data?.ok) registeredWebCustomerId = userId;
}

function publish(event, session) {
  currentSession = session || null;
  if (!currentSession) registeredWebCustomerId = null;
  else registerWebCustomer(currentSession);
  for (const listener of listeners) listener({ event, session: currentSession });
  window.dispatchEvent(new CustomEvent('toolio-auth-change', { detail: { event } }));
}

export function subscribe(listener) {
  listeners.add(listener);
  ready.then(() => listener({ event: 'INITIAL_SESSION', session: currentSession }));
  return () => listeners.delete(listener);
}

export async function signInWithGoogle() {
  if (!isSupportedOrigin()) {
    return { ok: false, error: 'Google sign-in requires the hosted site or a local HTTP address.' };
  }
  await ready;
  if (!authAvailable || !supabase) {
    return { ok: false, error: 'Google sign-in is temporarily unavailable. Please try again.' };
  }

  try {
    if (/^#[a-z0-9-]+$/i.test(location.hash)) sessionStorage.setItem(AUTH_RETURN_HASH_KEY, location.hash);
    else sessionStorage.removeItem(AUTH_RETURN_HASH_KEY);
  } catch { /* OAuth still works without restoring a tab hash. */ }
  const redirectTo = `${location.origin}${location.pathname}${location.search}`;
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  return error ? { ok: false, error: 'Google sign-in could not start. Please try again.' } : { ok: true };
}

export async function signOut() {
  await ready;
  if (!supabase) return { ok: false, error: 'Sign out is temporarily unavailable.' };
  const { error } = await supabase.auth.signOut();
  return error ? { ok: false, error: 'Sign out failed. Please try again.' } : { ok: true };
}

window.ToolioAuth = {
  ready,
  getSession,
  getIdentity,
  signInWithGoogle,
  signOut,
  subscribe,
  isSupportedOrigin,
};

async function initialize() {
  if (!isSupportedOrigin()) {
    restoreReturnHash();
    resolveReady(null);
    window.dispatchEvent(new CustomEvent('toolio-auth-ready'));
    return;
  }

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.110.7');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'toolio-website-auth',
      },
    });
    const { data, error } = await supabase.auth.getSession();
    currentSession = error ? null : (data.session || null);
    authAvailable = !error;
    restoreReturnHash();
    if (currentSession) registerWebCustomer(currentSession);
    supabase.auth.onAuthStateChange((event, session) => publish(event, session));
  } catch {
    authAvailable = false;
    currentSession = null;
  }

  resolveReady(currentSession);
  window.dispatchEvent(new CustomEvent('toolio-auth-ready'));
}

initialize();
