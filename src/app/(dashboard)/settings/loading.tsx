export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse max-w-2xl">
      <div className="h-8 w-32 rounded-lg bg-white/5" />
      <div className="rounded-xl border border-white/5 bg-[#111827] p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-white/5" />
        <div className="h-10 w-full rounded-lg bg-white/5" />
        <div className="h-10 w-28 rounded-lg bg-white/5" />
      </div>
    </div>
  );
}
