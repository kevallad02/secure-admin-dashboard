import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar = () => {
  const location = useLocation();
  const { profile, user } = useAuth();
  
  const userRole = profile?.role || user?.user_metadata?.role || 'user';

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊', roles: ['user', 'manager', 'admin'] },
    { name: 'Users', path: '/users', icon: '👥', roles: ['admin'] },
    { name: 'Logs', path: '/logs', icon: '📝', roles: ['user', 'manager', 'admin'] },
  ];

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(userRole)
  );

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col h-full bg-gray-800 text-white w-64">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {filteredNavigation.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Role: <span className="text-white capitalize">{userRole}</span>
        </div>
      </div>
    </div>
  );
};
