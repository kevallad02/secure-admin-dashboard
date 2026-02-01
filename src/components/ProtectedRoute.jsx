import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole) {
    const userRole = profile?.role || user?.user_metadata?.role || 'user';
    const roles = ['user', 'manager', 'admin'];
    const requiredRoleIndex = roles.indexOf(requiredRole);
    const userRoleIndex = roles.indexOf(userRole);

    if (userRoleIndex < requiredRoleIndex) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};
