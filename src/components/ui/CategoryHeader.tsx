interface CategoryHeaderProps {
  title: string;
  count: number;
}

export function CategoryHeader({ title, count }: CategoryHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        padding: "var(--space-2) 0",
      }}
    >
      <span
        style={{
          font: "var(--text-label-caps)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
          textTransform: "uppercase",
        }}
      >
        {title}
      </span>
      <span style={{ font: "var(--text-caption)", color: "var(--text-disabled)" }}>
        {count}
      </span>
    </div>
  );
}
