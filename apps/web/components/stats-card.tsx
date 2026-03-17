"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatsCardProps {
  label: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  accentColor?: "purple" | "green" | "cyan" | "pink";
}

const accentMap = {
  purple: {
    iconBg: "bg-solana-purple/10",
    iconColor: "text-solana-purple",
    borderHover: "hover:border-solana-purple/30",
    shadow: "hover:shadow-glow",
  },
  green: {
    iconBg: "bg-solana-green/10",
    iconColor: "text-solana-green",
    borderHover: "hover:border-solana-green/30",
    shadow: "hover:shadow-glow-green",
  },
  cyan: {
    iconBg: "bg-solana-cyan/10",
    iconColor: "text-solana-cyan",
    borderHover: "hover:border-solana-cyan/30",
    shadow: "hover:shadow-[0_0_20px_rgba(0,209,255,0.15)]",
  },
  pink: {
    iconBg: "bg-solana-pink/10",
    iconColor: "text-solana-pink",
    borderHover: "hover:border-solana-pink/30",
    shadow: "hover:shadow-[0_0_20px_rgba(251,71,236,0.15)]",
  },
};

export function StatsCard({
  label,
  value,
  change,
  trend = "neutral",
  icon: Icon,
  accentColor = "purple",
}: StatsCardProps) {
  const accent = accentMap[accentColor];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        className={cn(
          "group cursor-default",
          accent.borderHover,
          accent.shadow
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="stat-label">{label}</p>
            <p className="stat-value text-white">{value}</p>
            {change && (
              <p
                className={cn(
                  "text-xs font-medium",
                  trend === "up" && "text-solana-green",
                  trend === "down" && "text-red-400",
                  trend === "neutral" && "text-zinc-500"
                )}
              >
                {trend === "up" && "+"}
                {change}
              </p>
            )}
          </div>
          <div
            className={cn(
              "rounded-lg p-2.5 transition-colors duration-300",
              accent.iconBg
            )}
          >
            <Icon className={cn("h-5 w-5", accent.iconColor)} />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
