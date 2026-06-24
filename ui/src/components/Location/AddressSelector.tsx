import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Edit, Loader2 } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { useAuthContext } from '../../contexts/AuthContext';

export interface Address {
  street: string;
  city: string;
  postcode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface AddressSelectorProps {
  onAddressChange: (address: Address) => void;
  initialAddress?: Address;
  className?: string;
}

export function AddressSelector({ onAddressChange, initialAddress, className }: AddressSelectorProps) {
  const { t } = useTranslation();
  const { user, profile } = useAuthContext();
  const [isEditing, setIsEditing] = useState(!initialAddress && !profile?.location);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [address, setAddress] = useState<Address>(
    initialAddress || {
      street: '',
      city: '',
      postcode: '',
      country: 'UK',
    }
  );

  // Initialize address from user profile if available
  useEffect(() => {
    if (user && profile?.location && !initialAddress) {
      try {
        // Try to parse profile location if it's JSON
        const parsedLocation = JSON.parse(profile.location);
        if (parsedLocation && typeof parsedLocation === 'object') {
          setAddress(prev => ({ ...prev, ...parsedLocation }));
          onAddressChange({ ...address, ...parsedLocation });
        }
      } catch {
        // If not JSON, treat as a simple string address
        setAddress(prev => ({ ...prev, street: profile.location || '' }));
      }
    }
  }, [user, profile, initialAddress]);

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert(t('location.geolocationNotSupported'));
      return;
    }

    setIsLoadingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Use OpenStreetMap Nominatim for reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en&addressdetails=1`
          );
          const data = await response.json();
          
          console.log(data);
          
          if (data && data.address) {
            const address_components = data.address;
            
            const newAddress: Address = {
              street: `${address_components.house_number || ''} ${address_components.road || address_components.street || ''}`.trim() || 'Current Location',
              city: address_components.city || address_components.town || address_components.village || address_components.hamlet || 'Unknown City',
              postcode: address_components.postcode || '',
              country: address_components.country || 'UK',
              coordinates: {
                lat: latitude,
                lng: longitude
              }
            };
            
            console.log('Setting address from current location:', newAddress); // Debug log
            setAddress(newAddress);
            onAddressChange(newAddress);
            setIsEditing(false);
          }
        } catch (error) {
          console.error('Error getting address from coordinates:', error);
          // Fallback: use coordinates with basic address info
          const newAddress: Address = {
            street: address.street || 'Current Location',
            city: address.city || 'Unknown City',
            postcode: address.postcode || '',
            country: address.country || 'UK',
            coordinates: {
              lat: latitude,
              lng: longitude
            }
          };
          console.log('Setting fallback address from current location:', newAddress); // Debug log
          setAddress(newAddress);
          onAddressChange(newAddress);
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        alert(t('location.errorGettingLocation'));
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleAddressUpdate = (field: keyof Address, value: string) => {
    const newAddress = { ...address, [field]: value };
    setAddress(newAddress);
    // Call onAddressChange for real-time updates during editing
    onAddressChange(newAddress);
  };

  const handleSaveAddress = () => {
    onAddressChange(address);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{user ? t('checkout.editAddress') : t('checkout.enterAddress')}</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="street">{t('checkout.streetAddress')}</Label>
                <Input
                  id="street"
                  value={address.street}
                  onChange={(e) => handleAddressUpdate('street', e.target.value)}
                  placeholder={t('checkout.streetPlaceholder')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city">{t('checkout.city')}</Label>
                  <Input
                    id="city"
                    value={address.city}
                    onChange={(e) => handleAddressUpdate('city', e.target.value)}
                    placeholder={t('checkout.cityPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="postcode">{t('checkout.postcode')}</Label>
                  <Input
                    id="postcode"
                    value={address.postcode}
                    onChange={(e) => handleAddressUpdate('postcode', e.target.value)}
                    placeholder={t('checkout.postcodePlaceholder')}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="country">{t('checkout.country')}</Label>
                <Input
                  id="country"
                  value={address.country}
                  onChange={(e) => handleAddressUpdate('country', e.target.value)}
                  placeholder={t('checkout.countryPlaceholder')}
                />
              </div>
            </div>

            {!user && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={getCurrentLocation}
                  disabled={isLoadingLocation}
                  className="flex items-center gap-2"
                >
                  {isLoadingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                  {t('location.useCurrentLocation')}
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveAddress} size="sm">
                {t('common.save')}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">{t('checkout.deliveryAddress')}</h3>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-1">
          {user && profile?.full_name && (
            <p className="text-sm font-medium">{profile.full_name}</p>
          )}
          <p className="text-sm">{address.street}</p>
          <p className="text-sm">{address.city} {address.postcode}</p>
          <p className="text-sm">{address.country}</p>
        </div>
        
        {!user && (
          <div className="mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={isLoadingLocation}
              className="flex items-center gap-2"
            >
              {isLoadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              {address.street ? t('location.useCurrentLocation') : t('location.detectLocation')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 