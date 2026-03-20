"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Settings,
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  UserCog,
  ArrowRight,
  Save,
  RotateCcw,
  Eye,
  Gavel,
} from "lucide-react";

interface ConfigField {
  label: string;
  key: string;
  value: string;
  type: "number" | "text";
  unit?: string;
  description: string;
}

const configFields: ConfigField[] = [
  {
    label: "Target Restaking Degree (d*)",
    key: "target_degree",
    value: "4",
    type: "number",
    description: "Network-wide target for validator restaking degree",
  },
  {
    label: "Slash Fraction (basis points)",
    key: "slash_fraction",
    value: "1000",
    type: "number",
    unit: "bps",
    description: "Default slash amount as fraction of stake (1000 = 10%)",
  },
  {
    label: "Veto Period (slots)",
    key: "veto_period",
    value: "5000",
    type: "number",
    unit: "slots",
    description: "Governance veto window before slash finalization",
  },
  {
    label: "Min Stake (lamports)",
    key: "min_stake",
    value: "1000000000",
    type: "number",
    unit: "lamports",
    description: "Minimum stake required to register as validator",
  },
  {
    label: "Max Services Per Validator",
    key: "max_services",
    value: "10",
    type: "number",
    description: "Cap on the number of services a validator can serve",
  },
  {
    label: "Reward Rate (bps per epoch)",
    key: "reward_rate",
    value: "50",
    type: "number",
    unit: "bps",
    description: "Base reward rate distributed per epoch",
  },
];

interface SlashProposal {
  id: number;
  validator: string;
  service: string;
  amount: string;
  status: "pending" | "vetoed" | "finalized";
  proposedAt: string;
  vetoDeadline: string;
}

const mockProposals: SlashProposal[] = [
  {
    id: 42,
    validator: "9aB1...xR7n",
    service: "Oracle Service",
    amount: "1,520 SOL",
    status: "pending",
    proposedAt: "Slot 285,412,100",
    vetoDeadline: "Slot 285,417,100",
  },
  {
    id: 41,
    validator: "3nR8...vL2k",
    service: "Bridge Relay",
    amount: "870 SOL",
    status: "pending",
    proposedAt: "Slot 285,410,800",
    vetoDeadline: "Slot 285,415,800",
  },
  {
    id: 40,
    validator: "5kM4...jR6t",
    service: "DA Layer",
    amount: "1,100 SOL",
    status: "vetoed",
    proposedAt: "Slot 285,408,200",
    vetoDeadline: "Slot 285,413,200",
  },
  {
    id: 39,
    validator: "2pQ5...hN8s",
    service: "Keeper Network",
    amount: "630 SOL",
    status: "finalized",
    proposedAt: "Slot 285,400,000",
    vetoDeadline: "Slot 285,405,000",
  },
];

const statusConfig = {
  pending: {
    label: "Pending Veto",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    icon: Clock,
  },
  vetoed: {
    label: "Vetoed",
    color: "text-red-400",
    bg: "bg-red-400/10",
    icon: XCircle,
  },
  finalized: {
    label: "Finalized",
    color: "text-solana-green",
    bg: "bg-solana-green/10",
    icon: CheckCircle2,
  },
};

export default function AdminPage() {
  const [configs, setConfigs] = useState<Record<string, string>>(
    Object.fromEntries(configFields.map((f) => [f.key, f.value]))
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="page-header flex items-center gap-2">
          <Settings className="h-6 w-6 text-zinc-400" />
          Admin & Governance
        </h1>
        <p className="page-description">
          Network configuration, slash governance, and authority management
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Network Config */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-zinc-400" />
              Network Configuration
            </CardTitle>
            <CardDescription className="mt-1">
              Update protocol parameters (requires authority)
            </CardDescription>

            <div className="mt-6 space-y-4">
              {configFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">
                      {field.label}
                    </label>
                    {field.unit && (
                      <span className="text-[10px] text-zinc-600">
                        {field.unit}
                      </span>
                    )}
                  </div>
                  <input
                    type={field.type}
                    value={configs[field.key]}
                    onChange={(e) =>
                      setConfigs((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 font-mono text-sm text-zinc-200 outline-none transition-colors focus:border-solana-purple/50"
                  />
                  <p className="text-[10px] text-zinc-600">
                    {field.description}
                  </p>
                </div>
              ))}

              <div className="flex gap-3 pt-2">
                <Button variant="primary" size="md" className="flex-1">
                  <Save className="h-4 w-4" />
                  Update Config
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() =>
                    setConfigs(
                      Object.fromEntries(
                        configFields.map((f) => [f.key, f.value])
                      )
                    )
                  }
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Slash Proposals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Card>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-4 w-4 text-amber-400" />
                Slash Proposals
              </CardTitle>
              <Button variant="danger" size="sm">
                <AlertTriangle className="h-3.5 w-3.5" />
                New Proposal
              </Button>
            </div>
            <CardDescription className="mt-1">
              Propose, veto, or finalize slashing events
            </CardDescription>

            <div className="mt-6 space-y-3">
              {mockProposals.map((proposal, i) => {
                const status = statusConfig[proposal.status];
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={proposal.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.05 }}
                    className="rounded-lg border border-zinc-800/40 bg-surface-2/30 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-500">
                            #{proposal.id}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                              status.bg,
                              status.color
                            )}
                          >
                            <StatusIcon className="h-2.5 w-2.5" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-200">
                          Slash{" "}
                          <span className="font-mono text-solana-purple">
                            {proposal.validator}
                          </span>
                        </p>
                        <p className="text-xs text-zinc-500">
                          {proposal.service} | {proposal.amount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[10px] text-zinc-600">
                        <span>Proposed: {proposal.proposedAt}</span>
                        <span className="mx-2">|</span>
                        <span>Veto deadline: {proposal.vetoDeadline}</span>
                      </div>

                      {proposal.status === "pending" && (
                        <div className="flex gap-2">
                          <Button variant="danger" size="sm">
                            <XCircle className="h-3 w-3" />
                            Veto
                          </Button>
                          <Button variant="outline" size="sm">
                            <CheckCircle2 className="h-3 w-3" />
                            Finalize
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>

          {/* Authority Transfer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-amber-400/10">
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-amber-400" />
                Authority Management
              </CardTitle>
              <CardDescription className="mt-1">
                Transfer protocol authority to a new address
              </CardDescription>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    Current Authority
                  </label>
                  <div className="flex items-center gap-2 rounded-lg bg-surface-2/50 px-3 py-2">
                    <div className="h-2 w-2 rounded-full bg-solana-green" />
                    <span className="font-mono text-xs text-zinc-300">
                      7xK2...mP4q (connected)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-zinc-600" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-400">
                    New Authority Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Solana address..."
                    className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 font-mono text-sm text-zinc-200 outline-none transition-colors focus:border-amber-400/50 placeholder:text-zinc-700"
                  />
                </div>

                <Button
                  variant="danger"
                  size="md"
                  className="w-full mt-2"
                >
                  <Shield className="h-4 w-4" />
                  Transfer Authority
                </Button>

                <p className="text-center text-[10px] text-zinc-600">
                  This action is irreversible. Double-check the new address.
                </p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
