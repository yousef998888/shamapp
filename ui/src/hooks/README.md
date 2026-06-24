# Hooks Directory

This directory contains custom React hooks used throughout the application.

## Available Hooks

### `useCityEstimation`

A hook that estimates the current city in Syria based on geolocation coordinates and matches it with cities from the shipping API.

#### Features

- **Automatic Location Detection**: Uses browser geolocation to get current coordinates
- **City Matching**: Fetches available cities from shipping API and finds the closest match
- **Distance Calculation**: Uses Haversine formula for accurate distance calculation
- **Fallback Support**: Handles cases where location is not available
- **Error Handling**: Comprehensive error handling for location and API failures

#### Usage

```tsx
import { useCityEstimation } from '@/hooks/useCityEstimation';

function MyComponent() {
  const { city, coordinates, isLoading, error, refetch } = useCityEstimation();
  
  if (isLoading) {
    return <div>Detecting your location...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  if (city) {
    return (
      <div>
        <p>Shipping from: {city.name}</p>
        <p>City Code: {city.code}</p>
        <p>Category: {city.category}</p>
      </div>
    );
  }
  
  return <div>Location not available</div>;
}
```

#### Return Values

- `city`: The closest city object from the API (or null if not found)
- `coordinates`: Current GPS coordinates (or null if not available)
- `isLoading`: Whether the cities are being fetched
- `error`: Error message if location or API fails
- `refetch`: Function to manually refetch location and cities

#### Supported Cities

The hook includes coordinates for major Syrian cities:
- دمشق (Damascus)
- حلب (Aleppo)
- حمص (Homs)
- حماة (Hama)
- اللاذقية (Latakia)
- طرطوس (Tartus)
- دير الزور (Deir ez-Zor)
- الحسكة (Al-Hasakah)
- إدلب (Idlib)
- درعا (Daraa)
- الرقة (Raqqa)
- القنيطرة (Quneitra)
- السويداء (As-Suwayda)

#### Requirements

- Browser must support geolocation API
- User must grant location permission
- Shipping API must be available and accessible

### Other Hooks

- `useAuth`: Authentication state management
- `useProfile`: User profile management
- `useProduct`: Product data management
- `useDeliveryEstimation`: Delivery cost estimation
- `useFavorites`: User favorites management
- `useRealTimeChat`: Real-time chat functionality
- `useDebounce`: Debounced value hook
- `useDirection`: Direction calculation
- `usePasswordChange`: Password change functionality
