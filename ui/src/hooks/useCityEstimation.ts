import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCities, City } from '@/services/DeliveryService';

interface Coordinates {
  lat: number;
  lng: number;
}

interface CityEstimationResult {
  city: City | null;
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

// Syrian cities with their approximate coordinates
const SYRIAN_CITIES_COORDINATES: Record<string, Coordinates> = {
  'دمشق': { lat: 33.5138, lng: 36.2765 }, // Damascus
  'حلب': { lat: 36.2021, lng: 37.1343 }, // Aleppo
  'حمص': { lat: 34.7268, lng: 36.7234 }, // Homs
  'حماة': { lat: 35.1313, lng: 36.7578 }, // Hama
  'اللاذقية': { lat: 35.5175, lng: 35.7833 }, // Latakia
  'طرطوس': { lat: 34.8894, lng: 35.8866 }, // Tartus
  'دير الزور': { lat: 35.3352, lng: 40.1408 }, // Deir ez-Zor
  'الحسكة': { lat: 36.5072, lng: 40.7477 }, // Al-Hasakah
  'إدلب': { lat: 35.9306, lng: 36.6339 }, // Idlib
  'درعا': { lat: 32.6189, lng: 36.1021 }, // Daraa
  'الرقة': { lat: 35.9496, lng: 39.0094 }, // Raqqa
  'القنيطرة': { lat: 33.1253, lng: 35.8249 }, // Quneitra
  'السويداء': { lat: 32.7083, lng: 36.5667 }, // As-Suwayda
};

// English city names mapping
const CITY_NAME_MAPPING: Record<string, string> = {
  'Damascus': 'دمشق',
  'Aleppo': 'حلب',
  'Homs': 'حمص',
  'Hama': 'حماة',
  'Latakia': 'اللاذقية',
  'Tartus': 'طرطوس',
  'Deir ez-Zor': 'دير الزور',
  'Al-Hasakah': 'الحسكة',
  'Idlib': 'إدلب',
  'Daraa': 'درعا',
  'Raqqa': 'الرقة',
  'Quneitra': 'القنيطرة',
  'As-Suwayda': 'السويداء',
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) *
      Math.cos(coord2.lat * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find the closest city based on coordinates
function findClosestCity(
  coordinates: Coordinates,
  cities: City[]
): City | null {
  let closestCity: City | null = null;
  let minDistance = Infinity;

  for (const city of cities) {
    // Try to find coordinates for this city
    const cityCoords = SYRIAN_CITIES_COORDINATES[city.name];
    if (!cityCoords) {
      // Try English name mapping
      const englishName = Object.keys(CITY_NAME_MAPPING).find(
        key => CITY_NAME_MAPPING[key] === city.name
      );
      if (englishName) {
        const mappedCoords = SYRIAN_CITIES_COORDINATES[CITY_NAME_MAPPING[englishName]];
        if (mappedCoords) {
          const distance = calculateDistance(coordinates, mappedCoords);
          if (distance < minDistance) {
            minDistance = distance;
            closestCity = city;
          }
        }
      }
    } else {
      const distance = calculateDistance(coordinates, cityCoords);
      if (distance < minDistance) {
        minDistance = distance;
        closestCity = city;
      }
    }
  }

  return closestCity;
}

/**
 * Hook to estimate the current city in Syria based on geolocation coordinates
 * and match it with cities from the shipping API.
 * 
 * This hook:
 * 1. Gets the user's current location using browser geolocation
 * 2. Fetches the list of available cities from the shipping API
 * 3. Calculates the distance to each city using the Haversine formula
 * 4. Returns the closest city with its details
 * 
 * @returns {CityEstimationResult} Object containing:
 *   - city: The closest city object from the API (or null if not found)
 *   - coordinates: Current GPS coordinates (or null if not available)
 *   - isLoading: Whether the cities are being fetched
 *   - error: Error message if location or API fails
 *   - refetch: Function to manually refetch location and cities
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { city, coordinates, isLoading, error } = useCityEstimation();
 *   
 *   if (isLoading) return <div>Detecting location...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   if (city) return <div>Shipping from: {city.name}</div>;
 *   
 *   return <div>Location not available</div>;
 * }
 * ```
 */
export function useCityEstimation(): CityEstimationResult {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch cities from API
  const {
    data: citiesResponse,
    isLoading: isCitiesLoading,
    error: citiesError,
    refetch: refetchCities,
  } = useQuery({
    queryKey: ['shipping-cities'],
    queryFn: getCities,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
  });

  // Get current location
  const getCurrentLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: Coordinates = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          resolve(coords);
        },
        (error) => {
          let errorMessage = 'Failed to get location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  }, []);

  // Initialize location
  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const coords = await getCurrentLocation();
        setCoordinates(coords);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.warn('Failed to get current location:', err);
      }
    };

    initializeLocation();
  }, [getCurrentLocation]);

  // Find closest city when both coordinates and cities are available
  const closestCity = coordinates && citiesResponse?.data
    ? findClosestCity(coordinates, citiesResponse.data)
    : null;

  const refetch = useCallback(() => {
    refetchCities();
    // Also refetch location
    getCurrentLocation()
      .then(setCoordinates)
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'));
  }, [refetchCities, getCurrentLocation]);

  return {
    city: closestCity,
    coordinates,
    isLoading: isCitiesLoading,
    error: error || (citiesError instanceof Error ? citiesError.message : null),
    refetch,
  };
}
