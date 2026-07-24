import { createContext } from "react";

export interface AuthModalContextValue {
  token: string | null;
  email: string | null;
  /** Resolves immediately if already signed in; otherwise shows the sign-in
   * modal and resolves with the token on success, or rejects if the user
   * declines. Never blocks app usage on its own - callers opt in. */
  requireAuth: () => Promise<string>;
  /** Clears the current session without prompting for a new one. */
  logout: () => void;
  /** Clears the current session and immediately prompts for a new one. */
  switchAccount: () => Promise<string>;
}

export const AuthModalContext = createContext<AuthModalContextValue | null>(null);
