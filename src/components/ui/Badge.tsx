type BadgeSize = "sm" | "lg";
type BadgeState = "default" | "approved" | "locked";

interface BadgeProps {
  points: number;
  size?: BadgeSize;
  state?: BadgeState;
}

const SIZE_PX: Record<BadgeSize, number> = { sm: 34, lg: 56 };

const STATE_STYLES: Record<
  BadgeState,
  { background: string; border: string; color: string; boxShadow?: string }
> = {
  approved: {
    background:
      "linear-gradient(180deg, var(--accent-gold-hover), var(--accent-gold-active))",
    border: "1px solid var(--c-gold-800)",
    color: "var(--text-on-gold)",
    boxShadow: "var(--status-approved-glow)",
  },
  default: {
    background: "var(--surface-card-sunken)",
    border: "1px solid var(--border-default)",
    color: "var(--accent-gold)",
  },
  locked: {
    background: "var(--surface-card-sunken)",
    border: "1px dashed var(--border-default)",
    color: "var(--text-muted)",
  },
};

export function Badge({ points, size = "sm", state = "default" }: BadgeProps) {
  const px = SIZE_PX[size];
  const st = STATE_STYLES[state];
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: st.background,
        border: st.border,
        color: st.color,
        boxShadow: st.boxShadow,
        font: `400 ${size === "lg" ? 20 : 13}px/1 var(--font-display)`,
      }}
    >
      {points}
    </div>
  );
}
