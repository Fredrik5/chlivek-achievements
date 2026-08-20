"use client";

export interface TabItem {
  key: string;
  label: string;
  icon: string;
}

interface TabBarProps {
  items: TabItem[];
  active: string;
  onChange: (key: string) => void;
  maxWidth?: number;
}

export function TabBar({ items, active, onChange, maxWidth }: TabBarProps) {
  return (
    <div
      style={{
        display: "flex",
        height: 64,
        flexShrink: 0,
        background: "var(--c-brown-900)",
        borderTop: "1px solid var(--border-default)",
        boxShadow: "0 -6px 20px rgba(0,0,0,0.5)",
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxWidth,
        margin: "0 auto",
        zIndex: 50,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            className="cca-tab"
            onClick={() => onChange(item.key)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isActive ? "var(--accent-gold)" : "var(--text-muted)",
              transition: "transform var(--duration-fast) var(--ease-standard)",
            }}
          >
            <span style={{ font: "16px/1 var(--font-body)" }}>{item.icon}</span>
            <span style={{ font: "var(--text-caption)" }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
