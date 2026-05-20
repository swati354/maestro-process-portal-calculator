import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { UiPath, UiPathError } from '@uipath/uipath-typescript/core';
import type { UiPathSDKConfig } from '@uipath/uipath-typescript/core';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  sdk: UiPath;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildSdkConfig(): UiPathSDKConfig {
  const pathname = window.location.pathname.replace(/\/$/, '');
  return {
    clientId: import.meta.env.VITE_UIPATH_CLIENT_ID,
    orgName: import.meta.env.VITE_UIPATH_ORG_NAME,
    tenantName: import.meta.env.VITE_UIPATH_TENANT_NAME,
    baseUrl: import.meta.env.VITE_UIPATH_BASE_URL,
    redirectUri: `${window.location.origin}${pathname}`,
    scope: import.meta.env.VITE_UIPATH_SCOPE,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sdk] = useState<UiPath>(() => new UiPath(buildSdkConfig()));
  const didInit = useRef(false);

  useEffect(() => {
    // Guard against React Strict Mode's double-invocation in development.
    // OAuth authorization codes are single-use - calling completeOAuth() twice
    // fails the second time with "Authentication failed".
    if (didInit.current) return;
    didInit.current = true;

    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (sdk.isInOAuthCallback()) {
          await sdk.completeOAuth();
          // Strip OAuth params so a refresh does not replay the consumed code.
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        setIsAuthenticated(sdk.isAuthenticated());
      } catch (err) {
        setError(err instanceof UiPathError ? err.message : 'Authentication failed');
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [sdk]);

  const login = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await sdk.initialize();
      setIsAuthenticated(sdk.isAuthenticated());
    } catch (err) {
      setError(err instanceof UiPathError ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sdk.logout();
    setIsAuthenticated(false);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, sdk, login, logout, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
