export default function TrackerLoading() {
  return (
    <div className="page-container animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-32 rounded-xl bg-gray-200" />
        <div className="h-9 w-28 rounded-xl bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <div className="mb-1 h-4 w-40 rounded-lg bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-gray-100" />
            </div>
            <div className="h-2 w-full rounded-full bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
