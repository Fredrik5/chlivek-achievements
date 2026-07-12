type PillStatus = "locked" | "pending" | "approved";

interface StatusPillProps {
  status: PillStatus;
  compact?: boolean;
}

const STATUS_STYLES: Record<
  PillStatus,
  { label: string; background: string; border: string; color: string }
> = {
  locked: {
    label: "Nesplněno",
    background: "var(--status-locked-bg)",
    border: "1px solid var(--status-locked-border)",
    color: "var(--status-locked-fg)",
  },
  pending: {
    label: "Čeká na schválení",
    background: "var(--status-pending-bg)",
    border: "1px solid var(--status-pending-border)",
    color: "var(--status-pending-fg)",
  },
  approved: {
    label: "Schváleno",
    background: "var(--status-approved-bg)",
    border: "1px solid var(--status-approved-border)",
    color: "var(--status-approved-fg)",
  },
};

export function StatusPill({ status, compact = false }: StatusPillProps) {
  const st = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: compact ? "2px 8px" : "4px 10px",
        borderRadius: "var(--radius-pill)",
        background: st.background,
        border: st.border,
        color: st.color,
        font: "var(--text-label-caps)",
        letterSpacing: "var(--tracking-caps)",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {st.label}
    </span>
  );
}
