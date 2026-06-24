import React, { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { getTranslations, Language } from '@/locales';
import { I18n } from 'i18n-js';
import * as Updates from 'expo-updates';
import { I18nManager, Platform } from 'react-native';

const LANGUAGE_KEY = '@sham_app_language';

interface LanguageContextType {
  language: Language;
  translations: any;
  i18n: I18n;
  changeLanguage: (newLanguage: Language) => Promise<void>;
  loading: boolean;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * Function to get device language using expo-localization
 * Detects the user's system language and returns 'ar' for Arabic or 'en' for others
 * @returns Language - 'ar' or 'en'
 */
const getDeviceLanguage = (): Language => {
  try {
    // Get device locales (returns array of locale strings)
    const deviceLocales = Localization.getLocales();
    
    if (deviceLocales && deviceLocales.length > 0) {
      // Get the primary locale's language code
      const primaryLocale = deviceLocales[0];
      const languageCode = primaryLocale.languageCode?.toLowerCase();
      
      console.log('🌍 Device locale info:', {
        languageCode: primaryLocale.languageCode,
        regionCode: primaryLocale.regionCode,
        languageTag: primaryLocale.languageTag,
        textDirection: primaryLocale.textDirection,
      });
      
      // Return 'ar' if Arabic, otherwise default to 'en'
      return languageCode === 'ar' ? 'ar' : 'en';
    }
  } catch (error) {
    console.error('Error detecting device language:', error);
  }
  
  // Fallback to English if detection fails
  console.log('⚠️ Using fallback language: en');
  return 'en';
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => getDeviceLanguage());
  const [translations, setTranslations] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize i18n with empty translations to prevent null errors
  // Using useRef since i18n is mutable and shouldn't trigger re-renders
  const i18nRef = useRef<I18n>(
    new I18n({
      en: {},
      ar: {},
    })
  );
  
  // Initialize the i18n instance
  if (!i18nRef.current) {
    i18nRef.current = new I18n({ en: {}, ar: {} });
    i18nRef.current.locale = 'en';
    i18nRef.current.enableFallback = true;
  }
  
  const i18n = i18nRef.current;

  // Set RTL direction based on language
  const setRTL = (isRTL: boolean, reloadOnChange = false) => {
    const wasRTL = I18nManager.isRTL;
    I18nManager.forceRTL(isRTL);
    I18nManager.allowRTL(isRTL);
    
    // Only reload if RTL state changed and reload is requested
    // For initial load, we reload to set RTL properly
    // For language changes after mount, we avoid reload to prevent flicker
    if (wasRTL !== isRTL && reloadOnChange) {
      console.log(`🔄 RTL state changed: ${isRTL}, reloading...`);
      
      // Skip reload to avoid crashes - RTL changes will be applied on next app restart
      // In development, RTL changes are applied without reload
      // In production, users may need to restart the app for full RTL support
      console.log('⚠️ RTL change detected. App may need restart for full RTL support.');
    } else if (wasRTL !== isRTL) {
      console.log(`🔄 RTL state changed: ${isRTL}`);
    }
  };

  // Load translations on mount
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        // Load saved language preference (overrides system language)
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        
        // Priority: saved preference > device language > fallback to English
        const lang = (savedLang as Language) || getDeviceLanguage();
        
        console.log('📱 Device language detected:', getDeviceLanguage());
        console.log('💾 Saved language preference:', savedLang);
        console.log('✅ Using language:', lang);
        console.log('🌐 Initial RTL state will be:', lang === 'ar');
        
        // Load translations for both languages
        const [englishTrans, arabicTrans] = await Promise.all([
          getTranslations('en'),
          getTranslations('ar'),
        ]);
        
        // Update i18n instance with both languages
        i18n.translations = {
          en: {
            homePage: englishTrans.homePage || {},
            authPages: englishTrans.authPages || {},
            createListingPage: englishTrans.createListingPage || {},
            productDetailPage: englishTrans.productDetailPage || {},
            searchPage: englishTrans.searchPage || {},
            searchResultsPage: englishTrans.searchResultsPage || {},
            sellingPage: englishTrans.sellingPage || {},
            buyingPage: englishTrans.buyingPage || {},
            checkoutPage: englishTrans.checkoutPage || {},
            accountPage: englishTrans.accountPage || {},
            common: englishTrans.common || {},
            inboxPage: englishTrans.inboxPage || {},
            chatPage: englishTrans.chatPage || {},
            categoryPage: englishTrans.categoryPage || {},
            sellerProfilePage: englishTrans.sellerProfilePage || {},
            listingSuccessPage: englishTrans.listingSuccessPage || {},
            explorePage: englishTrans.explorePage || {},
          },
          ar: {
            homePage: arabicTrans.homePage || {},
            authPages: arabicTrans.authPages || {},
            createListingPage: arabicTrans.createListingPage || {},
            productDetailPage: arabicTrans.productDetailPage || {},
            searchPage: arabicTrans.searchPage || {},
            searchResultsPage: arabicTrans.searchResultsPage || {},
            sellingPage: arabicTrans.sellingPage || {},
            buyingPage: arabicTrans.buyingPage || {},
            checkoutPage: arabicTrans.checkoutPage || {},
            accountPage: arabicTrans.accountPage || {},
            common: arabicTrans.common || {},
            inboxPage: arabicTrans.inboxPage || {},
            chatPage: arabicTrans.chatPage || {},
            categoryPage: arabicTrans.categoryPage || {},
            sellerProfilePage: arabicTrans.sellerProfilePage || {},
            listingSuccessPage: arabicTrans.listingSuccessPage || {},
            explorePage: arabicTrans.explorePage || {},
          },
        };
        
        i18n.locale = lang;
        i18n.enableFallback = true;
        
        setLanguage(lang);
        setTranslations(lang === 'ar' ? arabicTrans : englishTrans);
        
        // Set initial RTL state - reload on initial load to set RTL properly
        setRTL(lang === 'ar', true);
      } catch (error) {
        console.error('Error loading translations:', error);
        // Fallback to printing device language or English
        const fallbackLang = getDeviceLanguage();
        const [englishTrans, arabicTrans] = await Promise.all([
          getTranslations('en'),
          getTranslations('ar'),
        ]);
        
        i18n.translations = {
          en: {
            homePage: englishTrans.homePage || {},
            authPages: englishTrans.authPages || {},
            createListingPage: englishTrans.createListingPage || {},
            productDetailPage: englishTrans.productDetailPage || {},
            searchPage: englishTrans.searchPage || {},
            searchResultsPage: englishTrans.searchResultsPage || {},
            sellingPage: englishTrans.sellingPage || {},
            buyingPage: englishTrans.buyingPage || {},
            checkoutPage: englishTrans.checkoutPage || {},
            accountPage: englishTrans.accountPage || {},
            common: englishTrans.common || {},
            inboxPage: englishTrans.inboxPage || {},
            chatPage: englishTrans.chatPage || {},
            categoryPage: englishTrans.categoryPage || {},
            sellerProfilePage: englishTrans.sellerProfilePage || {},
            listingSuccessPage: englishTrans.listingSuccessPage || {},
            explorePage: englishTrans.explorePage || {},
          },
          ar: {
            homePage: arabicTrans.homePage || {},
            authPages: arabicTrans.authPages || {},
            createListingPage: arabicTrans.createListingPage || {},
            productDetailPage: arabicTrans.productDetailPage || {},
            searchPage: arabicTrans.searchPage || {},
            searchResultsPage: arabicTrans.searchResultsPage || {},
            sellingPage: arabicTrans.sellingPage || {},
            buyingPage: arabicTrans.buyingPage || {},
            checkoutPage: arabicTrans.checkoutPage || {},
            accountPage: arabicTrans.accountPage || {},
            common: arabicTrans.common || {},
            inboxPage: arabicTrans.inboxPage || {},
            chatPage: arabicTrans.chatPage || {},
            categoryPage: arabicTrans.categoryPage || {},
            sellerProfilePage: arabicTrans.sellerProfilePage || {},
            listingSuccessPage: arabicTrans.listingSuccessPage || {},
            explorePage: arabicTrans.explorePage || {},
          },
        };
        i18n.locale = fallbackLang;
        i18n.enableFallback = true;
        
        setLanguage(fallbackLang);
        setTranslations(fallbackLang === 'ar' ? arabicTrans : englishTrans);
        setRTL(fallbackLang === 'ar', true);
      } finally {
        setLoading(false);
      }
    };

    loadTranslations();
  }, []);

  // Change language function
  const changeLanguage = async (newLanguage: Language) => {
    try {
      console.log(`🔄 Changing language from ${language} to ${newLanguage}`);
      setLoading(true);
      await AsyncStorage.setItem(LANGUAGE_KEY, newLanguage);
      console.log('💾 Saved language to AsyncStorage:', newLanguage);
      
      const trans = await getTranslations(newLanguage);
      
      // Update i18n instance
      // Update translations for the new language
      const currentTrans = i18n.translations[language === 'ar' ? 'ar' : 'en'];
      const newTranslations = {
        ...i18n.translations,
        [newLanguage]: {
          homePage: trans.homePage || currentTrans?.homePage || {},
          authPages: trans.authPages || currentTrans?.authPages || {},
          createListingPage: trans.createListingPage || currentTrans?.createListingPage || {},
          productDetailPage: trans.productDetailPage || currentTrans?.productDetailPage || {},
          searchPage: trans.searchPage || currentTrans?.searchPage || {},
          searchResultsPage: trans.searchResultsPage || currentTrans?.searchResultsPage || {},
          sellingPage: trans.sellingPage || currentTrans?.sellingPage || {},
          buyingPage: trans.buyingPage || currentTrans?.buyingPage || {},
          checkoutPage: trans.checkoutPage || currentTrans?.checkoutPage || {},
          accountPage: trans.accountPage || currentTrans?.accountPage || {},
          common: trans.common || currentTrans?.common || {},
          inboxPage: trans.inboxPage || currentTrans?.inboxPage || {},
          chatPage: trans.chatPage || currentTrans?.chatPage || {},
          categoryPage: trans.categoryPage || currentTrans?.categoryPage || {},
          sellerProfilePage: trans.sellerProfilePage || currentTrans?.sellerProfilePage || {},
          listingSuccessPage: trans.listingSuccessPage || currentTrans?.listingSuccessPage || {},
          explorePage: trans.explorePage || currentTrans?.explorePage || {},
        },
      };
      
      i18n.translations = newTranslations;
      i18n.locale = newLanguage;
      
      setLanguage(newLanguage);
      setTranslations(trans);
      
      // Update RTL state - don't reload to prevent flicker
      // The app will handle RTL layout changes via React re-render
      setRTL(newLanguage === 'ar', false);
      
      console.log(`✅ Language changed to ${newLanguage}, RTL: ${newLanguage === 'ar'}`);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        translations,
        i18n,
        changeLanguage,
        loading,
        isRTL: language === 'ar',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  return context;
}

