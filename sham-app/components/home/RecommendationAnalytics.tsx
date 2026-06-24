import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useUserBehaviorTracking } from '@/hooks/useRecommendations';
import UserBehaviorService from '@/services/UserBehaviorService';

interface RecommendationAnalyticsProps {
  visible: boolean;
  onClose: () => void;
}

export const RecommendationAnalytics: React.FC<RecommendationAnalyticsProps> = ({
  visible,
  onClose,
}) => {
  const { getSessionAnalytics } = useUserBehaviorTracking();
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      const sessionAnalytics = getSessionAnalytics();
      setAnalytics(sessionAnalytics);
    }
  }, [visible, getSessionAnalytics]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Recommendation Analytics</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {analytics && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Session Overview</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Total Interactions:</Text>
                  <Text style={styles.statValue}>{analytics.totalInteractions}</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Session Duration:</Text>
                  <Text style={styles.statValue}>{analytics.sessionDuration}s</Text>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interaction Types</Text>
                {Object.entries(analytics.interactionTypes).map(([type, count]) => (
                  <View key={type} style={styles.statRow}>
                    <Text style={styles.statLabel}>{type}:</Text>
                    <Text style={styles.statValue}>{count as number}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommendation Performance</Text>
                <Text style={styles.infoText}>
                  This section would show recommendation click-through rates, 
                  conversion rates, and other performance metrics once you have 
                  more data collected.
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});

export default RecommendationAnalytics;
