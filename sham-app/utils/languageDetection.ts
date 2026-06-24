import { Platform } from 'react-native';

/**
 * Detects the device language/locale
 * @returns The language code (e.g., 'ar', 'en', 'fr')
 */
export const getDeviceLanguage = (): string => {
  try {
    // Use Intl API which is available in React Native
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    
    // Extract language code from locale (e.g., 'ar-SA' -> 'ar', 'en-US' -> 'en')
    const languageCode = locale.split('-')[0].split('_')[0];
    
    console.log('Detected locale:', locale, 'Language code:', languageCode);
    return languageCode.toLowerCase();
  } catch (error) {
    console.warn('Failed to detect device language, defaulting to English:', error);
    return 'en';
  }
};

/**
 * Checks if the device language is Arabic
 * @returns true if the device language is Arabic
 */
export const isArabicLanguage = (): boolean => {
  console.log('getDeviceLanguage()', getDeviceLanguage());
  return getDeviceLanguage() === 'ar';
};

/**
 * Gets the appropriate title based on device language
 * @param englishTitle - The English title
 * @param arabicTitle - The Arabic title (optional)
 * @returns The appropriate title based on device language
 */
export const getLocalizedTitle = (englishTitle: string, arabicTitle?: string): string => {
  if (isArabicLanguage() && arabicTitle) {
    return arabicTitle;
  }
  return englishTitle;
};
