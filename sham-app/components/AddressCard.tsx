import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { MapView, Marker } from '@/components/map/MapView';
import type { UserAddress } from '@/types/database';

interface AddressCardProps {
  address: UserAddress;
  onEdit: () => void;
}

export default function AddressCard({ address, onEdit }: AddressCardProps) {
  return (
    <View style={styles.container}>
      {/* Map Section */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: address.latitude,
            longitude: address.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
        >
          <Marker
            coordinate={{
              latitude: address.latitude,
              longitude: address.longitude,
            }}
            title={address.title}
          />
        </MapView>
      </View>

      {/* Address Details */}
      <View style={styles.addressDetails}>
        <View style={styles.addressInfo}>
          <View style={styles.addressIcon}>
            <IconSymbol name="location.fill" size={20} color="#61d5b6" />
          </View>
          <View style={styles.addressTextContainer}>
            <Text style={styles.addressTitle}>{address.title}</Text>
            <Text style={styles.addressLine1}>{address.address_line_1}</Text>
            {address.address_line_2 && (
              <Text style={styles.addressLine2}>{address.address_line_2}</Text>
            )}
            <Text style={styles.addressLocation}>
              {address.city}, {address.country} {address.postal_code}
            </Text>
          </View>
        </View>

        {/* Edit Button */}
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Text style={styles.editButtonText}>Change or edit</Text>
          <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  mapContainer: {
    height: 200,
  },
  map: {
    flex: 1,
  },
  addressDetails: {
    padding: 16,
  },
  addressInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  addressLine1: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  addressLine2: {
    fontSize: 14,
    color: '#000',
    marginBottom: 2,
  },
  addressLocation: {
    fontSize: 14,
    color: '#6B7280',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#61d5b6',
    fontWeight: '500',
  },
});
