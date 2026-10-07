type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary"; loading?: boolean };

export function Button({ variant = "primary", loading, disabled, className = "", ...p }: Props) {
  return <button {...p} disabled={disabled || loading} aria-busy={loading || undefined} className={`btn btn-${variant} ${className}`} />;
}
