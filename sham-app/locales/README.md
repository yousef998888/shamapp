# Translation System - Sham App

This directory contains per-page translation files for English (En) and Arabic (Ar) languages.

## Structure

Each page has its own translation files split by language:

```
locales/
├── homePageEn.ts          # Home page - English
├── homePageAr.ts          # Home page - Arabic
├── authPagesEn.ts         # Auth pages - English
├── authPagesAr.ts         # Auth pages - Arabic
├── createListingPageEn.ts # Create listing - English
├── createListingPageAr.ts # Create listing - Arabic
├── productDetailPageEn.ts # Product detail - English
├── productDetailPageAr.ts # Product detail - Arabic
├── searchPageEn.ts        # Search page - English
├── searchPageAr.ts        # Search page - Arabic
├── searchResultsPageEn.ts # Search results - English
├── searchResultsPageAr.ts # Search results - Arabic
├── sellingPageEn.ts       # Selling page - English
├── sellingPageAr.ts       # Selling page - Arabic
├── buyingPageEn.ts        # Buying page - English
├── buyingPageAr.ts        # Buying page - Arabic
├── checkoutPageEn.ts      # Checkout - English
├── checkoutPageAr.ts      # Checkout - Arabic
├── accountPageEn.ts       # Account page - English
├── accountPageAr.ts       # Account page - Arabic
├── commonEn.ts            # Common translations - English
├── commonAr.ts            # Common translations - Arabic
└── index.ts               # Export aggregator
```

## Usage

### 1. Using translations in a page component

```typescript
import { usePageTranslation } from '@/hooks/useTranslation';

export default function MyPage() {
  const { t, language, changeLanguage, isRTL } = usePageTranslation('homePage');
  
  return (
    <View>
      <Text>{t.welcomeTitle}</Text>
      <Text>{t.welcomeDescription}</Text>
    </View>
  );
}
```

### 2. Changing language

```typescript
import { usePageTranslation } from '@/hooks/useTranslation';

export default function LanguageSelector() {
  const { language, changeLanguage } = usePageTranslation('common');
  
  return (
    <View>
      <TouchableOpacity onPress={() => changeLanguage('en')}>
        <Text>English</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => changeLanguage('ar')}>
        <Text>العربية</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3. Accessing multiple pages

If you need translations from multiple pages, use the general `useTranslation` hook:

```typescript
import { useTranslation } from '@/hooks/useTranslation';

export default function MyComponent() {
  const { t, language } = useTranslation();
  
  return (
    <View>
      <Text>{t('homePage', 'welcomeTitle')}</Text>
      <Text>{t('authPages', 'signIn')}</Text>
    </View>
  );
}
```

### 4. RTL Support

The hook provides an `isRTL` boolean for RTL layout support:

```typescript
const { isRTL } = usePageTranslation('homePage');

<View style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
  {/* Content */}
</View>
```

## Adding New Translations

1. **Create translation files for a new page:**
   - Create `myNewPageEn.ts` with English translations
   - Create `myNewPageAr.ts` with Arabic translations

2. **Export in index.ts:**
   ```typescript
   export { myNewPageEn } from './myNewPageEn';
   export { myNewPageAr } from './myNewPageAr';
   ```

3. **Add to getTranslations function:**
   ```typescript
   const [{ myNewPageEn }, { myNewPageAr }] = await Promise.all([
     import('./myNewPageEn'),
     import('./myNewPageAr'),
   ]);
   
   return {
     // ... existing pages
     myNewPage: myNewPageEn, // or myNewPageAr
   };
   ```

4. **Use in your component:**
   ```typescript
   const { t } = usePageTranslation('myNewPage');
   ```

## Translation File Format

Each translation file exports a constant object with key-value pairs:

```typescript
// myPageEn.ts
export const myPageEn = {
  welcomeMessage: 'Welcome to our app',
  buttonLabel: 'Click here',
  errorMessage: 'Something went wrong',
};

// myPageAr.ts
export const myPageAr = {
  welcomeMessage: 'مرحبًا بك في تطبيقنا',
  buttonLabel: 'اضغط هنا',
  errorMessage: 'حدث خطأ ما',
};
```

## Best Practices

1. **Use descriptive keys:** `welcomeMessage` instead of `msg1`
2. **Group related translations:** Keep all translations for a page in one file
3. **Provide fallbacks:** Always provide a fallback string when using translations:
   ```typescript
   <Text>{t.welcomeTitle || 'Welcome'}</Text>
   ```
4. **Keep translations consistent:** Use the same keys in both language files
5. **Comment complex translations:** Add comments for context when needed

## Automatic Language Detection 🌍

The app automatically detects the user's system language on first launch!

### How it works:

1. **First Launch:**
   - App detects device system language using `expo-localization`
   - If device language is Arabic → App loads in Arabic
   - If device language is anything else → App loads in English

2. **After Manual Selection:**
   - User manually changes language → Choice is saved
   - Next time app opens → Uses saved preference
   - Device language is ignored after manual selection

3. **Priority Order:**
   - Saved user preference (highest)
   - Device system language
   - Fallback to English (if detection fails)

### Console Logs

You'll see helpful logs during startup:
```
🌍 Device locale info: { languageCode: 'ar', regionCode: 'SA', ... }
📱 Device language detected: ar
💾 Saved language preference: null
✅ Using language: ar
```

### Testing

**iOS Simulator:**
- Settings → Language & Region → Add Arabic → Set as Primary

**Android Emulator:**
- Settings → Languages & input → Add Arabic → Move to top

For more details, see `LOCALE_DETECTION.md`.

## Language Persistence

The selected language is persisted using AsyncStorage with the key `@sham_app_language`. It will be automatically loaded on app restart.

## Example Implementation

See `app/(tabs)/index.tsx` for a complete example of how the Home page uses translations.

