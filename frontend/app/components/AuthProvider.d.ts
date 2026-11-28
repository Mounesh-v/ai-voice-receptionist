import type { ReactNode } from "react";

export type PortalUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type AuthContextValue = {
  user: PortalUser | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<PortalUser>;
  signup: (details: { name: string; email: string; password: string }) => Promise<PortalUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<PortalUser | null>;
};

export function useAuth(): AuthContextValue;

declare const AuthProvider: (props: { children: ReactNode }) => ReactNode;

export default AuthProvider;
