import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useAuthContext } from '@/contexts/AuthContext';
import { usePageTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/PageHeader';
import FavoriteService, { Wishlist } from '@/services/FavoriteService';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import ManageWishlistModal from '@/components/modals/ManageWishlistModal';
import DeleteWishlistModal from '@/components/modals/DeleteWishlistModal';
import WishlistDeletedModal from '@/components/modals/WishlistDeletedModal';
import { Alert } from 'react-native';

export default function FavoritesPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const { t } = usePageTranslation('favoritesPage');
  
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [selectedWishlist, setSelectedWishlist] = useState<Wishlist | null>(null);
  const [manageModalVisible, setManageModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletedModalVisible, setDeletedModalVisible] = useState(false);
  const [deletedWishlistName, setDeletedWishlistName] = useState('');
  const [deletedWishlistImage, setDeletedWishlistImage] = useState<string | undefined>();

  useEffect(() => {
    if (user?.id) {
      fetchWishlists();
    } else {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchWishlists = async () => {
    if (!user?.id) return;

    try {
      setError(null);
      const data = await FavoriteService.getUserWishlists(user.id);
      setWishlists(data);
    } catch (err) {
      console.error('Error fetching wishlists:', err);
      setError(err instanceof Error ? err.message : t.errorLoadingWishlists);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWishlists();
  };

  const filteredWishlists = wishlists.filter(wishlist => 
    activeTab === 'public' ? wishlist.is_public : !wishlist.is_public
  );

  const renderTabButton = (tab: 'public' | 'private', label: string) => (
    <TouchableOpacity
      key={tab}
      style={[styles.tab, activeTab === tab && styles.activeTab]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const handleWishlistLongPress = (wishlist: Wishlist) => {
    setSelectedWishlist(wishlist);
    setManageModalVisible(true);
  };

  const handleEditWishlist = () => {
    if (selectedWishlist) {
      router.push(`/wishlist/edit/${selectedWishlist.id}` as any);
    }
  };

  const handleDeleteWishlist = () => {
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedWishlist) return;

    try {
      const wishlistName = selectedWishlist.name;
      const wishlistImage = selectedWishlist.items?.[0]?.product?.images?.[0]?.image_url;

      await FavoriteService.deleteWishlist(selectedWishlist.id);
      
      // Update local state
      setWishlists(prev => prev.filter(w => w.id !== selectedWishlist.id));
      
      // Show success modal
      setDeletedWishlistName(wishlistName);
      setDeletedWishlistImage(wishlistImage);
      setDeletedModalVisible(true);
      
      setSelectedWishlist(null);
    } catch (error) {
      console.error('Error deleting wishlist:', error);
      Alert.alert(
        t.errorDeletingWishlist || 'Error',
        'Failed to delete wishlist. Please try again.'
      );
    }
  };

  const handleEmptyAllItems = () => {
    Alert.alert(
      t.emptyAllItems || 'Empty All Items',
      'Are you sure you want to remove all items from this wishlist?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { 
          text: t.remove || 'Remove', 
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement empty all items functionality
            Alert.alert('Coming Soon', 'This feature will be available soon!');
          }
        }
      ]
    );
  };

  const handleShareWishlist = () => {
    // TODO: Implement share functionality
    Alert.alert('Coming Soon', 'Share feature will be available soon!');
  };

  const renderWishlistCard = (wishlist: Wishlist) => {
    const itemCount = wishlist.item_count || 0;
    const saleCount = wishlist.sale_count || 0;
    const firstImage = wishlist.items?.[0]?.product?.images?.[0]?.image_url;

    return (
      <TouchableOpacity
        key={wishlist.id}
        style={styles.wishlistCard}
        onPress={() => router.push(`/wishlist/${wishlist.id}` as any)}
        onLongPress={() => handleWishlistLongPress(wishlist)}
        delayLongPress={500}
      >
        <View style={styles.wishlistImageContainer}>
          {firstImage ? (
            <Image source={{ uri: firstImage }} style={styles.wishlistImage} />
          ) : (
            <View style={styles.wishlistImagePlaceholder}>
              <IconSymbol name="heart.fill" size={32} color="#E5E7EB" />
            </View>
          )}
        </View>
        
        <View style={styles.wishlistInfo}>
          <Text style={styles.wishlistName} numberOfLines={1}>
            {wishlist.name}
          </Text>
          <View style={styles.wishlistMeta}>
            <Text style={styles.wishlistMetaText}>
              {t.defaultWishlist} · {itemCount} {itemCount === 1 ? t.item : t.items}
            </Text>
          </View>
          {saleCount > 0 && (
            <View style={styles.saleTag}>
              <IconSymbol name="tag.fill" size={12} color="#10B981" />
              <Text style={styles.saleText}>
                {saleCount} {saleCount === 1 ? t.itemOnSale : t.itemsOnSale}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.wishlistActions}>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => handleWishlistLongPress(wishlist)}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const handleCreateWishlist = () => {
    router.push('/wishlist/create');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        {/* <MaterialCommunityIcons name="heart-outline" size={120} color="#E5E7EB" /> */}
      </View>
      
      <Text style={styles.emptyTitle}>{t.noWishlistYet}</Text>
      <Text style={styles.emptySubtitle}>{t.addNewWishlist}</Text>
      
      <TouchableOpacity
        style={styles.createWishlistButton}
        onPress={handleCreateWishlist}
      >
        <MaterialCommunityIcons name="plus" size={20} color="#FFFFFF" />
        <Text style={styles.createWishlistButtonText}>{t.createWishlist}</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.browseButtonText}>{t.browseProducts}</Text>
      </TouchableOpacity>
      
      {/* Feedback Section */}
      {/* <View style={styles.feedbackSection}>
        <View style={styles.emojiRow}>
          {['😢', '😕', '😐', '🙂', '😄'].map((emoji, index) => (
            <TouchableOpacity key={index} style={styles.emojiButton}>
              <Text style={styles.emoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={styles.feedbackTitle}>{t.feedbackTitle}</Text>
        <Text style={styles.feedbackMessage}>{t.feedbackMessage}</Text>
        
          <TouchableOpacity style={styles.feedbackButton}>
            <MaterialCommunityIcons name="message-text-outline" size={20} color="#61d5b6" />
          <Text style={styles.feedbackButtonText}>{t.sendFeedback}</Text>
        </TouchableOpacity>
      </View> */}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <PageHeader title={t.myWishlist} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#61d5b6" />
        </View>
      </SafeAreaView>
    );
  }

  // Show login prompt if not authenticated
  if (!user?.id) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <PageHeader title={t.myWishlist} />
        <View style={styles.loginPromptContainer}>
          <IconSymbol name="heart.fill" size={80} color="#61d5b6" />
          <Text style={styles.loginPromptTitle}>{t.signInToViewWishlist || 'Sign in to view your wishlist'}</Text>
          <Text style={styles.loginPromptSubtitle}>
            {t.wishlistDescription || 'Save your favorite items and create wishlists to organize your shopping'}
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.loginButtonText}>{t.signIn || 'Sign In'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.signupButton}
            onPress={() => router.push('/auth/signup')}
          >
            <Text style={styles.signupButtonText}>{t.createAccount || 'Create Account'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      
      <PageHeader title={t.myWishlist} />
      
      <View style={styles.container}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {renderTabButton('public', t.public)}
          {renderTabButton('private', t.private)}
        </View>
        
        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchWishlists}>
                <Text style={styles.retryButtonText}>{t.tryAgain}</Text>
              </TouchableOpacity>
            </View>
          ) : filteredWishlists.length > 0 ? (
            <View style={styles.wishlistsContainer}>
              {filteredWishlists.map(renderWishlistCard)}
            </View>
          ) : (
            renderEmptyState()
          )}
        </ScrollView>

        {/* Floating Create Wishlist Button - Only show when there are wishlists */}
        {filteredWishlists.length > 0 && (
          <TouchableOpacity
            style={styles.floatingButton}
            onPress={handleCreateWishlist}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Modals */}
      <ManageWishlistModal
        visible={manageModalVisible}
        onClose={() => setManageModalVisible(false)}
        onEdit={handleEditWishlist}
        onEmptyAll={handleEmptyAllItems}
        onShare={handleShareWishlist}
        onDelete={handleDeleteWishlist}
      />

      <DeleteWishlistModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        wishlist={selectedWishlist}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteModalVisible(false)}
      />

      <WishlistDeletedModal
        visible={deletedModalVisible}
        onClose={() => {
          setDeletedModalVisible(false);
          setSelectedWishlist(null);
        }}
        wishlistName={deletedWishlistName}
        wishlistImage={deletedWishlistImage}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#61d5b6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  wishlistsContainer: {
    padding: 16,
    gap: 12,
  },
  wishlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  wishlistImageContainer: {
    width: 60,
    height: 60,
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
    marginRight: 8,
  },
  wishlistActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreButton: {
    padding: 4,
  },
  wishlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  wishlistMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  wishlistMetaText: {
    fontSize: 13,
    color: '#6B7280',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  emptyIllustration: {
    width: 280,
    height: 200,
    marginBottom: 24,
  },
  emptyImage: {
    width: '100%',
    height: '100%',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  createWishlistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#61d5b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createWishlistButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  browseButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#61d5b6',
  },
  feedbackSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  feedbackButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#61d5b6',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#61d5b6',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#61d5b6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#61d5b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loginPromptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  loginPromptSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#61d5b6',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#61d5b6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  signupButton: {
    width: '100%',
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#61d5b6',
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#61d5b6',
  },
});

export const options = {
  headerShown: false,
};

