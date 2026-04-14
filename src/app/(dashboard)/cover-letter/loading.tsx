export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-28 w-full rounded-xl bg-[#111827] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
