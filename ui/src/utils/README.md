# Multilingual Display Utility

This utility provides functions to display attributes and other multilingual content from your database in the correct language based on the user's current language setting.

## 🚀 Quick Start

```typescript
import { getAttributeName, getProductTitle, formatAttributeValuePair } from './DisplayAtteibuteSupportedLanguage';

// Display attribute name in current language
const attributeName = getAttributeName(attribute); // "Brand" or "العلامة التجارية"

// Display product title in current language  
const productTitle = getProductTitle(product); // "iPhone 15" or "آيفون 15"

// Display attribute-value pair formatted properly
const formatted = formatAttributeValuePair(attribute, term); // "Brand: Samsung" or "العلامة التجارية: سامسونج"
```

## 📋 Available Functions

### Core Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `getLocalizedText(obj, options)` | Generic function for any multilingual field | `getLocalizedText(product, { fieldPrefix: 'title' })` |
| `getAttributeName(attribute)` | Get localized attribute name | `getAttributeName({ name: "Brand", ar_name: "العلامة التجارية" })` |
| `getAttributeTermName(term)` | Get localized term name | `getAttributeTermName({ name: "Samsung", ar_name: "سامسونج" })` |
| `getCategoryName(category)` | Get localized category name | `getCategoryName({ name: "Electronics", ar_name: "إلكترونيات" })` |
| `getProductTitle(product)` | Get localized product title | `getProductTitle({ title: "iPhone", ar_title: "آيفون" })` |
| `getLocalizedDescription(obj)` | Get localized description | `getLocalizedDescription(product)` |

### Utility Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `formatAttributeValuePair(attr, term, separator)` | Format attribute:value pairs | `"Brand: Samsung"` or `"العلامة التجارية: سامسونج"` |
| `getLocalizedNameAndDescription(obj)` | Get both name and description | `{ name: "...", description: "..." }` |
| `isRTL()` | Check if current language is RTL | `true` for Arabic, `false` for English |
| `getCurrentLanguage()` | Get current language code | `"en"` or `"ar"` |

## 🎯 Common Use Cases

### 1. Product Details Page

Replace this:
```typescript
// ❌ Old way (not localized)
<h1>{product.title}</h1>
<p>Category: {product.category.name}</p>
<p>{product.description}</p>
```

With this:
```typescript
// ✅ New way (properly localized)
import { getProductTitle, getCategoryName, getLocalizedDescription } from './DisplayAtteibuteSupportedLanguage';

<h1>{getProductTitle(product)}</h1>
<p>Category: {getCategoryName(product.category)}</p>
<p>{getLocalizedDescription(product)}</p>
```

### 2. Product Attributes Display

Replace this:
```typescript
// ❌ Old way (not localized)
{product.attribute_relationships.map(rel => (
  <div key={rel.id}>
    <span>{rel.attribute?.name}:</span>
    <span>{rel.term?.name}</span>
  </div>
))}
```

With this:
```typescript
// ✅ New way (properly localized)
import { formatAttributeValuePair } from './DisplayAtteibuteSupportedLanguage';

{product.attribute_relationships.map(rel => (
  <div key={rel.id}>
    {formatAttributeValuePair(rel.attribute, rel.term)}
  </div>
))}
```

### 3. Category Lists

Replace this:
```typescript
// ❌ Old way (not localized)
{categories.map(cat => (
  <div key={cat.id}>{cat.name}</div>
))}
```

With this:
```typescript
// ✅ New way (properly localized)
import { getCategoryName } from './DisplayAtteibuteSupportedLanguage';

{categories.map(cat => (
  <div key={cat.id}>{getCategoryName(cat)}</div>
))}
```

### 4. Search Results

Replace this:
```typescript
// ❌ Old way (not localized)
<h3>{product.title}</h3>
```

With this:
```typescript
// ✅ New way (properly localized)
import { getProductTitle } from './DisplayAtteibuteSupportedLanguage';

<h3>{getProductTitle(product)}</h3>
```

## ⚙️ Advanced Options

The main `getLocalizedText` function supports custom options:

```typescript
import { getLocalizedText } from './DisplayAtteibuteSupportedLanguage';

// Custom field prefix
const title = getLocalizedText(product, { fieldPrefix: 'title' });

// Return empty string if translation missing
const strictName = getLocalizedText(attribute, { 
  fieldPrefix: 'name',
  returnEmptyIfMissing: true 
});

// Custom fallback language
const description = getLocalizedText(category, { 
  fieldPrefix: 'description',
  fallbackLanguage: 'ar' 
});
```

## 🔄 Language Switching

The utility automatically detects the current language from your i18n configuration. When users switch languages, all text will update automatically on the next render.

```typescript
import { isRTL, getCurrentLanguage } from './DisplayAtteibuteSupportedLanguage';

// Apply RTL styles conditionally
<div className={`product-card ${isRTL() ? 'rtl' : 'ltr'}`}>
  {getProductTitle(product)}
</div>

// Log current language for debugging
console.log('Current language:', getCurrentLanguage());
```

## 🛡️ Error Handling

The utility functions handle errors gracefully:

- **Null/undefined objects**: Returns empty string
- **Missing translations**: Falls back to available language
- **Empty fields**: Returns empty string or fallback content

```typescript
// These all work safely
getAttributeName(null); // Returns: ""
getCategoryName(undefined); // Returns: ""
getProductTitle({}); // Returns: ""

// Missing Arabic translation falls back to English
const category = { name: "Electronics" }; // no ar_name
getCategoryName(category); // Returns: "Electronics" even in Arabic mode
```

## 📱 React Component Integration

For better performance in React components, consider memoization:

```typescript
import { useMemo } from 'react';
import { getProductTitle, formatAttributeValuePair } from './DisplayAtteibuteSupportedLanguage';

function ProductCard({ product }) {
  const title = useMemo(() => getProductTitle(product), [product]);
  
  const attributePairs = useMemo(() => 
    product.attribute_relationships?.map(rel => 
      formatAttributeValuePair(rel.attribute, rel.term)
    ) || [],
    [product.attribute_relationships]
  );

  return (
    <div>
      <h3>{title}</h3>
      {attributePairs.map((pair, index) => (
        <div key={index}>{pair}</div>
      ))}
    </div>
  );
}
```

## 🔍 Testing

Test your implementation by switching languages:

1. Change language using your language switcher
2. Verify all attributes, titles, and descriptions update correctly
3. Check RTL layout for Arabic content
4. Test with missing translations to ensure fallbacks work

## 📚 Example Files

- See `DisplayAttributeSupportedLanguageExamples.ts` for comprehensive usage examples
- Check updated `ProductPage.tsx` for real implementation 