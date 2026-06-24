import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Input } from '@/components/shadcn/input';
import { Button } from '@/components/shadcn/button';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent } from '@/components/shadcn/card';
import { Search, MapPin, Loader2 } from 'lucide-react';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface LocationPickerProps {
  value?: LocationData;
  onChange: (location: LocationData) => void;
  disabled?: boolean;
}

interface GeocodingResult {
  display_name: string;
  lat: string;
  lon: string;
  place_id: string;
}

// Component to handle map clicks
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to handle map center updates
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMapEvents({});
  
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  
  return null;
}

export function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const { t } = useTranslation();
  const [addressInput, setAddressInput] = useState(value?.address || '');
  const [selectedLocation, setSelectedLocation] = useState<LocationData>(
    value || { address: '', latitude: null, longitude: null }
  );
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([35.6892, 37.3442]); // Damascus, Syria
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Update internal state when prop value changes
  useEffect(() => {
    if (value) {
      setSelectedLocation(value);
      setAddressInput(value.address);
      if (value.latitude && value.longitude) {
        setMapCenter([value.latitude, value.longitude]);
      }
    }
  }, [value]);

  // Geocoding function using Nominatim
  const geocodeAddress = async (address: string): Promise<GeocodingResult[]> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=5&countrycodes=sy&addressdetails=1`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  };

  // Reverse geocoding function
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      );
      const data = await response.json();
      return data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  };

  // Handle address input change with debounced search
  const handleAddressChange = (address: string) => {
    setAddressInput(address);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (address.length > 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        const results = await geocodeAddress(address);
        setSearchResults(results);
        setShowResults(results.length > 0);
        setIsSearching(false);
      }, 500);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  // Handle search result selection
  const handleResultSelect = (result: GeocodingResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    const newLocation: LocationData = {
      address: result.display_name,
      latitude: lat,
      longitude: lng,
    };

    setSelectedLocation(newLocation);
    setAddressInput(result.display_name);
    setMapCenter([lat, lng]);
    setShowResults(false);
    onChange(newLocation);
  };

  // Handle map click
  const handleMapClick = async (lat: number, lng: number) => {
    const address = await reverseGeocode(lat, lng);
    
    const newLocation: LocationData = {
      address,
      latitude: lat,
      longitude: lng,
    };

    setSelectedLocation(newLocation);
    setAddressInput(address);
    setMapCenter([lat, lng]);
    onChange(newLocation);
  };

  // Manual search trigger
  const handleSearch = async () => {
    if (addressInput.length > 2) {
      setIsSearching(true);
      const results = await geocodeAddress(addressInput);
      setSearchResults(results);
      setShowResults(results.length > 0);
      setIsSearching(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address-search">{t('listing.locationPicker.addressSearch')}</Label>
          <div className="relative">
            <div className="flex gap-2">
              <Input
                id="address-search"
                value={addressInput}
                onChange={(e) => handleAddressChange(e.target.value)}
                placeholder={t('listing.locationPicker.searchPlaceholder')}
                disabled={disabled}
                className="flex-1"
              />
              <Button 
                type="button" 
                onClick={handleSearch} 
                disabled={isSearching || disabled}
                variant="outline"
                size="sm"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-[9999] w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    className="w-full text-start px-4 py-2 hover:bg-gray-100 border-b last:border-b-0"
                    onClick={() => handleResultSelect(result)}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-gray-500 flex-shrink-0" />
                      <span className="text-sm">{result.display_name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Display */}
        <div className="space-y-2 mt-40">
          <Label>{t('listing.locationPicker.selectLocationOnMap')}</Label>
          <div className="h-96 w-full  rounded-lg overflow-hidden border">
            <MapContainer
              center={mapCenter}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapCenterUpdater center={mapCenter} />
              <MapClickHandler onLocationSelect={handleMapClick} />
              
              {selectedLocation.latitude && selectedLocation.longitude && (
                <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
                  <Popup>
                    <div className="p-2">
                      <p className="font-semibold mb-1">{t('listing.locationPicker.selectedLocation')}</p>
                      <p className="text-sm text-gray-600 mb-2">{selectedLocation.address}</p>
                      <p className="text-xs text-gray-500">
                        Lat: {selectedLocation.latitude.toFixed(6)}<br />
                        Lng: {selectedLocation.longitude.toFixed(6)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Selected Location Info */}
        {selectedLocation.latitude && selectedLocation.longitude && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{t('listing.locationPicker.selectedLocationInfo')}</h4>
            <p className="text-sm text-gray-700 mb-1">{selectedLocation.address}</p>
            <p className="text-xs text-gray-500">
              {t('listing.locationPicker.coordinates')}: {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
            </p>
          </div>
        )}

        <p className="text-xs text-gray-500">
          {t('listing.locationPicker.tip')}
        </p>
      </CardContent>
    </Card>
  );
} 