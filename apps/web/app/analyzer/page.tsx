"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Play,
  Shield,
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
  Settings2,
} from "lucide-react";

interface SliderParam {
  label: string;
  key: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  description: string;
}

const parameters: SliderParam[] = [
  {
    label: "Number of Validators (n)",
    key: "n",
    min: 5,
    max: 200,
    step: 5,
    defaultValue: 50,
    unit: "",
    description: "Total validators in the network",
  },
  {
    label: "Number of Services (m)",
    key: "m",
    min: 1,
    max: 50,
    step: 1,
    defaultValue: 8,
    unit: "",
    description: "Total services requiring security",
  },
  {
    label: "Target Degree (d*)",
    key: "d_star",
    min: 1,
    max: 20,
    step: 0.5,
    defaultValue: 4,
    unit: "",
    description: "Optimal restaking degree for the network",
  },
  {
    label: "Slash Fraction",
    key: "slash_fraction",
    min: 0.01,
    max: 1.0,
    step: 0.01,
    defaultValue: 0.1,
    unit: "",
    description: "Fraction of stake slashed per violation",
  },
  {
    label: "Security Threshold",
    key: "threshold",
    min: 1000,
    max: 100000,
    step: 1000,
    defaultValue: 15000,
    unit: " SOL",
    description: "Minimum stake threshold per service",
  },
  {
    label: "Veto Period (slots)",
    key: "veto_period",
    min: 100,
    max: 50000,
    step: 100,
    defaultValue: 5000,
    unit: "",
    description: "Slots before slash can be finalized",
  },
];

const mockFigures = [
  {
    id: "fig3",
    title: "Figure 3: Security vs Restaking Degree",
    description:
      "Shows how total network security scales with the restaking degree d*. Demonstrates the elastic security amplification effect.",
    color: "text-solana-purple",
  },
  {
    id: "fig4",
    title: "Figure 4: Optimal d* vs Network Size",
    description:
      "Plots the optimal restaking degree as a function of the number of validators and services.",
    color: "text-solana-green",
  },
  {
    id: "fig5",
    title: "Figure 5: Cascade Risk Analysis",
    description:
      "Visualizes the probability and magnitude of cascading slashing events under different network configurations.",
    color: "text-amber-400",
  },
  {
    id: "fig6",
    title: "Figure 6: Prize-Stake Equilibrium",
    description:
      "Displays the game-theoretic equilibrium between service prizes and validator stake allocations.",
    color: "text-solana-cyan",
  },
];

