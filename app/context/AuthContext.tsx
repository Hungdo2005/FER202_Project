"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: "Pro Creator" | "Free Tier";
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  signup: (name: string, email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  demoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: UserProfile = {
  id: "usr_synth_pro",
  name: "Alex Vance",
  email: "alex.vance@gesturesynth.ai",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  plan: "Pro Creator",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("gesture_synth_auth");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to read auth state", e);
    }
  }, []);

  const login = async (email: string, _pass: string): Promise<boolean> => {
    // Simulate brief network latency
    await new Promise((res) => setTimeout(res, 800));
    const loggedInUser: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: email.split("@")[0].replace(".", " ").replace(/^./, (c) => c.toUpperCase()) || "Synth User",
      email,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
      plan: "Pro Creator",
    };
    setUser(loggedInUser);
    localStorage.setItem("gesture_synth_auth", JSON.stringify(loggedInUser));
    return true;
  };

  const signup = async (name: string, email: string, _pass: string): Promise<boolean> => {
    await new Promise((res) => setTimeout(res, 900));
    const newUser: UserProfile = {
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      name: name.trim() || "Producer",
      email,
      avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
      plan: "Free Tier",
    };
    setUser(newUser);
    localStorage.setItem("gesture_synth_auth", JSON.stringify(newUser));
    return true;
  };

  const demoLogin = () => {
    setUser(DEMO_USER);
    localStorage.setItem("gesture_synth_auth", JSON.stringify(DEMO_USER));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("gesture_synth_auth");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        demoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
