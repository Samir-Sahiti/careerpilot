export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-40 rounded-lg bg-white/5" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 w-full rounded-xl bg-[#1a1916] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
