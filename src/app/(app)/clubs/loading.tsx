export default function ClubsLoading() {
  return (
    <div className="page-container animate-pulse">
      <div className="mb-6 h-8 w-40 rounded-xl bg-gray-200" />
      <div className="mb-4 h-10 w-full rounded-xl bg-gray-100" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card">
            <div className="mb-3 h-5 w-36 rounded-lg bg-gray-200" />
            <div className="mb-2 h-3 w-24 rounded bg-gray-100" />
            <div className="h-3 w-20 rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
