export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Title Skeleton */}
      <div>
        <div className="h-9 w-64 bg-[#2d2a26]/50 rounded-lg"></div>
        <div className="h-4 w-80 bg-[#1a1916] rounded mt-3"></div>
      </div>

      {/* 2x2 Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="h-[200px] bg-[#1a1916] border border-[#2d2a26]/50 rounded-2xl"></div>
        <div className="h-[200px] bg-[#1a1916] border border-[#2d2a26]/50 rounded-2xl"></div>
        <div className="h-[250px] bg-[#1a1916] border border-[#2d2a26]/50 rounded-2xl"></div>
        <div className="h-[250px] bg-[#1a1916] border border-[#2d2a26]/50 rounded-2xl"></div>
      </div>

      {/* Applications Widget Skeleton */}
      <div className="h-[400px] bg-[#1a1916] border border-[#2d2a26]/50 rounded-2xl"></div>
    </div>
  );
}
