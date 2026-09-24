export function Badge({ children }: { children: string }) {
  return (
    <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-teal-900">
      {children}
    </span>
  );
}
