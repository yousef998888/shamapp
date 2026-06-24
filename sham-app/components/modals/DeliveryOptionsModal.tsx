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

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string;
  icon: string;
}

interface DeliveryOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: DeliveryOption) => void;
  selectedOptionId?: string;
}

const deliveryOptions: DeliveryOption[] = [
  {
    id: 'both',
    name: 'Both',
    description: 'Home delivery and collection available',
    price: 0,
    estimatedDays: 'Flexible',
    icon: 'truck.box',
  },
  {
    id: 'postage',
    name: 'Postage Only',
    description: 'Item will be shipped to your address',
    price: 5,
    estimatedDays: '3-5 days',
    icon: 'shippingbox',
  },
  {
    id: 'collection',
    name: 'Collection Only',
    description: 'Pick up from seller location',
    price: 0,
    estimatedDays: 'Immediate',
    icon: 'location',
  },
];

export default function DeliveryOptionsModal({
  visible,
  onClose,
  onSelect,
  selectedOptionId,
}: DeliveryOptionsModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(selectedOptionId || null);

  const handleSelect = (option: DeliveryOption) => {
    setSelectedOption(option.id);
    onSelect(option);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Delivery Options</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Options List */}
        <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
          {deliveryOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption === option.id && styles.selectedOptionCard,
              ]}
              onPress={() => handleSelect(option)}
            >
              <View style={styles.optionContent}>
                <View style={styles.optionIcon}>
                  <IconSymbol name={option.icon} size={24} color="#61d5b6" />
                </View>
                
                <View style={styles.optionDetails}>
                  <Text style={styles.optionName}>{option.name}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                  <View style={styles.optionMeta}>
                    <Text style={styles.optionPrice}>
                      {option.price === 0 ? 'Free' : `$${option.price}`}
                    </Text>
                    <Text style={styles.optionDays}>{option.estimatedDays}</Text>
                  </View>
                </View>

                {selectedOption === option.id && (
                  <View style={styles.selectedIndicator}>
                    <IconSymbol name="checkmark.circle.fill" size={24} color="#61d5b6" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
  optionsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    padding: 16,
  },
  selectedOptionCard: {
    borderColor: '#61d5b6',
    backgroundColor: '#F8F5FF',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionDetails: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  optionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  optionDays: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
});
