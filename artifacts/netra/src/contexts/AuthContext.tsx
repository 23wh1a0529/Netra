import React, { createContext, useContext, useState, useEffect } from "react";
import { AuthResponse } from "@workspace/api-client-react";

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  role: "officer" | "admin" | null;
  officerId: string | null;
  name: string | null;
}

interface AuthContextType extends AuthState {
  login: (data: AuthResponse) => void;
  guestAdminLogin: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    const stored = localStorage.getItem("netra_auth");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return { isAuthenticated: false, token: null, role: null, officerId: null, name: null };
      }
    }
    return { isAuthenticated: false, token: null, role: null, officerId: null, name: null };
  });

  useEffect(() => {
    if (auth.isAuthenticated) {
      localStorage.setItem("netra_auth", JSON.stringify(auth));
    } else {
      localStorage.removeItem("netra_auth");
    }
  }, [auth]);

  const login = (data: AuthResponse) => {
    setAuth({
      isAuthenticated: true,
      token: data.token,
      role: data.role,
      officerId: data.officerId || null,
      name: data.name || null,
    });
  };

  const guestAdminLogin = () => {
    setAuth({
      isAuthenticated: true,
      token: "guest-admin-token",
      role: "admin",
      officerId: null,
      name: "Guest Admin",
    });
  };

  const logout = () => {
    setAuth({ isAuthenticated: false, token: null, role: null, officerId: null, name: null });
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, guestAdminLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
