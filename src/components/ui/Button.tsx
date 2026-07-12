"use client";

import { ButtonHTMLAttributes, CSSProperties } from "react";

type ButtonVariant = "gold" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const SIZE_STYLES: Record<ButtonSize, CSSProperties> = {
  sm: { height: 36, padding: "0 14px", font: "700 13px/1 var(--font-body)" },
  md: { height: 44, padding: "0 18px", font: "700 14px/1 var(--font-body)" },
  lg: { height: 52, padding: "0 22px", font: "700 16px/1 var(--font-body)" },
};

const VARIANT_STYLES: Record<ButtonVariant, CSSProperties> = {
  gold: {
    background:
      "linear-gradient(180deg, var(--accent-gold-hover), var(--accent-gold-active))",
    color: "var(--text-on-gold)",
    border: "1px solid var(--c-gold-800)",
    boxShadow: "var(--shadow-raised)",
  },
  ghost: {
    background: "transparent",
    color: "var(--text-heading)",
    border: "1px solid var(--border-default)",
  },
  danger: {
    background: "var(--c-bordeaux-700)",
    color: "var(--text-on-primary)",
    border: "1px solid var(--c-bordeaux-500)",
  },
};

export function Button({
  variant = "gold",
  size = "md",
  fullWidth = false,
  disabled,
  style,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={["cca-button", className].filter(Boolean).join(" ")}
      style={{
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        width: fullWidth ? "100%" : undefined,
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "transform var(--duration-fast) var(--ease-standard)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
