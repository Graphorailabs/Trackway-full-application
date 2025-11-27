import { type ButtonHTMLAttributes, type PropsWithChildren } from "react";

export type ToolbarPlacement = "top" | "bottom" | "left" | "right";

export interface ToolbarProps extends PropsWithChildren {
  placement?: ToolbarPlacement;
  className?: string;
}

function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const placementStyles: Record<ToolbarPlacement, string> = {
  top: "flex h-10 items-center border-b border-white/15 px-3",
  bottom: "flex h-12 items-center border-t border-white/15 px-4",
  left: "flex w-12 flex-col items-center gap-2 border-r border-white/15 px-1.5 py-3",
  right: "flex w-12 flex-col items-center gap-2 border-l border-white/15 px-1.5 py-3",
};

export function Toolbar({ placement = "top", className, children }: ToolbarProps) {
  const base = "bg-slate-950/80 text-white backdrop-blur";
  return (
    <section className={classNames(base, placementStyles[placement], className)} data-placement={placement}>
      {children}
    </section>
  );
}

export interface ToolbarItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  label?: string;
  labelSide?: "left" | "right";
}

export function ToolbarItem({
  active = false,
  className,
  children,
  label,
  labelSide = "right",
  ...props
}: ToolbarItemProps) {
  const base = "group relative rounded-lg border px-3 py-2 text-left text-sm transition";
  const palette = active
    ? "border-emerald-300/60 bg-emerald-500/10 text-white"
    : "border-white/10 bg-white/5 text-white/80 hover:bg-white/10";

  return (
    <button type="button" className={classNames(base, palette, className)} {...props}>
      {children}
      {label ? <ToolLabel side={labelSide}>{label}</ToolLabel> : null}
      {active ? (
        <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-emerald-400/50" aria-hidden="true" />
      ) : null}
    </button>
  );
}

export function ToolLabel({ children, side = "right" }: PropsWithChildren<{ side?: "left" | "right" }>) {
  const sideClasses =
    side === "left"
      ? "right-full mr-2"
      : "left-full ml-2";
  return (
    <span
      className={
        "pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-slate-900/90 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg shadow-black/40 transition group-hover:opacity-100 " +
        sideClasses
      }
    >
      {children}
    </span>
  );
}
