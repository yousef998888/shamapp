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

interface Currency {
  id: string;
  name: string;
  symbol: string;
  code: string;
}

interface CurrencySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (currency: Currency) => void;
  selectedCurrencyId?: string;
}

const currencies: Currency[] = [
  { id: 'SYP', name: 'Syrian Pound', symbol: '£', code: 'SYP' },
  { id: 'USD', name: 'US Dollar', symbol: '$', code: 'USD' },
  { id: 'EUR', name: 'Euro', symbol: '€', code: 'EUR' },
  { id: 'GBP', name: 'British Pound', symbol: '£', code: 'GBP' },
  { id: 'AED', name: 'UAE Dirham', symbol: 'د.إ', code: 'AED' },
  { id: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', code: 'SAR' },
];

export default function CurrencySelectModal({
  visible,
  onClose,
  onSelect,
  selectedCurrencyId,
}: CurrencySelectModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(
    currencies.find(curr => curr.id === selectedCurrencyId) || null
  );

  const handleApply = () => {
    if (selectedCurrency) {
      onSelect(selectedCurrency);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Currency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Currencies List */}
        <ScrollView style={styles.currenciesList} showsVerticalScrollIndicator={false}>
          {currencies.map((currency) => (
            <TouchableOpacity
              key={currency.id}
              style={[
                styles.currencyItem,
                selectedCurrency?.id === currency.id && styles.selectedCurrencyItem,
              ]}
              onPress={() => setSelectedCurrency(currency)}
            >
              <View style={styles.currencyContent}>
                <View style={styles.currencySymbol}>
                  <Text style={styles.symbolText}>{currency.symbol}</Text>
                </View>
                <View style={styles.currencyInfo}>
                  <Text
                    style={[
                      styles.currencyName,
                      selectedCurrency?.id === currency.id && styles.selectedCurrencyName,
                    ]}
                  >
                    {currency.name}
                  </Text>
                  <Text
                    style={[
                      styles.currencyCode,
                      selectedCurrency?.id === currency.id && styles.selectedCurrencyCode,
                    ]}
                  >
                    {currency.code}
                  </Text>
                </View>
                <View style={styles.radioButton}>
                  {selectedCurrency?.id === currency.id && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
  currenciesList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  currencyItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCurrencyItem: {
    backgroundColor: '#F3F4F6',
    borderColor: '#61d5b6',
  },
  currencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  currencySymbol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  symbolText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#61d5b6',
  },
  currencyInfo: {
    flex: 1,
  },
  currencyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  selectedCurrencyName: {
    color: '#61d5b6',
  },
  currencyCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectedCurrencyCode: {
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
