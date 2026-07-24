import { useContext } from "react";
import { AuthModalContext } from "@/contexts/AuthModalContextBase";

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within <AuthModalProvider>");
  return ctx;
}
