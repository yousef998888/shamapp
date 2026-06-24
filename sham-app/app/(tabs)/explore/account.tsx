import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import LocationPicker from '@/components/LocationPicker';
import ProfileImagePickerModal from '@/components/modals/ProfileImagePickerModal';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import type { CreateAddressData } from '@/types/database';
import OrderService from '@/services/OrderService';
import UserService from '@/services/UserService';
import VerificationModal from '@/components/modals/VerificationModal';
import { useUserVerification } from '@/hooks/useUserVerification';
import { usePageTranslation } from '@/hooks/useTranslation';

export default function AccountPage() {
  const { user, profile, signOut, loading, refreshProfile, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = usePageTranslation('accountPage');
  const [isEditing, setIsEditing] = useState(false);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [imagePickerType, setImagePickerType] = useState<'avatar' | 'background'>('avatar');
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const verification = useUserVerification();

  const { data: buyerOrders } = useQuery({
    queryKey: ['buyer-orders-summary', user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return OrderService.getOrders(user.id, 'buyer');
    },
    enabled: !!user?.id,
  });

  const purchasedCount = buyerOrders?.length || 0;

  // Profile image upload mutation
  const uploadProfileImageMutation = useMutation({
    mutationFn: ({ imageUri, type }: { imageUri: string; type: 'avatar' | 'background' }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return UserService.uploadAndUpdateProfileImage(user.id, imageUri, type);
    },
    onSuccess: () => {
      // Invalidate and refetch profile data
      queryClient.invalidateQueries({ queryKey: ['userProfile', user?.id] });
      Alert.alert(t.success || 'Success', t.profileImageUpdated || 'Profile image updated successfully');
    },
    onError: (error: Error) => {
      Alert.alert(t.error || 'Error', `${t.failedToUpdateProfileImage || 'Failed to update profile image'}: ${error.message}`);
    },
  });

  // Calculate member since year
  const memberSince = profile?.member_since
    ? new Date(profile.member_since).getFullYear()
    : new Date().getFullYear();

  const handleSignOut = () => {
    Alert.alert(
      t.signOut || 'Sign Out',
      t.areYouSureSignOut || 'Are you sure you want to sign out?',
      [
        { text: t.cancel || 'Cancel', style: 'cancel' },
        { text: t.signOut || 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleAddressSelected = (address: CreateAddressData) => {
    // Handle address selection - you can add logic here if needed
    console.log('Address selected:', address);
    setLocationPickerVisible(false);
  };

  const handleImagePickerOpen = (type: 'avatar' | 'background') => {
    setImagePickerType(type);
    setImagePickerVisible(true);
  };

  const handleImageSelected = (imageUri: string) => {
    uploadProfileImageMutation.mutate({ imageUri, type: imagePickerType });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <IconSymbol
          key={i}
          name="star.fill"
          size={16}
          color={i < rating ? '#10B981' : '#E5E7EB'}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t.loading || 'Loading...'}</Text>
        </View>
      </View>
    );
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.loginPromptContainer}>
          <IconSymbol name="person.circle" size={80} color="#61d5b6" />
          <Text style={styles.loginPromptTitle}>{t.signInRequired || 'Sign in to access your account'}</Text>
          <Text style={styles.loginPromptSubtitle}>
            {t.signInDescription || 'Create an account or sign in to manage your profile, orders, and listings'}
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
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>

          </View>

          <TouchableOpacity 
            style={styles.backgroundImageContainer}
            onPress={() => handleImagePickerOpen('background')}
            activeOpacity={0.8}
          >
            {profile?.background_image_url ? (
              <Image 
                source={{ uri: profile.background_image_url }} 
                style={styles.backgroundImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.backgroundPlaceholder}>
                <IconSymbol name="photo" size={40} color="#9CA3AF" />
                <Text style={styles.backgroundPlaceholderText}>{t.tapToAddBackground || 'Tap to add background'}</Text>
              </View>
            )}
            
            <View style={styles.profileHeader}>
              <Text style={styles.initials}>
                {profile?.full_name ? getInitials(profile.full_name) : 'A H'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={() => handleImagePickerOpen('avatar')}
            activeOpacity={0.8}
          >
            <View style={styles.avatar}>
              {profile?.avatar_url ? (
                <Image 
                  source={{ uri: profile.avatar_url }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <IconSymbol name="person" size={40} color="#3B82F6" />
              )}
            </View>
            <View style={styles.avatarEditOverlay}>
              <IconSymbol name="camera.fill" size={16} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* <View style={styles.ratingContainer}>
          <View style={styles.stars}>
            {renderStars(profile?.rating || 0)}
          </View>
          <Text style={styles.ratingText}>(1)</Text>
        </View> */}

          <TouchableOpacity style={styles.bioButton}>
            <Text style={styles.bioText}>{t.tapToAddBio || 'Tap to add bio'}</Text>
          </TouchableOpacity>

          {!profile?.is_verified && (
            <View style={styles.verifyCard}>
              <TouchableOpacity
                onPress={() => setVerificationModalVisible(true)}
                activeOpacity={0.85}
              >
                <View style={styles.verifyCardHeader}>
                  <IconSymbol name="shield.fill" size={20} color="#047857" />
                  <Text style={styles.verifyTitle}>{t.verifyYourIdentity || 'Verify your identity'}</Text>
                </View>
                <Text style={styles.verifyDescription}>
                  {t.verifyDescription || 'Upload a photo of your ID to unlock buying and selling on Sham.'}
                </Text>
                <View style={styles.verifyBadge}>
                  <Text style={styles.verifyBadgeText}>
                    {verification.status === 'pending'
                      ? t.verificationInProgress || 'Verification in progress'
                      : verification.status === 'rejected'
                      ? t.verificationRequired || 'Verification required'
                      : t.startVerification || 'Start verification'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={async () => {
                  await verification.refetch();
                  await refreshProfile();
                }}
                disabled={verification.isLoading}
              >
                <MaterialCommunityIcons 
                  name="refresh" 
                  size={18} 
                  color="#047857" 
                  style={verification.isLoading && { opacity: 0.5 }}
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile?.total_sales || 0}</Text>
              <Text style={styles.statLabel}>{t.sold || 'Sold'}</Text>
            </View>
            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{memberSince}</Text>
              <Text style={styles.statLabel}>{t.memberSince || 'Member Since'}</Text>
            </View>

            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{purchasedCount}</Text>
              <Text style={styles.statLabel}>{t.bought || 'Bought'}</Text>
            </View>
          </View>
        </View>

        {/* Account Sections */}
        <View style={styles.sectionsContainer}>
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/selling')}
          >
            <IconSymbol name="square.stack.3d.up.fill" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.selling || 'Selling'}</Text>
              <Text style={styles.sectionSubtitle}>{t.noItems || 'No items'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/buying')}
          >
            <IconSymbol name="bag.fill" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.buying || 'Buying'}</Text>
              <Text style={styles.sectionSubtitle}>
                {purchasedCount === 0 ? (t.noPurchasesYet || 'No purchases yet') : `${purchasedCount} ${purchasedCount === 1 ? (t.item || 'item') : (t.items || 'items')} ${t.purchased || 'purchased'}`}
              </Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/help-center' as any)}
          >
            <MaterialCommunityIcons name="lifebuoy" size={26} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.helpCenter || 'Help Center'}</Text>
              <Text style={styles.sectionSubtitle}>{t.helpCenterSubtitle || 'FAQs, phone support, and feedback'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/favorites')}
          >
            <IconSymbol name="heart.fill" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.watchlist || 'Watchlist'}</Text>
              <Text style={styles.sectionSubtitle}>{t.noItems || 'No items'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sectionCard}>
            <IconSymbol name="magnifyingglass" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.savedSearches || 'Saved searches'}</Text>
              <Text style={styles.sectionSubtitle}>{t.noSavedSearches || 'No saved searches'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => setLocationPickerVisible(true)}
          >
            <IconSymbol name="mappin.circle.fill" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.addresses || 'Addresses'}</Text>
              <Text style={styles.sectionSubtitle}>{t.manageYourAddresses || 'Manage your addresses'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>

          <View style={styles.sectionCard}>
            <IconSymbol name="globe" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>{t.language || 'Language'}</Text>
              <View style={styles.languageSwitcherContainer}>
                <LanguageSwitcher variant="compact" />
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.sectionCard} onPress={handleSignOut}>
            <IconSymbol name="rectangle.portrait.and.arrow.right" size={24} color="#61d5b6" />
            <View style={styles.sectionContent}>
              <Text style={[styles.sectionTitle, styles.signOutText]}>{t.signOut || 'Sign Out'}</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color="#61d5b6" />
          </TouchableOpacity>
        </View>


        {/* Bottom spacing for floating tab bar */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Location Picker Modal */}
      <LocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onSelect={handleAddressSelected}
        showTabs={true}
      />

      {/* Profile Image Picker Modal */}
      <ProfileImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onImageSelected={handleImageSelected}
        type={imagePickerType}
      />

      <VerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        onSubmitted={() => {
          verification.refetch();
          setVerificationModalVisible(false);
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backgroundImageContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  backgroundPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  time: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 15,
  },
  headerButton: {
    padding: 5,
  },
  profileHeader: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  initials: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 30,
    marginTop: -90,
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stars: {
    flexDirection: 'row',
    marginRight: 8,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
  },
  bioButton: {
    marginBottom: 20,
  },
  bioText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  verifyCard: {
    width: '100%',
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 10,
    position: 'relative',
  },
  refreshButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  verifyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#047857',
  },
  verifyDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: '#047857',
  },
  verifyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  membershipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  membershipText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sectionsContainer: {
    marginHorizontal: 20,
    gap: 8,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  signOutText: {
    color: '#EF4444',
  },
  languageSwitcherContainer: {
    marginTop: 8,
  },
  bottomSpacing: {
    height: 100,
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
