export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 text-sm text-slate-600" role="status">
      {label}
    </div>
  );
}
