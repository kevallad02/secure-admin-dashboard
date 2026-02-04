import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'
import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { orgService } from '../services/orgService'
import { orgMembersService } from '../services/orgMembersService'
import { customFieldsService } from '../services/customFieldsService'

export default function Settings() {
  const { org } = useAuth()
  const [orgDetails, setOrgDetails] = useState<any | null>(null)
  const [orgSettings, setOrgSettings] = useState<any | null>(null)
  const [taxTemplates, setTaxTemplates] = useState<any[]>([])
  const [orgMembers, setOrgMembers] = useState<any[]>([])
  const [customFields, setCustomFields] = useState<any[]>([])

  const [companyForm, setCompanyForm] = useState({
    name: '',
    logo_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
  })
  const [currencyForm, setCurrencyForm] = useState({ currency_code: 'USD', tax_rate: 0, tax_included: false })
  const [taxForm, setTaxForm] = useState({ id: '', country_code: 'US', name: '', rate: 0, tax_included: false })
  const [customFieldForm, setCustomFieldForm] = useState({
    id: '',
    entity: 'product',
    name: '',
    field_type: 'text',
    required: false,
    options: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [integrations, setIntegrations] = useState([
    { id: 'stripe', name: 'Stripe', description: 'Collect card payments automatically.', enabled: false, mode: 'oauth' },
    { id: 'quickbooks', name: 'QuickBooks', description: 'Sync invoices and payments.', enabled: false, mode: 'oauth' },
    { id: 'slack', name: 'Slack', description: 'Get alerts and daily summaries.', enabled: false, mode: 'api_key' },
  ])
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false)
  const [activeIntegration, setActiveIntegration] = useState<any | null>(null)
  const [integrationForm, setIntegrationForm] = useState({
    client_id: '',
    client_secret: '',
    api_key: '',
    redirect_url: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!org?.id) return
      const [orgData, settingsData, taxData, memberData, fieldData] = await Promise.all([
        orgService.getOrganization(org.id),
        orgService.getOrgSettings(org.id),
        orgService.getTaxTemplates(),
        orgMembersService.getOrgMembers(org.id),
        customFieldsService.getCustomFields(org.id),
      ])
      setOrgDetails(orgData)
      setOrgSettings(settingsData)
      setTaxTemplates(taxData)
      setOrgMembers(memberData)
      setCustomFields(fieldData)
      if (orgData?.name) {
        setCompanyForm((prev) => ({ ...prev, name: orgData.name }))
      }
      if (settingsData) {
        setCurrencyForm({
          currency_code: settingsData.currency_code || 'USD',
          tax_rate: Number(settingsData.tax_rate || 0),
          tax_included: Boolean(settingsData.tax_included),
        })
        setCompanyForm((prev) => ({
          ...prev,
          logo_url: settingsData.logo_url || '',
          address_line1: settingsData.address_line1 || '',
          address_line2: settingsData.address_line2 || '',
          city: settingsData.city || '',
          state: settingsData.state || '',
          postal_code: settingsData.postal_code || '',
          country: settingsData.country || '',
        }))
      }
    }
    load()
  }, [org?.id])

  const currencyOptions = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED']

  const sortedCustomFields = useMemo(() => {
    return [...customFields].sort((a, b) => `${a.entity}-${a.name}`.localeCompare(`${b.entity}-${b.name}`))
  }, [customFields])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Settings"
          subtitle="Configure company info, users, and integrations."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Company Info</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Business details and plan metadata.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {companyForm.logo_url ? (
                  <img src={companyForm.logo_url} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-gray-400">Logo</span>
                )}
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo URL</label>
                <input
                  type="text"
                  value={companyForm.logo_url}
                  onChange={(e) => setCompanyForm({ ...companyForm, logo_url: e.target.value })}
                  placeholder="https://..."
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Organization name</label>
              <input
                type="text"
                value={companyForm.name}
                onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address line 1</label>
                <input
                  type="text"
                  value={companyForm.address_line1}
                  onChange={(e) => setCompanyForm({ ...companyForm, address_line1: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address line 2</label>
                <input
                  type="text"
                  value={companyForm.address_line2}
                  onChange={(e) => setCompanyForm({ ...companyForm, address_line2: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">City</label>
                <input
                  type="text"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">State / Province</label>
                <input
                  type="text"
                  value={companyForm.state}
                  onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Postal code</label>
                <input
                  type="text"
                  value={companyForm.postal_code}
                  onChange={(e) => setCompanyForm({ ...companyForm, postal_code: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                <input
                  type="text"
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <p className="text-xs uppercase tracking-wide">Plan</p>
                <p className="text-gray-900 dark:text-white">{orgDetails?.plan || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">Created</p>
                <p className="text-gray-900 dark:text-white">
                  {orgDetails?.created_at ? new Date(orgDetails.created_at).toLocaleDateString() : '—'}
                </p>
              </div>
            </div>
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              onClick={async () => {
                if (!org?.id) return
                setSaving(true)
                setError(null)
                const success = await orgService.updateOrganization({ id: org.id, name: companyForm.name.trim() })
                const settingsSuccess = await orgService.upsertOrgSettings({
                  org_id: org.id,
                  currency_code: currencyForm.currency_code,
                  tax_rate: Number(currencyForm.tax_rate),
                  tax_included: currencyForm.tax_included,
                  logo_url: companyForm.logo_url,
                  address_line1: companyForm.address_line1,
                  address_line2: companyForm.address_line2,
                  city: companyForm.city,
                  state: companyForm.state,
                  postal_code: companyForm.postal_code,
                  country: companyForm.country,
                })
                setSaving(false)
                if (!success || !settingsSuccess) {
                  setError('Failed to update company info.')
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save company info'}
            </button>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Currency</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Default currency and base tax preferences.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Currency code</label>
                <select
                  value={currencyForm.currency_code}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, currency_code: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Default tax rate (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currencyForm.tax_rate}
                  onChange={(e) => setCurrencyForm({ ...currencyForm, tax_rate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={currencyForm.tax_included}
                onChange={(e) => setCurrencyForm({ ...currencyForm, tax_included: e.target.checked })}
                className="mr-2"
              />
              Prices include tax
            </label>
            <button
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
              onClick={async () => {
                if (!org?.id) return
                setSaving(true)
                setError(null)
                const success = await orgService.upsertOrgSettings({
                  org_id: org.id,
                  currency_code: currencyForm.currency_code,
                  tax_rate: Number(currencyForm.tax_rate),
                  tax_included: currencyForm.tax_included,
                })
                setSaving(false)
                if (!success) {
                  setError('Failed to update currency settings.')
                } else {
                  setOrgSettings({ ...(orgSettings || {}), ...currencyForm })
                }
              }}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save currency settings'}
            </button>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Tax Rules</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create and manage tax templates.</p>
            </div>
            <div className="space-y-3">
              {taxTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No tax rules configured.</p>
              ) : (
                taxTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-md border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {template.country_code} · {template.rate}% · {template.tax_included ? 'Tax included' : 'Tax excluded'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        className="text-primary-600 hover:text-primary-700"
                        onClick={() => setTaxForm({
                          id: template.id,
                          country_code: template.country_code,
                          name: template.name,
                          rate: Number(template.rate || 0),
                          tax_included: template.tax_included,
                        })}
                      >
                        Edit
                      </button>
                      <button
                        className="text-red-500 hover:text-red-600"
                        onClick={async () => {
                          await orgService.deleteTaxTemplate(template.id)
                          const updated = await orgService.getTaxTemplates()
                          setTaxTemplates(updated)
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Country</label>
                  <select
                    value={taxForm.country_code}
                    onChange={(e) => setTaxForm({ ...taxForm, country_code: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    {['US', 'CA', 'GB', 'AU', 'DE', 'FR'].map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text"
                    value={taxForm.name}
                    onChange={(e) => setTaxForm({ ...taxForm, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxForm.rate}
                    onChange={(e) => setTaxForm({ ...taxForm, rate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center">
                  <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={taxForm.tax_included}
                      onChange={(e) => setTaxForm({ ...taxForm, tax_included: e.target.checked })}
                      className="mr-2"
                    />
                    Prices include tax
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  onClick={async () => {
                    if (!taxForm.name.trim()) {
                      setError('Please enter a tax name.')
                      return
                    }
                    setSaving(true)
                    setError(null)
                    const success = taxForm.id
                      ? await orgService.updateTaxTemplate({
                        id: taxForm.id,
                        country_code: taxForm.country_code,
                        name: taxForm.name.trim(),
                        rate: Number(taxForm.rate),
                        tax_included: taxForm.tax_included,
                      })
                      : await orgService.createTaxTemplate({
                        country_code: taxForm.country_code,
                        name: taxForm.name.trim(),
                        rate: Number(taxForm.rate),
                        tax_included: taxForm.tax_included,
                      })
                    setSaving(false)
                    if (success) {
                      setTaxForm({ id: '', country_code: 'US', name: '', rate: 0, tax_included: false })
                      const updated = await orgService.getTaxTemplates()
                      setTaxTemplates(updated)
                    } else {
                      setError('Failed to save tax rule.')
                    }
                  }}
                  disabled={saving}
                >
                  {taxForm.id ? 'Update tax rule' : 'Add tax rule'}
                </button>
                {taxForm.id && (
                  <button
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setTaxForm({ id: '', country_code: 'US', name: '', rate: 0, tax_included: false })}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">User Roles</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Assign access levels for team members.</p>
            </div>
            <div className="space-y-3">
              {orgMembers.map((member) => (
                <div
                  key={`${member.org_id}-${member.user_id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{member.profiles?.email || 'Unknown'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Joined {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={member.role}
                      onChange={(e) => {
                        const next = orgMembers.map((item) => (
                          item.user_id === member.user_id ? { ...item, role: e.target.value } : item
                        ))
                        setOrgMembers(next)
                      }}
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      className="text-primary-600 hover:text-primary-700"
                      onClick={async () => {
                        setSaving(true)
                        if (!org?.id) return
                        await orgMembersService.updateMemberRole({
                          org_id: org.id,
                          user_id: member.user_id,
                          role: member.role,
                        })
                        setSaving(false)
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
              {orgMembers.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No users found.</p>
              )}
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Custom Fields</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Extend records with industry-specific attributes.</p>
            </div>
            <div className="space-y-3">
              {sortedCustomFields.map((field) => (
                <div
                  key={field.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{field.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {field.entity} · {field.field_type} · {field.required ? 'Required' : 'Optional'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="text-primary-600 hover:text-primary-700"
                      onClick={() => {
                        setCustomFieldForm({
                          id: field.id,
                          entity: field.entity,
                          name: field.name,
                          field_type: field.field_type,
                          required: field.required,
                          options: (field.options?.values || []).join(', '),
                        })
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-500 hover:text-red-600"
                      onClick={async () => {
                        if (!org?.id) return
                        await customFieldsService.deleteCustomField(field.id)
                        const updated = await customFieldsService.getCustomFields(org.id)
                        setCustomFields(updated)
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {sortedCustomFields.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No custom fields yet.</p>
              )}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Entity</label>
                  <select
                    value={customFieldForm.entity}
                    onChange={(e) => setCustomFieldForm({ ...customFieldForm, entity: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="product">Product</option>
                    <option value="asset">Asset</option>
                    <option value="customer">Customer</option>
                    <option value="vendor">Vendor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Field type</label>
                  <select
                    value={customFieldForm.field_type}
                    onChange={(e) => setCustomFieldForm({ ...customFieldForm, field_type: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="select">Select</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Field name</label>
                  <input
                    type="text"
                    value={customFieldForm.name}
                    onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              {customFieldForm.field_type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Options (comma-separated)</label>
                  <input
                    type="text"
                    value={customFieldForm.options}
                    onChange={(e) => setCustomFieldForm({ ...customFieldForm, options: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              )}
              <label className="inline-flex items-center text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={customFieldForm.required}
                  onChange={(e) => setCustomFieldForm({ ...customFieldForm, required: e.target.checked })}
                  className="mr-2"
                />
                Required field
              </label>
              <div className="flex items-center gap-3">
                <button
                  className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                  onClick={async () => {
                    if (!org?.id) return
                    if (!customFieldForm.name.trim()) {
                      setError('Custom field name is required.')
                      return
                    }
                    setSaving(true)
                    setError(null)
                    const options = customFieldForm.field_type === 'select'
                      ? { values: customFieldForm.options.split(',').map((value) => value.trim()).filter(Boolean) }
                      : {}
                    const success = customFieldForm.id
                      ? await customFieldsService.updateCustomField({
                        id: customFieldForm.id,
                        entity: customFieldForm.entity,
                        name: customFieldForm.name.trim(),
                        field_type: customFieldForm.field_type,
                        required: customFieldForm.required,
                        options,
                      })
                      : await customFieldsService.createCustomField({
                        org_id: org.id,
                        entity: customFieldForm.entity,
                        name: customFieldForm.name.trim(),
                        field_type: customFieldForm.field_type,
                        required: customFieldForm.required,
                        options,
                      })
                    setSaving(false)
                    if (success) {
                      setCustomFieldForm({ id: '', entity: 'product', name: '', field_type: 'text', required: false, options: '' })
                      const updated = await customFieldsService.getCustomFields(org.id)
                      setCustomFields(updated)
                    } else {
                      setError('Failed to save custom field.')
                    }
                  }}
                  disabled={saving}
                >
                  {customFieldForm.id ? 'Update field' : 'Add field'}
                </button>
                {customFieldForm.id && (
                  <button
                    className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setCustomFieldForm({ id: '', entity: 'product', name: '', field_type: 'text', required: false, options: '' })}
                  >
                    Cancel edit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="app-shell shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4 lg:col-span-2">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Integrations</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Connect external tools and services.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {integrations.map((integration) => (
                <div key={integration.id} className="rounded-md border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{integration.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{integration.description}</p>
                    </div>
                    <button
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        integration.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                      onClick={() => {
                        setActiveIntegration(integration)
                        setIntegrationForm({ client_id: '', client_secret: '', api_key: '', redirect_url: '' })
                        setIntegrationModalOpen(true)
                      }}
                    >
                      {integration.enabled ? 'Manage' : 'Connect'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {integrationModalOpen && activeIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setIntegrationModalOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-lg rounded-lg bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Connect {activeIntegration.name}
              </h3>
              <button
                onClick={() => setIntegrationModalOpen(false)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              This is a placeholder flow. Save credentials to mark the integration as connected.
            </p>
            {activeIntegration.mode === 'oauth' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client ID</label>
                  <input
                    type="text"
                    value={integrationForm.client_id}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, client_id: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Client Secret</label>
                  <input
                    type="password"
                    value={integrationForm.client_secret}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, client_secret: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Redirect URL</label>
                  <input
                    type="text"
                    value={integrationForm.redirect_url}
                    onChange={(e) => setIntegrationForm({ ...integrationForm, redirect_url: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Key</label>
                <input
                  type="password"
                  value={integrationForm.api_key}
                  onChange={(e) => setIntegrationForm({ ...integrationForm, api_key: e.target.value })}
                  className="mt-1 w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIntegrationModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
                onClick={() => {
                  setIntegrations((prev) => prev.map((item) => (
                    item.id === activeIntegration.id ? { ...item, enabled: true } : item
                  )))
                  setIntegrationModalOpen(false)
                }}
              >
                Save connection
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
