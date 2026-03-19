"use client";

import { motion } from "framer-motion";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Layers,
  Plus,
  Shield,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  status: "active" | "pending" | "inactive";
  threshold: string;
  prize: string;
  allocated: string;
  validators: number;
  description: string;
}

const mockServices: Service[] = [
  {
    id: 1,
    name: "Oracle Service",
    status: "active",
    threshold: "10,000 SOL",
    prize: "500 SOL/epoch",
    allocated: "45,200 SOL",
    validators: 18,
    description: "Decentralized price feed oracle network",
  },
  {
    id: 2,
    name: "Bridge Relay",
    status: "active",
    threshold: "25,000 SOL",
    prize: "1,200 SOL/epoch",
    allocated: "38,000 SOL",
    validators: 12,
    description: "Cross-chain bridge message relay service",
  },
  {
    id: 3,
    name: "DA Layer",
    status: "active",
    threshold: "15,000 SOL",
    prize: "800 SOL/epoch",
    allocated: "22,500 SOL",
    validators: 9,
    description: "Data availability sampling and attestation",
  },
  {
    id: 4,
    name: "Sequencer Network",
    status: "active",
    threshold: "20,000 SOL",
    prize: "950 SOL/epoch",
    allocated: "28,100 SOL",
    validators: 14,
    description: "Shared sequencing for L2 rollups",
  },
  {
    id: 5,
    name: "Keeper Network",
    status: "active",
    threshold: "5,000 SOL",
    prize: "200 SOL/epoch",
    allocated: "8,400 SOL",
    validators: 7,
    description: "Automated transaction execution service",
  },
  {
    id: 6,
    name: "ZK Prover Pool",
    status: "pending",
    threshold: "30,000 SOL",
    prize: "1,500 SOL/epoch",
    allocated: "0 SOL",
    validators: 0,
    description: "Distributed ZK proof generation network",
  },
  {
    id: 7,
    name: "MEV Protection",
    status: "active",
    threshold: "8,000 SOL",
    prize: "350 SOL/epoch",
    allocated: "12,600 SOL",
    validators: 6,
    description: "MEV-aware transaction ordering service",
  },
  {
    id: 8,
    name: "Consensus Oracle",
    status: "inactive",
    threshold: "12,000 SOL",
    prize: "600 SOL/epoch",
    allocated: "650 SOL",
    validators: 1,
    description: "Cross-chain consensus verification",
  },
];

const statusConfig = {
  active: {
    label: "Active",
    color: "text-solana-green",
    bg: "bg-solana-green/10",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    icon: Clock,
  },
  inactive: {
    label: "Inactive",
    color: "text-zinc-500",
    bg: "bg-zinc-500/10",
    icon: XCircle,
  },
};

export default function ServicesPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between"
      >
        <div className="space-y-1">
          <h1 className="page-header flex items-center gap-2">
            <Layers className="h-6 w-6 text-solana-green" />
            Service Registry
          </h1>
          <p className="page-description">
            {mockServices.length} services registered |{" "}
            {mockServices.filter((s) => s.status === "active").length} active
          </p>
        </div>
        <Button variant="primary" size="md">
          <Plus className="h-4 w-4" />
          Register Service
        </Button>
      </motion.div>

      {/* Services Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800/60">
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Service
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Threshold
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Prize
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Allocated
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                    Validators
                  </th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {mockServices.map((service, i) => {
                  const status = statusConfig[service.status];
                  const StatusIcon = status.icon;
                  return (
                    <motion.tr
                      key={service.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="group transition-colors hover:bg-zinc-800/20"
                    >
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs text-zinc-500">
                          #{service.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {service.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {service.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                            status.bg,
                            status.color
                          )}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-300">
                        {service.threshold}
                      </td>
                      <td className="px-6 py-4 text-sm text-solana-green">
                        {service.prize}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-sm text-zinc-300">
                            {service.allocated}
                          </span>
                          {service.status === "active" && (
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green"
                                style={{
                                  width: `${Math.min(
                                    (parseInt(service.allocated.replace(/[^0-9]/g, "")) /
                                      parseInt(service.threshold.replace(/[^0-9]/g, ""))) *
                                      100,
                                    100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-zinc-300">
                          {service.validators}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="text-center">
            <Shield className="mx-auto mb-2 h-6 w-6 text-solana-purple" />
            <p className="stat-value">155,450</p>
            <p className="stat-label mt-1">Total SOL Allocated</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card className="text-center">
            <Layers className="mx-auto mb-2 h-6 w-6 text-solana-green" />
            <p className="stat-value">6,100</p>
            <p className="stat-label mt-1">SOL Rewards / Epoch</p>
          </Card>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="text-center">
            <Shield className="mx-auto mb-2 h-6 w-6 text-solana-cyan" />
            <p className="stat-value">3.6</p>
            <p className="stat-label mt-1">Average Restaking Degree</p>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
