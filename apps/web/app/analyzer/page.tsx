"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Play,
  Shield,
  TrendingUp,
  AlertTriangle,
  Activity,
  Settings2,
  Loader2,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  generateFigure3Data,
  generateFigure5Data,
  generateFigure6Data,
  computeOptimalDegree,
} from "@/lib/analyzer/optimal-degree";
import type {
  Figure3Point,
  Figure5Point,
  Figure6Point,
  OptimalDegreeResult,
} from "@/lib/analyzer/optimal-degree";

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
    label: "Validators (n)",
    key: "numValidators",
    min: 5,
    max: 200,
    step: 5,
    defaultValue: 50,
    unit: "",
    description: "Total validators in the network",
  },
  {
    label: "Services (m)",
    key: "numServices",
    min: 2,
    max: 50,
    step: 1,
    defaultValue: 10,
    unit: "",
    description: "Total services requiring security",
  },
  {
    label: "Stake per Validator",
    key: "stakePerValidator",
    min: 100,
    max: 50000,
    step: 100,
    defaultValue: 10000,
    unit: " SOL",
    description: "Stake each validator commits",
  },
  {
    label: "Attack Threshold",
    key: "attackThreshold",
    min: 1000,
    max: 100000,
    step: 1000,
    defaultValue: 15000,
    unit: " SOL",
    description: "Minimum stake threshold per service",
  },
  {
    label: "Attack Prize",
    key: "attackPrize",
    min: 1000,
    max: 200000,
    step: 1000,
    defaultValue: 50000,
    unit: " SOL",
    description: "Prize an attacker gains per service",
  },
  {
    label: "Max Degree",
    key: "maxDegree",
    min: 2,
    max: 30,
    step: 1,
    defaultValue: 10,
    unit: "",
    description: "Maximum restaking degree to analyze",
  },
];

interface ComputeResults {
  figure3: Figure3Point[];
  figure5: Figure5Point[];
  figure6: Figure6Point[];
  optimal: OptimalDegreeResult;
}

const figures = [
  {
    id: "fig3",
    title: "Figure 3: Min Stake vs Restaking Degree",
    short: "Figure 3",
    description:
      "Minimum per-validator stake for network security at each restaking degree. The interior minimum reveals the optimal degree d*.",
    color: "text-purple-400",
  },
  {
    id: "fig5",
    title: "Figure 5: Failure Threshold vs Degree",
    short: "Figure 5",
    description:
      "Fraction of total stake an attacker must spend to mount a profitable attack. Higher is more secure.",
    color: "text-green-400",
  },
  {
    id: "fig6",
    title: "Figure 6: Base Service Synergy",
    short: "Figure 6",
    description:
      "Compares failure thresholds with and without a base service. Demonstrates the security amplification from adding a shared base layer.",
    color: "text-cyan-400",
  },
];

const chartColors = {
  primary: "#a855f7",
  secondary: "#22c55e",
  tertiary: "#06b6d4",
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(24, 24, 27, 0.95)",
    border: "1px solid rgba(63, 63, 70, 0.5)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#d4d4d8",
  },
  labelStyle: { color: "#a1a1aa", fontWeight: 600 },
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(n < 1 ? 4 : 1);
}

