import React, { forwardRef } from 'react';
import type { StyleProp, TextInputProps, ViewStyle } from 'react-native';
import { StyleSheet, TextInput, TouchableOpacity, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type SearchBarProps = {
  value: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  autoFocus?: boolean;
  onPress?: () => void;
  onFilterPress?: () => void;
  showFilterButton?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  sharedTransitionTag?: string;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholder' | 'editable'>;

export const SearchBar = forwardRef<TextInput, SearchBarProps>(
  (
    {
      value,
      onChangeText,
      placeholder = 'Search for anything...',
      editable = true,
      autoFocus = false,
      onPress,
      onFilterPress,
      showFilterButton = true,
      containerStyle,
      sharedTransitionTag,
      ...inputProps
    },
    ref,
  ) => {
    const renderFilterButton = showFilterButton ? (
      <TouchableOpacity
        onPress={onFilterPress}
        activeOpacity={0.8}
        style={styles.filterButton}
      >
        <MaterialCommunityIcons name="tune-variant" size={20} color="#4C5567" />
      </TouchableOpacity>
    ) : null;

    const pressOverlay = onPress && !editable ? (
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { right: showFilterButton ? 52 : 0, borderRadius: 24 },
        ]}
        onPress={onPress}
      />
    ) : null;

    return (
      <Animated.View
        sharedTransitionTag="tag"
        style={[styles.container, containerStyle]}

      >
        <MaterialCommunityIcons name="magnify" size={20} color="#4C5567" />
        <TextInput
          ref={ref}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#6B7280"
          returnKeyType="search"
          editable={editable}
          autoFocus={autoFocus}
          {...inputProps}
        />
        {pressOverlay}
      </Animated.View>
    );
  },
);

SearchBar.displayName = 'SearchBar';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  input: {
    flex: 1,
    marginHorizontal: 12,
    fontSize: 15,
    color: '#111827',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
