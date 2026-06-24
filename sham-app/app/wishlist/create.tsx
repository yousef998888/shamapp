import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTranslation } from '@/hooks/useTranslation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FavoriteService from '@/services/FavoriteService';

const WISHLIST_CATEGORIES = [
  'iPhone Cases',
  'Birthday',
  'Fashion',
  'Miscellaneous',
];

export default function CreateWishlistPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { t } = usePageTranslation('favoritesPage');
  
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(t.error || 'Error', t.wishlistNameRequired || 'Wishlist name is required');
      return;
    }

    if (!user?.id) {
      Alert.alert(t.error || 'Error', t.pleaseSignIn || 'Please sign in to create a wishlist');
      return;
    }

    setCreating(true);
    try {
      const wishlist = await FavoriteService.createWishlist(
        user.id,
        name.trim(),
        nameAr.trim() || undefined,
        undefined,
        isPublic
      );

      Alert.alert(
        t.success || 'Success',
        t.wishlistCreated || 'Wishlist created successfully',
        [
          {
            text: t.ok || 'OK',
            onPress: () => router.replace(`/wishlist/${wishlist.id}` as any),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating wishlist:', error);
      Alert.alert(t.error || 'Error', t.errorCreatingWishlist);
    } finally {
      setCreating(false);
    }
  };

  const handleQuickSelect = (category: string) => {
    setName(category);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.createNewWishlist || 'Create New Wishlist'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t.addMerchantDetails || 'Add merchant details here easily'}</Text>

        {/* Wishlist Name */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.wishlistName || 'Wishlist Name'}</Text>
          <View style={styles.inputContainer}>
            <MaterialCommunityIcons name="heart-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t.wishlistNamePlaceholder || 'Enter your wishlist name...'}
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Quick Select Categories */}
          <View style={styles.categoriesContainer}>
            {WISHLIST_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.categoryChip}
                onPress={() => handleQuickSelect(category)}
              >
                <Text style={styles.categoryChipText}>{category}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Wishlist Type */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.wishlistType || 'Wishlist Type'}</Text>
          <TouchableOpacity
            style={styles.dropdownContainer}
            onPress={() => setIsPublic(!isPublic)}
          >
            <MaterialCommunityIcons
              name={isPublic ? 'account-multiple' : 'account'}
              size={20}
              color="#9CA3AF"
            />
            <Text style={styles.dropdownText}>
              {isPublic ? t.public || 'Public' : t.private || 'Private'}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Create Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, creating && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={creating}
        >
          <Text style={styles.createButtonText}>
            {creating ? t.creating || 'Creating...' : t.createWishlist || 'Create Wishlist'}
          </Text>
          {!creating && <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  dropdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export const options = {
  headerShown: false,
};

