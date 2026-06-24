import React, { useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePageTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/PageHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

const SUPPORT_PHONE = '+18001234567';
const SUPPORT_EMAIL = 'support@sham.com';

type FaqItem = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
};

export default function HelpCenterFaqScreen() {
  const router = useRouter();
  const { t } = usePageTranslation('helpCenterPage');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const FAQ_ITEMS: FaqItem[] = [
    {
      id: 'shopping',
      question: t.faqShoppingQuestion || 'How can I shop with Sham?',
      answer: t.faqShoppingAnswer || 'Use the Personalized AI feature for tailored suggestions or browse categories. Add items to your cart and follow checkout to confirm.',
      tags: [t.tagShopping || 'Shopping', t.tagApp || 'App'],
    },
    {
      id: 'safety',
      question: t.faqSafetyQuestion || 'Is the transaction safe?',
      answer: t.faqSafetyAnswer || 'All payments are processed via our secure provider. We never store your card details and transactions are protected with 2FA.',
      tags: [t.tagSecurity || 'Security', t.tagApp || 'App'],
    },
    {
      id: 'store',
      question: t.faqStoreQuestion || 'How do I open a store?',
      answer: t.faqStoreAnswer || 'Head to the Selling tab in your account, tap "Create store", and follow the prompts to set up shipping, payment, and listings.',
      tags: [t.tagSelling || 'Selling', t.tagSetup || 'Setup'],
    },
    {
      id: 'wishlist',
      question: t.faqWishlistQuestion || 'How do I add to wishlist?',
      answer: t.faqWishlistAnswer || 'Tap the heart icon on any product to save it. Access your wishlist from the Account tab under Watchlist.',
      tags: [t.tagShopping || 'Shopping', t.tagApp || 'App'],
    },
    {
      id: 'report',
      question: t.faqReportQuestion || 'How do I report a product?',
      answer: t.faqReportAnswer || 'Open the product page, tap the three dots menu, and choose "Report". Provide details so our team can review quickly.',
      tags: [t.tagSafety || 'Safety', t.tagSupport || 'Support'],
    },
  ];

  const TAGS = [
    t.tagShopping || 'Shopping',
    t.tagApp || 'App',
    t.tagLag || 'Lag',
    t.tagBug || 'Bug',
    t.tagFee || 'Fee',
    t.tagSelling || 'Selling',
    t.tagSecurity || 'Security',
  ];

  const [expandedId, setExpandedId] = useState<string | null>(FAQ_ITEMS[0]?.id || null);

  const filteredFaqs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return FAQ_ITEMS.filter(item => {
      const matchesSearch =
        term.length === 0 ||
        item.question.toLowerCase().includes(term) ||
        item.answer.toLowerCase().includes(term);
      const matchesTag = !activeTag || item.tags.includes(activeTag);
      return matchesSearch && matchesTag;
    });
  }, [searchTerm, activeTag, FAQ_ITEMS]);

  const toggleExpanded = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const handleSupport = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {
      Alert.alert(t.unableToOpenPhone || 'Unable to open phone', t.tryAgainLater || 'Please try again later.');
    });
  };

  const handleEmail = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(t.needAdditionalHelp || 'Need additional help')}`,
    ).catch(() => {
      Alert.alert(t.unableToOpenEmail || 'Unable to open email', t.tryAgainLater || 'Please try again later.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <PageHeader title={t.faqPageTitle || 'FAQ'} />
      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons name="magnify" size={20} color="#9CA3AF" />
          <TextInput
            placeholder={t.searchPlaceholder || 'Search for a question...'}
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {TAGS.map(tag => {
            const isActive = activeTag === tag;
            return (
              <TouchableOpacity
                key={tag}
                onPress={() => setActiveTag(isActive ? null : tag)}
                style={[styles.tag, isActive && styles.tagActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.tagLabel, isActive && styles.tagLabelActive]}>{tag}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.faqList}>
          {filteredFaqs.map(item => {
            const isExpanded = expandedId === item.id;
            return (
              <View key={item.id} style={styles.faqItem}>
                <TouchableOpacity
                  onPress={() => toggleExpanded(item.id)}
                  style={styles.faqHeader}
                  activeOpacity={0.9}
                >
                  <View style={styles.faqTitleWrapper}>
                    <MaterialCommunityIcons name="help-circle-outline" size={22} color="#61d5b6" />
                    <Text style={styles.faqTitle}>{item.question}</Text>
                  </View>
                  <MaterialCommunityIcons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color="#61d5b6"
                  />
                </TouchableOpacity>
                {isExpanded && (
                  <Text style={styles.faqAnswer}>
                    {item.answer}
                  </Text>
                )}
              </View>
            );
          })}

          {filteredFaqs.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="file-search-outline" size={32} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>{t.noResults || 'No results'}</Text>
              <Text style={styles.emptyDescription}>
                {t.noResultsDescription || 'Try a different keyword or pick another topic to find the right answer.'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.supportButton} onPress={handleSupport} activeOpacity={0.9}>
          <MaterialCommunityIcons name="phone-outline" size={20} color="#FFFFFF" />
          <Text style={styles.supportButtonLabel}>{t.stillNeedHelp || 'Still need help?'}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleEmail} activeOpacity={0.8}>
          <Text style={styles.contactText}>
            {t.contactUs || 'Or contact us at'} <Text style={styles.contactLink}>{SUPPORT_EMAIL}</Text>
          </Text>
        </TouchableOpacity>
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
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#1F2937',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  tagsContainer: {
    marginVertical: 20,
    gap: 12,
  },
  tag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  tagActive: {
    backgroundColor: '#E6FCF5',
    borderWidth: 1,
    borderColor: '#61d5b6',
  },
  tagLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  tagLabelActive: {
    color: '#047857',
  },
  faqList: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#111827',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 14,
    elevation: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  faqTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 10,
  },
  faqAnswer: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  supportButton: {
    marginTop: 32,
    marginBottom: 12,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#61d5b6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  supportButtonLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#4B5563',
    marginBottom: 32,
  },
  contactLink: {
    color: '#61d5b6',
    fontWeight: '600',
  },
});
