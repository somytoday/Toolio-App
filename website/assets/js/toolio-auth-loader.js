(() => {
  const supported = location.protocol === 'http:' || location.protocol === 'https:';
  if (supported) {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = new URL('toolio-auth.js', document.currentScript.src).href;
    document.head.appendChild(script);
    return;
  }

  const ready = Promise.resolve(null);
  window.ToolioAuth = {
    ready,
    getSession: () => null,
    getIdentity: () => null,
    isSupportedOrigin: () => false,
    subscribe(listener) {
      ready.then(() => listener({ event: 'INITIAL_SESSION', session: null }));
      return () => {};
    },
    async signInWithGoogle() {
      return { ok: false, error: 'Google sign-in requires the hosted site or a local HTTP address.' };
    },
    async signOut() {
      return { ok: false, error: 'No signed-in web session is available.' };
    },
  };
  window.dispatchEvent(new CustomEvent('toolio-auth-ready'));
})();
