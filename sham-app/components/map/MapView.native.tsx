// iOS/Android implementation using react-native-maps
import React from 'react';
import RNMapView, { Marker as RNMarker } from 'react-native-maps';
import type { MapViewProps, MapRegion, MarkerProps } from './MapView';

export const MapView: React.FC<MapViewProps> = ({ 
  style, 
  initialRegion, 
  region,
  onPress,
  scrollEnabled = true,
  zoomEnabled = true,
  children 
}) => {
  return (
    <RNMapView
      style={style}
      initialRegion={initialRegion}
      region={region}
      onPress={onPress}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
    >
      {children}
    </RNMapView>
  );
};

export const Marker: React.FC<MarkerProps> = ({ 
  coordinate, 
  title, 
  description 
}) => {
  return (
    <RNMarker
      coordinate={coordinate}
      title={title}
      description={description}
    />
  );
};

export default MapView;
