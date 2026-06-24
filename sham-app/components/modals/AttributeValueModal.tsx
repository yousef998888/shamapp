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

interface AttributeTerm {
  id: string;
  name: string;
}

interface ProductAttribute {
  id: string;
  name: string;
  terms: AttributeTerm[];
}

interface AttributeValueModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (terms: AttributeTerm[]) => void;
  attribute: ProductAttribute;
  value: string[];
}

export default function AttributeValueModal({
  visible,
  onClose,
  onSelect,
  attribute,
  value,
}: AttributeValueModalProps) {
  const [selectedTerms, setSelectedTerms] = useState<string[]>(value);

  const handleTermToggle = (termId: string) => {
    setSelectedTerms(prev => 
      prev.includes(termId) 
        ? prev.filter(id => id !== termId)
        : [...prev, termId]
    );
  };

  const handleApply = () => {
    if (!attribute?.terms) return;
    const selectedTermObjects = attribute.terms.filter(term => 
      selectedTerms.includes(term.id)
    );
    onSelect(selectedTermObjects);
    onClose();
  };

  if (!attribute) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{attribute?.name || 'Attribute'}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Terms List */}
        <ScrollView style={styles.termsList} showsVerticalScrollIndicator={false}>
          {attribute?.terms?.map((term) => (
            <TouchableOpacity
              key={term.id}
              style={styles.termItem}
              onPress={() => handleTermToggle(term.id)}
            >
              <View style={styles.termContent}>
                <Text style={styles.termName}>{term.name}</Text>
                {selectedTerms.includes(term.id) && (
                  <IconSymbol name="checkmark" size={20} color="#61d5b6" />
                )}
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
  termsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  termItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  termContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termName: {
    fontSize: 16,
    color: '#000',
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
