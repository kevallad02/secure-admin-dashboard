import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import { orgService } from '../services/orgService'

interface SelectOption {
  id: string
  name: string
  symbol?: string | null
}

const currencyOptions = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED']
const countryOptions = [
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'IN', label: 'India' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
]

const defaultCurrencyByCountry: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  PK: 'PKR',
  IN: 'INR',
  AE: 'AED',
  DE: 'EUR',
  FR: 'EUR',
}
const productTypes = [
  { value: 'stock', label: 'Stock' },
  { value: 'serialized', label: 'Serialized' },
  { value: 'perishable', label: 'Perishable' },
  { value: 'rental_asset', label: 'Rental Asset' },
  { value: 'service', label: 'Service' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { user, org, refreshOrg } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)

  const [units, setUnits] = useState<SelectOption[]>([])
  const [categories, setCategories] = useState<SelectOption[]>([])
  const [taxTemplates, setTaxTemplates] = useState<{
    id: string
    country_code: string
    name: string
    rate: number
    tax_included: boolean
  }[]>([])

  const [currency, setCurrency] = useState('USD')
  const [countryCode, setCountryCode] = useState('US')
  const [taxRate, setTaxRate] = useState(0)
  const [taxIncluded, setTaxIncluded] = useState(false)
  const [taxTemplateId, setTaxTemplateId] = useState<string | null>(null)

  const [productName, setProductName] = useState('')
  const [productSku, setProductSku] = useState('')
  const [productType, setProductType] = useState('stock')
  const [unitId, setUnitId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [trackInventory, setTrackInventory] = useState(true)
  const [createdProductId, setCreatedProductId] = useState<string | null>(null)

  const [locationName, setLocationName] = useState('Main Warehouse')
  const [initialStock, setInitialStock] = useState(0)

  useEffect(() => {
    const load = async () => {
      if (!user || !org?.id) return
      if (org.onboarding_completed_at) {
        navigate('/dashboard')
        return
      }
      setLoading(true)
      const [orgUnits, orgCategories, templates] = await Promise.all([
        orgService.getDefaultUnits(org.id),
        orgService.getDefaultCategories(org.id),
        orgService.getTaxTemplates(),
      ])
      setUnits(orgUnits)
      setCategories(orgCategories)
      setTaxTemplates(templates)
      setUnitId(orgUnits[0]?.id || null)
      setCategoryId(orgCategories[0]?.id || null)
      setLoading(false)
    }
    load()
  }, [user, org?.id, org?.onboarding_completed_at, navigate])

  useEffect(() => {
    if (!taxTemplateId) return
    const template = taxTemplates.find((t) => t.id === taxTemplateId)
    if (template && template.country_code !== countryCode) {
      setTaxTemplateId(null)
    }
  }, [countryCode, taxTemplateId, taxTemplates])

  useEffect(() => {
    const mappedCurrency = defaultCurrencyByCountry[countryCode]
    if (mappedCurrency) {
      setCurrency(mappedCurrency)
    }
  }, [countryCode])

  const applyTemplate = (templateId: string) => {
    const template = taxTemplates.find((t) => t.id === templateId)
    if (!template) return
    setTaxRate(template.rate)
    setTaxIncluded(template.tax_included)
  }

  const saveSettings = async () => {
    if (!org?.id) return false
    return orgService.upsertOrgSettings({
      org_id: org.id,
      currency_code: currency,
      tax_rate: taxRate,
      tax_included: taxIncluded,
      country_code: countryCode,
    })
  }

  const handleStepOne = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org?.id) return
    setSaving(true)
    setError(null)

    if (!productName.trim()) {
      setError('Please enter a product name.')
      setSaving(false)
      return
    }

    const settingsSaved = await saveSettings()

    if (!settingsSaved) {
      setError('Failed to save organization settings.')
      setSaving(false)
      return
    }

    const productId = await orgService.createFirstProduct({
      org_id: org.id,
      name: productName.trim(),
      sku: productSku.trim() || undefined,
      type: productType,
      unit_id: unitId,
      category_id: categoryId,
      track_inventory: trackInventory,
    })

    if (!productId) {
      setError('Failed to create the first product.')
      setSaving(false)
      return
    }

    setCreatedProductId(productId)
    setStep(2)
    setSaving(false)
  }

  const handleStepTwo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!org?.id || !createdProductId) return
    setSaving(true)
    setError(null)

    if (!locationName.trim()) {
      setError('Please enter a location name.')
      setSaving(false)
      return
    }

    const locationId = await orgService.createLocation(org.id, locationName.trim())
    if (!locationId) {
      setError('Failed to create location.')
      setSaving(false)
      return
    }

    const stockSaved = await orgService.setInitialStock({
      org_id: org.id,
      product_id: createdProductId,
      location_id: locationId,
      qty_on_hand: initialStock,
    })

    if (!stockSaved) {
      setError('Failed to set initial stock.')
      setSaving(false)
      return
    }

    const completed = await orgService.markOnboardingComplete(org.id)
    if (!completed) {
      setError('Failed to complete onboarding.')
      setSaving(false)
      return
    }

    await refreshOrg()
    navigate('/dashboard')
  }

  const handleSkip = async () => {
    if (!org?.id) return
    setSaving(true)
    setError(null)
    await saveSettings()

    const locationId = await orgService.createLocation(org.id, 'Main Warehouse')
    if (!locationId) {
      setError('Failed to create default location.')
      setSaving(false)
      return
    }

    let productId = createdProductId
    if (!productId && productName.trim()) {
      productId = await orgService.createFirstProduct({
        org_id: org.id,
        name: productName.trim(),
        sku: productSku.trim() || undefined,
        type: productType,
        unit_id: unitId,
        category_id: categoryId,
        track_inventory: trackInventory,
      })
    }

    if (!productId) {
      productId = await orgService.createFirstProduct({
        org_id: org.id,
        name: 'Default Item',
        sku: undefined,
        type: 'stock',
        unit_id: unitId,
        category_id: categoryId,
        track_inventory: true,
      })
    }

    if (productId) {
      await orgService.setInitialStock({
        org_id: org.id,
        product_id: productId,
        location_id: locationId,
        qty_on_hand: 0,
      })
    }

    const completed = await orgService.markOnboardingComplete(org.id)
    if (!completed) {
      setError('Failed to skip onboarding.')
      setSaving(false)
      return
    }
    await refreshOrg()
    navigate('/dashboard')
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="app-shell shadow rounded-lg border border-gray-200  p-6">
          <h1 className="text-2xl font-semibold text-gray-900 ">
            Let’s set up your workspace
          </h1>
          <p className="text-sm text-gray-600  mt-1">
            Configure basics and add your first product.
          </p>
        </div>

        {step === 1 ? (
          <form
            onSubmit={handleStepOne}
          className="app-shell shadow rounded-lg border border-gray-200  p-6 space-y-6"
          >
          <div>
            <h2 className="text-lg font-medium text-gray-900 ">Company settings</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Country
                </label>
                <select
                  value={countryCode}
                  onChange={(e) => {
                    const nextCountry = e.target.value
                    setCountryCode(nextCountry)
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>{country.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  {currencyOptions.map((code) => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Tax rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Tax template
                </label>
                <select
                  value={taxTemplateId || ''}
                  onChange={(e) => {
                    const nextId = e.target.value || null
                    setTaxTemplateId(nextId)
                    if (nextId) {
                      applyTemplate(nextId)
                    }
                  }}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  <option value="">Custom</option>
                  {taxTemplates
                    .filter((template) => template.country_code === countryCode)
                    .map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center text-sm text-gray-700 ">
                  <input
                    type="checkbox"
                    checked={taxIncluded}
                    onChange={(e) => setTaxIncluded(e.target.checked)}
                    className="mr-2"
                  />
                  Prices include tax
                </label>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-medium text-gray-900 ">First product</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 ">
                  Product name
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  SKU (optional)
                </label>
                <input
                  type="text"
                  value={productSku}
                  onChange={(e) => setProductSku(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Type
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  {productTypes.map((type) => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Unit
                </label>
                <select
                  value={unitId || ''}
                  onChange={(e) => setUnitId(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}{unit.symbol ? ` (${unit.symbol})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 ">
                  Category
                </label>
                <select
                  value={categoryId || ''}
                  onChange={(e) => setCategoryId(e.target.value || null)}
                  className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="inline-flex items-center text-sm text-gray-700 ">
                  <input
                    type="checkbox"
                    checked={trackInventory}
                    onChange={(e) => setTrackInventory(e.target.checked)}
                    className="mr-2"
                  />
                  Track inventory
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50  p-4">
              <p className="text-sm text-red-800 ">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={saving || loading}
              className="text-sm font-medium text-gray-600  hover:text-gray-900 "
            >
              Skip onboarding
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
        ) : (
          <form
            onSubmit={handleStepTwo}
            className="app-shell shadow rounded-lg border border-gray-200  p-6 space-y-6"
          >
            <div>
              <h2 className="text-lg font-medium text-gray-900 ">Warehouse setup</h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 ">
                    Location name
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 ">
                    Initial stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={initialStock}
                    onChange={(e) => setInitialStock(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-gray-300  bg-white  px-3 py-2 text-sm text-gray-900 "
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50  p-4">
                <p className="text-sm text-red-800 ">{error}</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving || loading}
                className="text-sm font-medium text-gray-600  hover:text-gray-900 "
              >
                Back
              </button>
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center px-4 py-2 rounded-md bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Complete setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
