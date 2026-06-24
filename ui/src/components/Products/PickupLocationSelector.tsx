import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, Store, Package, Map } from 'lucide-react';
import { City, PickupLocation } from '@/types';
import { getCities, getPickupLocationsByCity } from '@/services/locationService';
import { Button } from '@/components/shadcn/button';
import { Card } from '@/components/shadcn/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shadcn/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shadcn/select';
import { LocationMap } from './LocationMap';

interface PickupLocationSelectorProps {
  selectedLocation: PickupLocation | null;
  onLocationSelect: (location: PickupLocation) => void;
  currency?: string;
}

export function PickupLocationSelector({
  selectedLocation,
  onLocationSelect,
  currency = 'GBP',
}: PickupLocationSelectorProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Utility function to format price
  const formatPrice = (price: number, curr: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: curr || 'GBP',
      minimumFractionDigits: 2,
    }).format(price);
  };
  
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [locations, setLocations] = useState<PickupLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cities on mount
  useEffect(() => {
    loadCities();
  }, []);

  // Load locations when city is selected
  useEffect(() => {
    if (selectedCityId) {
      loadLocations(selectedCityId);
    } else {
      setLocations([]);
    }
  }, [selectedCityId]);

  const loadCities = async () => {
    try {
      setLoading(true);
      setError(null);
      const citiesData = await getCities();
      setCities(citiesData);
    } catch (err) {
      console.error('Error loading cities:', err);
      setError('Failed to load cities');
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async (cityId: string) => {
    try {
      setLoadingLocations(true);
      setError(null);
      const locationsData = await getPickupLocationsByCity(cityId);
      setLocations(locationsData);
    } catch (err) {
      console.error('Error loading pickup locations:', err);
      setError('Failed to load pickup locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCityId(cityId);
    const city = cities.find(c => c.id === cityId);
    setSelectedCity(city || null);
    };

  const handleLocationSelect = (location: PickupLocation) => {
    onLocationSelect(location);
  };

  const getCityName = (city: City) => {
    return isArabic && city.name_ar ? city.name_ar : city.name;
  };

  const getLocationName = (location: PickupLocation) => {
    return isArabic && location.name_ar ? location.name_ar : location.name;
  };

  const getLocationAddress = (location: PickupLocation) => {
    return isArabic && location.address_ar ? location.address_ar : location.address;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={loadCities} variant="outline" size="sm">
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* City Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {t('checkout.selectCity')}
        </label>
        <Select value={selectedCityId} onValueChange={handleCityChange}>
          <SelectTrigger>
            <SelectValue placeholder={t('checkout.selectCityPlaceholder')} />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {getCityName(city)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Selection */}
      {selectedCityId && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('checkout.selectPickupLocation')}
          </label>
          
          {loadingLocations ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              {t('checkout.noLocationsAvailable')}
            </div>
          ) : (
            <Tabs defaultValue="list" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  {t('checkout.locationList')}
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="h-4 w-4" />
                  {t('checkout.locationMap')}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="mt-4">
                <div className="space-y-2">
                  {locations.map((location) => (
                    <Card
                      key={location.id}
                      className={`p-4 cursor-pointer transition-all ${
                        selectedLocation?.id === location.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => handleLocationSelect(location)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {location.type === 'branch' ? (
                            <Store className="h-5 w-5 text-primary" />
                          ) : (
                            <Package className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-sm">
                                {getLocationName(location)}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                <MapPin className="inline h-3 w-3 mr-1" />
                                {getLocationAddress(location)}
                              </p>
                              {location.phone && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {t('common.phone')}: {location.phone}
                                </p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="font-semibold text-green-600">
                                {location.pickup_fee > 0
                                  ? formatPrice(location.pickup_fee, currency)
                                  : t('common.free')}
                              </p>
                              {location.estimated_days && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {location.estimated_days} {t('common.days')}
                                </p>
                              )}
                            </div>
                          </div>
                          {location.special_instructions && (
                            <p className="text-xs text-gray-500 mt-2 italic">
                              {isArabic && location.special_instructions_ar
                                ? location.special_instructions_ar
                                : location.special_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="map" className="mt-4">
                <div className="h-[300px] sm:h-[400px]">
                  <LocationMap
                    locations={locations}
                    selectedLocation={selectedLocation}
                    onLocationSelect={handleLocationSelect}
                    city={selectedCity || undefined}
                    height="100%"
                  />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}

