import React from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/PageHeader';

const SUPPORT_PHONE = '+18001234567';
const SUPPORT_EMAIL = 'support@sham.com';

export default function HelpCenterScreen() {
  const router = useRouter();
  const { t } = usePageTranslation('helpCenterPage');

  const cardItems = [
    {
      id: 'faq',
      title: t.faqTitle || 'FAQ Questions',
      description: t.faqDescription || "Have any questions? Let's have a look at our FAQ",
      icon: 'help-circle-outline',
      iconColor: '#61d5b6',
    },
    {
      id: 'chat',
      title: t.chatTitle || 'Chat Live Support',
      description: t.chatDescription || 'Call our friendly support team for instant answers',
      icon: 'phone-outline',
      iconColor: '#61d5b6',
    },
    {
      id: 'feedback',
      title: t.feedbackTitle || 'Leave feedback',
      description: t.feedbackDescription || 'Tell us what features you would like to see improved',
      icon: 'star-outline',
      iconColor: '#61d5b6',
    },
  ];

  const handleCardPress = (cardId: string) => {
    switch (cardId) {
      case 'faq':
        router.push('/help-center/faq');
        break;
      case 'chat':
        Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
          Alert.alert(t.unableToOpenPhone || 'Unable to open phone', t.tryAgainLater || 'Please try again later.');
        });
        break;
      case 'feedback':
        Linking.openURL(
          `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Sham App Feedback')}`,
        ).catch(() => {
          Alert.alert(t.unableToOpenEmail || 'Unable to open email', t.tryAgainLater || 'Please try again later.');
        });
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t.title || 'Help Center'} />
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.subtitle}>
            {t.subtitle || 'Users with notifications enabled are 2x more likely to stick to their budgets.'}
          </Text>
        </View>

        <View style={styles.cardContainer}>
          {cardItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => handleCardPress(item.id)}
              activeOpacity={0.9}
            >
              <View style={[styles.iconWrapper, { backgroundColor: `${item.iconColor}10` }]}>
                <MaterialCommunityIcons name={item.icon as any} size={28} color={item.iconColor} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDescription}>{item.description}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    gap: 12,
    marginBottom: 24,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4B5563',
  },
  cardContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 2,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});
