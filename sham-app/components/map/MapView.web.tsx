// Web implementation - shows address info instead of map
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { MapViewProps, MapRegion, MarkerProps } from './MapView';

export const MapView: React.FC<MapViewProps> = ({ 
  style, 
  initialRegion, 
  children,
  onPress,
  scrollEnabled = true,
  zoomEnabled = true 
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapPlaceholder}>
        <IconSymbol name="location.fill" size={32} color="#61d5b6" />
        <Text style={styles.mapText}>Map View</Text>
        <Text style={styles.coordinatesText}>
          {initialRegion && `${initialRegion.latitude.toFixed(4)}, ${initialRegion.longitude.toFixed(4)}`}
        </Text>
      </View>
      {children}
    </View>
  );
};

export const Marker: React.FC<MarkerProps> = ({ 
  coordinate, 
  title, 
  description 
}) => {
  return (
    <View style={styles.marker}>
      <View style={styles.markerPin}>
        <IconSymbol name="location.fill" size={16} color="#EF4444" />
      </View>
      {title && (
        <View style={styles.markerLabel}>
          <Text style={styles.markerTitle}>{title}</Text>
          {description && (
            <Text style={styles.markerDescription}>{description}</Text>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 20,
    gap: 8,
  },
  mapText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  coordinatesText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerLabel: {
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  markerTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  markerDescription: {
    fontSize: 10,
    color: '#6B7280',
  },
});

export default MapView;
