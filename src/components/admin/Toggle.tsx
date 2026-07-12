"use client";

export function Toggle({
  checked,
  onChange,
  label,
  size = "md",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  size?: "md" | "sm";
}) {
  const width = size === "md" ? 56 : 44;
  const height = size === "md" ? 32 : 26;
  const thumb = size === "md" ? 26 : 20;
  const inset = (height - thumb) / 2;

  return (
    <button
      onClick={() => onChange(!checked)}
      aria-label={label}
      style={{
        flexShrink: 0,
        width,
        height,
        borderRadius: "var(--radius-pill)",
        border: `1px solid ${checked ? "var(--border-strong)" : "var(--border-default)"}`,
        background: checked ? "var(--status-approved-bg)" : "var(--surface-card-sunken)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: inset,
          left: checked ? width - thumb - inset : inset,
          width: thumb,
          height: thumb,
          borderRadius: "50%",
          background: checked
            ? "linear-gradient(180deg, var(--accent-gold-hover), var(--accent-gold-active))"
            : "var(--c-gray-500)",
          transition: "left var(--duration-fast) var(--ease-standard)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
        }}
      />
    </button>
  );
}
