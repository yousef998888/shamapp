import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';

interface ManageWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onEmptyAll: () => void;
  onShare: () => void;
  onDelete: () => void;
}

export default function ManageWishlistModal({
  visible,
  onClose,
  onEdit,
  onEmptyAll,
  onShare,
  onDelete,
}: ManageWishlistModalProps) {
  const { t } = usePageTranslation('favoritesPage');

  const menuItems = [
    {
      icon: 'pencil-outline',
      label: t.edit || 'Edit',
      onPress: onEdit,
      color: '#111827',
    },
    // {
    //   icon: 'delete-sweep-outline',
    //   label: t.emptyAllItems || 'Empty All Items',
    //   onPress: onEmptyAll,
    //   color: '#111827',
    // },
    // {
    //   icon: 'share-variant-outline',
    //   label: t.share || 'Share',
    //   onPress: onShare,
    //   color: '#111827',
    // },
    {
      icon: 'delete-outline',
      label: t.delete || 'Delete',
      onPress: onDelete,
      color: '#EF4444',
    },
  ];

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
            <Text style={styles.title}>{t.manageThisWishlist || 'Manage this wishlist'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.menuItem,
                  index === menuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={() => {
                  item.onPress();
                  onClose();
                }}
              >
                <MaterialCommunityIcons
                  name={item.icon as any}
                  size={24}
                  color={item.color}
                />
                <Text style={[styles.menuLabel, { color: item.color }]}>
                  {item.label}
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#D1D5DB"
                />
              </TouchableOpacity>
            ))}
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
  closeButton: {
    padding: 4,
  },
  menuContainer: {
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
});

