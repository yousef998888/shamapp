import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { X, Search, MapPin, Package, Store, Building } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Card, CardContent } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import pickupLocationsData from '../../data/pickup-locations.json';

// Fix for default marker icons in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PickupLocation {
  id: string;
  name: string;
  price: number;
  location: string;
  delivery_time: string;
  coordinates: [number, number];
  type: 'locker' | 'store' | 'post_office' | 'shop';
}

interface PickupLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (location: PickupLocation) => void;
  selectedLocation?: PickupLocation | null;
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

export function PickupLocationModal({ isOpen, onClose, onSelect, selectedLocation }: PickupLocationModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState<PickupLocation[]>(
    pickupLocationsData.pickup_locations.map(loc => ({
      ...loc,
      coordinates: loc.coordinates as [number, number],
      type: loc.type as 'locker' | 'store' | 'post_office' | 'shop'
    }))
  );
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.5138, 36.2765]); // Damascus area
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);

  useEffect(() => {
    if (searchQuery) {
      const filtered = pickupLocationsData.pickup_locations.filter(location =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredLocations(filtered.map(loc => ({
        ...loc,
        coordinates: loc.coordinates as [number, number],
        type: loc.type as 'locker' | 'store' | 'post_office' | 'shop'
      })));
    } else {
      setFilteredLocations(pickupLocationsData.pickup_locations.map(loc => ({
        ...loc,
        coordinates: loc.coordinates as [number, number],
        type: loc.type as 'locker' | 'store' | 'post_office' | 'shop'
      })));
    }
  }, [searchQuery]);

  const handleLocationSelect = (location: PickupLocation) => {
    onSelect(location);
    onClose();
  };

  const handleLocationHover = (locationId: string | null) => {
    setHoveredLocation(locationId);
    if (locationId) {
      const location = pickupLocationsData.pickup_locations.find(loc => loc.id === locationId);
      if (location) {
        setMapCenter(location.coordinates as [number, number]);
      }
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'locker':
        return <Package className="h-4 w-4" />;
      case 'store':
      case 'shop':
        return <Store className="h-4 w-4" />;
      case 'post_office':
        return <Building className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{t('pickup.title')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left side - Map */}
          <div className="flex-1 relative">
            <MapContainer
              center={mapCenter}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
              attributionControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapCenterUpdater center={mapCenter} />
              <MapClickHandler onLocationSelect={() => {}} />
              
                             {pickupLocationsData.pickup_locations.map((location) => (
                 <Marker 
                   key={location.id} 
                   position={location.coordinates as [number, number]}
                  eventHandlers={{
                    mouseover: () => handleLocationHover(location.id),
                    mouseout: () => handleLocationHover(null),
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <p className="font-semibold mb-1">{location.name}</p>
                      <p className="text-sm text-gray-600 mb-2">{location.location}</p>
                      <p className="text-sm font-medium text-green-600">{formatPrice(location.price)}</p>
                      <p className="text-xs text-gray-500">{location.delivery_time}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Right side - Location list */}
          <div className="w-96 border-l overflow-y-auto">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={t('pickup.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="p-4 space-y-3">
              {filteredLocations.map((location) => (
                <Card 
                  key={location.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedLocation?.id === location.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                  } ${hoveredLocation === location.id ? 'bg-gray-50' : ''}`}
                  onMouseEnter={() => handleLocationHover(location.id)}
                  onMouseLeave={() => handleLocationHover(null)}
                  onClick={() => handleLocationSelect(location)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getLocationIcon(location.type)}
                        <span className="font-medium text-sm">{location.name}</span>
                      </div>
                      <span className="font-semibold text-green-600">{formatPrice(location.price)}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">{location.location}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{location.delivery_time}</span>
                      <Badge variant="outline" className="text-xs">
                        {t(`pickup.type.${location.type}`)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {filteredLocations.length} {t('pickup.searchResults')}
            </p>
            <Button onClick={onClose} variant="outline">
              {t('pickup.cancel')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 