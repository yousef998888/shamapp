import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';
import type { Wishlist } from '@/services/FavoriteService';

interface DeleteWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  wishlist: Wishlist | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteWishlistModal({
  visible,
  onClose,
  wishlist,
  onConfirm,
  onCancel,
}: DeleteWishlistModalProps) {
  const { t } = usePageTranslation('favoritesPage');

  if (!wishlist) return null;

  const firstImage = wishlist.items?.[0]?.product?.images?.[0]?.image_url;
  const itemCount = wishlist.item_count || 0;
  const saleCount = wishlist.sale_count || 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustration}>
              <MaterialCommunityIcons name="delete-outline" size={80} color="#61d5b6" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{t.deleteWishlistTitle || 'Delete wishlist?'}</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            {t.deleteWishlistConfirmation || 'Are you sure to delete Wishlist #1? This operation cannot be undone.'}
          </Text>

          {/* Wishlist Info */}
          <View style={styles.wishlistCard}>
            <View style={styles.wishlistImageContainer}>
              {firstImage ? (
                <Image source={{ uri: firstImage }} style={styles.wishlistImage} />
              ) : (
                <View style={styles.wishlistImagePlaceholder}>
                  <MaterialCommunityIcons name="heart-outline" size={24} color="#9CA3AF" />
                </View>
              )}
            </View>
            
            <View style={styles.wishlistInfo}>
              <Text style={styles.wishlistName}>{wishlist.name}</Text>
              <Text style={styles.wishlistMeta}>
                {t.defaultWishlist || 'Default'} · {itemCount} {t.items || 'Items'}
              </Text>
              {saleCount > 0 && (
                <View style={styles.saleTag}>
                  <MaterialCommunityIcons name="tag" size={12} color="#10B981" />
                  <Text style={styles.saleText}>
                    {saleCount} {saleCount === 1 ? t.itemOnSale : t.itemsOnSale}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onConfirm();
                onClose();
              }}
            >
              <Text style={styles.deleteButtonText}>{t.deleteWishlist || 'Delete wishlist'}</Text>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                onCancel();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>{t.nevermind || 'Nevermind'}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  wishlistCard: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
  },
  wishlistImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  wishlistImage: {
    width: '100%',
    height: '100%',
  },
  wishlistImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  wishlistName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  wishlistMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  saleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  saleText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 12,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

