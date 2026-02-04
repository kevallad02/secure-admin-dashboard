import { useEffect, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { orgService } from '../services/orgService'

interface TaxTemplate {
  id: string
  country_code: string
  name: string
  rate: number
  tax_included: boolean
}

const countryOptions = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'IN', label: 'India' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
]

export default function TaxTemplates() {
  const { canManageTaxes } = useAuth()
  const [templates, setTemplates] = useState<TaxTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    id: '',
    country_code: 'US',
    name: '',
    rate: 0,
    tax_included: false,
  })

  const loadTemplates = async () => {
    setLoading(true)
    const data = await orgService.getTaxTemplates()
    setTemplates(data)
    setLoading(false)
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setForm({
      id: '',
      country_code: 'US',
      name: '',
      rate: 0,
      tax_included: false,
    })
  }

  const handleEdit = (template: TaxTemplate) => {
    setForm({
      id: template.id,
      country_code: template.country_code,
      name: template.name,
      rate: template.rate,
      tax_included: template.tax_included,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!form.name.trim()) {
      setError('Please enter a template name.')
      setSaving(false)
      return
    }

    const payload = {
      id: form.id,
      country_code: form.country_code,
      name: form.name.trim(),
      rate: Number(form.rate),
      tax_included: form.tax_included,
    }

    const success = form.id
      ? await orgService.updateTaxTemplate(payload)
      : await orgService.createTaxTemplate(payload)

    if (!success) {
      setError('Failed to save template.')
      setSaving(false)
      return
    }

    resetForm()
    await loadTemplates()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    const success = await orgService.deleteTaxTemplate(id)
    if (success) {
      await loadTemplates()
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Tax Templates</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage country tax defaults for onboarding.
          </p>
        </div>

        {!canManageTaxes && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You need admin access to edit templates.
            </p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Country
              </label>
              <select
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                disabled={!canManageTaxes}
              >
                {countryOptions.map((country) => (
                  <option key={country.code} value={country.code}>{country.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                disabled={!canManageTaxes}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: Number(e.target.value) })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                disabled={!canManageTaxes}
              />
            </div>
          </div>
          <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.tax_included}
              onChange={(e) => setForm({ ...form, tax_included: e.target.checked })}
              className="mr-2"
              disabled={!canManageTaxes}
            />
            Prices include tax
          </label>

          {error && (
            <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              disabled={!canManageTaxes}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving || !canManageTaxes}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : (form.id ? 'Update template' : 'Create template')}
            </button>
          </div>
        </form>

        <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Templates</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">No templates found.</p>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {template.country_code} · {template.rate}% · {template.tax_included ? 'Tax included' : 'Tax excluded'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-sm font-medium text-primary-600 hover:text-primary-700 disabled:opacity-50"
                      onClick={() => handleEdit(template)}
                      disabled={!canManageTaxes}
                    >
                      Edit
                    </button>
                    <button
                      className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      onClick={() => handleDelete(template.id)}
                      disabled={!canManageTaxes}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
