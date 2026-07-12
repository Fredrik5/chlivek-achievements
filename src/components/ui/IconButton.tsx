"use client";

import { ButtonHTMLAttributes } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: number;
}

export function IconButton({
  label,
  size = 44,
  style,
  className,
  children,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={["cca-icon-button", className].filter(Boolean).join(" ")}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-default)",
        background: "transparent",
        color: "var(--text-heading)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
        padding: 0,
        transition: "transform var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
