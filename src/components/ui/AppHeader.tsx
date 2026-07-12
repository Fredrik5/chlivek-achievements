interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        height: 64,
        flexShrink: 0,
        padding: "0 var(--space-4)",
        background:
          "linear-gradient(180deg, var(--c-bordeaux-800), var(--c-bordeaux-900))",
        borderBottom: "1px solid var(--border-default)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      }}
    >
      <span style={{ font: "var(--text-display-md)", color: "var(--text-heading)" }}>
        {title}
      </span>
    </div>
  );
}
