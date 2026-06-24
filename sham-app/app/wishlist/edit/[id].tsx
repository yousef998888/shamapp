import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTranslation } from '@/hooks/useTranslation';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { IconSymbol } from '@/components/ui/icon-symbol';
import FavoriteService, { Wishlist } from '@/services/FavoriteService';

export default function EditWishlistPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = usePageTranslation('favoritesPage');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWishlist();
    }
  }, [id]);

  const fetchWishlist = async () => {
    if (!id) return;

    try {
      const data = await FavoriteService.getWishlist(id);
      if (data) {
        setWishlist(data);
        setName(data.name);
        setNameAr(data.name_ar || '');
        setIsPublic(data.is_public);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      Alert.alert(t.error || 'Error', t.errorLoadingWishlist);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert(t.error || 'Error', t.wishlistNameRequired || 'Wishlist name is required');
      return;
    }

    if (!id) return;

    setSaving(true);
    try {
      await FavoriteService.updateWishlist(id, {
        name: name.trim(),
        name_ar: nameAr.trim() || undefined,
        is_public: isPublic,
      });

      Alert.alert(t.success || 'Success', t.wishlistUpdated || 'Wishlist updated successfully');
      router.back();
    } catch (error) {
      console.error('Error updating wishlist:', error);
      Alert.alert(t.error || 'Error', t.errorUpdatingWishlist);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!id) return;

    Alert.alert(
      t.removeFromWishlist || 'Remove Item',
      'Are you sure you want to remove this item?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.remove || 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await FavoriteService.removeFromWishlist(id, productId);
              await fetchWishlist();
            } catch (error) {
              Alert.alert(t.error || 'Error', t.errorRemovingFromWishlist);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#61d5b6" />
        </View>
      </SafeAreaView>
    );
  }

  const items = wishlist?.items || [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.editWishlist || 'Edit Wishlist'}</Text>
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

        {/* Wishlist Items */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>{t.wishlistItems || 'Wishlist Items'}</Text>
            {items.map((item) => {
              const product = item.product;
              if (!product) return null;

              const primaryImage = product.images?.[0]?.image_url || 'https://via.placeholder.com/60';

              return (
                <View key={item.id} style={styles.itemCard}>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveItem(product.id)}
                  >
                    <MaterialCommunityIcons name="minus-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>

                  <Image source={{ uri: primaryImage }} style={styles.itemImage} />
                  
                  <Text style={styles.itemTitle} numberOfLines={2}>
                    {product.title}
                  </Text>

                  <TouchableOpacity style={styles.dragHandle}>
                    <MaterialCommunityIcons name="drag-vertical" size={20} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving ? t.saving || 'Saving...' : t.saveWishlist || 'Save wishlist'}
          </Text>
          {!saving && <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  removeButton: {
    padding: 4,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  dragHandle: {
    padding: 4,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export const options = {
  headerShown: false,
};

