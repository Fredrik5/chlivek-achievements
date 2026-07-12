"use client";

export function Modal({
  children,
  onClose,
  maxWidth = 460,
}: {
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: number;
}) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
        background: "var(--surface-overlay)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth,
          maxHeight: "88vh",
          overflowY: "auto",
          background: "var(--surface-card)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
          padding: "var(--space-5)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          font: "var(--text-label-caps)",
          letterSpacing: "var(--tracking-caps)",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
