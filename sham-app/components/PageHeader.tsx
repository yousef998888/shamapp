import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useLanguageContext } from '@/contexts/LanguageContext';

export interface PageHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightElement?: React.ReactNode;
  backgroundColor?: string;
  titleStyle?: TextStyle;
  containerStyle?: ViewStyle;
  paddingTop?: number;
}

export default function PageHeader({
  title,
  showBackButton = true,
  onBackPress,
  rightElement,
  backgroundColor = 'transparent',
  titleStyle,
  containerStyle,
  paddingTop = 12,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };
  const { isRTL} = useLanguageContext();
  return (
    <View style={[styles.header, { paddingTop, backgroundColor }, containerStyle]}>
      {showBackButton ? (
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>

          {isRTL ? <MaterialCommunityIcons name="arrow-right" size={24} color="#0F172A" /> : <MaterialCommunityIcons name="arrow-left" size={24} color="#0F172A" />}
        </TouchableOpacity>
      ) : (
        <View style={styles.headerButton} />
      )}

      {title ? (
        <Text style={[styles.headerTitle, titleStyle]}>{title}</Text>
      ) : (
        <View style={styles.headerTitle} />
      )}

      {rightElement ? (
        rightElement
      ) : (
        <View style={styles.headerPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 40,
  },
});

