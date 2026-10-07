import { useId } from "react";

type Props = React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string };

export function Input({ label, error, ...p }: Props) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} {...p} className="input" aria-invalid={!!error} aria-describedby={error ? `${id}-e` : undefined} />
      {error && <p id={`${id}-e`} className="small text-destructive">{error}</p>}
    </div>
  );
}
