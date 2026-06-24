import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import { MapPin, Store, Package } from 'lucide-react';
import { PickupLocation, City } from '@/types';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LocationMapProps {
  locations: PickupLocation[];
  selectedLocation: PickupLocation | null;
  onLocationSelect: (location: PickupLocation) => void;
  city?: City;
  height?: string;
}

// Custom marker icons
const createCustomIcon = (isSelected: boolean) => {
  const iconColor = isSelected ? '#3b82f6' : '#ef4444';
  const iconSize = isSelected ? [30, 40] : [25, 35];
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${iconColor}"/>
      </svg>
    `)}`,
    iconSize: iconSize as [number, number],
    iconAnchor: [iconSize[0] / 2, iconSize[1]],
    popupAnchor: [0, -iconSize[1]],
  });
};

// Component to fit map bounds to markers
function FitBounds({ locations }: { locations: PickupLocation[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = locations.map(location => [location.latitude, location.longitude] as [number, number]);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [locations, map]);
  
  return null;
}

export function LocationMap({ 
  locations, 
  selectedLocation, 
  onLocationSelect, 
  city,
  height = '400px' 
}: LocationMapProps) {
  const [mapCenter, setMapCenter] = useState<[number, number]>([33.5138, 36.2765]); // Damascus, Syria default

  useEffect(() => {
    if (city?.latitude && city?.longitude) {
      setMapCenter([city.latitude, city.longitude]);
    } else if (locations.length > 0) {
      // Calculate center from locations
      const avgLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
      const avgLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
      setMapCenter([avgLat, avgLng]);
    }
  }, [city, locations]);

  if (locations.length === 0) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-lg border"
        style={{ height }}
      >
        <div className="text-center text-gray-500">
          <MapPin className="h-8 w-8 mx-auto mb-2" />
          <p>No locations available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border" style={{ height }}>
      <MapContainer
        center={mapCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
        dragging={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <FitBounds locations={locations} />
        
        {locations.map((location) => (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={createCustomIcon(selectedLocation?.id === location.id)}
            eventHandlers={{
              click: () => onLocationSelect(location),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="flex items-start gap-2 mb-2">
                  {location.type === 'branch' ? (
                    <Store className="h-4 w-4 text-primary mt-0.5" />
                  ) : (
                    <Package className="h-4 w-4 text-primary mt-0.5" />
                  )}
                  <div>
                    <h3 className="font-semibold text-sm">{location.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{location.address}</p>
                  </div>
                </div>
                
                {location.phone && (
                  <p className="text-xs text-gray-500 mb-1">
                    📞 {location.phone}
                  </p>
                )}
                
                <div className="flex justify-between items-center mt-2 pt-2 border-t">
                  <span className="text-xs text-gray-500">
                    {location.estimated_days} days
                  </span>
                  <span className="font-semibold text-green-600 text-sm">
                    {location.pickup_fee > 0 
                      ? `$${location.pickup_fee.toFixed(2)}` 
                      : 'Free'
                    }
                  </span>
                </div>
                
                {location.special_instructions && (
                  <p className="text-xs text-gray-500 mt-2 italic">
                    {location.special_instructions}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
