import { useAuth } from '../contexts/AuthContext';

export const DashboardPage = () => {
  const { user, profile } = useAuth();
  const userRole = profile?.role || user?.user_metadata?.role || 'user';

  const stats = [
    { name: 'Total Users', value: '1,234', icon: '👥', color: 'bg-blue-500' },
    { name: 'Active Sessions', value: '89', icon: '🔒', color: 'bg-green-500' },
    { name: 'System Logs', value: '5,678', icon: '📝', color: 'bg-purple-500' },
    { name: 'Alerts', value: '12', icon: '⚠️', color: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex items-start gap-3 pb-4 border-b border-gray-200 last:border-0">
                <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">User logged in</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Profile</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <p className="text-gray-900 capitalize">{userRole}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">User ID</p>
              <p className="text-gray-900 font-mono text-sm">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <div className="text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Welcome to the Admin Dashboard</h3>
            <p className="text-sm text-blue-800">
              This is a secure admin dashboard built with React, Vite, Tailwind CSS, and Supabase. 
              You can navigate through different sections using the sidebar. Your access level is determined by your role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
