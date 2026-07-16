export default function AnalysisLoading() {
  return (
    <div className="page-container max-w-xl animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-40 rounded-xl bg-gray-200" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="mb-2 h-5 w-3/4 rounded-lg bg-gray-200" />
            <div className="mb-3 h-3 w-32 rounded bg-gray-100" />
            <div className="h-3 w-24 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
