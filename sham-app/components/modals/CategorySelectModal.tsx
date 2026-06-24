import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import CategoryService from '@/services/CategoryService';
import type { Category } from '@/types/database';

interface CategorySelectModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: string;
}

export default function CategorySelectModal({
  visible,
  onClose,
  onSelect,
  selectedCategoryId,
}: CategorySelectModalProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentParent, setCurrentParent] = useState<Category | null>(null);
  const [filtered, setFiltered] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all categories on mount
  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    CategoryService.fetchCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [visible]);

  // Filter categories by parent and search
  useEffect(() => {
    let cats = categories.filter(cat => {
      const parentId = currentParent ? currentParent.id : null;
      return cat.parent_id === parentId;
    });
    
    if (search) {
      cats = cats.filter(cat => 
        cat.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(cats);
  }, [categories, currentParent, search]);

  // Find children for a category
  const hasChildren = (cat: Category) => categories.some(c => c.parent_id === cat.id);

  // Drill down to children
  const handleCategoryClick = (cat: Category) => {
    if (hasChildren(cat)) {
      setCurrentParent(cat);
      setSearch('');
    } else {
      onSelect(cat);
      onClose();
    }
  };

  // Go back to parent
  const handleBack = () => {
    if (!currentParent) return;
    const parent = categories.find(cat => cat.id === currentParent.parent_id) || null;
    setCurrentParent(parent);
    setSearch('');
  };

  // Reset navigation when closed
  useEffect(() => {
    if (!visible) {
      setCurrentParent(null);
      setSearch('');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            {currentParent ? (
              <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                <IconSymbol name="chevron.left" size={16} color="#6B7280" />
                <Text style={styles.backButtonText}>{currentParent.name}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.title}>Set Category</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol name="magnifyingglass" size={20} color="#4C5567" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a category..."
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Categories List */}
        <ScrollView style={styles.categoriesList} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#61d5b6" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : (
            filtered.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryItem}
                onPress={() => handleCategoryClick(category)}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  {selectedCategoryId === category.id && (
                    <IconSymbol name="checkmark" size={16} color="#22C55E" />
                  )}
                </View>
                {hasChildren(category) && (
                  <IconSymbol name="chevron.right" size={16} color="#6B7280" />
                )}
              </TouchableOpacity>
            ))
          )}
          {!loading && filtered.length === 0 && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No categories found</Text>
            </View>
          )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  categoriesList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
