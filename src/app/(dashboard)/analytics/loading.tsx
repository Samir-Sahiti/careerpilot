export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-32 rounded-lg bg-white/5" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-[#111827] border border-white/5" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-56 rounded-xl bg-[#111827] border border-white/5" />
        <div className="h-56 rounded-xl bg-[#111827] border border-white/5" />
      </div>
    </div>
  );
}
