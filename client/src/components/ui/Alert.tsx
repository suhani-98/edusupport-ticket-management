export function Alert({ children, tone = "error" }: { children: string; tone?: "error" | "success" }) {
  const styles =
    tone === "success"
      ? "border-teal-200 bg-teal-50 text-teal-900"
      : "border-red-200 bg-red-50 text-red-800";
  return (
    <p role="alert" className={`rounded-md border px-3 py-2 text-sm ${styles}`}>
      {children}
    </p>
  );
}
