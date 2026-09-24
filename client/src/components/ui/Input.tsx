import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, className = "", ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="block text-sm font-medium text-slate-800" htmlFor={inputId}>
      {label}
      <input
        {...props}
        id={inputId}
        className={`mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus-visible:border-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-800 ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />
      {error ? (
        <span id={`${inputId}-error`} className="mt-1 block text-sm font-normal text-red-700">
          {error}
        </span>
      ) : null}
    </label>
  );
}
