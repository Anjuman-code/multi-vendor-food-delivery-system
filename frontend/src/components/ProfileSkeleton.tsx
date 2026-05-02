export const ProfileSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse">
    <div className="bg-white rounded-2xl border border-gray-100 p-8">
      <div className="h-6 bg-gray-200 rounded w-48 mb-6" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-14 bg-gray-100 rounded-xl" />
        ))}
      </div>
    </div>
  </div>
);