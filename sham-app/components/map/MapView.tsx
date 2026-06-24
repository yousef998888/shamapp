// Interface / contract for MapView component
import React from 'react';

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

export interface MapViewProps {
  style?: any;
  initialRegion?: MapRegion;
  region?: MapRegion;
  onPress?: (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => void;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  children?: React.ReactNode;
}

export interface MarkerProps {
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title?: string;
  description?: string;
}

// Default export for the MapView component
declare const MapView: React.FC<MapViewProps>;
declare const Marker: React.FC<MarkerProps>;

export { MapView, Marker };
