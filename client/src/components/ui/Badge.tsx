export function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}
