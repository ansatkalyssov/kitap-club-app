export default function MeetingsLoading() {
  return (
    <div className="page-container animate-pulse">
      <div className="mb-6 h-8 w-44 rounded-xl bg-gray-200" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="mb-2 h-4 w-40 rounded-lg bg-gray-200" />
            <div className="h-3 w-28 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
