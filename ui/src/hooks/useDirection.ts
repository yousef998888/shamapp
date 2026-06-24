import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function useDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const currentLanguage = i18n.language;
    const isRTL = currentLanguage === 'ar';
    
    // Set document direction
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
    
    // Add/remove RTL class to body for additional styling control
    if (isRTL) {
      document.body.classList.add('rtl');
      document.body.classList.remove('ltr');
    } else {
      document.body.classList.add('ltr');
      document.body.classList.remove('rtl');
    }
  }, [i18n.language]);

  return {
    isRTL: i18n.language === 'ar',
    direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    language: i18n.language,
  };
} 