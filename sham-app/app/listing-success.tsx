import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, Share, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePageTranslation } from '@/hooks/useTranslation';

export default function ListingSuccessScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { productName, price, currency, imageUri, productId } = params;
  const { t } = usePageTranslation('listingSuccessPage');

  const handleViewItem = () => {
    if (productId) {
      router.replace(`/product/${productId}`);
    } else {
      Alert.alert(t.errorTitle || 'Error', t.errorMessage || 'Product ID not found.');
    }
  };

  const handleBackToSelling = () => {
    router.replace('/selling');
  };

  // Handle back button to go to selling screen instead of create-listing
  useEffect(() => {
    const backAction = () => {
      handleBackToSelling();
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleShare = async () => {
    try {
      const result = await Share.share({
        message: `${t.shareMessage} ${productName} ${t.price}: ${currency}${price}!`,
        url: `your-app-deep-link/product/${productId}`, // Replace with actual deep link
      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // shared with activity type of result.activityType
        } else {
          // shared
        }
      } else if (result.action === Share.dismissedAction) {
        // dismissed
      }
    } catch (error: any) {
      Alert.alert(t.errorTitle || 'Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToSelling}>
          <IconSymbol name="arrow.left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.successTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri as string }} style={styles.productImage} />
          <View style={styles.successIcon}>
            <IconSymbol name="checkmark.circle.fill" size={48} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.congratulationsText}>{t.successTitle}</Text>
        <Text style={styles.messageText}>{t.successMessage}</Text>

        <Text style={styles.productNameText}>{productName}</Text>
        <Text style={styles.priceText}>{currency}{price}</Text>

        <TouchableOpacity style={styles.viewItemButton} onPress={handleViewItem}>
          <Text style={styles.viewItemButtonText}>{t.viewListing}</Text>
          <IconSymbol name="arrow.right" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <IconSymbol name="square.and.arrow.up" size={20} color="#61d5b6" />
          <Text style={styles.shareButtonText}>{t.shareProduct}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40, // Same width as back button to center title
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 30,
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  successIcon: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 2,
  },
  congratulationsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  productNameText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 30,
  },
  viewItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginBottom: 12,
    gap: 8,
  },
  viewItemButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    borderWidth: 1,
    borderColor: '#61d5b6',
    gap: 8,
  },
  shareButtonText: {
    fontSize: 16,
    color: '#61d5b6',
    fontWeight: '600',
  },
});
