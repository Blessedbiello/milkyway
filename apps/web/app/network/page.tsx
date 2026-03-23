"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Network,
  Zap,
  AlertTriangle,
  RotateCcw,
  X,
  Shield,
  Activity,
  Server,
  Link2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Mock devnet data
// ---------------------------------------------------------------------------

interface Validator {
  id: string;
  label: string;
  stake: number;
  effectiveStake: number;
}

interface Service {
  id: string;
  label: string;
  status: "active" | "slashed";
  allocated: number;
}

interface Allocation {
  validator: string;
  service: string;
  amount: number;
  effective: number;
}

const INITIAL_VALIDATORS: Validator[] = [
  { id: "v0", label: "Validator 0", stake: 100, effectiveStake: 100 },
  { id: "v1", label: "Validator 1", stake: 100, effectiveStake: 100 },
  { id: "v2", label: "Validator 2", stake: 100, effectiveStake: 20 },
  { id: "v3", label: "Validator 3", stake: 100, effectiveStake: 100 },
  { id: "v4", label: "Validator 4", stake: 100, effectiveStake: 100 },
  { id: "v5", label: "Validator 5", stake: 100, effectiveStake: 100 },
];

const INITIAL_SERVICES: Service[] = [
  { id: "s0", label: "Oracle Network", status: "active", allocated: 300 },
  { id: "s1", label: "Bridge Protocol", status: "active", allocated: 280 },
  { id: "s2", label: "DEX Sequencer", status: "slashed", allocated: 0 },
  { id: "s3", label: "Data Availability", status: "active", allocated: 200 },
];

const INITIAL_ALLOCATIONS: Allocation[] = [
  { validator: "v0", service: "s0", amount: 100, effective: 100 },
  { validator: "v0", service: "s2", amount: 80, effective: 0 },
  { validator: "v1", service: "s0", amount: 100, effective: 100 },
  { validator: "v1", service: "s1", amount: 100, effective: 100 },
  { validator: "v2", service: "s1", amount: 80, effective: 20 },
  { validator: "v2", service: "s2", amount: 80, effective: 0 },
  { validator: "v3", service: "s1", amount: 100, effective: 100 },
  { validator: "v3", service: "s3", amount: 100, effective: 100 },
  { validator: "v4", service: "s3", amount: 100, effective: 100 },
  { validator: "v4", service: "s0", amount: 100, effective: 100 },
  { validator: "v5", service: "s2", amount: 80, effective: 0 },
  { validator: "v5", service: "s3", amount: 100, effective: 100 },
];

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const SVG_W = 900;
const SVG_H = 520;
const V_X = 160;
const S_X = 740;
const Y_PAD = 60;
const NODE_R_MIN = 18;
const NODE_R_MAX = 30;
const SERVICE_W = 120;
const SERVICE_H = 40;

function validatorY(index: number, total: number) {
  const usable = SVG_H - 2 * Y_PAD;
  const gap = usable / (total - 1 || 1);
  return Y_PAD + index * gap;
}

function serviceY(index: number, total: number) {
  const usable = SVG_H - 2 * Y_PAD;
  const gap = usable / (total - 1 || 1);
  return Y_PAD + index * gap;
}

// ---------------------------------------------------------------------------
// Types for selection
// ---------------------------------------------------------------------------

