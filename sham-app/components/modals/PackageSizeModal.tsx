import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface PackageSize {
  id: string;
  name: string;
  description: string;
  dimensions: string;
  weight: string;
  icon: string;
  color: string;
}

interface PackageSizeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (size: PackageSize) => void;
  selectedSizeId?: string;
}

const packageSizes: PackageSize[] = [
  {
    id: 'large_letter',
    name: 'Large letter',
    description: 'Up to 35 × 25 × 2.5 cm',
    dimensions: '35 × 25 × 2.5 cm',
    weight: 'Up to 100g',
    icon: 'shippingbox',
    color: '#10B981',
  },
  {
    id: 'small_1kg',
    name: 'Small parcel – up to 1 kg',
    description: 'Fits items like a tablet or sandals',
    dimensions: 'Up to 45 × 35 × 16 cm',
    weight: 'Up to 1 kg',
    icon: 'shippingbox',
    color: '#F59E0B',
  },
  {
    id: 'small_2kg',
    name: 'Small parcel – up to 2 kg',
    description: 'Fits items like a hand mixer or hiking boots',
    dimensions: 'Up to 45 × 35 × 16 cm',
    weight: 'Up to 2 kg',
    icon: 'shippingbox',
    color: '#F59E0B',
  },
  {
    id: 'medium_1kg',
    name: 'Medium parcel – up to 1 kg',
    description: 'Fits items like a throw or cushion or picture frame',
    dimensions: 'Up to 61 × 46 × 46 cm',
    weight: 'Up to 1 kg',
    icon: 'shippingbox',
    color: '#EF4444',
  },
  {
    id: 'medium_2kg',
    name: 'Medium parcel – up to 2 kg',
    description: 'Fits items like a laptop or wall clock',
    dimensions: 'Up to 61 × 46 × 46 cm',
    weight: 'Up to 2 kg',
    icon: 'shippingbox',
    color: '#EF4444',
  },
];

export default function PackageSizeModal({
  visible,
  onClose,
  onSelect,
  selectedSizeId,
}: PackageSizeModalProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(selectedSizeId || null);

  const handleSelect = (size: PackageSize) => {
    setSelectedSize(size.id);
    onSelect(size);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Package Size</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Sizes List */}
        <ScrollView style={styles.sizesList} showsVerticalScrollIndicator={false}>
          {packageSizes.map((size) => (
            <TouchableOpacity
              key={size.id}
              style={[
                styles.sizeCard,
                selectedSize === size.id && styles.selectedSizeCard,
              ]}
              onPress={() => handleSelect(size)}
            >
              <View style={styles.sizeContent}>
                <View style={[styles.sizeIcon, { backgroundColor: size.color + '20' }]}>
                  <IconSymbol name={size.icon} size={24} color={size.color} />
                </View>
                
                <View style={styles.sizeDetails}>
                  <Text style={styles.sizeName}>{size.name}</Text>
                  <Text style={styles.sizeDescription}>{size.description}</Text>
                  <View style={styles.sizeSpecs}>
                    <View style={styles.specItem}>
                      <IconSymbol name="ruler" size={16} color="#6B7280" />
                      <Text style={styles.specText}>{size.dimensions}</Text>
                    </View>
                    <View style={styles.specItem}>
                      <IconSymbol name="scalemass" size={16} color="#6B7280" />
                      <Text style={styles.specText}>{size.weight}</Text>
                    </View>
                  </View>
                </View>

                {selectedSize === size.id && (
                  <View style={styles.selectedIndicator}>
                    <IconSymbol name="checkmark.circle.fill" size={24} color="#61d5b6" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Help Text */}
        <View style={styles.helpContainer}>
          <IconSymbol name="info.circle" size={16} color="#6B7280" />
          <Text style={styles.helpText}>
            Choose the size that best matches your item. This helps with shipping calculations.
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sizesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sizeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    padding: 16,
  },
  selectedSizeCard: {
    borderColor: '#61d5b6',
    backgroundColor: '#F8F5FF',
  },
  sizeContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sizeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sizeDetails: {
    flex: 1,
  },
  sizeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sizeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  sizeSpecs: {
    flexDirection: 'row',
    gap: 16,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  specText: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    gap: 8,
  },
  helpText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
});
