function SkeletonCard({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-3xl border border-white/10 bg-white/[0.04] ${className}`} />;
}

export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-black text-white">
      <main className="mx-auto w-full max-w-400 px-3 pb-10 pt-3 sm:px-4 md:pt-4 lg:px-5 xl:px-6">
        <div className="space-y-6 md:hidden">
          <SkeletonCard className="h-28" />
          <SkeletonCard className="h-72" />
          <div className="grid grid-cols-1 gap-4">
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
            <SkeletonCard className="h-44" />
          </div>
        </div>

        <div className="hidden space-y-6 md:block">
          <div className="grid grid-cols-12 gap-5">
            <SkeletonCard className="col-span-8 h-64" />
            <SkeletonCard className="col-span-4 h-64" />
          </div>
          <SkeletonCard className="h-20" />
          <div className="grid grid-cols-12 gap-5">
            <SkeletonCard className="col-span-7 h-44" />
            <SkeletonCard className="col-span-5 h-44" />
          </div>
          <div className="grid grid-cols-12 gap-5">
            <SkeletonCard className="col-span-7 h-96" />
            <SkeletonCard className="col-span-5 h-96" />
          </div>
          <SkeletonCard className="h-80" />
          <div className="grid grid-cols-12 gap-5">
            <SkeletonCard className="col-span-7 h-64" />
            <SkeletonCard className="col-span-5 h-64" />
          </div>
        </div>
      </main>
    </div>
  );
}