export default function AnalyzerPage() {
  const [params, setParams] = useState<Record<string, number>>(
    Object.fromEntries(parameters.map((p) => [p.key, p.defaultValue]))
  );
  const [activeFigure, setActiveFigure] = useState("fig3");
  const [isComputing, setIsComputing] = useState(false);
  const [results, setResults] = useState<ComputeResults | null>(null);
  const [computeTime, setComputeTime] = useState<number | null>(null);

  const handleCompute = useCallback(() => {
    setIsComputing(true);

    // Use setTimeout to let the UI update with loading state before blocking
    setTimeout(() => {
      const start = performance.now();
      try {
        const baseParams = {
          numValidators: params.numValidators,
          numServices: params.numServices,
          stakePerValidator: params.stakePerValidator,
          attackThreshold: params.attackThreshold,
          attackPrize: params.attackPrize,
          maxDegree: params.maxDegree,
        };

        const figure3 = generateFigure3Data(baseParams);
        const figure5 = generateFigure5Data(baseParams);
        const figure6 = generateFigure6Data(baseParams);
        const optimal = computeOptimalDegree(baseParams);

        const elapsed = performance.now() - start;
        setResults({ figure3, figure5, figure6, optimal });
        setComputeTime(elapsed);
      } catch (err) {
        console.error("Computation error:", err);
      } finally {
        setIsComputing(false);
      }
    }, 16);
  }, [params]);

  const handleReset = useCallback(() => {
    setParams(
      Object.fromEntries(parameters.map((p) => [p.key, p.defaultValue]))
    );
    setResults(null);
    setComputeTime(null);
  }, []);

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
          Interactive analysis of Milky Way security properties from
          Bar-Zur & Eyal, ACM CCS &apos;25
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
                onClick={handleCompute}
                disabled={isComputing}
              >
                {isComputing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Computing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Compute Analysis
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={handleReset}
              >
                Reset Defaults
              </Button>
              {computeTime !== null && (
                <p className="text-center text-[10px] text-zinc-600">
                  Computed in {computeTime.toFixed(0)}ms
                </p>
              )}
            </div>
          </Card>

          {/* Optimal Degree Display */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-solana-purple/20">
                <Zap className="mx-auto mb-2 h-8 w-8 text-solana-purple" />
                <p className="text-center text-xs font-medium text-zinc-400">
                  Optimal Restaking Degree
                </p>
                <p className="text-center text-4xl font-bold text-white">
                  d* = {results.optimal.optimalDegree}
                </p>
                <p className="mt-2 text-center text-xs text-zinc-500">
                  Robustness at d*:{" "}
                  <span className="font-mono text-solana-green">
                    {formatNumber(results.optimal.robustnessAtOptimal)} SOL
                  </span>
                </p>
              </Card>
            </motion.div>
          )}

          {/* Security Score */}
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card
                className={cn(
                  "text-center",
                  results.optimal.robustnessAtOptimal >
                    params.attackPrize * params.numServices
                    ? "border-solana-green/20"
                    : results.optimal.robustnessAtOptimal > params.attackPrize
                    ? "border-amber-400/20"
                    : "border-red-500/20"
                )}
              >
                <Shield
                  className={cn(
                    "mx-auto mb-2 h-8 w-8",
                    results.optimal.robustnessAtOptimal >
                      params.attackPrize * params.numServices
                      ? "text-solana-green"
                      : results.optimal.robustnessAtOptimal > params.attackPrize
                      ? "text-amber-400"
                      : "text-red-400"
                  )}
                />
                <p className="text-xs font-medium text-zinc-400">
                  Network Security
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {results.optimal.robustnessAtOptimal >
                  params.attackPrize * params.numServices
                    ? "Secure against all attack subsets"
                    : results.optimal.robustnessAtOptimal > params.attackPrize
                    ? "Secure against single-service attacks"
                    : "Vulnerable - increase stake or reduce services"}
                </p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      results.optimal.robustnessAtOptimal >
                        params.attackPrize * params.numServices
                        ? "bg-solana-green"
                        : results.optimal.robustnessAtOptimal >
                          params.attackPrize
                        ? "bg-amber-400"
                        : "bg-red-500"
                    )}
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, (results.optimal.robustnessAtOptimal / (params.attackPrize * params.numServices)) * 100)}%`,
                    }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </Card>
            </motion.div>
          )}
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
            {figures.map((fig) => (
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
                {fig.short}
              </button>
            ))}
          </div>

          {/* Chart Display */}
          <Card className="min-h-[480px] relative overflow-hidden">
            {/* Figure 3 */}
            <div
              className={cn(
                "transition-opacity duration-300",
                activeFigure === "fig3"
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none absolute inset-0"
              )}
            >
              <h3 className="text-base font-semibold text-purple-400">
                {figures[0].title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-lg">
                {figures[0].description}
              </p>
              <div className="mt-4 h-[360px]">
                {!results ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.figure3}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(63, 63, 70, 0.3)"
                      />
                      <XAxis
                        dataKey="degree"
                        stroke="#71717a"
                        fontSize={11}
                        label={{
                          value: "Restaking Degree (d)",
                          position: "insideBottom",
                          offset: -5,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickFormatter={(v: number) => formatNumber(v)}
                        label={{
                          value: "Min Stake (SOL)",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number) => [
                          `${formatNumber(value)} SOL`,
                          "Min Stake",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="minStake"
                        name="Minimum Stake"
                        stroke={chartColors.primary}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: chartColors.primary }}
                        activeDot={{ r: 5, fill: chartColors.primary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Figure 5 */}
            <div
              className={cn(
                "transition-opacity duration-300",
                activeFigure === "fig5"
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none absolute inset-0"
              )}
            >
              <h3 className="text-base font-semibold text-green-400">
                {figures[1].title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-lg">
                {figures[1].description}
              </p>
              <div className="mt-4 h-[360px]">
                {!results ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.figure5}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(63, 63, 70, 0.3)"
                      />
                      <XAxis
                        dataKey="degree"
                        stroke="#71717a"
                        fontSize={11}
                        label={{
                          value: "Restaking Degree (d)",
                          position: "insideBottom",
                          offset: -5,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickFormatter={(v: number) => v.toFixed(3)}
                        label={{
                          value: "Failure Threshold",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number) => [
                          value.toFixed(4),
                          "Failure Threshold",
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="failureThreshold"
                        name="Failure Threshold"
                        stroke={chartColors.secondary}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: chartColors.secondary }}
                        activeDot={{ r: 5, fill: chartColors.secondary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Figure 6 */}
            <div
              className={cn(
                "transition-opacity duration-300",
                activeFigure === "fig6"
                  ? "opacity-100"
                  : "opacity-0 pointer-events-none absolute inset-0"
              )}
            >
              <h3 className="text-base font-semibold text-cyan-400">
                {figures[2].title}
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-lg">
                {figures[2].description}
              </p>
              <div className="mt-4 h-[360px]">
                {!results ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={results.figure6}
                      margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(63, 63, 70, 0.3)"
                      />
                      <XAxis
                        dataKey="degree"
                        stroke="#71717a"
                        fontSize={11}
                        label={{
                          value: "Restaking Degree (d)",
                          position: "insideBottom",
                          offset: -5,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickFormatter={(v: number) => v.toFixed(3)}
                        label={{
                          value: "Failure Threshold",
                          angle: -90,
                          position: "insideLeft",
                          offset: 10,
                          style: { fill: "#a1a1aa", fontSize: 11 },
                        }}
                      />
                      <Tooltip
                        {...tooltipStyle}
                        formatter={(value: number, name: string) => [
                          value.toFixed(4),
                          name,
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, color: "#a1a1aa" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="withoutBase"
                        name="Without Base Service"
                        stroke={chartColors.primary}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: chartColors.primary }}
                        activeDot={{ r: 5, fill: chartColors.primary }}
                      />
                      <Line
                        type="monotone"
                        dataKey="withBase"
                        name="With Base Service"
                        stroke={chartColors.tertiary}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: chartColors.tertiary }}
                        activeDot={{ r: 5, fill: chartColors.tertiary }}
                        strokeDasharray="5 3"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Parameter readout */}
            <div className="mt-4 flex flex-wrap gap-3">
              <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                n={params.numValidators}
              </span>
              <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                m={params.numServices}
              </span>
              <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                sigma={params.stakePerValidator}
              </span>
              <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                pi={params.attackPrize}
              </span>
              <span className="rounded bg-surface-2 px-2 py-1 text-[10px] font-mono text-zinc-500">
                maxDeg={params.maxDegree}
              </span>
            </div>
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
                      {results ? (
                        <>
                          At optimal d*={results.optimal.optimalDegree}, the
                          network requires{" "}
                          {formatNumber(results.optimal.robustnessAtOptimal)} SOL
                          to attack versus{" "}
                          {formatNumber(params.attackPrize * params.numServices)}{" "}
                          SOL total prize.{" "}
                          {results.optimal.robustnessAtOptimal >
                          params.attackPrize * params.numServices
                            ? "Attack is unprofitable."
                            : "Consider increasing validator stake."}
                        </>
                      ) : (
                        <>
                          Click &quot;Compute Analysis&quot; to see how elastic
                          restaking amplifies security across the network.
                        </>
                      )}
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
                      Degree Sensitivity
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {results ? (
                        <>
                          The optimal degree d*={results.optimal.optimalDegree}{" "}
                          balances security amplification against concentration
                          risk. Over-restaking (d &gt; d*) reduces the attack
                          cost as validators become correlated across too many
                          services.
                        </>
                      ) : (
                        <>
                          Tune parameters and compute to analyze the tradeoff
                          between restaking breadth and concentration risk.
                        </>
                      )}
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

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-zinc-800/40 bg-surface-2/30">
      <div className="text-center">
        <BarChart3 className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
        <p className="text-sm text-zinc-500">
          Configure parameters and click Compute
        </p>
        <p className="mt-1 text-[10px] text-zinc-600">
          Charts render real data from the analyzer package
        </p>
      </div>
    </div>
  );
}
