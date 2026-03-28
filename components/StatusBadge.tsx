interface StatusBadgeProps {
  label: string;
  variant?: "success" | "warning" | "error" | "default";
}

export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[variant]}`}
    >
      {label}
    </span>
  );
}
