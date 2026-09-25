"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Printer, Trash2, X } from "lucide-react";
import type { ActionState } from "@/lib/actions/helpers";

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const inputCls =
  "w-full px-3.5 py-2.5 bg-vault border border-edge rounded-xl text-sm font-semibold text-ink placeholder:text-mut/50 outline-none focus:border-gold transition-colors";
export const labelCls = "block text-[10px] font-bold text-mut uppercase tracking-widest mb-1.5";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "appearance-none", props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={2} {...props} className={cx(inputCls, props.className)} />;
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
const btnVariants: Record<string, string> = {
  gold: "bg-gold text-vault hover:bg-goldsoft shadow-lg shadow-gold/20",
  ghost: "bg-panel2 text-ink border border-edge hover:border-gold/50",
  danger: "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20",
  subtle: "text-mut hover:text-ink",
};
const btnSizes: Record<string, string> = {
  md: "px-4 py-2.5 text-sm",
  sm: "px-3 py-2 text-xs",
  icon: "p-2 text-xs",
};

export function Button({
  variant = "gold", size = "md", full, className, type = "button", ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string; full?: boolean }) {
  return (
    <button
      type={type}
      {...props}
      className={cx(btnBase, btnVariants[variant] ?? btnVariants.gold, btnSizes[size] ?? btnSizes.md, full && "w-full", className)}
    />
  );
}

export function SubmitBtn({ label, pendingLabel, full, variant = "gold" }: {
  label: string; pendingLabel?: string; full?: boolean; variant?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending} className={cx(full && "w-full")}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? pendingLabel || "Saving…" : label}
    </Button>
  );
}

export function Msg({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p className={cx(
      "text-xs font-bold px-3 py-2 rounded-lg border",
      state.ok
        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
        : "text-red-400 bg-red-500/10 border-red-500/30",
    )}>
      {state.message}
    </p>
  );
}

export function Card({ title, actions, children, className }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cx("bg-panel border border-edge rounded-2xl", className)}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-edge">
          <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

const badgeTones: Record<string, string> = {
  gold: "bg-gold/10 text-gold border-gold/25",
  sky: "bg-sky/10 text-sky border-sky/25",
  green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
  red: "bg-red-500/10 text-red-400 border-red-500/25",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/25",
  grey: "bg-panel2 text-mut border-edge",
};

export function Badge({ tone = "grey", children }: { tone?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider whitespace-nowrap", badgeTones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="text-xs font-semibold text-mut mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ icon, label, value, sub, tone = "gold" }: {
  icon: ReactNode; label: string; value: ReactNode; sub?: string; tone?: string;
}) {
  const toneCls: Record<string, string> = {
    gold: "text-gold bg-gold/10 border-gold/20",
    sky: "text-sky bg-sky/10 border-sky/20",
    green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    red: "text-red-400 bg-red-500/10 border-red-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    grey: "text-mut bg-white/5 border-edge",
  };
  const cls = toneCls[tone] ?? toneCls.gold;
  return (
    <div className="bg-panel border border-edge rounded-2xl p-4 flex items-start gap-3">
      <div className={cx("p-2.5 rounded-xl border shrink-0", cls)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-mut uppercase tracking-widest">{label}</p>
        <p className="text-lg sm:text-xl font-extrabold tracking-tight truncate">{value}</p>
        {sub && <p className="text-[11px] font-semibold text-mut mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export function EmptyState({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="text-center py-10">
      <p className="text-sm font-extrabold">{title}</p>
      <p className="text-xs font-semibold text-mut mt-1">{desc}</p>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center no-print">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className={cx(
        "relative w-full bg-panel border border-edge sm:rounded-2xl rounded-t-2xl max-h-[92dvh] flex flex-col",
        wide ? "sm:max-w-2xl" : "sm:max-w-md",
      )}>
        <header className="flex items-center justify-between px-5 py-4 border-b border-edge shrink-0">
          <h3 className="text-sm font-extrabold">{title}</h3>
          <button onClick={onClose} aria-label="Close dialog" className="text-mut hover:text-ink p-1"><X size={18} /></button>
        </header>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/** Delete button that confirms, then runs a bound server action. */
export function DeleteBtn({ action, label = "item", small }: {
  action: () => Promise<void>; label?: string; small?: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      aria-label={`Delete ${label}`}
      disabled={pending}
      onClick={() => { if (confirm(`Delete this ${label}? This cannot be undone.`)) start(() => action()); }}
      className={cx("text-red-400/70 hover:text-red-400 disabled:opacity-40", small ? "p-1" : "p-2")}
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

export function EditIconBtn({ onClick }: { onClick: () => void }) {
  return (
    <button aria-label="Edit" onClick={onClick} className="text-mut hover:text-gold p-2">
      <Pencil size={15} />
    </button>
  );
}

export function PrintBtn() {
  return (
    <Button variant="ghost" size="sm" onClick={() => window.print()}>
      <Printer size={14} /> Print
    </Button>
  );
}

export function AuthCard({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4 bg-vault">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="font-script text-5xl text-gold leading-none">Shivaa</p>
          <p className="text-[10px] font-bold text-mut uppercase tracking-[0.35em] mt-2">Enterprise Vault</p>
        </div>
        <div className="bg-panel border border-edge rounded-2xl p-6">
          <h1 className="text-lg font-extrabold tracking-tight">{title}</h1>
          <p className="text-xs font-semibold text-mut mt-1 mb-5">{sub}</p>
          {children}
        </div>
      </div>
    </main>
  );
}

/** Simple client-side search box that updates the `q` query param via form GET. */
export function SearchBox({ placeholder, defaultValue, extra }: {
  placeholder: string; defaultValue?: string; extra?: Record<string, string>;
}) {
  return (
    <form method="GET" className="flex-1 min-w-[180px] max-w-sm">
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <Input name="q" placeholder={placeholder} defaultValue={defaultValue} />
    </form>
  );
}

export function useDisclosure(initial = false) {
  const [open, setOpen] = useState(initial);
  return { open, show: () => setOpen(true), hide: () => setOpen(false) };
}
