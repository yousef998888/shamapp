import React from 'react';

import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Alert,
  Share as RNShare,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';

interface ShareWishlistModalProps {
  visible: boolean;
  onClose: () => void;
  wishlistId: string;
  wishlistName: string;
}

export default function ShareWishlistModal({
  visible,
  onClose,
  wishlistId,
  wishlistName,
}: ShareWishlistModalProps) {
  const { t } = usePageTranslation('favoritesPage');

  const shareUrl = `https://shamshop.com/wishlist/${wishlistId}`;

  const handleCopyLink = async () => {
    try {
      await Clipboard.setStringAsync(shareUrl);
      Alert.alert(t.success || 'Success', t.linkCopied || 'Link copied to clipboard');
      onClose();
    } catch (error) {
      Alert.alert(t.error || 'Error', t.failedToCopyLink || 'Failed to copy link');
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Check out my wishlist: ${wishlistName}`);
    const body = encodeURIComponent(`I thought you might like to see my wishlist!\n\n${shareUrl}`);
    // In a real app, you'd use a proper email library or Linking.openURL
    Alert.alert(t.email || 'Email', `mailto:?subject=${subject}&body=${body}`);
    onClose();
  };

  const handleTextMessage = async () => {
    try {
      await RNShare.share({
        message: `Check out my wishlist: ${wishlistName}\n${shareUrl}`,
      });
      onClose();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleQRCode = () => {
    Alert.alert(t.qrCode || 'QR Code', t.qrCodeFeatureComingSoon || 'QR Code feature coming soon!');
    onClose();
  };

  const shareOptions = [
    {
      icon: 'content-copy',
      label: t.copyLink || 'Copy Link',
      onPress: handleCopyLink,
    },
    {
      icon: 'email-outline',
      label: t.email || 'Email',
      onPress: handleEmail,
    },
    {
      icon: 'message-text-outline',
      label: t.textMessage || 'Text Message',
      onPress: handleTextMessage,
    },
    {
      icon: 'qrcode',
      label: t.qrCode || 'QR Code',
      onPress: handleQRCode,
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
            <Text style={styles.title}>{t.shareThisWishlist || 'Share this wishlist'}</Text>
          </View>

          {/* Share Options */}
          <View style={styles.optionsContainer}>
            {shareOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionItem}
                onPress={option.onPress}
              >
                <Text style={styles.optionLabel}>{option.label}</Text>
                <MaterialCommunityIcons
                  name={option.icon as any}
                  size={24}
                  color="#6B7280"
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Show Results Button */}
          <TouchableOpacity style={styles.showResultsButton} onPress={onClose}>
            <Text style={styles.showResultsText}>{t.showResults || 'Show results'}</Text>
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
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  showResultsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  showResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

