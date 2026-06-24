import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';
import type { Wishlist } from '@/services/FavoriteService';

interface MoveToWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  wishlists: Wishlist[];
  currentWishlistId?: string;
  onMove: (targetWishlistId: string) => void;
}

export default function MoveToWishlistModal({
  visible,
  onClose,
  wishlists,
  currentWishlistId,
  onMove,
}: MoveToWishlistModalProps) {
  const { t } = usePageTranslation('favoritesPage');
  const [selectedWishlistId, setSelectedWishlistId] = useState<string | null>(null);

  const availableWishlists = wishlists.filter(w => w.id !== currentWishlistId);

  const handleMove = () => {
    if (selectedWishlistId) {
      onMove(selectedWishlistId);
      onClose();
      setSelectedWishlistId(null);
    }
  };

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
            <Text style={styles.title}>{t.moveToAnotherList || 'Move to another list'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.clearAll}>{t.clearAll || 'Clear All'}</Text>
            </TouchableOpacity>
          </View>

          {/* Wishlists List */}
          <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
            {availableWishlists.map((wishlist) => {
              const isSelected = selectedWishlistId === wishlist.id;
              const firstImage = wishlist.items?.[0]?.product?.images?.[0]?.image_url;

              return (
                <TouchableOpacity
                  key={wishlist.id}
                  style={[
                    styles.wishlistItem,
                    isSelected && styles.wishlistItemSelected,
                  ]}
                  onPress={() => setSelectedWishlistId(wishlist.id)}
                >
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
                      {wishlist.item_count || 0} {t.items || 'Items'}
                    </Text>
                  </View>

                  <View style={[styles.radio, isSelected && styles.radioSelected]}>
                    {isSelected && (
                      <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Move Button */}
          <TouchableOpacity
            style={[
              styles.moveButton,
              !selectedWishlistId && styles.moveButtonDisabled,
            ]}
            onPress={handleMove}
            disabled={!selectedWishlistId}
          >
            <Text style={styles.moveButtonText}>{t.move || 'Move'}</Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
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
    maxHeight: '80%',
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
    paddingHorizontal: 20,
    marginBottom: 20,
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
  listContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  wishlistItemSelected: {
    borderColor: '#8B5CF6',
    backgroundColor: '#F5F3FF',
  },
  wishlistImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
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
  },
  wishlistName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  wishlistMeta: {
    fontSize: 13,
    color: '#6B7280',
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#61d5b6',
    borderColor: '#8B5CF6',
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    marginHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  moveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

