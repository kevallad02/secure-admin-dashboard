import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'

export default function Reports() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reports"
          subtitle="Track inventory valuation, sales performance, and profit."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[
            { name: 'Inventory Value', value: '$148,200' },
            { name: 'Net Sales (30d)', value: '$38,400' },
            { name: 'Gross Margin', value: '42%' },
          ].map((stat) => (
            <div
              key={stat.name}
              className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}

