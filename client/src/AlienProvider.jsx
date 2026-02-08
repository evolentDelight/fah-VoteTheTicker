import React, { createContext, useContext, useState } from 'react';

const AlienContext = createContext(null);

function AlienProviderFallback({ children }) {
  const [authToken] = useState(() => {
    // Dev: check for injected token (e.g. from Alien WebView)
    if (typeof window !== 'undefined' && window.__ALIEN_AUTH_TOKEN__) {
      return window.__ALIEN_AUTH_TOKEN__;
    }
    return null;
  });
  const isBridgeAvailable = typeof window !== 'undefined' && !!window.__ALIEN_AUTH_TOKEN__;
  return (
    <AlienContext.Provider value={{ authToken, isBridgeAvailable, contractVersion: null, ready: () => {} }}>
      {children}
    </AlienContext.Provider>
  );
}

export function useAlienFallback() {
  const ctx = useContext(AlienContext);
  return ctx || { authToken: null, isBridgeAvailable: false };
}

export function AlienProviderWrapper({ children }) {
  try {
    const { AlienProvider } = require('@alien_org/react');
    return <AlienProvider>{children}</AlienProvider>;
  } catch {
    return <AlienProviderFallback>{children}</AlienProviderFallback>;
  }
}
