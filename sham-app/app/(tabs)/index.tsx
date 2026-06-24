import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import DynamicHeader from '@/components/DynamicHeader';
import RecommendationCarousel, { RecommendationCarouselRef } from '@/components/home/RecommendationCarousel';
import ContinueShoppingSection, { ContinueShoppingSectionRef } from '../../components/home/ContinueShoppingSection';
import HorizontalCategories from '../../components/home/HorizontalCategories';
import BannerCarousel from '../../components/home/BannerCarousel';
import InfiniteProductsFeed from '../../components/home/InfiniteProductsFeed';
import UserBehaviorService from '@/services/UserBehaviorService';
import { usePageTranslation } from '@/hooks/useTranslation';
import { UI } from '@/constants/theme';
export default function HomeScreen() {
  const {
    user,
    profile,
    isAuthenticated,
    loading,
    sessionError,
    profileError,
  } = useAuthContext();

  const { t, loading: translationLoading, isRTL } = usePageTranslation('homePage');

  // Scroll tracking for blur effect
  const scrollY = useRef(new Animated.Value(0)).current;
  const infiniteProductsRef = React.useRef<{ loadMore: () => void } | null>(null);

  // Pull to refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Refs for refreshing sections
  const personalizedRef = React.useRef<RecommendationCarouselRef | null>(null);
  const highlightsRef = React.useRef<RecommendationCarouselRef | null>(null);
  const trendingRef = React.useRef<RecommendationCarouselRef | null>(null);
  const continueShoppingRef = React.useRef<ContinueShoppingSectionRef | null>(null);

  // Interpolate scale based on scroll position
  // Scale from 1 to 1.2 as scroll goes from 0 to 600
  const gradientScale = scrollY.interpolate({
    inputRange: [0, 600],
    outputRange: [1, 1.2],
    extrapolate: 'clamp',
  });

  // Interpolate opacity based on scroll position
  // Fade out as you scroll down, fade in when at top
  const gradientOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Shared element progress for horizontal categories transition
  const stickyAppearProgress = scrollY.interpolate({
    inputRange: [520, 521],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  // Interpolate sticky categories opacity based on scroll position
  const stickyCategoriesOpacity = stickyAppearProgress;

  // Fade out original categories when sticky one appears
  const originalCategoriesOpacity = stickyAppearProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const handleSearchPress = React.useCallback(() => {
    router.push('/search');
  }, []);

  // Handle pull to refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);

    // Refresh all recommendation sections
    personalizedRef.current?.refresh();
    highlightsRef.current?.refresh();
    trendingRef.current?.refresh();
    continueShoppingRef.current?.refresh();

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    setRefreshing(false);
  }, []);

  // Initialize user behavior tracking when user is authenticated
  React.useEffect(() => {
    if (isAuthenticated && user?.id) {
      UserBehaviorService.initializeSession(user.id);
    }
  }, [isAuthenticated, user?.id]);

  // Loading state
  if (loading || translationLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={UI.colors.primary} />
        <Text style={styles.loadingText}>{t.loading || 'Loading...'}</Text>
      </SafeAreaView>
    );
  }

  // Main view (accessible to all users, authenticated or not)
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* "Jump back in" gradient section - Fixed at top */}
      <Animated.View
        style={[
          styles.jumpBackWrapper,
          {
            transform: [{ scale: gradientScale }],
            opacity: gradientOpacity,
          }
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['#61d5b6', 'white']}
          style={styles.jumpBackSection}
        >
          {/* <Text style={styles.jumpBackText}>{t.jumpBackIn || 'Jump back in'}</Text> */}
        </LinearGradient>
      </Animated.View>

      {/* Main content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#61d5b6"
            colors={['#61d5b6']}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: false,
            listener: (e: any) => {
              const offsetY = e.nativeEvent.contentOffset.y;
              const contentHeight = e.nativeEvent.contentSize.height;
              const layoutHeight = e.nativeEvent.layoutMeasurement.height;

              // Trigger load more when 80% scrolled
              if (offsetY + layoutHeight >= contentHeight * 0.8) {
                infiniteProductsRef.current?.loadMore();
              }
            }
          }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.carouselContainer}>
          {/* Horizontal Carousel */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carouselContent}
            snapToInterval={336} // 320 (card width) + 16 (margin)
            snapToAlignment="start"
            decelerationRate="fast"
            pagingEnabled={false}
          >
            {/* Personalized Recommendations */}
            <RecommendationCarousel
              ref={personalizedRef}
              type="personalized"
              title="Deals based on your lists"
              onProductPress={(product) => {
                // Track product interaction only if authenticated
                if (isAuthenticated && user?.id) {
                  UserBehaviorService.trackProductView(product.id, {
                    categoryId: product.category_id,
                    price: product.price,
                  });
                }
                router.push(`/product/${product.id}`);
              }}
            />

            {/* Highlight Recommendations */}
            <RecommendationCarousel
              ref={highlightsRef}
              type="highlights"
              title="Highlights deals"
              onProductPress={(product) => {
                if (isAuthenticated && user?.id) {
                  UserBehaviorService.trackProductView(product.id, {
                    categoryId: product.category_id,
                    price: product.price,
                  });
                }
                router.push(`/product/${product.id}`);
              }}
            />

            {/* Trending Recommendations */}
            <RecommendationCarousel
              ref={trendingRef}
              type="trending"
              title="Trending now"
              onProductPress={(product) => {
                if (isAuthenticated && user?.id) {
                  UserBehaviorService.trackProductView(product.id, {
                    categoryId: product.category_id,
                    price: product.price,
                  });
                }
                router.push(`/product/${product.id}`);
              }}
            />
          </ScrollView>
        </View>

        {/* Horizontal Categories */}

        <Animated.View
          style={[
            styles.horizontalCategorySection,
            { opacity: isRTL ? 1 : originalCategoriesOpacity }
          ]}
        >
          <HorizontalCategories
            onCategoryPress={(categorySlug) => {
              router.push(`/category/${categorySlug}`);
            }}
            variant="default"
          />
        </Animated.View>


        {isAuthenticated && (
          <View style={styles.section}>
            <ContinueShoppingSection ref={continueShoppingRef} />
          </View>
        )}

        {/* Banner Carousel */}
        <BannerCarousel />

        {/* Infinite Products Feed */}
        <View style={styles.productsSection}>
          <InfiniteProductsFeed ref={infiniteProductsRef} userId={user?.id} />
        </View>
      </ScrollView>

      {/* Sticky categories header - appears when scrolling */}
      {!isRTL && (
        <Animated.View
          style={[
            styles.stickyCategoriesContainer,
            { opacity: stickyCategoriesOpacity, marginTop: 50 }
          ]}
          pointerEvents="box-none"
        >
          <HorizontalCategories
            onCategoryPress={(categoryId) => {
              console.log('Sticky category pressed:', categoryId);
            }}
            variant="sticky"
            scrollY={scrollY}
            transitionConfig={{ morphStart: 540, morphEnd: 640 }}
          />
        </Animated.View>
      )}

      {/* Header with search bar - positioned absolute on top */}
      <DynamicHeader handleSearchPress={handleSearchPress} scrollY={scrollY} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 150, // Add top padding to account for gradient
  },

  // Jump back in section
  jumpBackWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 600,
    zIndex: 0,
  },
  jumpBackSection: {
    height: 600,
    justifyContent: 'flex-start',
    paddingLeft: 20,
  },
  jumpBackText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },

  // Horizontal Carousel
  carouselContainer: {
    // backgroundColor: '#1F2937',
    paddingVertical: 20,
  },
  carouselContent: {
    paddingLeft: 20,
    paddingRight: 4, // Small padding for last card
    paddingBottom: 20,
  },
  section: {

  },
  productsSection: {
    marginTop: 16,
  },
  categorySection: {
    marginTop: 16,
  },
  horizontalCategorySection: {
    marginTop: 16,
    marginBottom: 8,
    // backgroundColor: '#FFFFFF',
    // borderBottomWidth: 1,
    // borderBottomColor: '#E5E7EB',
  },
  stickyCategoriesContainer: {
    position: 'absolute',
    top: 80, // Below the header
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: UI.colors.background,
    borderBottomWidth: UI.dimensions.borderWidth,
    borderBottomColor: UI.colors.border,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  carouselCard: {
    width: 320,
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.largeBorderRadius,
    padding: 24,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Carousel indicators
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#1F2937',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  indicatorActive: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },

  // Recently viewed section
  recentlyViewedSection: {

  },
  recentlyViewedTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Loading & Error states
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: UI.colors.primary,
    paddingHorizontal: 32,
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: UI.dimensions.borderRadius,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Unauthenticated state
  logoContainer: {
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: UI.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: UI.colors.primary,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: UI.colors.backgroundLight,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
});
