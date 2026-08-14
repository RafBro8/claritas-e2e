import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "../types";

const STORAGE_KEY = "claritas-identity";

export interface Identity {
  name: string;
  role: UserRole;
}

const DEFAULT_IDENTITY: Identity = { name: "", role: "Developer" };

function getInitialIdentity(): Identity {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return DEFAULT_IDENTITY;
  try {
    const parsed = JSON.parse(stored) as Partial<Identity>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : DEFAULT_IDENTITY.name,
      role: parsed.role ?? DEFAULT_IDENTITY.role,
    };
  } catch {
    return DEFAULT_IDENTITY;
  }
}

interface UserContextValue {
  identity: Identity;
  /** Not a login — just labels anything the user creates with a name/role so the team knows who to talk to. */
  setIdentity: (identity: Identity) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentityState] = useState<Identity>(getInitialIdentity);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  }, [identity]);

  return (
    <UserContext.Provider value={{ identity, setIdentity: setIdentityState }}>{children}</UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}
