export default function DashboardLoading() {
  return (
    <div className="page-container animate-pulse">
      <div className="mb-6 h-8 w-48 rounded-xl bg-gray-200" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="mb-2 h-9 w-9 rounded-xl bg-gray-200" />
            <div className="mb-1 h-7 w-10 rounded-lg bg-gray-200" />
            <div className="h-3 w-16 rounded bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="mb-8 space-y-3">
        <div className="h-5 w-36 rounded-lg bg-gray-200" />
        {[1, 2].map((i) => (
          <div key={i} className="card">
            <div className="mb-3 h-4 w-40 rounded bg-gray-200" />
            <div className="h-2 w-full rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-32 rounded-lg bg-gray-200" />
        {[1, 2].map((i) => (
          <div key={i} className="card h-20" />
        ))}
      </div>
    </div>
  );
}
