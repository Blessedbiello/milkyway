"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface DegreeGaugeProps {
  current: number;
  target: number;
  max?: number;
  label?: string;
  size?: number;
  className?: string;
}

export function DegreeGauge({
  current,
  target,
  max,
  label = "Restaking Degree",
  size = 180,
  className,
}: DegreeGaugeProps) {
  const maxVal = max ?? Math.max(target * 1.5, current * 1.2, 10);
  const percentage = Math.min((current / maxVal) * 100, 100);
  const targetPercentage = Math.min((target / maxVal) * 100, 100);

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const targetAngle = (targetPercentage / 100) * 360;

  const atTarget = current >= target;
  const progressColor = atTarget ? "#14F195" : "#9945FF";
  const glowColor = atTarget
    ? "rgba(20, 241, 149, 0.3)"
    : "rgba(153, 69, 255, 0.3)";

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 180 180"
        className="drop-shadow-lg"
      >
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(39, 39, 42, 0.5)"
          strokeWidth="10"
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
        />

        {/* Progress arc */}
        <motion.circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          transform="rotate(-90 90 90)"
          filter="url(#glow)"
          style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
        />

        {/* Target marker */}
        <g transform={`rotate(${targetAngle - 90} 90 90)`}>
          <line
            x1="90"
            y1={90 - radius + 14}
            x2="90"
            y2={90 - radius - 14}
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="2 3"
          />
        </g>

        {/* Center text */}
        <text
          x="90"
          y="80"
          textAnchor="middle"
          fill="white"
          fontSize="28"
          fontWeight="700"
          fontFamily="var(--font-inter), system-ui"
        >
          {current.toFixed(1)}
        </text>
        <text
          x="90"
          y="100"
          textAnchor="middle"
          fill="rgba(161, 161, 170, 1)"
          fontSize="11"
          fontFamily="var(--font-inter), system-ui"
        >
          d* target: {target.toFixed(1)}
        </text>

        {/* Status indicator */}
        <circle
          cx="90"
          cy="120"
          r="4"
          fill={atTarget ? "#14F195" : "#F59E0B"}
        />
        <text
          x="90"
          y="138"
          textAnchor="middle"
          fill={atTarget ? "#14F195" : "#F59E0B"}
          fontSize="9"
          fontWeight="600"
          fontFamily="var(--font-inter), system-ui"
        >
          {atTarget ? "OPTIMAL" : "BELOW TARGET"}
        </text>
      </svg>

      <p className="text-xs font-medium text-zinc-400">{label}</p>
    </div>
  );
}
