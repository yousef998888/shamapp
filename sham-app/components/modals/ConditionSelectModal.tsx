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

interface Condition {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface ConditionSelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (condition: Condition) => void;
  selectedConditionId?: string;
}

const conditions: Condition[] = [
  {
    id: 'new',
    name: 'Brand New',
    description: 'Your item is brand new in box.',
    icon: 'sparkles',
  },
  {
    id: 'used',
    name: 'Used',
    description: 'You have used the product.',
    icon: 'hand.raised',
  },
  {
    id: 'refurbished',
    name: 'Refurbished',
    description: 'Your product has been restored to working condition.',
    icon: 'arrow.clockwise',
  },
];

export default function ConditionSelectModal({
  visible,
  onClose,
  onSelect,
  selectedConditionId,
}: ConditionSelectModalProps) {
  const [selectedCondition, setSelectedCondition] = useState<Condition | null>(
    conditions.find(cond => cond.id === selectedConditionId) || null
  );

  const handleApply = () => {
    if (selectedCondition) {
      onSelect(selectedCondition);
    }
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Condition</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Conditions List */}
        <View style={styles.conditionsContainer}>
          {conditions.map((condition) => (
            <TouchableOpacity
              key={condition.id}
              style={[
                styles.conditionCard,
                selectedCondition?.id === condition.id && styles.selectedConditionCard,
              ]}
              onPress={() => setSelectedCondition(condition)}
            >
              <View style={styles.conditionContent}>
                <IconSymbol 
                  name={condition.icon} 
                  size={32} 
                  color={selectedCondition?.id === condition.id ? '#61d5b6' : '#6B7280'} 
                />
                <View style={styles.conditionInfo}>
                  <Text
                    style={[
                      styles.conditionName,
                      selectedCondition?.id === condition.id && styles.selectedConditionName,
                    ]}
                  >
                    {condition.name}
                  </Text>
                  <Text
                    style={[
                      styles.conditionDescription,
                      selectedCondition?.id === condition.id && styles.selectedConditionDescription,
                    ]}
                  >
                    {condition.description}
                  </Text>
                </View>
                {selectedCondition?.id === condition.id && (
                  <IconSymbol name="checkmark" size={24} color="#61d5b6" />
                )}
              </View>
            </TouchableOpacity>
          ))}
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
  conditionsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  conditionCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedConditionCard: {
    backgroundColor: '#F3F4F6',
    borderColor: '#61d5b6',
  },
  conditionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  conditionInfo: {
    flex: 1,
  },
  conditionName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  selectedConditionName: {
    color: '#61d5b6',
  },
  conditionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  selectedConditionDescription: {
    color: '#61d5b6',
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
