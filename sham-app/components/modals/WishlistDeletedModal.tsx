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

interface WishlistDeletedModalProps {
  visible: boolean;
  onClose: () => void;
  wishlistName: string;
  wishlistImage?: string;
}

export default function WishlistDeletedModal({
  visible,
  onClose,
  wishlistName,
  wishlistImage,
}: WishlistDeletedModalProps) {
  const { t } = usePageTranslation('favoritesPage');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          {/* Wishlist Image/Icon */}
          <View style={styles.imageContainer}>
            {wishlistImage ? (
              <Image source={{ uri: wishlistImage }} style={styles.image} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <MaterialCommunityIcons name="heart-outline" size={40} color="#9CA3AF" />
              </View>
            )}
          </View>

          {/* Wishlist Name */}
          <Text style={styles.wishlistName}>{wishlistName}</Text>

          {/* Title */}
          <Text style={styles.title}>{t.wishlistDeleted || 'Wishlist deleted.'}</Text>
          
          {/* Description */}
          <Text style={styles.description}>
            {t.wishlistDeletedConfirmation || `Are you sure to delete ${wishlistName}? This operation cannot be undone.`}
          </Text>

          {/* OK Button */}
          <TouchableOpacity style={styles.okButton} onPress={onClose}>
            <Text style={styles.okButtonText}>{t.greatThanks || 'Great, thanks'}</Text>
            <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
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
  okButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  okButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

