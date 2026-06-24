import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface DeliveryOption {
  id: string;
  name: string;
  provider: string;
  details: string[];
  logo: string;
  maxWeight: string;
  dimensions: string;
  tracking: string;
  coverage: string;
  label: string;
}

interface DeliverySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: DeliveryOption) => void;
  selectedOptionId?: string;
}

const deliveryOptions: DeliveryOption[] = [
  {
    id: 'usps',
    name: 'USPS Priority Mail',
    provider: 'USPS',
    details: ['Max 2lbs, Length + Girth < 108"', 'Tracked for Shipping', 'Cover for up to $100', 'Prepaid Label'],
    logo: 'USPS',
    maxWeight: '2lbs',
    dimensions: 'Length + Girth < 108"',
    tracking: 'Tracked for Shipping',
    coverage: 'Cover for up to $100',
    label: 'Prepaid Label',
  },
  {
    id: 'ups',
    name: 'UPS One Night Delivery',
    provider: 'UPS',
    details: ['Max 2lbs, Length + Girth < 108"', 'Tracked for Shipping', 'Cover for up to $100', 'Prepaid Label'],
    logo: 'UPS',
    maxWeight: '2lbs',
    dimensions: 'Length + Girth < 108"',
    tracking: 'Tracked for Shipping',
    coverage: 'Cover for up to $100',
    label: 'Prepaid Label',
  },
];

export default function DeliverySelectModal({
  visible,
  onClose,
  onSelect,
  selectedOptionId,
}: DeliverySelectModalProps) {
  const [selectedOption, setSelectedOption] = useState<DeliveryOption | null>(
    deliveryOptions.find(opt => opt.id === selectedOptionId) || null
  );

  const handleApply = () => {
    if (selectedOption) {
      onSelect(selectedOption);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Shipping Options</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Delivery Options */}
        <View style={styles.optionsContainer}>
          {deliveryOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selectedOption?.id === option.id && styles.selectedOptionCard,
              ]}
              onPress={() => setSelectedOption(option)}
            >
              <View style={styles.optionHeader}>
                <View style={styles.logoContainer}>
                  <Text style={styles.logoText}>{option.logo}</Text>
                </View>
                <Text
                  style={[
                    styles.optionName,
                    selectedOption?.id === option.id && styles.selectedOptionName,
                  ]}
                >
                  {option.name}
                </Text>
                <View style={styles.radioButton}>
                  {selectedOption?.id === option.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
              
              <View style={styles.optionDetails}>
                {option.details.map((detail, index) => (
                  <Text
                    key={index}
                    style={[
                      styles.detailText,
                      selectedOption?.id === option.id && styles.selectedDetailText,
                    ]}
                  >
                    {detail}
                  </Text>
                ))}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Privacy Notice */}
        <View style={styles.privacyContainer}>
          <Text style={styles.privacyText}>
            Shipping labels and cover are provided when buyers pay through the app.{' '}
            <Text style={styles.privacyLink}>See Privacy Policy</Text> for more info.
          </Text>
        </View>

        {/* Apply Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <IconSymbol name="checkmark" size={20} color="#fff" />
            <Text style={styles.applyButtonText}>Apply</Text>
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
  optionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  optionCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedOptionCard: {
    backgroundColor: '#F3F4F6',
    borderColor: '#61d5b6',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  logoContainer: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  logoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  optionName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  selectedOptionName: {
    color: '#61d5b6',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#61d5b6',
  },
  optionDetails: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedDetailText: {
    color: '#61d5b6',
  },
  privacyContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  privacyText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  privacyLink: {
    color: '#61d5b6',
    fontWeight: '600',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
