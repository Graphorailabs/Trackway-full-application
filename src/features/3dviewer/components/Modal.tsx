import React from "react";
import { createPortal } from "react-dom";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullScreen?: boolean;
  title?: string;
  children?: React.ReactNode;
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18L18 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Modal({ isOpen, onClose, fullScreen = false, title, children }: ModalProps) {
  if (!isOpen) return null;

  // ensure portal target
  const root = typeof document !== "undefined" ? document.body : null;
  if (!root) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div
        className={
          "relative z-10 w-full max-w-4xl mx-4 transition-all" +
          (fullScreen
            ? " h-full max-w-none rounded-none p-4"
            : " rounded-lg bg-slate-900/90 border border-white/10 shadow-xl overflow-hidden")
        }
        role="dialog"
        aria-modal="true"
      >
        <header className={"flex items-center justify-between px-3 py-2 " + (fullScreen ? "bg-slate-950/80" : "bg-transparent") }>
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={
                "group rounded-lg border px-2 py-1 text-sm transition text-white/80 hover:bg-white/5 border-white/10 " +
                (fullScreen ? "bg-transparent" : "bg-white/5")
              }
            >
              <span className="sr-only">Close</span>
              <CloseIcon />
            </button>
          </div>
        </header>

        <div className={"p-4 " + (fullScreen ? "h-[calc(100%-48px)] overflow-auto" : "")}>{children}</div>
      </div>
    </div>,
    root
  );
}
