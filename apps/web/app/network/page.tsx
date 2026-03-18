"use client";

import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Network,
  Zap,
  AlertTriangle,
  Play,
  RotateCcw,
  Info,
} from "lucide-react";

const mockValidators = [
  { id: "7xK2...mP4q", stake: 12500, services: 4, degree: 4.0 },
  { id: "3nR8...vL2k", stake: 8700, services: 3, degree: 3.0 },
  { id: "9aB1...xR7n", stake: 15200, services: 5, degree: 5.0 },
  { id: "2pQ5...hN8s", stake: 6300, services: 2, degree: 2.0 },
  { id: "5kM4...jR6t", stake: 11000, services: 4, degree: 4.0 },
];

export default function NetworkPage() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="page-header flex items-center gap-2">
          <Network className="h-6 w-6 text-solana-purple" />
          Restaking Network Graph
        </h1>
        <p className="page-description">
          Visualize validator-service allocations and simulate slashing scenarios
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Graph Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="relative min-h-[500px] overflow-hidden">
            {/* Graph placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Decorative network nodes */}
              <svg
                viewBox="0 0 600 400"
                className="h-full w-full opacity-30"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Edges */}
                <line x1="150" y1="120" x2="300" y2="80" stroke="#9945FF" strokeWidth="1" opacity="0.4" />
                <line x1="150" y1="120" x2="280" y2="200" stroke="#9945FF" strokeWidth="1" opacity="0.4" />
                <line x1="300" y1="80" x2="450" y2="150" stroke="#14F195" strokeWidth="1" opacity="0.4" />
                <line x1="300" y1="80" x2="280" y2="200" stroke="#14F195" strokeWidth="1" opacity="0.4" />
                <line x1="280" y1="200" x2="450" y2="150" stroke="#9945FF" strokeWidth="1" opacity="0.4" />
                <line x1="280" y1="200" x2="200" y2="300" stroke="#00D1FF" strokeWidth="1" opacity="0.4" />
                <line x1="450" y1="150" x2="420" y2="300" stroke="#00D1FF" strokeWidth="1" opacity="0.4" />
                <line x1="200" y1="300" x2="420" y2="300" stroke="#9945FF" strokeWidth="1" opacity="0.4" />
                <line x1="200" y1="300" x2="100" y2="250" stroke="#14F195" strokeWidth="1" opacity="0.4" />
                <line x1="100" y1="250" x2="150" y2="120" stroke="#00D1FF" strokeWidth="1" opacity="0.4" />

                {/* Validator nodes (circles) */}
                <circle cx="150" cy="120" r="12" fill="#9945FF" opacity="0.8" />
                <circle cx="300" cy="80" r="16" fill="#9945FF" opacity="0.8" />
                <circle cx="450" cy="150" r="14" fill="#9945FF" opacity="0.8" />
                <circle cx="100" cy="250" r="10" fill="#9945FF" opacity="0.8" />

                {/* Service nodes (squares approx as rounded rects) */}
                <rect x="270" y="190" width="20" height="20" rx="4" fill="#14F195" opacity="0.8" />
                <rect x="190" y="290" width="20" height="20" rx="4" fill="#14F195" opacity="0.8" />
                <rect x="410" y="290" width="20" height="20" rx="4" fill="#14F195" opacity="0.8" />
              </svg>

              {/* Overlay text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="rounded-xl border border-zinc-700/50 bg-surface-1/90 px-6 py-4 text-center backdrop-blur">
                  <Network className="mx-auto mb-2 h-8 w-8 text-solana-purple" />
                  <p className="text-sm font-medium text-zinc-200">
                    Force-Directed Network Graph
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-zinc-500">
                    Interactive bipartite graph showing validators (purple) and
                    services (green) with stake allocation edges. Will use D3.js
                    force simulation.
                  </p>
                </div>
              </div>
            </div>

            {/* Graph controls */}
            <div className="absolute bottom-4 left-4 flex gap-2">
              <Button variant="secondary" size="sm">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset View
              </Button>
              <Button variant="secondary" size="sm">
                <Info className="h-3.5 w-3.5" />
                Legend
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Slash Simulator */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Card>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Slash Simulator
            </CardTitle>
            <CardDescription className="mt-1">
              Simulate slashing events to analyze cascading effects on the
              restaking network
            </CardDescription>

            <div className="mt-6 space-y-4">
              {/* Target Validator */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Target Validator
                </label>
                <select className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-solana-purple/50">
                  <option value="">Select validator...</option>
                  {mockValidators.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} ({v.stake.toLocaleString()} SOL)
                    </option>
                  ))}
                </select>
              </div>

              {/* Slash Percentage */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Slash Percentage
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="10"
                    className="w-full accent-solana-purple"
                  />
                  <span className="w-12 text-right text-sm font-mono text-zinc-300">
                    10%
                  </span>
                </div>
              </div>

              {/* Target Service */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Target Service
                </label>
                <select className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-solana-purple/50">
                  <option value="">All services</option>
                  <option>Oracle Service</option>
                  <option>Bridge Relay</option>
                  <option>DA Layer</option>
                </select>
              </div>

              <Button variant="danger" size="md" className="w-full mt-2">
                <Zap className="h-4 w-4" />
                Simulate Slash
              </Button>
            </div>
          </Card>

          {/* Network Summary */}
          <Card>
            <CardTitle className="text-base">Network Validators</CardTitle>
            <div className="mt-4 space-y-2">
              {mockValidators.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg bg-surface-2/50 px-3 py-2"
                >
                  <div>
                    <p className="font-mono text-xs text-zinc-300">{v.id}</p>
                    <p className="text-[10px] text-zinc-500">
                      {v.services} services | d={v.degree}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-zinc-400">
                    {v.stake.toLocaleString()} SOL
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
