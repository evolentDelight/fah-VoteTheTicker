import React, { createContext, useContext, useState } from 'react';

const AlienContext = createContext(null);

/**
 * AlienProvider for VoteTheTicker.
 * When running in Alien app: host injects JWT via window.__ALIEN_AUTH_TOKEN__.
 * Install @alien_org/react for full bridge support and replace this with AlienProvider from that package.
 */
export function AlienProvider({ children }) {
  const [authToken] = useState(
    () => (typeof window !== 'undefined' && window.__ALIEN_AUTH_TOKEN__) || null
  );
  const isBridgeAvailable = typeof window !== 'undefined' && !!window.__ALIEN_AUTH_TOKEN__;
  const value = { authToken, isBridgeAvailable, contractVersion: null, ready: () => {} };
  return <AlienContext.Provider value={value}>{children}</AlienContext.Provider>;
}

export function useAlien() {
  const ctx = useContext(AlienContext);
  return ctx || { authToken: null, isBridgeAvailable: false };
}
