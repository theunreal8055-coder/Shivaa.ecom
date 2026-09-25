"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Gem, ReceiptText, BookUser, Scale, Hammer, Users,
  Wallet, BarChart3, ShieldCheck, Settings, LogOut, MoreHorizontal, X,
} from "lucide-react";
import { cx } from "./ui";
import { logout } from "@/lib/actions/auth";
import { inr } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; className?: string }> };

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Gem },
  { href: "/invoices", label: "Billing", icon: ReceiptText },
  { href: "/khata", label: "Khata", icon: BookUser },
  { href: "/metal", label: "Metal Billing", icon: Scale },
  { href: "/karigar", label: "Karigar Jobs", icon: Hammer },
  { href: "/parties", label: "Parties", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/vault", label: "Secure Vault", icon: ShieldCheck },
  { href: "/settings", label: "Settings", icon: Settings },
];

const BOTTOM_NAV = MAIN_NAV.slice(0, 4);
const MORE_NAV = MAIN_NAV.slice(4);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const active = isActive(pathname, item.href);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cx(
        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
        active ? "bg-gold/10 text-gold" : "text-mut hover:text-ink hover:bg-white/5"
      )}
    >
      <Icon size={17} className={active ? "text-gold" : ""} />
      {item.label}
    </Link>
  );
}

export function Shell({
  userName, goldRate, silverRate, children,
}: {
  userName: string; goldRate: number; silverRate: number; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className="no-print hidden md:flex w-60 shrink-0 flex-col border-r border-edge bg-panel/60 sticky top-0 h-dvh">
        <div className="px-5 pt-6 pb-4">
          <div className="font-script text-4xl text-gold leading-none">Shivaa</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-mut">Enterprise Vault</div>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {MAIN_NAV.map((it) => <NavLink key={it.href} item={it} pathname={pathname} />)}
        </nav>
        <div className="border-t border-edge p-3">
          <form action={logout}>
            <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-mut hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut size={17} /> Logout
            </button>
          </form>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="no-print sticky top-0 z-30 border-b border-edge bg-vault/85 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 md:px-6 h-14">
            <div className="md:hidden font-script text-2xl text-gold leading-none">Shivaa</div>
            <div className="flex-1" />
            <Link
              href="/settings#rates"
              className="flex items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 text-[11px] font-bold hover:border-gold/50 transition-colors"
              title="Update live rates"
            >
              <span className="text-gold">Au ₹{inr(goldRate)}/g</span>
              <span className="text-edge">|</span>
              <span className="text-slate-300">Ag ₹{inr(silverRate)}/g</span>
            </Link>
            <div className="hidden sm:block max-w-[140px] truncate text-xs font-bold text-mut" title={userName}>
              {userName}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-6 py-5 pb-32 md:pb-8 max-w-[1200px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-edge bg-panel/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {BOTTOM_NAV.map((it) => {
            const active = isActive(pathname, it.href);
            const Icon = it.icon;
            return (
              <Link key={it.href} href={it.href}
                className={cx("flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold", active ? "text-gold" : "text-mut")}>
                <Icon size={19} />
                {it.label}
              </Link>
            );
          })}
          <button onClick={() => setMoreOpen(true)}
            className={cx("flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold", MORE_NAV.some((i) => isActive(pathname, i.href)) ? "text-gold" : "text-mut")}>
            <MoreHorizontal size={19} />
            More
          </button>
        </div>
      </nav>

      {/* Mobile "More" sheet */}
      {moreOpen && (
        <div className="no-print md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 rounded-t-2xl border-t border-edge bg-panel p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-widest text-mut">More</div>
              <button onClick={() => setMoreOpen(false)} className="text-mut hover:text-ink p-1"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MORE_NAV.map((it) => <NavLink key={it.href} item={it} pathname={pathname} onClick={() => setMoreOpen(false)} />)}
            </div>
            <form action={logout} className="mt-2 border-t border-edge pt-2">
              <button className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10">
                <LogOut size={17} /> Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
