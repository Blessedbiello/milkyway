"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DegreeGauge } from "@/components/degree-gauge";
import { cn } from "@/lib/utils";
import {
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  Minus,
  Gift,
  TrendingUp,
  Shield,
  Wallet,
} from "lucide-react";

const mockAllocations = [
  { service: "Oracle Service", allocated: 3500, max: 5000 },
  { service: "Bridge Relay", allocated: 2800, max: 5000 },
  { service: "DA Layer", allocated: 1500, max: 5000 },
  { service: "Sequencer Network", allocated: 2200, max: 5000 },
];

const mockRewards = [
  { epoch: 412, amount: 12.5, services: 4 },
  { epoch: 411, amount: 11.8, services: 4 },
  { epoch: 410, amount: 13.2, services: 3 },
  { epoch: 409, amount: 10.1, services: 3 },
  { epoch: 408, amount: 11.9, services: 4 },
];

export default function StakePage() {
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  const totalStaked = 12500;
  const totalAllocated = mockAllocations.reduce(
    (sum, a) => sum + a.allocated,
    0
  );
  const unallocated = totalStaked - totalAllocated;
  const currentDegree = mockAllocations.length;
  const targetDegree = 4.2;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="page-header flex items-center gap-2">
          <Coins className="h-6 w-6 text-solana-purple" />
          Validator Staking
        </h1>
        <p className="page-description">
          Manage your stake, allocations, and view restaking rewards
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Deposit/Withdraw + Allocations */}
        <div className="space-y-6 lg:col-span-2">
          {/* Deposit/Withdraw Panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <div className="mb-6 flex items-center justify-between">
                <CardTitle>My Validator</CardTitle>
                <div className="flex items-center gap-2 rounded-lg bg-surface-2 p-1">
                  <button
                    onClick={() => setActiveTab("deposit")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      activeTab === "deposit"
                        ? "bg-solana-purple/20 text-solana-purple"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => setActiveTab("withdraw")}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                      activeTab === "withdraw"
                        ? "bg-red-500/20 text-red-400"
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    Withdraw
                  </button>
                </div>
              </div>

              {/* Balance overview */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-surface-2/50 p-3 text-center">
                  <p className="text-xs text-zinc-500">Total Staked</p>
                  <p className="mt-1 text-lg font-bold text-white">
                    {totalStaked.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-600">SOL</p>
                </div>
                <div className="rounded-lg bg-surface-2/50 p-3 text-center">
                  <p className="text-xs text-zinc-500">Allocated</p>
                  <p className="mt-1 text-lg font-bold text-solana-purple">
                    {totalAllocated.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-600">SOL</p>
                </div>
                <div className="rounded-lg bg-surface-2/50 p-3 text-center">
                  <p className="text-xs text-zinc-500">Unallocated</p>
                  <p className="mt-1 text-lg font-bold text-solana-green">
                    {unallocated.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-zinc-600">SOL</p>
                </div>
              </div>

              {/* Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-400">
                    {activeTab === "deposit" ? "Deposit" : "Withdraw"} Amount
                    (SOL)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        placeholder="0.00"
                        value={
                          activeTab === "deposit"
                            ? depositAmount
                            : withdrawAmount
                        }
                        onChange={(e) =>
                          activeTab === "deposit"
                            ? setDepositAmount(e.target.value)
                            : setWithdrawAmount(e.target.value)
                        }
                        className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-4 py-3 text-lg font-mono text-white outline-none transition-colors focus:border-solana-purple/50 placeholder:text-zinc-700"
                      />
                      <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-zinc-700/50 px-2 py-0.5 text-[10px] font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200 transition-colors">
                        MAX
                      </button>
                    </div>
                    <Button
                      variant={
                        activeTab === "deposit" ? "primary" : "danger"
                      }
                      size="lg"
                    >
                      {activeTab === "deposit" ? (
                        <>
                          <ArrowUpCircle className="h-4 w-4" />
                          Deposit
                        </>
                      ) : (
                        <>
                          <ArrowDownCircle className="h-4 w-4" />
                          Withdraw
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Allocation Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardTitle>Service Allocations</CardTitle>
                <Button variant="outline" size="sm">
                  <Plus className="h-3.5 w-3.5" />
                  Allocate to New Service
                </Button>
              </div>
              <CardDescription>
                Manage how your stake is distributed across services
              </CardDescription>

              <div className="mt-6 space-y-3">
                {mockAllocations.map((alloc, i) => {
                  const pct = (alloc.allocated / totalStaked) * 100;
                  return (
                    <motion.div
                      key={alloc.service}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="rounded-lg border border-zinc-800/40 bg-surface-2/30 p-4"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">
                            {alloc.service}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {alloc.allocated.toLocaleString()} /{" "}
                            {alloc.max.toLocaleString()} SOL
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-solana-purple to-solana-green"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{
                            duration: 0.8,
                            delay: 0.3 + i * 0.05,
                            ease: "easeOut",
                          }}
                        />
                      </div>
                      <p className="mt-1 text-right text-[10px] text-zinc-600">
                        {pct.toFixed(1)}% of total stake
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Right column: Gauge + Rewards */}
        <div className="space-y-6">
          {/* Degree Gauge */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="flex flex-col items-center">
              <CardTitle className="mb-4 self-start">
                Restaking Degree
              </CardTitle>
              <DegreeGauge
                current={currentDegree}
                target={targetDegree}
                max={8}
              />
              <div className="mt-4 w-full space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Current degree</span>
                  <span className="font-mono text-zinc-200">
                    {currentDegree}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Target d*</span>
                  <span className="font-mono text-zinc-200">
                    {targetDegree}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Services allocated</span>
                  <span className="font-mono text-zinc-200">
                    {mockAllocations.length}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Rewards */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-solana-green" />
                  Rewards
                </CardTitle>
                <Button variant="outline" size="sm">
                  Claim All
                </Button>
              </div>

              <div className="mb-4 rounded-lg bg-gradient-to-r from-solana-purple/10 to-solana-green/10 p-4 text-center">
                <p className="text-xs text-zinc-400">Unclaimed Rewards</p>
                <p className="mt-1 text-2xl font-bold text-solana-green">
                  47.6 SOL
                </p>
                <p className="text-[10px] text-zinc-500">~$7,140 USD</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-500">
                  Recent Epochs
                </p>
                {mockRewards.map((reward) => (
                  <div
                    key={reward.epoch}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-surface-2/50"
                  >
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-3.5 w-3.5 text-solana-green" />
                      <span className="text-xs text-zinc-400">
                        Epoch {reward.epoch}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-zinc-200">
                        +{reward.amount} SOL
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        {reward.services} services
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-solana-purple/20">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-solana-purple" />
                <div className="space-y-1">
                  <p className="text-xs font-medium text-zinc-200">
                    Elastic Security
                  </p>
                  <p className="text-[11px] leading-relaxed text-zinc-500">
                    Your stake is elastically shared across{" "}
                    {mockAllocations.length} services. The protocol ensures
                    economic security through the restaking degree mechanism,
                    targeting d* = {targetDegree}.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
