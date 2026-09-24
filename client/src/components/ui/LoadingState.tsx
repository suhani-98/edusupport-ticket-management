export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center text-sm text-slate-600" role="status">
      {label}
    </div>
  );
}