type Selection =
  | { type: "validator"; id: string }
  | { type: "service"; id: string }
  | { type: "edge"; validator: string; service: string }
  | null;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NetworkPage() {
  const [validators, setValidators] = useState<Validator[]>(INITIAL_VALIDATORS);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [allocations, setAllocations] = useState<Allocation[]>(INITIAL_ALLOCATIONS);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [slashTarget, setSlashTarget] = useState<string>("");
  const [isSlashing, setIsSlashing] = useState(false);

  // Derived: connected edges for highlight
  const connectedEdges = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const set = new Set<string>();
    allocations.forEach((a) => {
      if (a.validator === hoveredNode || a.service === hoveredNode) {
        set.add(`${a.validator}-${a.service}`);
        set.add(a.validator);
        set.add(a.service);
      }
    });
    return set;
  }, [hoveredNode, allocations]);

  // Summary stats
  const stats = useMemo(() => {
    const totalStaked = validators.reduce((s, v) => s + v.stake, 0);
    const totalEffective = validators.reduce((s, v) => s + v.effectiveStake, 0);
    const degrees = validators.map(
      (v) => allocations.filter((a) => a.validator === v.id).length
    );
    const avgDegree =
      degrees.length > 0
        ? (degrees.reduce((a, b) => a + b, 0) / degrees.length).toFixed(1)
        : "0";
    const securityScore = totalStaked > 0 ? Math.round((totalEffective / totalStaked) * 100) : 0;
    return {
      totalValidators: validators.length,
      totalServices: services.length,
      totalStaked,
      avgDegree,
      securityScore,
    };
  }, [validators, services, allocations]);

  // ---------------------------------------------------------------------------
  // Slash simulation
  // ---------------------------------------------------------------------------

  const handleSlash = useCallback(() => {
    if (!slashTarget) return;
    setIsSlashing(true);

    // Find affected allocations
    const affected = INITIAL_ALLOCATIONS.filter((a) => a.service === slashTarget);
    const affectedValidatorIds = new Set(affected.map((a) => a.validator));

    // Update service
    setServices((prev) =>
      prev.map((s) =>
        s.id === slashTarget ? { ...s, status: "slashed" as const, allocated: 0 } : s
      )
    );

    // Update allocations: zero out effective for this service
    setAllocations((prev) =>
      prev.map((a) => (a.service === slashTarget ? { ...a, effective: 0 } : a))
    );

    // Update validators: recalculate effective stake
    setValidators((prev) =>
      prev.map((v) => {
        if (!affectedValidatorIds.has(v.id)) return v;
        // effective = sum of effective allocations
        const newEffective = INITIAL_ALLOCATIONS
          .filter((a) => a.validator === v.id)
          .reduce((sum, a) => {
            if (a.service === slashTarget) return sum;
            return sum + a.effective;
          }, 0);
        return { ...v, effectiveStake: Math.max(0, newEffective) };
      })
    );

    setTimeout(() => setIsSlashing(false), 600);
  }, [slashTarget]);

  const handleReset = useCallback(() => {
    setValidators(INITIAL_VALIDATORS);
    setServices(INITIAL_SERVICES);
    setAllocations(INITIAL_ALLOCATIONS);
    setSelection(null);
    setSlashTarget("");
    setIsSlashing(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Detail panel content
  // ---------------------------------------------------------------------------

  const detailContent = useMemo(() => {
    if (!selection) return null;

    if (selection.type === "validator") {
      const v = validators.find((x) => x.id === selection.id);
      if (!v) return null;
      const allocs = allocations.filter((a) => a.validator === v.id);
      const degree = allocs.length;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-purple-500" />
            <span className="font-semibold text-white">{v.label}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Stake</p>
              <p className="font-mono text-zinc-200">{v.stake} SOL</p>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Effective</p>
              <p className="font-mono text-zinc-200">{v.effectiveStake} SOL</p>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Degree</p>
              <p className="font-mono text-zinc-200">{degree}</p>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Utilization</p>
              <p className="font-mono text-zinc-200">
                {v.stake > 0 ? Math.round((v.effectiveStake / v.stake) * 100) : 0}%
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">Allocations</p>
            {allocs.map((a) => {
              const svc = services.find((s) => s.id === a.service);
              return (
                <div
                  key={a.service}
                  className="flex items-center justify-between rounded bg-surface-2/60 px-2 py-1 text-xs"
                >
                  <span className="text-zinc-300">{svc?.label}</span>
                  <span className="font-mono text-zinc-400">
                    {a.effective}/{a.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selection.type === "service") {
      const s = services.find((x) => x.id === selection.id);
      if (!s) return null;
      const allocs = allocations.filter((a) => a.service === s.id);
      const validatorCount = allocs.length;
      const totalAllocated = allocs.reduce((sum, a) => sum + a.effective, 0);
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className={`h-3 w-3 rounded ${
                s.status === "active" ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="font-semibold text-white">{s.label}</span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium ${
                s.status === "active"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {s.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Validators</p>
              <p className="font-mono text-zinc-200">{validatorCount}</p>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Allocated</p>
              <p className="font-mono text-zinc-200">{totalAllocated} SOL</p>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-zinc-400">Validators</p>
            {allocs.map((a) => {
              const val = validators.find((v) => v.id === a.validator);
              return (
                <div
                  key={a.validator}
                  className="flex items-center justify-between rounded bg-surface-2/60 px-2 py-1 text-xs"
                >
                  <span className="text-zinc-300">{val?.label}</span>
                  <span className="font-mono text-zinc-400">
                    {a.effective}/{a.amount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (selection.type === "edge") {
      const a = allocations.find(
        (x) => x.validator === selection.validator && x.service === selection.service
      );
      if (!a) return null;
      const val = validators.find((v) => v.id === a.validator);
      const svc = services.find((s) => s.id === a.service);
      const ratio = a.amount > 0 ? a.effective / a.amount : 0;
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-zinc-400" />
            <span className="font-semibold text-white">Allocation</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">From</p>
              <p className="text-zinc-200">{val?.label}</p>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">To</p>
              <p className="text-zinc-200">{svc?.label}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-zinc-500">Amount</p>
                <p className="font-mono text-zinc-200">{a.amount} SOL</p>
              </div>
              <div className="rounded-lg bg-surface-2 px-3 py-2">
                <p className="text-zinc-500">Effective</p>
                <p className="font-mono text-zinc-200">{a.effective} SOL</p>
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 px-3 py-2">
              <p className="text-zinc-500">Effectiveness</p>
              <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                <motion.div
                  className={`h-full rounded-full ${
                    ratio > 0.5 ? "bg-green-500" : ratio > 0 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${ratio * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="mt-1 text-right font-mono text-zinc-400">
                {Math.round(ratio * 100)}%
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }, [selection, validators, services, allocations]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3 sm:grid-cols-5"
      >
        {[
          {
            label: "Validators",
            value: stats.totalValidators,
            icon: Server,
            color: "text-purple-400",
          },
          {
            label: "Services",
            value: stats.totalServices,
            icon: Activity,
            color: "text-green-400",
          },
          {
            label: "Total Staked",
            value: `${stats.totalStaked} SOL`,
            icon: Shield,
            color: "text-solana-cyan",
          },
          {
            label: "Avg Degree",
            value: stats.avgDegree,
            icon: Link2,
            color: "text-amber-400",
          },
          {
            label: "Security Score",
            value: `${stats.securityScore}%`,
            icon: Shield,
            color:
              stats.securityScore >= 80
                ? "text-green-400"
                : stats.securityScore >= 50
                  ? "text-amber-400"
                  : "text-red-400",
          },
        ].map((stat) => (
          <Card key={stat.label} className="px-4 py-3">
            <div className="flex items-center gap-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[11px] text-zinc-500">{stat.label}</span>
            </div>
            <p className="mt-1 font-mono text-lg font-semibold text-white">
              {stat.value}
            </p>
          </Card>
        ))}
      </motion.div>

      {/* Main layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Graph Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card className="relative overflow-hidden p-0">
            <svg
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              className="h-full w-full"
              style={{ minHeight: 500 }}
            >
              <defs>
                {/* Glow filters */}
                <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter id="glow-red" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Background grid pattern */}
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="rgba(255,255,255,0.02)"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>

              {/* Background */}
              <rect width={SVG_W} height={SVG_H} fill="url(#grid)" />

              {/* Column labels */}
              <text
                x={V_X}
                y={28}
                textAnchor="middle"
                fill="#a78bfa"
                fontSize="13"
                fontWeight="600"
                letterSpacing="0.05em"
              >
                VALIDATORS
              </text>
              <text
                x={S_X}
                y={28}
                textAnchor="middle"
                fill="#4ade80"
                fontSize="13"
                fontWeight="600"
                letterSpacing="0.05em"
              >
                SERVICES
              </text>

              {/* Edges */}
              {allocations.map((alloc) => {
                const vi = validators.findIndex((v) => v.id === alloc.validator);
                const si = services.findIndex((s) => s.id === alloc.service);
                if (vi === -1 || si === -1) return null;

                const svc = services[si];
                const x1 = V_X;
                const y1 = validatorY(vi, validators.length);
                const x2 = S_X;
                const y2 = serviceY(si, services.length);

                const edgeKey = `${alloc.validator}-${alloc.service}`;
                const thickness = Math.max(1, (alloc.amount / 100) * 3);
                const ratio = alloc.amount > 0 ? alloc.effective / alloc.amount : 0;
                const isSlashed = svc.status === "slashed" || ratio === 0;
                const isHighlighted =
                  hoveredNode !== null && connectedEdges.has(edgeKey);
                const isDimmed = hoveredNode !== null && !connectedEdges.has(edgeKey);
                const isSelected =
                  selection?.type === "edge" &&
                  selection.validator === alloc.validator &&
                  selection.service === alloc.service;

                // Curved path for a nicer look
                const mx = (x1 + x2) / 2;
                const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

                return (
                  <motion.path
                    key={edgeKey}
                    d={path}
                    fill="none"
                    stroke={isSlashed ? "#ef4444" : isSelected ? "#c084fc" : "#a855f7"}
                    strokeWidth={isHighlighted ? thickness + 1 : thickness}
                    strokeDasharray={isSlashed ? "6 4" : "none"}
                    initial={{ opacity: 0, pathLength: 0 }}
                    animate={{
                      opacity: isDimmed ? 0.08 : isSlashed ? 0.25 : ratio * 0.6 + 0.15,
                      pathLength: 1,
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="cursor-pointer"
                    style={{ pointerEvents: "stroke" }}
                    strokeLinecap="round"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({
                        type: "edge",
                        validator: alloc.validator,
                        service: alloc.service,
                      });
                    }}
                    onMouseEnter={() => {
                      setHoveredNode(alloc.validator);
                    }}
                    onMouseLeave={() => setHoveredNode(null)}
                  />
                );
              })}

              {/* Validator nodes */}
              {validators.map((v, i) => {
                const cx = V_X;
                const cy = validatorY(i, validators.length);
                const r = NODE_R_MIN + ((v.stake / 100) * (NODE_R_MAX - NODE_R_MIN));
                const effectiveRatio = v.stake > 0 ? v.effectiveStake / v.stake : 0;
                const innerR = r * effectiveRatio;
                const isHovered = hoveredNode === v.id;
                const isDimmed =
                  hoveredNode !== null && !connectedEdges.has(v.id);
                const isSelected =
                  selection?.type === "validator" && selection.id === v.id;

                return (
                  <g
                    key={v.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: "validator", id: v.id });
                    }}
                    onMouseEnter={() => setHoveredNode(v.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    {/* Outer ring (total stake) */}
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      initial={{ r: 0 }}
                      animate={{
                        r: isHovered ? r + 3 : r,
                        opacity: isDimmed ? 0.2 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      fill="rgba(168, 85, 247, 0.15)"
                      stroke={isSelected ? "#e9d5ff" : "#a855f7"}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={isHovered ? "url(#glow-purple)" : undefined}
                    />
                    {/* Inner circle (effective stake) */}
                    <motion.circle
                      cx={cx}
                      cy={cy}
                      initial={{ r: 0 }}
                      animate={{
                        r: innerR,
                        opacity: isDimmed ? 0.2 : 1,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      fill="#a855f7"
                    />
                    {/* Label */}
                    <motion.text
                      x={cx}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize="10"
                      fontWeight="600"
                      animate={{ opacity: isDimmed ? 0.2 : 1 }}
                      style={{ pointerEvents: "none" }}
                    >
                      V{i}
                    </motion.text>
                    {/* Hover tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.g
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                        >
                          <rect
                            x={cx - 70}
                            y={cy - r - 38}
                            width={140}
                            height={28}
                            rx={6}
                            fill="rgba(15,15,20,0.95)"
                            stroke="rgba(168,85,247,0.3)"
                            strokeWidth={1}
                          />
                          <text
                            x={cx}
                            y={cy - r - 20}
                            textAnchor="middle"
                            fill="#e4e4e7"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {v.label} | {v.effectiveStake}/{v.stake} SOL
                          </text>
                        </motion.g>
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}

              {/* Service nodes */}
              {services.map((s, i) => {
                const cx = S_X;
                const cy = serviceY(i, services.length);
                const halfW = SERVICE_W / 2;
                const halfH = SERVICE_H / 2;
                const isActive = s.status === "active";
                const isHovered = hoveredNode === s.id;
                const isDimmed =
                  hoveredNode !== null && !connectedEdges.has(s.id);
                const isSelected =
                  selection?.type === "service" && selection.id === s.id;

                const color = isActive ? "#22c55e" : "#ef4444";
                const bgColor = isActive
                  ? "rgba(34, 197, 94, 0.1)"
                  : "rgba(239, 68, 68, 0.1)";
                const filterName = isActive ? "url(#glow-green)" : "url(#glow-red)";

                return (
                  <g
                    key={s.id}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelection({ type: "service", id: s.id });
                    }}
                    onMouseEnter={() => setHoveredNode(s.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                  >
                    <motion.rect
                      x={cx - halfW}
                      y={cy - halfH}
                      width={SERVICE_W}
                      height={SERVICE_H}
                      rx={8}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{
                        opacity: isDimmed ? 0.2 : 1,
                        scale: isHovered ? 1.05 : 1,
                        fill: bgColor,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      stroke={isSelected ? "#fff" : color}
                      strokeWidth={isSelected ? 2 : 1.5}
                      filter={isHovered ? filterName : undefined}
                    />
                    {/* Status dot */}
                    <motion.circle
                      cx={cx - halfW + 14}
                      cy={cy}
                      r={4}
                      fill={color}
                      animate={{
                        opacity: isDimmed ? 0.2 : 1,
                        scale: isActive ? [1, 1.3, 1] : 1,
                      }}
                      transition={
                        isActive
                          ? { scale: { repeat: Infinity, duration: 2, ease: "easeInOut" } }
                          : {}
                      }
                    />
                    {/* Label */}
                    <motion.text
                      x={cx + 4}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isDimmed ? "rgba(255,255,255,0.2)" : "#e4e4e7"}
                      fontSize="11"
                      fontWeight="500"
                      style={{ pointerEvents: "none" }}
                    >
                      {s.label}
                    </motion.text>
                    {/* Hover tooltip */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.g
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                        >
                          <rect
                            x={cx - 75}
                            y={cy + halfH + 8}
                            width={150}
                            height={28}
                            rx={6}
                            fill="rgba(15,15,20,0.95)"
                            stroke={`${color}44`}
                            strokeWidth={1}
                          />
                          <text
                            x={cx}
                            y={cy + halfH + 26}
                            textAnchor="middle"
                            fill="#a1a1aa"
                            fontSize="10"
                            fontFamily="monospace"
                          >
                            {s.status} | {s.allocated} SOL allocated
                          </text>
                        </motion.g>
                      )}
                    </AnimatePresence>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex items-center gap-4 rounded-lg border border-zinc-800/60 bg-surface-1/90 px-3 py-2 text-[10px] text-zinc-500 backdrop-blur">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-purple-500" />
                Validator
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded bg-green-500" />
                Active Service
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded bg-red-500" />
                Slashed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-4 w-4 border-t-2 border-dashed border-red-400" />
                Slashed Edge
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Right Panel: Simulator + Detail */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Slash Simulator */}
          <Card>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              Slash Simulator
            </CardTitle>
            <CardDescription className="mt-1">
              Simulate slashing a service to see cascading effects on validators
            </CardDescription>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-400">
                  Target Service
                </label>
                <select
                  value={slashTarget}
                  onChange={(e) => setSlashTarget(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-surface-2 px-3 py-2 text-sm text-zinc-200 outline-none transition-colors focus:border-solana-purple/50"
                >
                  <option value="">Select service...</option>
                  {services
                    .filter((s) => s.status === "active")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label} ({s.allocated} SOL)
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="md"
                  className="flex-1"
                  disabled={!slashTarget || isSlashing}
                  onClick={handleSlash}
                >
                  <Zap className="h-4 w-4" />
                  {isSlashing ? "Slashing..." : "Simulate Slash"}
                </Button>
                <Button variant="secondary" size="md" onClick={handleReset}>
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </Card>

          {/* Detail Panel */}
          <AnimatePresence mode="wait">
            {selection && detailContent ? (
              <motion.div
                key={JSON.stringify(selection)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Details</CardTitle>
                    <button
                      onClick={() => setSelection(null)}
                      className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-surface-2 hover:text-zinc-300"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3">{detailContent}</div>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="border-dashed">
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Network className="mb-2 h-8 w-8 text-zinc-700" />
                    <p className="text-sm text-zinc-500">
                      Click a node or edge to inspect
                    </p>
                    <p className="mt-1 text-xs text-zinc-600">
                      Hover to highlight connections
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validator List */}
          <Card>
            <CardTitle className="text-base">Validators</CardTitle>
            <div className="mt-3 space-y-1.5">
              {validators.map((v, i) => {
                const ratio = v.stake > 0 ? v.effectiveStake / v.stake : 0;
                const degree = allocations.filter(
                  (a) => a.validator === v.id
                ).length;
                return (
                  <button
                    key={v.id}
                    onClick={() =>
                      setSelection({ type: "validator", id: v.id })
                    }
                    onMouseEnter={() => setHoveredNode(v.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="flex w-full items-center gap-3 rounded-lg bg-surface-2/50 px-3 py-2 text-left transition-all hover:bg-surface-2"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{
                        background: `conic-gradient(#a855f7 ${ratio * 360}deg, rgba(168,85,247,0.2) ${ratio * 360}deg)`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-zinc-300">
                        {v.label}
                      </p>
                      <p className="text-[10px] text-zinc-600">
                        d={degree} | {v.effectiveStake}/{v.stake} SOL
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-medium ${
                        ratio >= 0.8
                          ? "text-green-400"
                          : ratio >= 0.4
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    >
                      {Math.round(ratio * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
