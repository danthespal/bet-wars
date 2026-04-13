"use client";

function inferKind(message: string): "success" | "error" | "info" {
  const m = message.toLowerCase();
  if (m.includes("failed") || m.includes("error")) return "error";
  if (m.includes("✅") || m.includes("ticket placed") || m.includes("reset ✅")) return "success";
  return "info";
}

export function ToastBar({ message }: { message: string }) {
  if (!message) return null;

  const kind = inferKind(message);

  const tone =
    kind === "success"
      ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
      : kind === "error"
        ? "bg-rose-50 text-rose-900 ring-rose-200"
        : "bg-white text-slate-700 ring-slate-200";

  const icon = kind === "success" ? "✓" : kind === "error" ? "×" : "⏳";

  return (
    <div className="mx-auto max-w-6xl px-4 pb-3">
      <div className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm shadow-sm ring-1 ${tone}`}>
        <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/60 ring-1 ring-slate-200">
          {icon}
        </span>
        <div className="min-w-0 truncate">{message}</div>
      </div>
    </div>
  );
}