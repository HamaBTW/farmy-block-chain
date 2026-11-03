import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-field text-field-ink hover:brightness-110",
  secondary: "bg-card text-ink border border-line hover:bg-field-wash",
  danger: "bg-beet text-white hover:brightness-110",
  ghost: "text-ink hover:bg-field-wash",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "md" | "sm" };

export function Button({ variant = "secondary", size = "md", className = "", type = "button", ...props }: Props) {
  const sizing = size === "sm" ? "h-9 px-3 text-sm" : "h-10 px-4 text-sm";
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold ${sizing} ${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
