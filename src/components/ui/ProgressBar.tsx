interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  sublabel?: string;
}

export function ProgressBar({ value, max, label, sublabel }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {(label || sublabel) && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          {label && (
            <span
              style={{
                font: "var(--text-label-caps)",
                letterSpacing: "var(--tracking-caps)",
                color: "var(--text-muted)",
              }}
            >
              {label}
            </span>
          )}
          {sublabel && (
            <span style={{ font: "var(--text-caption)", color: "var(--text-muted)" }}>
              {sublabel}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: 8,
          borderRadius: "var(--radius-pill)",
          background: "var(--surface-card-sunken)",
          boxShadow: "var(--shadow-inset-sunken)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: "var(--radius-pill)",
            background:
              "linear-gradient(90deg, var(--accent-gold-hover), var(--accent-gold))",
            transition: "width var(--duration-slow) var(--ease-standard)",
          }}
        />
      </div>
    </div>
  );
}
