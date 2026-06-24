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
import type { Product } from '@/types/database';

interface EditWishlistItemModalProps {
  visible: boolean;
  onClose: () => void;
  product: Product | null;
  onMove: () => void;
  onDelete: () => void;
}

export default function EditWishlistItemModal({
  visible,
  onClose,
  product,
  onMove,
  onDelete,
}: EditWishlistItemModalProps) {
  const { t } = usePageTranslation('favoritesPage');

  if (!product) return null;

  const primaryImage = product.images?.[0]?.image_url || 'https://via.placeholder.com/80';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t.editWishlistItem || 'Edit Wishlist Item'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.clearAll}>{t.clearAll || 'Clear All'}</Text>
            </TouchableOpacity>
          </View>

          {/* Product Info */}
          <View style={styles.productContainer}>
            <Image source={{ uri: primaryImage }} style={styles.productImage} />
            <Text style={styles.productTitle} numberOfLines={2}>
              {product.title}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.moveButton}
              onPress={() => {
                onMove();
                onClose();
              }}
            >
              <Text style={styles.moveButtonText}>{t.move || 'Move'}</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => {
                onDelete();
                onClose();
              }}
            >
              <MaterialCommunityIcons name="delete-outline" size={20} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>{t.delete || 'Delete'}</Text>
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
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  clearAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#61d5b6',
  },
  productContainer: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  actionsContainer: {
    gap: 12,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
});

