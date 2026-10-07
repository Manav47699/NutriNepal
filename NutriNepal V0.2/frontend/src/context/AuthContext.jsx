import { createContext, useContext, useState, useEffect } from 'react';
import apiClient, { setAuthLogoutHandler } from '../api/client';
import {
  getTokens,
  setTokens as storeTokens,
  clearTokens as removeTokens,
  getUser,
  setUser as storeUser,
  clearUser as removeUser,
} from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [tokens, setTokensState] = useState(() => getTokens());
  const [user, setUserState] = useState(() => getUser());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [hasProfile, setHasProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(() => {
    const initialTokens = getTokens();
    return Boolean(initialTokens?.access || initialTokens?.refresh);
  });

  const accessToken = tokens?.access || null;

  const logout = () => {
    removeTokens();
    removeUser();
    setTokensState({ access: null, refresh: null });
    setUserState(null);
    setIsAuthenticated(false);
    setHasProfile(null);
    setIsLoading(false);
  };

  const checkProfile = async () => {
    const currentTokens = getTokens();
    if (!currentTokens?.access && !currentTokens?.refresh) {
      logout();
      return null;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get('/api/profiles/user-profile/');
      if (response.status === 200) {
        setIsAuthenticated(true);
        setHasProfile(true);
        return true;
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setIsAuthenticated(true);
        setHasProfile(false);
        return false;
      }
      // If unrecoverable auth failure, trigger hard logout
      if (!getTokens()?.access) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = () => checkProfile();

  useEffect(() => {
    setAuthLogoutHandler(() => {
      logout();
    });

    const initialTokens = getTokens();
    if (initialTokens?.access || initialTokens?.refresh) {
      checkProfile();
    } else {
      setIsLoading(false);
      setIsAuthenticated(false);
    }
  }, []);

  const login = (newTokens, newUser = null) => {
    if (newTokens) {
      storeTokens(newTokens);
      setTokensState({
        access: newTokens.access || null,
        refresh: newTokens.refresh || null,
      });
      setIsAuthenticated(true);
    }

    if (newUser) {
      storeUser(newUser);
      setUserState(newUser);
    } else if (newUser === null) {
      removeUser();
      setUserState(null);
    }

    // Trigger profile check on login
    if (newTokens?.access) {
      checkProfile();
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated,
    isLoading,
    hasProfile,
    isProfileLoading: isLoading,
    checkProfile,
    refreshProfile,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
