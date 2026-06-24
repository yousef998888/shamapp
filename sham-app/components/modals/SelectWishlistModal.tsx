import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FavoriteService, { Wishlist } from '@/services/FavoriteService';
import { useAuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';

interface SelectWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  productId: string;
  onSuccess?: () => void;
  translations: {
    selectWishlist: string;
    createNewWishlist: string;
    cancel: string;
    items: string;
    addToWishlist: string;
    success: string;
    error: string;
    addedToWishlist: string;
    failedToAddToWishlist: string;
    noWishlists: string;
    createYourFirstWishlist: string;
    alreadyInWishlist: string;
  };
}

export default function SelectWishlistModal({
  visible,
  onClose,
  productId,
  onSuccess,
  translations: t,
}: SelectWishlistModalProps) {
  const { user } = useAuthContext();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (visible && user?.id) {
      loadWishlists();
    }
  }, [visible, user?.id]);

  const loadWishlists = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await FavoriteService.getUserWishlists(user.id);
      setWishlists(data);
    } catch (error) {
      console.error('Error loading wishlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWishlist = async (wishlistId: string) => {
    setAdding(wishlistId);
    try {
      // Check if product is already in this wishlist
      const wishlist = wishlists.find(w => w.id === wishlistId);
      const alreadyAdded = wishlist?.items?.some(item => item.product_id === productId);

      if (alreadyAdded) {
        Alert.alert(t.error, t.alreadyInWishlist);
        setAdding(null);
        return;
      }

      await FavoriteService.addToWishlist(wishlistId, productId);
      
      Alert.alert(t.success, t.addedToWishlist);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      Alert.alert(t.error, t.failedToAddToWishlist);
    } finally {
      setAdding(null);
    }
  };

  const handleCreateNew = () => {
    onClose();
    router.push('/wishlist/create');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t.selectWishlist}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#61d5b6" />
            </View>
          ) : wishlists.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="heart-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>{t.noWishlists}</Text>
              <Text style={styles.emptySubtitle}>{t.createYourFirstWishlist}</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
              {wishlists.map((wishlist) => {
                const isAdding = adding === wishlist.id;
                const alreadyAdded = wishlist.items?.some(item => item.product_id === productId);

                return (
                  <TouchableOpacity
                    key={wishlist.id}
                    style={[
                      styles.wishlistItem,
                      alreadyAdded && styles.wishlistItemDisabled,
                    ]}
                    onPress={() => handleAddToWishlist(wishlist.id)}
                    disabled={isAdding || alreadyAdded}
                  >
                    <View style={styles.wishlistIcon}>
                      <MaterialCommunityIcons
                        name={wishlist.is_public ? "heart" : "heart-outline"}
                        size={24}
                        color="#61d5b6"
                      />
                    </View>
                    <View style={styles.wishlistInfo}>
                      <Text style={styles.wishlistName}>{wishlist.name}</Text>
                      <Text style={styles.wishlistCount}>
                        {wishlist.item_count || 0} {t.items}
                      </Text>
                    </View>
                    {isAdding ? (
                      <ActivityIndicator size="small" color="#61d5b6" />
                    ) : alreadyAdded ? (
                      <MaterialCommunityIcons name="check" size={24} color="#10B981" />
                    ) : (
                      <MaterialCommunityIcons name="plus" size={24} color="#6B7280" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateNew}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>{t.createNewWishlist}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>{t.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  wishlistItemDisabled: {
    opacity: 0.5,
  },
  wishlistIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  wishlistInfo: {
    flex: 1,
  },
  wishlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  wishlistCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    padding: 20,
    gap: 12,
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
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

