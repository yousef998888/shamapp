/**
 * RTL Debugger Component
 * Shows current RTL status and language info
 * Use this during development to verify RTL is working
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, I18nManager } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';

interface RTLDebuggerProps {
  position?: 'top' | 'bottom';
}

export default function RTLDebugger({ position = 'bottom' }: RTLDebuggerProps) {
  const { language, isRTL, changeLanguage, loading } = useTranslation();
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!__DEV__) {
    // Only show in development mode
    return null;
  }

  const i18nRTL = I18nManager.isRTL;
  const isMatching = isRTL === i18nRTL;

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={styles.headerText}>
          🔄 RTL Debug {isMatching ? '✅' : '⚠️'}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={styles.label}>Language:</Text>
            <Text style={styles.value}>{language.toUpperCase()}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Hook RTL:</Text>
            <Text style={[styles.value, isRTL ? styles.success : styles.info]}>
              {isRTL ? 'TRUE ✅' : 'FALSE'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>I18nManager RTL:</Text>
            <Text style={[styles.value, i18nRTL ? styles.success : styles.info]}>
              {i18nRTL ? 'TRUE ✅' : 'FALSE'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, isMatching ? styles.success : styles.error]}>
              {isMatching ? 'MATCHING ✅' : 'MISMATCH ⚠️'}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loading:</Text>
            <Text style={styles.value}>{loading ? 'YES' : 'NO'}</Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, language === 'en' && styles.buttonActive]}
              onPress={() => changeLanguage('en')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>EN</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, language === 'ar' && styles.buttonActive]}
              onPress={() => changeLanguage('ar')}
              disabled={loading}
            >
              <Text style={styles.buttonText}>AR</Text>
            </TouchableOpacity>
          </View>

          {!isMatching && (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                ⚠️ RTL mismatch detected! Restart the app to apply changes.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderWidth: 2,
    borderColor: '#6366F1',
    zIndex: 9999,
  },
  top: {
    top: 0,
    borderTopWidth: 0,
  },
  bottom: {
    bottom: 0,
    borderBottomWidth: 0,
  },
  header: {
    padding: 12,
    backgroundColor: '#6366F1',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  success: {
    color: '#10B981',
  },
  error: {
    color: '#EF4444',
  },
  info: {
    color: '#3B82F6',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#374151',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonActive: {
    backgroundColor: '#6366F1',
    borderColor: '#818CF8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warning: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    color: '#92400E',
    fontSize: 11,
    textAlign: 'center',
  },
});

