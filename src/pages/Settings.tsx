import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure company info, users, and integrations."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[
            { name: 'Company Profile', description: 'Business name, logo, address.' },
            { name: 'Tax & Currency', description: 'Default tax and currency settings.' },
            { name: 'User Roles', description: 'Manage access and permissions.' },
            { name: 'Integrations', description: 'Connect email, POS, or accounting.' },
          ].map((card) => (
            <div
              key={card.name}
              className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">{card.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

