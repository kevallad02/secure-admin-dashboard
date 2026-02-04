import DashboardLayout from '../components/DashboardLayout'
import DataTable from '../components/DataTable'
import PageHeader from '../components/PageHeader'

export default function Billing() {
  const columns = [
    { key: 'invoice', header: 'Invoice' },
    { key: 'customer', header: 'Customer' },
    { key: 'status', header: 'Status' },
    { key: 'total', header: 'Total' },
    { key: 'paid', header: 'Paid' },
  ]

  const rows = [
    { invoice: 'INV-2001', customer: 'Northwind Rentals', status: 'Open', total: '$2,400', paid: '$0' },
    { invoice: 'INV-2002', customer: 'City Mart', status: 'Paid', total: '$980', paid: '$980' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Billing"
          subtitle="Review invoices, payments, and recurring charges."
          actions={(
            <button className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700">
              Record payment
            </button>
          )}
        />

        <DataTable
          columns={columns}
          rows={rows}
          emptyLabel="No billing activity yet."
          enableSearch
          defaultSortKey="invoice"
        />
      </div>
    </DashboardLayout>
  )
}
