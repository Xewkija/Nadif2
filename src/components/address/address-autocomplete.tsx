'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Search, X, AlertCircle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type AddressResult = {
  address_line1: string
  address_line2?: string
  city: string
  state: string
  postal_code: string
  country: string
  google_place_id?: string
  latitude?: number
  longitude?: number
  formatted_address: string
}

interface AddressAutocompleteProps {
  value?: AddressResult | null
  onChange: (address: AddressResult | null) => void
  onManualEntry?: () => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Google Maps is loaded via script tag, types come from @types/google.maps

export function AddressAutocomplete({
  value,
  onChange,
  onManualEntry,
  placeholder = 'Search for an address...',
  disabled = false,
  className,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [inputValue, setInputValue] = useState(value?.formatted_address ?? '')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false)

  // Load Google Maps script
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      setError('Google Maps API key not configured')
      return
    }

    // Check if already loaded
    if (window.google?.maps?.places) {
      setIsGoogleLoaded(true)
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsGoogleLoaded(true))
      return
    }

    // Load the script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = () => setIsGoogleLoaded(true)
    script.onerror = () => setError('Failed to load Google Maps')
    document.head.appendChild(script)

    return () => {
      // Cleanup not needed for shared script
    }
  }, [])

  // Initialize autocomplete when Google Maps is loaded
  useEffect(() => {
    if (!isGoogleLoaded || !inputRef.current || !window.google?.maps?.places) {
      return
    }

    try {
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'geometry', 'place_id', 'formatted_address'],
      })

      autocompleteRef.current.addListener('place_changed', handlePlaceSelect)
    } catch (err) {
      setError('Failed to initialize address search')
    }

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners?.(autocompleteRef.current)
      }
    }
  }, [isGoogleLoaded])

  const handlePlaceSelect = useCallback(() => {
    if (!autocompleteRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const place = autocompleteRef.current.getPlace()

      if (!place.address_components) {
        setError('Please select an address from the dropdown')
        setIsLoading(false)
        return
      }

      // Parse address components
      const components: Record<string, string> = {}
      for (const component of place.address_components) {
        const type = component.types[0]
        components[type] = component.short_name
        components[`${type}_long`] = component.long_name
      }

      const address: AddressResult = {
        address_line1: [components.street_number, components.route].filter(Boolean).join(' '),
        city: components.locality || components.sublocality_level_1 || components.administrative_area_level_2 || '',
        state: components.administrative_area_level_1 || '',
        postal_code: components.postal_code || '',
        country: components.country || 'US',
        google_place_id: place.place_id,
        latitude: place.geometry?.location?.lat(),
        longitude: place.geometry?.location?.lng(),
        formatted_address: place.formatted_address || '',
      }

      setInputValue(address.formatted_address)
      onChange(address)
    } catch (err) {
      setError('Failed to parse address')
    } finally {
      setIsLoading(false)
    }
  }, [onChange])

  const handleClear = () => {
    setInputValue('')
    onChange(null)
    inputRef.current?.focus()
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setError(null)
    // Clear the selection if user types
    if (value) {
      onChange(null)
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          className="pl-10 pr-10"
        />
        {(inputValue || value) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {value && (
        <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
          <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <p className="font-medium">{value.address_line1}</p>
            <p className="text-muted-foreground">
              {value.city}, {value.state} {value.postal_code}
            </p>
          </div>
        </div>
      )}

      {onManualEntry && !value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onManualEntry}
          className="text-muted-foreground"
        >
          Enter address manually
        </Button>
      )}
    </div>
  )
}
