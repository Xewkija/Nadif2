'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Move, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MapPreviewProps {
  latitude: number
  longitude: number
  onLocationChange?: (lat: number, lng: number) => void
  allowPinAdjustment?: boolean
  className?: string
}

export function MapPreview({
  latitude,
  longitude,
  onLocationChange,
  allowPinAdjustment = false,
  className,
}: MapPreviewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [pendingLocation, setPendingLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) {
      // Wait for Google Maps to load
      const checkGoogle = setInterval(() => {
        if (window.google?.maps && mapRef.current) {
          clearInterval(checkGoogle)
          initMap()
        }
      }, 100)

      return () => clearInterval(checkGoogle)
    }

    initMap()
  }, [latitude, longitude])

  const initMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return

    const center = { lat: latitude, lng: longitude }

    // Create map if not exists
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center,
        zoom: 17,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }],
          },
        ],
      })

      // Create marker
      markerRef.current = new window.google.maps.Marker({
        position: center,
        map: mapInstanceRef.current,
        draggable: false,
      })

      setIsLoaded(true)
    } else {
      // Update existing map
      mapInstanceRef.current.setCenter(center)
      markerRef.current?.setPosition(center)
    }
  }, [latitude, longitude])

  // Handle pin adjustment mode
  useEffect(() => {
    if (!markerRef.current) return

    markerRef.current.setDraggable(isAdjusting)

    if (isAdjusting) {
      const listener = markerRef.current.addListener('dragend', () => {
        const position = markerRef.current?.getPosition()
        if (position) {
          setPendingLocation({
            lat: position.lat(),
            lng: position.lng(),
          })
        }
      })

      return () => {
        window.google?.maps?.event?.removeListener(listener)
      }
    }
  }, [isAdjusting])

  const handleStartAdjust = () => {
    setIsAdjusting(true)
    setPendingLocation(null)
  }

  const handleConfirmAdjust = () => {
    if (pendingLocation && onLocationChange) {
      onLocationChange(pendingLocation.lat, pendingLocation.lng)
    }
    setIsAdjusting(false)
    setPendingLocation(null)
  }

  const handleCancelAdjust = () => {
    // Reset marker to original position
    if (markerRef.current) {
      markerRef.current.setPosition({ lat: latitude, lng: longitude })
    }
    setIsAdjusting(false)
    setPendingLocation(null)
  }

  if (!latitude || !longitude) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted rounded-lg h-48',
          className
        )}
      >
        <div className="text-center text-muted-foreground">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p className="text-sm">No location coordinates</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div
        ref={mapRef}
        className="w-full h-48 rounded-lg overflow-hidden bg-muted"
      />

      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-lg">
          <div className="text-center text-muted-foreground">
            <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Loading map...</p>
          </div>
        </div>
      )}

      {allowPinAdjustment && isLoaded && (
        <div className="absolute bottom-3 left-3 right-3">
          {isAdjusting ? (
            <div className="flex items-center justify-between bg-background/95 backdrop-blur rounded-lg p-2 shadow-lg">
              <p className="text-sm text-muted-foreground">
                Drag the pin to adjust location
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAdjust}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmAdjust}
                  disabled={!pendingLocation}
                >
                  <Check className="mr-1 h-3 w-3" />
                  Confirm
                </Button>
              </div>
            </div>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleStartAdjust}
              className="shadow-lg"
            >
              <Move className="mr-2 h-3 w-3" />
              Adjust Pin
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