export default function AnalyzerPage() {
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(parameters.map((p) => [p.key, p.defaultValue]))
  );
  const [activeFigure, setActiveFigure] = useState("fig3");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  const securityScore = Math.min(
    99,
    60 +
      params.d_star * 5 +
      (params.n / params.m) * 0.5 -
      params.slash_fraction * 10
  );

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="page-header flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-solana-cyan" />
          Security Analyzer
        </h1>
        <p className="page-description">
          Analyze and simulate network security parameters from the Elastic
          Restaking paper
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Parameters Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Card>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-zinc-400" />
              Network Parameters
            </CardTitle>

            <div className="mt-6 space-y-5">
              {parameters.map((param) => (
                <div key={param.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-zinc-400">
                      {param.label}
                    </label>
                    <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-zinc-200">
                      {params[param.key]}
                      {param.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    value={params[param.key]}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        [param.key]: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full accent-solana-purple"
                  />
                  <p className="text-[10px] text-zinc-600">
                    {param.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <Activity className="h-4 w-4 animate-pulse" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Analyze Current Network
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() =>
                  setParams(
                    Object.fromEntries(
                      parameters.map((p) => [p.key, p.defaultValue])
                    )
                  )
                }
              >
                Reset Defaults
              </Button>
            </div>
          </Card>

          {/* Security Score */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card
              className={cn(
                "text-center",
                securityScore >= 80
                  ? "border-solana-green/20"
                  : securityScore >= 60
                  ? "border-amber-400/20"
                  : "border-red-500/20"
              )}
            >
              <Shield
                className={cn(
                  "mx-auto mb-2 h-8 w-8",
                  securityScore >= 80
                    ? "text-solana-green"
                    : securityScore >= 60
                    ? "text-amber-400"
                    : "text-red-400"
                )}
              />
              <p className="text-3xl font-bold text-white">
                {securityScore.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Network Security Score
              </p>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    securityScore >= 80
                      ? "bg-solana-green"
                      : securityScore >= 60
                      ? "bg-amber-400"
                      : "bg-red-500"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${securityScore}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Charts Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4 lg:col-span-2"
        >
          {/* Figure Tabs */}
          <div className="flex flex-wrap gap-2">
            {mockFigures.map((fig) => (
              <button
                key={fig.id}
                onClick={() => setActiveFigure(fig.id)}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-medium transition-all",
                  activeFigure === fig.id
                    ? "bg-solana-purple/20 text-solana-purple border border-solana-purple/30"
                    : "bg-surface-2 text-zinc-500 border border-transparent hover:text-zinc-300 hover:border-zinc-700"
                )}
              >
                {fig.title.split(":")[0]}
              </button>
            ))}
          </div>

          {/* Chart Display */}
          <Card className="min-h-[400px] relative overflow-hidden">
            {mockFigures.map((fig) => (
              <div
                key={fig.id}
                className={cn(
                  "absolute inset-0 p-6 transition-opacity duration-300",
                  activeFigure === fig.id
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                )}
              >
                <h3 className={cn("text-base font-semibold", fig.color)}>
                  {fig.title}
                </h3>
                <p className="mt-2 text-xs text-zinc-500 max-w-lg">
                  {fig.description}
                </p>

                {/* Chart placeholder with grid */}
                <div className="mt-6 relative h-[280px] rounded-lg border border-zinc-800/40 bg-surface-2/30 overflow-hidden">
                  {/* Grid lines */}
                  <svg
                    className="absolute inset-0 h-full w-full"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    {/* Horizontal grid */}
                    {[0.2, 0.4, 0.6, 0.8].map((y) => (
                      <line
                        key={`h-${y}`}
                        x1="0"
                        y1={`${y * 100}%`}
                        x2="100%"
                        y2={`${y * 100}%`}
                        stroke="rgba(39, 39, 42, 0.4)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Vertical grid */}
                    {[0.2, 0.4, 0.6, 0.8].map((x) => (
                      <line
                        key={`v-${x}`}
                        x1={`${x * 100}%`}
                        y1="0"
                        x2={`${x * 100}%`}
                        y2="100%"
                        stroke="rgba(39, 39, 42, 0.4)"
                        strokeWidth="1"
                      />
                    ))}
                    {/* Placeholder curve */}
                    <path
                      d="M 40 240 Q 150 220 200 160 T 350 80 Q 400 60 500 50"
                      fill="none"
                      stroke="rgba(153, 69, 255, 0.5)"
                      strokeWidth="2"
                    />
                    <path
                      d="M 40 240 Q 150 220 200 160 T 350 80 Q 400 60 500 50 L 500 280 L 40 280 Z"
                      fill="url(#chartGradient)"
                      opacity="0.15"
                    />
                    <defs>
                      <linearGradient
                        id="chartGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#9945FF" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-lg border border-zinc-700/50 bg-surface-1/80 px-4 py-3 text-center backdrop-blur">
                      <BarChart3 className="mx-auto mb-1 h-5 w-5 text-zinc-500" />
                      <p className="text-xs text-zinc-500">
                        Recharts visualization will render here
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        Connected to SDK analysis functions
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parameter readout */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                    n={params.n}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                    m={params.m}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                    d*={params.d_star}
                  </span>
                  <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                    slash={params.slash_fraction}
                  </span>
                </div>
              </div>
            ))}
          </Card>

          {/* Analysis Insights */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-solana-green/10">
                <div className="flex items-start gap-3">
                  <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-solana-green" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Security Amplification
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      With d*={params.d_star}, the effective security is amplified
                      by {(params.d_star * 0.8).toFixed(1)}x compared to
                      isolated staking. Each SOL staked provides security to{" "}
                      {params.d_star} services simultaneously.
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <Card className="border-amber-400/10">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Cascade Risk
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      At slash_fraction={params.slash_fraction}, the maximum
                      cascade depth is{" "}
                      {Math.ceil(params.d_star * params.slash_fraction * 3)}{" "}
                      hops. Risk is{" "}
                      {params.slash_fraction > 0.3
                        ? "elevated"
                        : params.slash_fraction > 0.15
                        ? "moderate"
                        : "low"}
                      .
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
