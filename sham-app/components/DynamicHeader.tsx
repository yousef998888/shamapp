import * as React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SearchBar } from '@/components/search/SearchBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DynamicHeader({ 
    handleSearchPress, 
    scrollY 
}: { 
    handleSearchPress: () => void;
    scrollY: Animated.Value;
}) {
    const insets = useSafeAreaInsets();

    // Animate blur intensity based on scroll
    const blurIntensity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 80],
        extrapolate: 'clamp'
    });

    // Animate background opacity based on scroll
    const backgroundOpacity = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp'
    });

    return (
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <Animated.View style={[styles.blurContainer, { opacity: backgroundOpacity }]}>
                {/* <BlurView intensity={10} tint='light' style={StyleSheet.absoluteFill} /> */}
            </Animated.View>
            <SearchBar
                value=""
                editable={false}
                onPress={handleSearchPress}
                sharedTransitionTag="globalSearchBar"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    blurContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // borderBottomWidth: 0.5,
        // borderBottomColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: "#61d5b6"
    },
    fadeGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
