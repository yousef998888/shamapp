import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MapView, Marker } from '@/components/map/MapView';
import AddressService from '@/services/AddressService';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/utils/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTranslation } from '@/hooks/useTranslation';
import type { UserAddress, CreateAddressData, PickupLocation } from '@/types/database';
import PageHeader from './PageHeader';

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: UserAddress) => void;
  onApply?: (address: UserAddress) => void;
  selectedAddressId?: string;
  showTabs?: boolean;
  defaultTab?: 'addresses' | 'collection';
  title?: string;
  selectionType?: 'both' | 'pickup' | 'home';
}

interface AddressSuggestion {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export default function LocationPicker({
  visible,
  onClose,
  onSelect,
  onApply,
  selectedAddressId,
  showTabs = false,
  defaultTab = 'addresses',
  title,
  selectionType = 'both',
}: LocationPickerProps) {
  const { user } = useAuthContext();
  const { t, isRTL, language } = usePageTranslation('locationPickerPage');
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [userCollectionPoints, setUserCollectionPoints] = useState<UserAddress[]>([]);
  const [availableCollectionPoints, setAvailableCollectionPoints] = useState<PickupLocation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const getInitialTab = useCallback(() => {
    if (selectionType === 'pickup') {
      return 'collection';
    }
    if (selectionType === 'home') {
      return 'addresses';
    }
    return defaultTab;
  }, [selectionType, defaultTab]);

  const [activeTab, setActiveTab] = useState<'addresses' | 'collection'>(getInitialTab);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showCollectionPointModal, setShowCollectionPointModal] = useState(false);
  const [internalSelectedId, setInternalSelectedId] = useState<string | undefined>(undefined);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [mapRegion, setMapRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [showCollectionPointMap, setShowCollectionPointMap] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newAddressTitle, setNewAddressTitle] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false);
  const [locationRequestInProgress, setLocationRequestInProgress] = useState(false);
  const locationCacheRef = React.useRef<{ location: { latitude: number; longitude: number } | null; timestamp: number } | null>(null);

  // New state for apply button pattern
  const [pendingSelection, setPendingSelection] = useState<UserAddress | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // State for main page view toggle (list/map)
  const [mainViewMode, setMainViewMode] = useState<'list' | 'map'>('list');

  // Debounce search query with 500ms delay
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const showTabsUI = showTabs && selectionType === 'both';

  // Fetch user addresses on mount
  useEffect(() => {
    if (visible) {
      setActiveTab(getInitialTab());
    }
  }, [visible, getInitialTab]);

  useEffect(() => {
    if (visible) {
      if (activeTab === 'addresses') {
        fetchAddresses();
      } else {
        fetchCollectionPoints();
        fetchAvailableCollectionPoints();
      }
    }
  }, [visible, activeTab]);

  // Auto-select default address/collection point when data loads
  useEffect(() => {
    const currentSelectedId = selectedAddressId || internalSelectedId;
    if (activeTab === 'addresses' && addresses.length > 0) {
      if (currentSelectedId) {
        // If there's a pre-selected address, set it as pending selection
        const preSelectedAddress = addresses.find(addr => addr.id === currentSelectedId);
        if (preSelectedAddress && !pendingSelection) {
          setPendingSelection(preSelectedAddress);
          setInternalSelectedId(preSelectedAddress.id);
        }
      } else if (!currentSelectedId) {
        // Otherwise, select the default address
        const defaultAddress = addresses.find(addr => addr.is_default);
        if (defaultAddress) {
          setInternalSelectedId(defaultAddress.id);
          setPendingSelection(defaultAddress);
        }
      }
    } else if (activeTab === 'collection' && userCollectionPoints.length > 0) {
      if (currentSelectedId) {
        // If there's a pre-selected collection point, set it as pending selection
        const preSelectedPoint = userCollectionPoints.find(point => point.id === currentSelectedId);
        if (preSelectedPoint && !pendingSelection) {
          setPendingSelection(preSelectedPoint);
          setInternalSelectedId(preSelectedPoint.id);
        }
      } else if (!currentSelectedId) {
        // Otherwise, select the default collection point
        const defaultCollectionPoint = userCollectionPoints.find(point => point.is_default);
        if (defaultCollectionPoint) {
          setInternalSelectedId(defaultCollectionPoint.id);
          setPendingSelection(defaultCollectionPoint);
        }
      }
    }
  }, [addresses, userCollectionPoints, activeTab, selectedAddressId, internalSelectedId, pendingSelection]);

  // Search for address suggestions with debouncing
  useEffect(() => {
    if (debouncedSearchQuery.length > 2) {
      searchAddresses();
    } else {
      setSuggestions([]);
      setSearchLoading(false);
    }
  }, [debouncedSearchQuery]);

  // Show loading when user is typing
  useEffect(() => {
    if (searchQuery.length > 2 && searchQuery !== debouncedSearchQuery) {
      setSearchLoading(true);
    }
  }, [searchQuery, debouncedSearchQuery]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const allAddresses = await AddressService.fetchUserAddresses();
      // Filter out collection points (those with "Collection Point -" prefix)
      let regularAddresses = allAddresses.filter(addr =>
        !addr.title.startsWith('Collection Point -')
      );

      // Get user location and sort by distance
      const currentLocation = await getUserLocation(true);

      if (currentLocation && regularAddresses.length > 0) {
        // Calculate distance for each address and sort
        regularAddresses = regularAddresses
          .map((address) => ({
            ...address,
            distance: address.latitude && address.longitude
              ? calculateDistance(
                  currentLocation.latitude,
                  currentLocation.longitude,
                  address.latitude,
                  address.longitude
                )
              : undefined,
          }))
          .sort((a, b) => {
            // Put addresses with no location at the end
            if (a.distance === undefined && b.distance === undefined) return 0;
            if (a.distance === undefined) return 1;
            if (b.distance === undefined) return -1;
            return a.distance - b.distance;
          });
      } else {
        // If location not available, sort by default status then alphabetically
        regularAddresses = regularAddresses.sort((a, b) => {
          if (a.is_default && !b.is_default) return -1;
          if (!a.is_default && b.is_default) return 1;
          return a.title.localeCompare(b.title);
        });
      }

      setAddresses(regularAddresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
      Alert.alert(t.error || 'Error', t.failedToFetchAddresses || 'Failed to fetch addresses');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollectionPoints = async () => {
    try {
      setLoading(true);
      // Fetch user's saved pickup addresses from the proper table
      const { data, error } = await supabase
        .from('user_pickup_addresses')
        .select(`
          *,
          pickup_location:pickup_locations(
            *,
            city:cities(*)
          )
        `)
        .eq('user_id', user?.id!)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform the data to match the expected format
      let collectionPoints = (data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        title: item.title,
        title_ar: item.pickup_location.name_ar,
        address_line_1: item.pickup_location.address,
        address_line_1_ar: item.pickup_location.address_ar,
        address_line_2: undefined,
        city: item.pickup_location.city.name,
        city_ar: item.pickup_location.city.name_ar,
        country: item.pickup_location.city.country,
        country_ar: item.pickup_location.city.country_ar,
        postal_code: undefined,
        latitude: item.pickup_location.latitude,
        longitude: item.pickup_location.longitude,
        is_default: item.is_default,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Store the pickup location ID for reference
        pickup_location_id: item.pickup_location_id,
        pickup_location: item.pickup_location
      }));

      // Get user location and sort by distance
      const currentLocation = await getUserLocation(true);

      if (currentLocation && collectionPoints.length > 0) {
        // Calculate distance for each point and sort
        collectionPoints = collectionPoints
          .map((point) => ({
            ...point,
            distance: calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              point.latitude,
              point.longitude
            ),
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      }

      setUserCollectionPoints(collectionPoints);
    } catch (error) {
      console.error('Error fetching collection points:', error);
      Alert.alert(t.error || 'Error', t.failedToLoadCollectionPoints || 'Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get localized city name
  const getLocalizedCity = (address: UserAddress): string => {
    if (language === 'ar' && address.city_ar) {
      return address.city_ar;
    }
    return address.city || '';
  };

  const getLocalizedTitle = (address: UserAddress): string => {
    if (language === 'ar' && address.title_ar) {
      return address.title_ar;
    }
    return address.title || '';
  };

  const getLocalizedAddressLine1 = (address: UserAddress): string => {
    if (language === 'ar' && address.address_line_1_ar) {
      return address.address_line_1_ar;
    }
    return address.address_line_1 || '';
  };

  const getLocalizedAddressLine2 = (address: UserAddress): string => {
    if (language === 'ar' && address.address_line_2_ar) {
      return address.address_line_2_ar;
    }
    return address.address_line_2 || '';
  };

  


  // Helper function to get localized country name
  const getLocalizedCountry = (address: UserAddress): string => {
    if (language === 'ar' && address.country_ar) {
      return address.country_ar;
    }
    return address.country || '';
  };

  // Helper functions for pickup locations
  const getLocalizedPickupName = (point: PickupLocation): string => {
    if (language === 'ar' && point.name_ar) {
      return point.name_ar;
    }
    return point.name || '';
  };

  const getLocalizedPickupAddress = (point: PickupLocation): string => {
    if (language === 'ar' && point.address_ar) {
      return point.address_ar;
    }
    return point.address || '';
  };

  const getLocalizedCityName = (city: any): string => {
    if (language === 'ar' && city?.name_ar) {
      return city.name_ar;
    }
    return city?.name || '';
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Get user's current location with caching
  const getUserLocation = async (useCache = true): Promise<{ latitude: number; longitude: number } | null> => {
    // Check cache first (cache valid for 5 minutes)
    if (useCache && locationCacheRef.current) {
      const cacheAge = Date.now() - locationCacheRef.current.timestamp;
      if (cacheAge < 5 * 60 * 1000 && locationCacheRef.current.location) {
        return locationCacheRef.current.location;
      }
    }

    // Prevent multiple simultaneous requests
    if (locationRequestInProgress) {
      // Wait for the in-progress request
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!locationRequestInProgress) {
            clearInterval(checkInterval);
            if (locationCacheRef.current?.location) {
              resolve(locationCacheRef.current.location);
            } else {
              resolve(null);
            }
          }
        }, 100);
        // Timeout after 2 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 2000);
      });
    }

    try {
      setLocationRequestInProgress(true);

      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setLocationPermissionGranted(false);
        locationCacheRef.current = { location: null, timestamp: Date.now() };
        return null;
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermissionGranted(false);
        locationCacheRef.current = { location: null, timestamp: Date.now() };
        return null;
      }

      setLocationPermissionGranted(true);
      
      // Request location with shorter timeout (5 seconds instead of 10)
      const location = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timeout')), 5000)
        ),
      ]);

      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      
      // Cache the result
      locationCacheRef.current = { location: coords, timestamp: Date.now() };
      setUserLocation(coords);
      return coords;
    } catch (error: any) {
      // Handle different types of errors gracefully
      const errorMessage = error?.message || 'Unknown error';
      // Only log timeout/unavailable errors once to avoid spam
      if (
        errorMessage.includes('unavailable') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('permission')
      ) {
        // Only warn once per session to avoid spam
        if (!locationCacheRef.current || Date.now() - locationCacheRef.current.timestamp > 60000) {
          console.warn('Location unavailable:', errorMessage);
        }
      } else {
        console.error('Error getting user location:', error);
      }
      
      // Cache the failure (but with shorter cache time - 1 minute)
      locationCacheRef.current = { location: null, timestamp: Date.now() };
      setLocationPermissionGranted(false);
      setUserLocation(null);
      return null;
    } finally {
      setLocationRequestInProgress(false);
    }
  };

  const fetchAvailableCollectionPoints = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pickup_locations')
        .select(`
          *,
          city:cities(*)
        `)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      let sortedPoints = data || [];

      // Get user location and sort by distance
      // Use cached location if available to avoid repeated requests
      const currentLocation = await getUserLocation(true);

      if (currentLocation && sortedPoints.length > 0) {
        // Calculate distance for each point and sort
        sortedPoints = sortedPoints
          .map((point) => ({
            ...point,
            distance: calculateDistance(
              currentLocation.latitude,
              currentLocation.longitude,
              point.latitude,
              point.longitude
            ),
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      } else {
        // If location not available, sort alphabetically
        sortedPoints = sortedPoints.sort((a, b) => a.name.localeCompare(b.name));
      }

      setAvailableCollectionPoints(sortedPoints);
    } catch (error) {
      console.error('Error fetching available collection points:', error);
      Alert.alert(t.error || 'Error', t.failedToLoadCollectionPoints || 'Failed to load collection points');
    } finally {
      setLoading(false);
    }
  };

  const searchAddresses = async () => {
    try {
      setSearchLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedSearchQuery)}&limit=5&addressdetails=1&email=your-email@example.com`
      );

      // Check if response is ok
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      // Check if response is HTML (error page) instead of JSON
      if (text.trim().startsWith('<')) {
        console.warn('Received HTML response instead of JSON, likely rate limited');
        // Fallback to mock data for demo purposes

        return;
      }

      const data = JSON.parse(text);
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error searching addresses:', error);
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number): Promise<string> => {
    try {
      setReverseGeocoding(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&email=your-email@example.com`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();

      if (text.trim().startsWith('<')) {
        console.warn('Received HTML response instead of JSON, likely rate limited');
        return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      }

      const data = JSON.parse(text);
      return data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } finally {
      setReverseGeocoding(false);
    }
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    const location = {
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      address: suggestion.display_name,
    };
    setSelectedLocation(location);
    setMapRegion({
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
    setSearchQuery(suggestion.display_name);
    setSuggestions([]);
    setShowMap(true);
    setShowSearchModal(false); // Close the search modal
  };

  const handleMapPress = async (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const address = await reverseGeocode(latitude, longitude);
    setSelectedLocation({
      latitude,
      longitude,
      address: address,
    });
    setMapRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };


  const handleCreateAddress = async () => {
    if (!selectedLocation || !newAddressTitle.trim()) {
      Alert.alert(t.error || 'Error', t.pleaseSelectLocationAndEnterTitle || 'Please select a location and enter a title');
      return;
    }

    try {
      setLoading(true);

      // Parse the address components from the selected location
      const addressParts = selectedLocation.address.split(', ');
      const title = activeTab === 'collection'
        ? `Collection Point - ${newAddressTitle.trim()}`
        : newAddressTitle.trim();

      const addressData: CreateAddressData = {
        title: title,
        address_line_1: addressParts[0] || selectedLocation.address,
        city: addressParts[addressParts.length - 3] || 'Unknown',
        country: addressParts[addressParts.length - 1] || 'Unknown',
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        is_default: activeTab === 'addresses' ? addresses.length === 0 : userCollectionPoints.length === 0,
      };

      const newAddress = await AddressService.createAddress(addressData);

      // Refresh the appropriate list
      if (activeTab === 'addresses') {
        await fetchAddresses();
      } else {
        await fetchCollectionPoints();
      }

      onSelect(newAddress);
      onClose();
    } catch (error: any) {
      console.error('Error creating address:', error);

      let errorMessage = t.failedToCreateAddress || 'Failed to create address';
      if (error.message?.includes('User must be authenticated')) {
        errorMessage = t.pleaseLogInToSaveAddresses || 'Please log in to save addresses';
      } else if (error.message?.includes('row-level security policy')) {
        errorMessage = t.permissionDenied || 'Permission denied. Please try logging in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(t.error || 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleExistingAddressSelect = (address: UserAddress) => {
    setInternalSelectedId(address.id);
    setPendingSelection(address);
    setHasChanges(true);
  };

  const handleSetAsDefault = async (addressId: string, isPickup: boolean = false) => {
    try {
      if (isPickup) {
        // Update user_pickup_addresses table
        const { error } = await supabase
          .from('user_pickup_addresses')
          .update({ is_default: false })
          .eq('user_id', user?.id);

        if (error) throw error;

        const { error: updateError } = await supabase
          .from('user_pickup_addresses')
          .update({ is_default: true })
          .eq('id', addressId);

        if (updateError) throw updateError;

        // Update local state
        setUserCollectionPoints(prev =>
          prev.map(addr => ({
            ...addr,
            is_default: addr.id === addressId
          }))
        );
      } else {
        // Update user_addresses table
        const { error } = await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user?.id);

        if (error) throw error;

        const { error: updateError } = await supabase
          .from('user_addresses')
          .update({ is_default: true })
          .eq('id', addressId);

        if (updateError) throw updateError;

        // Update local state
        setAddresses(prev =>
          prev.map(addr => ({
            ...addr,
            is_default: addr.id === addressId
          }))
        );
      }
    } catch (error) {
      console.error('Error setting default address:', error);
      Alert.alert(t.error || 'Error', t.failedToSetAsDefault || 'Failed to set as default address');
    }
  };

  const handleCollectionPointSelect = async (point: PickupLocation) => {
    try {
      setLoading(true);

      // Create a new pickup address entry in the proper table
      // Use localized name for the title
      const localizedTitle = language === 'ar' && point.name_ar ? point.name_ar : point.name;
      
      const { data, error } = await supabase
        .from('user_pickup_addresses')
        .insert({
          user_id: user?.id!,
          pickup_location_id: point.id,
          title: localizedTitle,
          is_default: userCollectionPoints.length === 0,
          is_active: true
        })
        .select(`
          *,
          pickup_location:pickup_locations(
            *,
            city:cities(*)
          )
        `)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        // Transform the data to match the expected format
        const newCollectionPoint = {
          id: data.id,
          user_id: data.user_id,
          title: data.title,
          title_ar: data.pickup_location.name_ar,
          address_line_1: data.pickup_location.address,
          address_line_1_ar: data.pickup_location.address_ar,
          address_line_2: undefined,
          city: data.pickup_location.city.name,
          city_ar: data.pickup_location.city.name_ar,
          country: data.pickup_location.city.country,
          country_ar: data.pickup_location.city.country_ar,
          postal_code: undefined,
          latitude: data.pickup_location.latitude,
          longitude: data.pickup_location.longitude,
          is_default: data.is_default,
          is_active: data.is_active,
          created_at: data.created_at,
          updated_at: data.updated_at,
          pickup_location_id: data.pickup_location_id,
          pickup_location: data.pickup_location
        };

        // Add to the collection points list
        setUserCollectionPoints(prev => [...prev, newCollectionPoint]);

        // Select this address
        setInternalSelectedId(newCollectionPoint.id);
        setPendingSelection(newCollectionPoint);
        setHasChanges(true);

        // Close the collection point modal
        setShowCollectionPointModal(false);
      }
    } catch (error) {
      console.error('Error adding collection point:', error);
      let errorMessage = t.failedToAddCollectionPoint || 'Failed to add collection point';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      Alert.alert(t.error || 'Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (pendingSelection) {
      if (onApply) {
        onApply(pendingSelection);
      } else {
        onSelect(pendingSelection);
      }
      onClose();
    }
  };



  const resetState = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSelectedLocation(null);
    setMapRegion(null);
    setShowMap(false);
    setShowCollectionPointMap(false);
    setIsCreatingNew(false);
    setNewAddressTitle('');
    setSearchLoading(false);
    setShowSearchModal(false);
    setShowCollectionPointModal(false);
    setInternalSelectedId(undefined);
    setActiveTab(getInitialTab());
    setReverseGeocoding(false);
  };

  const handleClose = () => {
    setPendingSelection(null);
    setHasChanges(false);
    setInternalSelectedId(selectedAddressId || undefined);
    resetState();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        {/* <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {title
              || (showTabsUI
                ? t.myAddresses || 'My Addresses'
                : selectionType === 'pickup'
                  ? t.selectPickupLocation || 'Select Pickup Location'
                  : t.editAddress || 'Edit Address')}
          </Text>
          <View style={styles.headerRight} />
        </View> */}
        <PageHeader onBackPress={onClose} title={t.myAddresses || 'My Addresses'} />

        {/* Tabs */}
        {showTabsUI && (
          <View style={[styles.tabsContainer, isRTL && styles.rtlTabsContainer]}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'addresses' && styles.activeTab]}
              onPress={() => setActiveTab('addresses')}
            >
              <Text style={[styles.tabText, activeTab === 'addresses' && styles.activeTabText, isRTL && styles.rtlText]}>
                {t.address || 'Address'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'collection' && styles.activeTab]}
              onPress={() => setActiveTab('collection')}
            >
              <Text style={[styles.tabText, activeTab === 'collection' && styles.activeTabText, isRTL && styles.rtlText]}>
                {t.collectionPoints || 'Collection Points'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode Toggle (List/Map) */}
        {!showMap && (
          <View style={[styles.viewTabsContainer, isRTL && styles.rtlViewTabsContainer]}>
            <TouchableOpacity
              style={[styles.viewTab, mainViewMode === 'list' && styles.activeViewTab]}
              onPress={() => setMainViewMode('list')}
            >
              <Text style={[styles.viewTabText, mainViewMode === 'list' && styles.activeViewTabText, isRTL && styles.rtlText]}>
                {t.list || 'List'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewTab, mainViewMode === 'map' && styles.activeViewTab]}
              onPress={() => {
                setMainViewMode('map');
                // Initialize map region when switching to map view
                if (activeTab === 'collection' && availableCollectionPoints.length > 0) {
                  if (userLocation) {
                    setMapRegion({
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    });
                  } else {
                    const avgLat = availableCollectionPoints.reduce((sum, p) => sum + p.latitude, 0) / availableCollectionPoints.length;
                    const avgLon = availableCollectionPoints.reduce((sum, p) => sum + p.longitude, 0) / availableCollectionPoints.length;
                    setMapRegion({
                      latitude: avgLat,
                      longitude: avgLon,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    });
                  }
                } else if (activeTab === 'addresses' && addresses.length > 0) {
                  // Center on first address or user location
                  const firstAddr = addresses[0];
                  if (firstAddr.latitude && firstAddr.longitude) {
                    setMapRegion({
                      latitude: firstAddr.latitude,
                      longitude: firstAddr.longitude,
                      latitudeDelta: 0.1,
                      longitudeDelta: 0.1,
                    });
                  }
                }
              }}
            >
              <Text style={[styles.viewTabText, mainViewMode === 'map' && styles.activeViewTabText, isRTL && styles.rtlText]}>
                {t.map || 'Map'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {!showMap ? (
          <>
            {mainViewMode === 'list' ? (
              <>
                {activeTab === 'addresses' ? (
                  /* Addresses Tab */
                  <ScrollView style={styles.addressesList}>
                    {loading ? (
                      <ActivityIndicator size="large" color="#61d5b6" />
                    ) : addresses.length > 0 ? (
                      addresses.map((address) => (
                    <TouchableOpacity
                      key={address.id}
                      style={[
                        styles.addressItem,
                        (selectedAddressId || internalSelectedId) === address.id && styles.selectedAddressItem,
                        isRTL && styles.rtlAddressItem,
                      ]}
                      onPress={() => handleExistingAddressSelect(address)}
                    >
                      <View style={styles.addressIcon}>
                        <IconSymbol name="location.fill" size={20} color="#61d5b6" />
                      </View>
                      <View style={[styles.addressContent, isRTL && styles.rtlAddressContent]}>
                        <Text style={[styles.addressTitle, isRTL && styles.rtlText]}>{getLocalizedTitle(address)}</Text>
                        <Text style={[styles.addressText, isRTL && styles.rtlText]}>
                          {getLocalizedAddressLine1(address)}
                          {getLocalizedAddressLine2(address) && `, ${getLocalizedAddressLine2(address)}`}
                        </Text>
                        <Text style={[styles.addressLocation, isRTL && styles.rtlText]}>
                          {getLocalizedCity(address)}, {getLocalizedCountry(address)} {address.postal_code}
                        </Text>
                        <View style={[styles.shippingInfo, isRTL && { flexDirection: 'row-reverse' }]}>
                          <IconSymbol name="checkmark.circle.fill" size={16} color="#10B981" />
                          <Text style={styles.shippingText}>{t.shippingAvailable || 'Shipping Available'}</Text>
                        </View>
                        {(address as any).distance !== undefined && locationPermissionGranted && (
                          <Text style={[styles.distanceText, isRTL && styles.rtlText]}>
                            {(address as any).distance < 1 
                              ? `${Math.round((address as any).distance * 1000)}m ${t.away || 'away'}`
                              : `${(address as any).distance.toFixed(1)}km ${t.away || 'away'}`}
                          </Text>
                        )}
                        {address.is_default && (
                          <View style={[styles.defaultBadge, isRTL && { alignSelf: 'flex-end' }]}>
                            <Text style={[styles.defaultBadgeText, isRTL && styles.rtlText]}>{t.default || 'Default'}</Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.addressActions, isRTL && styles.rtlAddressActions]}>
                        <View style={[
                          styles.radioButton,
                          (selectedAddressId || internalSelectedId) === address.id && styles.radioButtonSelected
                        ]}>
                          {(selectedAddressId || internalSelectedId) === address.id && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        {!address.is_default && (
                          <TouchableOpacity
                            style={styles.setDefaultButton}
                            onPress={() => handleSetAsDefault(address.id, false)}
                          >
                            <Text style={[styles.setDefaultButtonText, isRTL && styles.rtlText]}>{t.setDefault || 'Set Default'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol name="location" size={48} color="#9CA3AF" />
                    <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>{t.noAddressesSaved || 'No addresses saved'}</Text>
                    <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                      {t.noAddressesMessage || 'Add your first address to get started'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Collection Points Tab */
              <ScrollView style={styles.addressesList}>
                {loading ? (
                  <ActivityIndicator size="large" color="#61d5b6" />
                ) : userCollectionPoints.length > 0 ? (
                  userCollectionPoints.map((point) => (
                    <TouchableOpacity
                      key={point.id}
                      style={[
                        styles.addressItem,
                        (selectedAddressId || internalSelectedId) === point.id && styles.selectedAddressItem,
                        isRTL && styles.rtlAddressItem,
                      ]}
                      onPress={() => handleExistingAddressSelect(point)}
                    >
                      <View style={styles.addressIcon}>
                        <IconSymbol name="location.fill" size={20} color="#61d5b6" />
                      </View>
                      <View style={[styles.addressContent, isRTL && styles.rtlAddressContent]}>
                        <Text style={[styles.addressTitle, isRTL && styles.rtlText]}>
                          {getLocalizedTitle(point)}
                        </Text>
                        <Text style={[styles.addressText, isRTL && styles.rtlText]}>
                          {getLocalizedAddressLine1(point)}
                          {getLocalizedAddressLine2(point) && `, ${getLocalizedAddressLine2(point)}`}
                        </Text>
                        <Text style={[styles.addressLocation, isRTL && styles.rtlText]}>
                          {getLocalizedCity(point)}, {getLocalizedCountry(point)} {point.postal_code}
                        </Text>
                        <View style={[styles.shippingInfo, isRTL && { flexDirection: 'row-reverse' }]}>
                          <IconSymbol name="checkmark.circle.fill" size={16} color="#10B981" />
                          <Text style={styles.shippingText}>{t.collectionAvailable || 'Collection Available'}</Text>
                        </View>
                        {(point as any).distance !== undefined && locationPermissionGranted && (
                          <Text style={[styles.distanceText, isRTL && styles.rtlText]}>
                            {(point as any).distance < 1 
                              ? `${Math.round((point as any).distance * 1000)}m ${t.away || 'away'}`
                              : `${(point as any).distance.toFixed(1)}km ${t.away || 'away'}`}
                          </Text>
                        )}
                        {point.is_default && (
                          <View style={[styles.defaultBadge, isRTL && { alignSelf: 'flex-end' }]}>
                            <Text style={[styles.defaultBadgeText, isRTL && styles.rtlText]}>{t.default || 'Default'}</Text>
                          </View>
                        )}
                      </View>
                      <View style={[styles.addressActions, isRTL && styles.rtlAddressActions]}>
                        <View style={[
                          styles.radioButton,
                          (selectedAddressId || internalSelectedId) === point.id && styles.radioButtonSelected
                        ]}>
                          {(selectedAddressId || internalSelectedId) === point.id && (
                            <View style={styles.radioButtonInner} />
                          )}
                        </View>
                        {!point.is_default && (
                          <TouchableOpacity
                            style={styles.setDefaultButton}
                            onPress={() => handleSetAsDefault(point.id, true)}
                          >
                            <Text style={[styles.setDefaultButtonText, isRTL && styles.rtlText]}>{t.setDefault || 'Set Default'}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol name="location" size={48} color="#9CA3AF" />
                    <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>{t.noCollectionPointsSaved || 'No collection points saved'}</Text>
                    <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                      {t.noCollectionPointsMessage || 'Add your first collection point to get started'}
                    </Text>
                  </View>
                )}
              </ScrollView>
                )}
              </>
            ) : (
              /* Map View for Main Page */
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={mapRegion || {
                    latitude: userLocation?.latitude || 33.5138,
                    longitude: userLocation?.longitude || 36.2765,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }}
                  region={mapRegion || undefined}
                >
                  {/* Show user location */}
                  {userLocation && (
                    <Marker
                      coordinate={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      }}
                      title={t.yourLocation || 'Your Location'}
                    />
                  )}
                  
                  {/* Show addresses or collection points based on active tab */}
                  {activeTab === 'addresses' ? (
                    addresses.map((address) => (
                      address.latitude && address.longitude && (
                        <Marker
                          key={address.id}
                          coordinate={{
                            latitude: address.latitude,
                            longitude: address.longitude,
                          }}
                          title={getLocalizedTitle(address)}
                          description={`${getLocalizedAddressLine1(address)}, ${getLocalizedCity(address)}`}
                        />
                      )
                    ))
                  ) : (
                    userCollectionPoints.map((point) => (
                      point.latitude && point.longitude && (
                        <Marker
                          key={point.id}
                          coordinate={{
                            latitude: point.latitude,
                            longitude: point.longitude,
                          }}
                          title={getLocalizedTitle(point)}
                          description={`${getLocalizedAddressLine1(point)}, ${getLocalizedCity(point)}`}
                        />
                      )
                    ))
                  )}
                </MapView>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Map View */}
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                initialRegion={mapRegion || {
                  latitude: selectedLocation?.latitude || 33.5138,
                  longitude: selectedLocation?.longitude || 36.2765,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                region={mapRegion || undefined}
                onPress={handleMapPress}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={{
                      latitude: selectedLocation.latitude,
                      longitude: selectedLocation.longitude,
                    }}
                    title={t.selectedLocation || 'Selected Location'}
                  />
                )}
                {/* Show available collection points on map when in collection tab */}
                {activeTab === 'collection' && availableCollectionPoints.map((point) => (
                  <Marker
                    key={point.id}
                    coordinate={{
                      latitude: point.latitude,
                      longitude: point.longitude,
                    }}
                    title={getLocalizedPickupName(point)}
                    description={getLocalizedPickupAddress(point)}
                  />
                ))}
              </MapView>

              {/* Map Controls */}
              <View style={styles.mapControls}>
                <TouchableOpacity style={styles.zoomButton}>
                  <IconSymbol name="plus" size={20} color="#000" />
                </TouchableOpacity>
                <View style={styles.zoomBar} />
                <TouchableOpacity style={styles.zoomButton}>
                  <IconSymbol name="minus" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Address Details */}
            <View style={styles.addressDetailsContainer}>
              <View style={styles.addressInfo}>
                <View style={styles.addressIcon}>
                  <IconSymbol name="location.fill" size={20} color="#61d5b6" />
                </View>
                <View style={styles.addressTextContainer}>
                  {reverseGeocoding ? (
                    <ActivityIndicator size="small" color="#61d5b6" />
                  ) : (
                    <Text style={styles.selectedAddressText}>{selectedLocation?.address}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.changeButton}
                onPress={() => {
                  setShowMap(false);
                  setShowSearchModal(true);
                }}
              >
                <Text style={styles.changeButtonText}>{t.changeOrEdit || 'Change or edit'}</Text>
                <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
              </TouchableOpacity>
            </View>

            {/* Create New Address Form */}
            <View style={styles.createForm}>
              <Text style={[styles.formLabel, isRTL && styles.rtlText]}>{t.saveThisAddressAs || 'Save this address as:'}</Text>
              <TextInput
                style={[styles.titleInput, isRTL && { textAlign: 'right' }]}
                placeholder={t.addressPlaceholder || 'e.g., Home, Work, Office'}
                value={newAddressTitle}
                onChangeText={setNewAddressTitle}
                editable={!loading}
              />
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowMap(false)}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>{t.cancel || 'Cancel'}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.saveButton, (!newAddressTitle.trim() || loading) && styles.saveButtonDisabled]}
                  onPress={handleCreateAddress}
                  disabled={!newAddressTitle.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t.saveAddress || 'Save Address'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading Overlay */}
            {loading && (
              <View style={styles.loadingOverlay}>
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#61d5b6" />
                  <Text style={[styles.savingText, isRTL && styles.rtlText]}>
                    {t.savingAddress || 'Saving address...'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Search Modal - Native Stacked Modal */}
        <Modal
          visible={showSearchModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.searchModalContainer}>
            
            <PageHeader onBackPress={() => setShowSearchModal(false)} title={activeTab === 'addresses' ? (t.addAddress || 'Add Address') : (t.addCollectionPoint || 'Add Collection Point')} />
            

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <IconSymbol name="location.fill" size={20} color="#6B7280" />
                <TextInput
                  style={styles.searchInput}
                  placeholder={t.searchForAddress || 'Search for an address...'}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#61d5b6" />
                ) : (
                  <TouchableOpacity>
                    <IconSymbol name="pencil" size={20} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Suggestions */}
            {searchLoading ? (
              <View style={styles.suggestionsContainer}>
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#61d5b6" />
                  <Text style={styles.loadingText}>{t.searchingAddresses || 'Searching addresses...'}</Text>
                </View>
              </View>
            ) : suggestions.length > 0 ? (
              <ScrollView style={styles.suggestionsContainer}>
                {suggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.suggestionItem}
                    onPress={() => handleSuggestionSelect(suggestion)}
                  >
                    <Text style={styles.suggestionText}>{suggestion.display_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.emptySearchState}>
                <IconSymbol name="magnifyingglass" size={48} color="#9CA3AF" />
                <Text style={styles.emptySearchTitle}>{t.searchForAnAddress || 'Search for an address'}</Text>
                <Text style={styles.emptySearchText}>
                  {t.searchForAddressMessage || 'Enter an address above to find and add it'}
                </Text>
              </View>
            )}
          </SafeAreaView>
        </Modal>

        {/* Collection Point Modal - Native Stacked Modal */}
        <Modal
          visible={showCollectionPointModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.searchModalContainer}>
            
            <PageHeader  onBackPress={() => {
              setShowCollectionPointModal(false);
              setShowCollectionPointMap(false);
              setSelectedLocation(null);
              setNewAddressTitle('');
            }} title={t.addCollectionPoint || 'Add Collection Point'} />
            
            {/* Tabs for List/Map view */}
            <View style={[styles.viewTabsContainer, isRTL && styles.rtlViewTabsContainer]}>
              <TouchableOpacity
                style={[styles.viewTab, !showCollectionPointMap && styles.activeViewTab]}
                onPress={() => setShowCollectionPointMap(false)}
              >
                <Text style={[styles.viewTabText, !showCollectionPointMap && styles.activeViewTabText]}>
                  {t.list || 'List'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.viewTab, showCollectionPointMap && styles.activeViewTab]}
                onPress={() => {
                  setShowCollectionPointMap(true);
                  if (availableCollectionPoints.length > 0) {
                    // Center map on user location if available, otherwise on first collection point or average
                    if (userLocation) {
                      setMapRegion({
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                      });
                    } else {
                      const avgLat = availableCollectionPoints.reduce((sum, p) => sum + p.latitude, 0) / availableCollectionPoints.length;
                      const avgLon = availableCollectionPoints.reduce((sum, p) => sum + p.longitude, 0) / availableCollectionPoints.length;
                      setMapRegion({
                        latitude: avgLat,
                        longitude: avgLon,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                      });
                    }
                  }
                }}
              >
                <Text style={[styles.viewTabText, showCollectionPointMap && styles.activeViewTabText]}>
                  {t.map || 'Map'}
                </Text>
              </TouchableOpacity>
            </View>

            {!showCollectionPointMap ? (
              /* Collection Points List */
              <ScrollView style={styles.addressesList}>
                <Text style={[styles.sectionTitle, isRTL && styles.rtlText]}>
                  {t.availableCollectionPoints || 'Available Collection Points'}
                </Text>
                {loading ? (
                  <ActivityIndicator size="large" color="#61d5b6" />
                ) : availableCollectionPoints.length > 0 ? (
                  availableCollectionPoints.map((point) => {
                    const distance = (point as any).distance;
                    return (
                      <TouchableOpacity
                        key={point.id}
                        style={[styles.addressItem, isRTL && styles.rtlAddressItem]}
                        onPress={() => handleCollectionPointSelect(point)}
                      >
                        <View style={[styles.addressContent, isRTL && styles.rtlAddressContent]}>
                          <Text style={[styles.addressTitle, isRTL && styles.rtlText]}>
                            {getLocalizedPickupName(point)}
                          </Text>
                          <Text style={[styles.addressText, isRTL && styles.rtlText]}>
                            {getLocalizedPickupAddress(point)}
                          </Text>
                          {point.city && (
                            <Text style={[styles.addressLocation, isRTL && styles.rtlText]}>
                              {getLocalizedCityName(point.city)}
                            </Text>
                          )}
                          {point.phone && (
                            <Text style={[styles.addressText, isRTL && styles.rtlText]}>
                              📞 {point.phone}
                            </Text>
                          )}
                          {distance !== undefined && locationPermissionGranted && (
                            <Text style={[styles.distanceText, isRTL && styles.rtlText]}>
                              {distance < 1 
                                ? `${Math.round(distance * 1000)}m ${t.away || 'away'}`
                                : `${distance.toFixed(1)}km ${t.away || 'away'}`}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.addressActions, isRTL && styles.rtlAddressActions]}>
                          <IconSymbol name="plus" size={16} color="#3B82F6" />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <IconSymbol name="location" size={48} color="#9CA3AF" />
                    <Text style={[styles.emptyStateTitle, isRTL && styles.rtlText]}>
                      {t.noCollectionPointsAvailable || 'No collection points available'}
                    </Text>
                    <Text style={[styles.emptyStateText, isRTL && styles.rtlText]}>
                      {t.noCollectionPointsAvailableMessage || 'No collection points are currently available'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              /* Map View with Collection Points */
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={mapRegion || {
                    latitude: 33.5138,
                    longitude: 36.2765,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }}
                  region={mapRegion || undefined}
                  onPress={async (event) => {
                    const { latitude, longitude } = event.nativeEvent.coordinate;
                    const address = await reverseGeocode(latitude, longitude);
                    setSelectedLocation({
                      latitude,
                      longitude,
                      address: address,
                    });
                    setMapRegion({
                      latitude,
                      longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    });
                    setNewAddressTitle('');
                    setIsCreatingNew(true);
                  }}
                >
                  {availableCollectionPoints.map((point) => (
                    <Marker
                      key={point.id}
                      coordinate={{
                        latitude: point.latitude,
                        longitude: point.longitude,
                      }}
                      title={getLocalizedPickupName(point)}
                      description={getLocalizedPickupAddress(point)}
                    />
                  ))}
                  {userLocation && (
                    <Marker
                      coordinate={{
                        latitude: userLocation.latitude,
                        longitude: userLocation.longitude,
                      }}
                      title={t.yourLocation || 'Your Location'}
                    />
                  )}
                  {selectedLocation && (
                    <Marker
                      coordinate={{
                        latitude: selectedLocation.latitude,
                        longitude: selectedLocation.longitude,
                      }}
                      title={t.selectedLocation || 'Selected Location'}
                    />
                  )}
                </MapView>
                {selectedLocation && (
                  <View style={styles.mapBottomSheet}>
                    <View style={styles.addressInfo}>
                      <View style={styles.addressIcon}>
                        <IconSymbol name="location.fill" size={20} color="#61d5b6" />
                      </View>
                      <View style={styles.addressTextContainer}>
                        <Text style={styles.selectedAddressText}>{selectedLocation.address}</Text>
                      </View>
                    </View>
                    <TextInput
                      style={styles.titleInput}
                      placeholder={t.addressPlaceholder || 'e.g., Home, Work, Office'}
                      value={newAddressTitle}
                      onChangeText={setNewAddressTitle}
                    />
                    <TouchableOpacity
                      style={[styles.saveButton, (!newAddressTitle.trim() || loading) && styles.saveButtonDisabled]}
                      onPress={async () => {
                        if (!selectedLocation || !newAddressTitle.trim()) {
                          Alert.alert(t.error || 'Error', t.pleaseSelectLocationAndEnterTitle || 'Please select a location and enter a title');
                          return;
                        }
                        try {
                          setLoading(true);
                          const addressParts = selectedLocation.address.split(', ');
                          const addressData: CreateAddressData = {
                            title: `Collection Point - ${newAddressTitle.trim()}`,
                            address_line_1: addressParts[0] || selectedLocation.address,
                            city: addressParts[addressParts.length - 3] || 'Unknown',
                            country: addressParts[addressParts.length - 1] || 'Unknown',
                            latitude: selectedLocation.latitude,
                            longitude: selectedLocation.longitude,
                            is_default: userCollectionPoints.length === 0,
                          };
                          const newAddress = await AddressService.createAddress(addressData);
                          await fetchCollectionPoints();
                          setShowCollectionPointModal(false);
                          setSelectedLocation(null);
                          setNewAddressTitle('');
                          setIsCreatingNew(false);
                          setInternalSelectedId(newAddress.id);
                          setPendingSelection(newAddress);
                          setHasChanges(true);
                        } catch (error: any) {
                          console.error('Error creating collection point:', error);
                          Alert.alert(t.error || 'Error', t.failedToAddCollectionPoint || 'Failed to add collection point');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={!newAddressTitle.trim() || loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>{t.saveAddress || 'Save Address'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </SafeAreaView>
        </Modal>

        {/* Footer with Add New Address and Apply buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerButton, styles.addNewButton, isRTL && styles.rtlFooterButton]}
            onPress={() => {
              if (activeTab === 'addresses') {
                setShowSearchModal(true);
              } else {
                fetchAvailableCollectionPoints();
                setShowCollectionPointModal(true);
              }
            }}
          >
            <IconSymbol name="plus" size={16} color="#61d5b6" />
            <Text style={[styles.addNewButtonText, isRTL && styles.rtlText]}>
              {activeTab === 'addresses' ? (t.addNewAddress || 'Add New Address') : (t.addNewCollectionPoint || 'Add New Collection Point')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.footerApplyButton,
              isRTL && styles.rtlFooterButton
            ]}
            onPress={handleApply}
            disabled={!hasChanges}
          >
            <Text style={[styles.footerApplyButtonText, isRTL && styles.rtlText]}>
              {t.apply || 'Apply'}
            </Text>
            <IconSymbol
              name="checkmark"
              size={16}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 20,
    marginBottom: 12,
    marginHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    padding: 4,
    gap: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  suggestionsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  suggestionText: {
    fontSize: 14,
    color: '#000',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  addressesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  selectedAddressItem: {
    borderColor: '#61d5b6',
    backgroundColor: '#F8FAFC',
  },
  addressIcon: {
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
    lineHeight: 20,
  },
  addressLocation: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  shippingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shippingText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  addressActions: {
    marginLeft: 12,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: '#61d5b6',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#61d5b6',
  },
  defaultText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 40,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -60 }],
    alignItems: 'center',
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  zoomBar: {
    width: 4,
    height: 20,
    backgroundColor: '#61d5b6',
    marginVertical: 4,
    borderRadius: 2,
  },
  addressDetailsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addressTextContainer: {
    flex: 1,
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#61d5b6',
    fontWeight: '500',
  },
  createForm: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 12,
  },
  titleInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#61d5b6',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  searchModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  emptySearchState: {
    alignItems: 'center',
    padding: 40,
  },
  emptySearchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySearchText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'column',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8F9FA',
    gap: 12,
  },
  footerButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addNewButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#61d5b6',
  },
  addNewButtonText: {
    color: '#61d5b6',
    fontSize: 16,
    fontWeight: '600',
  },
  footerApplyButton: {
    backgroundColor: '#61d5b6',
  },
  footerApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#E5E7EB',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  disabledIcon: {
    color: '#9CA3AF',
  },
  viewTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  viewTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  activeViewTab: {
    backgroundColor: '#61d5b6',
  },
  viewTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeViewTabText: {
    color: '#fff',
    fontWeight: '600',
  },
  mapBottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  defaultBadge: {
    backgroundColor: '#61d5b6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  setDefaultButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  setDefaultButtonText: {
    color: '#61d5b6',
    fontSize: 12,
    fontWeight: '600',
  },
  // RTL styles
  rtlText: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  rtlAddressItem: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  rtlAddressContent: {
    alignItems: I18nManager.isRTL ? 'flex-end' : 'flex-start',
  },
  rtlAddressActions: {
    marginLeft: I18nManager.isRTL ? 0 : 12,
    marginRight: I18nManager.isRTL ? 12 : 0,
  },
  rtlViewTabsContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  rtlTabsContainer: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  rtlFooterButton: {
    flexDirection: I18nManager.isRTL ? 'row-reverse' : 'row',
  },
  distanceText: {
    fontSize: 12,
    color: '#61d5b6',
    fontWeight: '500',
    marginTop: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
});
