export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="rounded-xl border border-white/5 bg-[#111827] p-6 space-y-4">
        <div className="h-5 w-32 rounded bg-white/5" />
        <div className="h-40 w-full rounded-lg bg-white/5" />
      </div>
    </div>
  );
}
