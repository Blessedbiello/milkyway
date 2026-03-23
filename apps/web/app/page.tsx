"use client";

import { motion } from "framer-motion";
import {
  Coins,
  Layers,
  Users,
  Target,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  Zap,
  Network,
  Radio,
} from "lucide-react";
import { StatsCard } from "@/components/stats-card";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNetworkConfig } from "@/hooks/use-network-config";
import { useServices } from "@/hooks/use-services";

const MOCK_STATS = [
  {
    label: "Total Value Staked",
    value: "142,850 SOL",
    change: "12.4% this epoch",
    trend: "up" as const,
    icon: Coins,
    accent: "purple" as const,
  },
  {
    label: "Active Services",
    value: "8",
    change: "2 pending registration",
    trend: "neutral" as const,
    icon: Layers,
    accent: "green" as const,
  },
  {
    label: "Active Validators",
    value: "47",
    change: "5 new this week",
    trend: "up" as const,
    icon: Users,
    accent: "cyan" as const,
  },
  {
    label: "Target Degree d*",
    value: "4.2",
    change: "Network avg: 3.8",
    trend: "neutral" as const,
    icon: Target,
    accent: "pink" as const,
  },
  {
    label: "Security Score",
    value: "94.2%",
    change: "1.8% from last epoch",
    trend: "up" as const,
    icon: ShieldCheck,
    accent: "green" as const,
  },
];

const quickActions = [
  {
    title: "Deposit Stake",
    description: "Stake SOL and earn restaking rewards across services",
    href: "/stake",
    icon: Coins,
    gradient: "from-solana-purple/20 to-transparent",
  },
  {
    title: "Register Service",
    description: "Register a new service to the restaking network",
    href: "/services",
    icon: Layers,
    gradient: "from-solana-green/20 to-transparent",
  },
  {
    title: "View Network",
    description: "Explore the restaking network graph and validator allocations",
    href: "/network",
    icon: Network,
    gradient: "from-solana-cyan/20 to-transparent",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function useStats() {
  const { connected } = useWallet();
  const { data: networkConfig, isLoading: configLoading } = useNetworkConfig();
  const { data: services, isLoading: servicesLoading } = useServices();

  const isLive = connected && !configLoading && !servicesLoading;
  const onChainServiceCount = services?.length ?? 0;

  const stats = MOCK_STATS.map((stat) => {
    if (stat.label === "Active Services" && isLive) {
      return {
        ...stat,
        value: onChainServiceCount > 0 ? String(onChainServiceCount) : stat.value,
        change:
          onChainServiceCount > 0
            ? `${onChainServiceCount} on-chain`
            : "No services deployed yet",
      };
    }
    return stat;
  });

  return { stats, isLive, networkConfig, services, configLoading, servicesLoading };
}

export default function DashboardPage() {
  const { connected } = useWallet();
  const { stats, isLive, networkConfig } = useStats();

  return (
    <div className="space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-solana shadow-glow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="page-header">Elastic Restaking Protocol</h1>
            <p className="page-description">
              Shared security through elastic restaking on Solana
            </p>
          </div>
          {isLive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-full border border-solana-green/30 bg-solana-green/10 px-3 py-1"
            >
              <Radio className="h-3 w-3 text-solana-green animate-pulse" />
              <span className="text-xs font-medium text-solana-green">
                Connected to Devnet
              </span>
            </motion.div>
          )}
        </div>

        {/* Network config on-chain indicator */}
        {isLive && networkConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="ml-[52px] flex items-center gap-2 text-xs text-zinc-500"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-solana-green" />
            <span>
              Network config:{" "}
              <span className="font-mono text-zinc-400">
                {networkConfig.address.slice(0, 8)}...
                {networkConfig.address.slice(-4)}
              </span>
            </span>
          </motion.div>
        )}
        {isLive && !networkConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="ml-[52px] flex items-center gap-2 text-xs text-zinc-500"
          >
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <span>Network config not yet initialized on-chain</span>
          </motion.div>
        )}
      </motion.div>

      {/* Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <StatsCard
              label={stat.label}
              value={stat.value}
              change={stat.change}
              trend={stat.trend}
              icon={stat.icon}
              accentColor={stat.accent}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}>
                <Card className="group relative overflow-hidden hover:border-solana-purple/30 hover:shadow-glow cursor-pointer h-full">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
                  />
                  <div className="relative space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="rounded-lg bg-zinc-800/80 p-2">
                        <Icon className="h-5 w-5 text-zinc-300" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-zinc-600 transition-all duration-200 group-hover:translate-x-1 group-hover:text-solana-purple" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{action.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {action.description}
                      </CardDescription>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <h2 className="mb-4 text-lg font-semibold text-white">
          Network Activity
        </h2>
        <Card>
          <div className="space-y-3">
            {[
              {
                action: "Validator registered",
                detail: "7xK2...mP4q joined the network",
                time: "2 min ago",
                icon: Users,
                color: "text-solana-green",
              },
              {
                action: "Stake deposited",
                detail: "500 SOL deposited by 3nR8...vL2k",
                time: "8 min ago",
                icon: TrendingUp,
                color: "text-solana-purple",
              },
              {
                action: "Service allocated",
                detail: "Oracle Service received 12,000 SOL allocation",
                time: "15 min ago",
                icon: Layers,
                color: "text-solana-cyan",
              },
              {
                action: "Slash proposed",
                detail: "Proposal #42 against validator 9aB1...xR7n",
                time: "1 hour ago",
                icon: ShieldCheck,
                color: "text-red-400",
              },
              {
                action: "Epoch completed",
                detail: "Rewards distributed: 284 SOL across 47 validators",
                time: "3 hours ago",
                icon: Zap,
                color: "text-solana-green",
              },
            ].map((event, i) => {
              const Icon = event.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg px-3 py-2.5 transition-colors hover:bg-zinc-800/30"
                >
                  <div className="rounded-md bg-zinc-800/80 p-2">
                    <Icon className={`h-4 w-4 ${event.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200">
                      {event.action}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {event.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-zinc-600">
                    {event.time}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
