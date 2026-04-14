export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-44 rounded-lg bg-white/5" />
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 w-full rounded-xl bg-[#111827] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
