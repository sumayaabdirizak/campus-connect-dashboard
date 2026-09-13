"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Cookies from "js-cookie";

interface User {
  email: string;
  password: string;
}

const demoUser: User = {
  email: "admin@gmail.com",
  password: "123456",
};

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { ok: boolean; msg?: string };
  register: (email: string, password: string) => { ok: boolean };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_COOKIE = "authUser";
const AUTH_DB_COOKIE = "authUserDB";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // ✅ Hydrate user from cookies (client-side only)
  useEffect(() => {
    try {
      const stored = Cookies.get(AUTH_COOKIE);
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (error) {
      console.warn("Failed to read auth cookie:", error);
    }
  }, []);

  const login = (email: string, password: string) => {
    try {
      const dbUserCookie = Cookies.get(AUTH_DB_COOKIE);
      const dbUser: User = dbUserCookie
        ? JSON.parse(dbUserCookie)
        : demoUser;

      // Seed demo user if DB not present
      if (!dbUserCookie) {
        Cookies.set(AUTH_DB_COOKIE, JSON.stringify(demoUser), {
          expires: 365,
          sameSite: "lax",
        });
      }

      if (dbUser.email === email && dbUser.password === password) {
        setUser(dbUser);
        Cookies.set(AUTH_COOKIE, JSON.stringify(dbUser), {
          expires: 7,
          sameSite: "lax",
        });
        return { ok: true };
      }

      return { ok: false, msg: "Invalid email or password" };
    } catch {
      return { ok: false, msg: "Login failed" };
    }
  };

  const register = (email: string, password: string) => {
    const newUser: User = { email, password };

    Cookies.set(AUTH_DB_COOKIE, JSON.stringify(newUser), {
      expires: 365,
      sameSite: "lax",
    });

    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    Cookies.remove(AUTH_COOKIE);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
};
