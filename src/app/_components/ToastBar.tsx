"use client";

export function ToastBar({ message }: { message: string }) {
    if (!message) return null;

    return (
        <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="rounded-lg border bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                {message}
            </div>
        </div>
    );
}