"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { shortenAddress } from "@/lib/utils";
import {
  LayoutDashboard,
  Network,
  Layers,
  Coins,
  BarChart3,
  Settings,
  Wallet,
  LogOut,
  Zap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/network", label: "Network", icon: Network },
  { href: "/services", label: "Services", icon: Layers },
  { href: "/stake", label: "Stake", icon: Coins },
  { href: "/analyzer", label: "Analyzer", icon: BarChart3 },
  { href: "/admin", label: "Admin", icon: Settings },
];

export function Navbar() {
  const pathname = usePathname();
  const { connected, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800/60 bg-surface-0/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-solana">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white group-hover:text-solana-purple transition-colors">
            Milky
            <span className="text-solana-green">Way</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-solana-purple/10 text-solana-purple"
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-2">
          {connected && publicKey ? (
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-surface-2 px-3 py-1.5 sm:flex">
                <div className="h-2 w-2 rounded-full bg-solana-green animate-pulse" />
                <span className="text-xs font-mono text-zinc-300">
                  {shortenAddress(publicKey.toBase58())}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => disconnect()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setVisible(true)}
            >
              <Wallet className="h-4 w-4" />
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <div className="flex items-center gap-1 overflow-x-auto border-t border-zinc-800/40 px-4 py-2 md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-solana-purple/10 text-solana-purple"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
