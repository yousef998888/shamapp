import React, { useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40; // 20px margin on each side

const banners = [
  {
    id: '1',
    title: 'MEGA SALE',
    subtitle: 'LIMITED TIME OFFER',
    discount: '70%',
    colors: ['#61d5b6', '#EC4899'],
  },
  {
    id: '2',
    title: 'SUMMER',
    subtitle: 'SPECIAL OFFERS',
    discount: '50%',
    colors: ['#06B6D4', '#3B82F6'],
  },
  {
    id: '3',
    title: 'NEW',
    subtitle: 'ARRIVALS',
    discount: '30%',
    colors: ['#F59E0B', '#EF4444'],
  },
];

export default function BannerCarousel() {
  const scrollX = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll functionality
  useEffect(() => {
    let currentIndex = 0;
    
    const autoScroll = () => {
      currentIndex = (currentIndex + 1) % banners.length;
      const scrollPosition = currentIndex * SCREEN_WIDTH;
      scrollViewRef.current?.scrollTo({
        x: scrollPosition,
        animated: true,
      });
    };

    intervalRef.current = setInterval(autoScroll, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {banners.map((banner, index) => (
          <View key={banner.id} style={{ width: SCREEN_WIDTH }}>
            <LinearGradient
              colors={banner.colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              {/* Geometric shapes */}
              <View style={styles.circle1} />
              <View style={styles.circle2} />
              <View style={styles.circle3} />
              <View style={styles.triangle1} />
              <View style={styles.triangle2} />
              <View style={styles.star1}>
                <Ionicons name="star" size={20} color="white" />
              </View>
              <View style={styles.star2}>
                <Ionicons name="star" size={12} color="white" />
              </View>

              {/* Content */}
              <View style={styles.content}>
                <Text style={styles.title}>{banner.title}</Text>
                <Text style={styles.subtitle}>{banner.subtitle}</Text>
              </View>

              {/* Discount badge */}
              <View style={styles.discountBadge}>
                <Text style={styles.discountPercent}>{banner.discount}</Text>
                <Text style={styles.discountOff}>OFF</Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {/* Pagination indicators */}
      <View style={styles.pagination}>
        {banners.map((_, index) => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 16, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  banner: {
    width: SCREEN_WIDTH - 40,
    height: 180,
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
    marginHorizontal: 20,
  },
  circle1: {
    position: 'absolute',
    top: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  circle2: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  circle3: {
    position: 'absolute',
    bottom: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  triangle1: {
    position: 'absolute',
    top: 20,
    right: 50,
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  triangle2: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderTopWidth: 25,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  star1: {
    position: 'absolute',
    top: 60,
    left: 40,
  },
  star2: {
    position: 'absolute',
    bottom: 50,
    right: 80,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 2,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 2,
    fontWeight: '600',
  },
  discountBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  discountPercent: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EC4899',
  },
  discountOff: {
    fontSize: 10,
    fontWeight: '600',
    color: '#EC4899',
    letterSpacing: 0.5,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#6366F1',
  },
});

