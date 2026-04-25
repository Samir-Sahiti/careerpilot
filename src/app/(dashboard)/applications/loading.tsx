export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/5" />
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 w-full rounded-xl bg-[#1a1916] border border-white/5" />
        ))}
      </div>
    </div>
  );
}
