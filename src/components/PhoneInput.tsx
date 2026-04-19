import { useState, useRef, useEffect } from 'react'

interface Country {
  code: string
  ddi: string
  flag: string
  name: string
}

const countries: Country[] = [
  { code: 'BR', ddi: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: 'US', ddi: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: 'PT', ddi: '+351', flag: '🇵🇹', name: 'Portugal' },
  { code: 'AR', ddi: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: 'UY', ddi: '+598', flag: '🇺🇾', name: 'Uruguai' },
  { code: 'PY', ddi: '+595', flag: '🇵🇾', name: 'Paraguai' },
  { code: 'CL', ddi: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: 'CO', ddi: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: 'MX', ddi: '+52', flag: '🇲🇽', name: 'Mexico' },
  { code: 'PE', ddi: '+51', flag: '🇵🇪', name: 'Peru' },
  { code: 'VE', ddi: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: 'BO', ddi: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: 'EC', ddi: '+593', flag: '🇪🇨', name: 'Equador' },
  { code: 'GB', ddi: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: 'DE', ddi: '+49', flag: '🇩🇪', name: 'Alemanha' },
  { code: 'FR', ddi: '+33', flag: '🇫🇷', name: 'Franca' },
  { code: 'ES', ddi: '+34', flag: '🇪🇸', name: 'Espanha' },
  { code: 'IT', ddi: '+39', flag: '🇮🇹', name: 'Italia' },
  { code: 'JP', ddi: '+81', flag: '🇯🇵', name: 'Japao' },
  { code: 'CA', ddi: '+1', flag: '🇨🇦', name: 'Canada' },
  { code: 'AU', ddi: '+61', flag: '🇦🇺', name: 'Australia' },
  { code: 'IL', ddi: '+972', flag: '🇮🇱', name: 'Israel' },
  { code: 'AO', ddi: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: 'MZ', ddi: '+258', flag: '🇲🇿', name: 'Mocambique' },
]

interface PhoneInputProps {
  value: string
  onChange: (fullPhone: string) => void
  required?: boolean
  placeholder?: string
}

// Parse value (+<DDI><local>) em { code, local }. Com DDIs duplicados (+1 para US e CA),
// retorna a primeira correspondencia na lista acima (BR tem prioridade para +55).
function parseValue(val: string): { code: string; local: string } {
  if (!val) return { code: 'BR', local: '' }
  for (const country of countries) {
    if (val.startsWith(country.ddi)) {
      return { code: country.code, local: val.slice(country.ddi.length) }
    }
  }
  if (val.startsWith('+')) {
    return { code: 'BR', local: val.replace(/^\+\d+/, '') }
  }
  return { code: 'BR', local: val }
}

export function PhoneInput({ value, onChange, required, placeholder }: PhoneInputProps) {
  const parsed = parseValue(value)
  const [selectedCode, setSelectedCode] = useState(parsed.code)
  const [localPhone, setLocalPhone] = useState(parsed.local)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Sync from parent when value changes externally
  useEffect(() => {
    const p = parseValue(value)
    setSelectedCode(p.code)
    setLocalPhone(p.local)
  }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchRef.current) {
      searchRef.current.focus()
    }
  }, [dropdownOpen])

  const selectedCountry = countries.find((c) => c.code === selectedCode) || countries[0]
  const selectedDdi = selectedCountry.ddi

  const filteredCountries = search
    ? countries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.ddi.includes(search) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries

  function handleCountrySelect(country: Country) {
    setSelectedCode(country.code)
    setDropdownOpen(false)
    setSearch('')
    onChange(country.ddi + localPhone)
  }

  function handleLocalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.replace(/[^\d]/g, '')
    setLocalPhone(val)
    onChange(selectedDdi + val)
  }

  return (
    <div className="flex gap-0">
      {/* DDI Selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-1 border border-gray-300 border-r-0 rounded-l-lg px-2 py-2 bg-gray-50 hover:bg-gray-100 transition-colors h-full min-w-[90px]"
        >
          <span className="text-lg leading-none">{selectedCountry.flag}</span>
          <span className="text-sm text-gray-700">{selectedCountry.ddi}</span>
          <svg
            className={`w-3 h-3 text-gray-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Buscar país..."
              />
            </div>
            <div className="overflow-y-auto max-h-48">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${
                    country.code === selectedCode ? 'bg-blue-50 font-medium' : ''
                  }`}
                >
                  <span className="text-lg leading-none">{country.flag}</span>
                  <span className="text-gray-800">{country.name}</span>
                  <span className="text-gray-500 ml-auto">{country.ddi}</span>
                </button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="text-sm text-gray-500 px-3 py-2">Nenhum país encontrado</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phone number input */}
      <input
        type="tel"
        required={required}
        value={localPhone}
        onChange={handleLocalChange}
        className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
        placeholder={placeholder || '11999999999'}
      />
    </div>
  )
}
