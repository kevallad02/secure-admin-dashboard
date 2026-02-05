import { NavLink } from 'react-router-dom'
import { 
  HomeIcon, 
  UsersIcon, 
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  CubeIcon,
  ShoppingCartIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  ChartPieIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { name: 'Inventory', path: '/inventory', icon: CubeIcon },
  { name: 'Purchases', path: '/purchases', icon: ShoppingCartIcon },
  { name: 'Sales', path: '/sales', icon: DocumentTextIcon },
  { name: 'Rentals', path: '/rentals', icon: BuildingStorefrontIcon },
  { name: 'Billing', path: '/billing', icon: CurrencyDollarIcon },
  { name: 'Reports', path: '/reports', icon: ChartPieIcon },
  { name: 'Settings', path: '/settings', icon: Cog6ToothIcon },
  { name: 'Users', path: '/users', icon: UsersIcon },
  { name: 'Logs', path: '/logs', icon: ClipboardDocumentListIcon },
  { name: 'Tax Templates', path: '/tax-templates', icon: CurrencyDollarIcon },
]

export default function Sidebar() {
  const { canManageTaxes } = useAuth()
  return (
    <div className="flex flex-col w-64 app-shell border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            Admin
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems
            .filter((item) => item.path !== '/tax-templates' || canManageTaxes)
            .map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50  text-primary-700 '
                    : 'text-gray-700  hover:bg-gray-100 '
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`w-5 h-5 mr-3 ${ isActive ? 'text-primary-700 ' : 'text-gray-500 ' }`}
                  />
                  {item.name}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-xs text-gray-500">
          v1.0.0
        </div>
      </div>
    </div>
  )
}
