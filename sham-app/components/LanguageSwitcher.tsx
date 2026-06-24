/**
 * Language Switcher Component
 * Allows users to switch between Arabic and English
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLanguageContext } from '@/contexts/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
}

export default function LanguageSwitcher({ variant = 'default' }: LanguageSwitcherProps) {
  const { language, changeLanguage, loading } = useLanguageContext();

  const handleLanguageChange = async (newLang: 'ar' | 'en') => {
    if (language !== newLang && !loading) {
      await changeLanguage(newLang);
    }
  };

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity
          style={[
            styles.compactButton,
            language === 'en' && styles.compactButtonActive,
          ]}
          onPress={() => handleLanguageChange('en')}
          disabled={loading}
        >
          <Text
            style={[
              styles.compactButtonText,
              language === 'en' && styles.compactButtonTextActive,
            ]}
          >
            EN
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.compactButton,
            language === 'ar' && styles.compactButtonActive,
          ]}
          onPress={() => handleLanguageChange('ar')}
          disabled={loading}
        >
          <Text
            style={[
              styles.compactButtonText,
              language === 'ar' && styles.compactButtonTextActive,
            ]}
          >
            ع
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {language === 'ar' ? 'اللغة' : 'Language'}
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.languageButton,
            language === 'en' && styles.languageButtonActive,
          ]}
          onPress={() => handleLanguageChange('en')}
          disabled={loading}
        >
          <Text
            style={[
              styles.languageButtonText,
              language === 'en' && styles.languageButtonTextActive,
            ]}
          >
            English
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.languageButton,
            language === 'ar' && styles.languageButtonActive,
          ]}
          onPress={() => handleLanguageChange('ar')}
          disabled={loading}
        >
          <Text
            style={[
              styles.languageButtonText,
              language === 'ar' && styles.languageButtonTextActive,
            ]}
          >
            العربية
          </Text>
        </TouchableOpacity>
      </View>
      {loading && (
        <Text style={styles.loadingText}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  languageButtonTextActive: {
    color: '#6366F1',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  // Compact variant styles
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  compactButtonActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#6366F1',
  },
  compactButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  compactButtonTextActive: {
    color: '#6366F1',
  },
});

