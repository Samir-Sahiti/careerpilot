export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-white/5" />
      <div className="rounded-xl border border-white/5 bg-[#1a1916] p-6 space-y-4">
        <div className="h-5 w-56 rounded bg-white/5" />
        <div className="h-32 w-full rounded-lg bg-white/5" />
        <div className="h-10 w-28 rounded-lg bg-white/5" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 w-full rounded-xl bg-[#1a1916] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
