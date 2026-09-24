export function StaffMetricCard({
  label,
  value,
  prominent = false,
}: {
  label: string;
  value: number;
  prominent?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        prominent ? "border-teal-700 ring-1 ring-teal-700" : "border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${prominent ? "text-teal-950" : "text-slate-900"}`}>{value}</p>
    </section>
  );
}
