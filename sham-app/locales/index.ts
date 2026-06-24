// Export all translation files
export { homePageEn } from './EN/homePageEn';
export { homePageAr } from './AR/homePageAr';
export { authPagesEn } from './EN/authPagesEn';
export { authPagesAr } from './AR/authPagesAr';
export { createListingPageEn } from './EN/createListingPageEn';
export { createListingPageAr } from './AR/createListingPageAr';
export { productDetailPageEn } from './EN/productDetailPageEn';
export { productDetailPageAr } from './AR/productDetailPageAr';
export { searchPageEn } from './EN/searchPageEn';
export { searchPageAr } from './AR/searchPageAr';
export { searchResultsPageEn } from './EN/searchResultsPageEn';
export { searchResultsPageAr } from './AR/searchResultsPageAr';
export { sellingPageEn } from './EN/sellingPageEn';
export { sellingPageAr } from './AR/sellingPageAr';
export { buyingPageEn } from './EN/buyingPageEn';
export { buyingPageAr } from './AR/buyingPageAr';
export { checkoutPageEn } from './EN/checkoutPageEn';
export { checkoutPageAr } from './AR/checkoutPageAr';
export { accountPageEn } from './EN/accountPageEn';
export { accountPageAr } from './AR/accountPageAr';
export { commonEn } from './EN/commonEn';
export { commonAr } from './AR/commonAr';
export { inboxPageEn } from './EN/inboxPageEn';
export { inboxPageAr } from './AR/inboxPageAr';
export { chatPageEn } from './EN/chatPageEn';
export { chatPageAr } from './AR/chatPageAr';
export { categoryPageEn } from './EN/categoryPageEn';
export { categoryPageAr } from './AR/categoryPageAr';
export { sellerProfilePageEn } from './EN/sellerProfilePageEn';
export { sellerProfilePageAr } from './AR/sellerProfilePageAr';
export { listingSuccessPageEn } from './EN/listingSuccessPageEn';
export { listingSuccessPageAr } from './AR/listingSuccessPageAr';
export { explorePageEn } from './EN/explorePageEn';
export { explorePageAr } from './AR/explorePageAr';
export { helpCenterPageEn } from './EN/helpCenterPageEn';
export { helpCenterPageAr } from './AR/helpCenterPageAr';
export { locationPickerPageEn } from './EN/locationPickerPageEn';
export { locationPickerPageAr } from './AR/locationPickerPageAr';
export { favoritesPageEn } from './EN/favoritesPageEn';
export { favoritesPageAr } from './AR/favoritesPageAr';

// Translation types
export type Language = 'en' | 'ar';

// Aggregated translations by language
export const translations = {
  en: {
    homePage: {} as typeof import('./EN/homePageEn').homePageEn,
    authPages: {} as typeof import('./EN/authPagesEn').authPagesEn,
    createListingPage: {} as typeof import('./EN/createListingPageEn').createListingPageEn,
    productDetailPage: {} as typeof import('./EN/productDetailPageEn').productDetailPageEn,
    searchPage: {} as typeof import('./EN/searchPageEn').searchPageEn,
    searchResultsPage: {} as typeof import('./EN/searchResultsPageEn').searchResultsPageEn,
    sellingPage: {} as typeof import('./EN/sellingPageEn').sellingPageEn,
    buyingPage: {} as typeof import('./EN/buyingPageEn').buyingPageEn,
    checkoutPage: {} as typeof import('./EN/checkoutPageEn').checkoutPageEn,
    accountPage: {} as typeof import('./EN/accountPageEn').accountPageEn,
    common: {} as typeof import('./EN/commonEn').commonEn,
    inboxPage: {} as typeof import('./EN/inboxPageEn').inboxPageEn,
    chatPage: {} as typeof import('./EN/chatPageEn').chatPageEn,
    categoryPage: {} as typeof import('./EN/categoryPageEn').categoryPageEn,
    sellerProfilePage: {} as typeof import('./EN/sellerProfilePageEn').sellerProfilePageEn,
    listingSuccessPage: {} as typeof import('./EN/listingSuccessPageEn').listingSuccessPageEn,
    explorePage: {} as typeof import('./EN/explorePageEn').explorePageEn,
    helpCenterPage: {} as typeof import('./EN/helpCenterPageEn').helpCenterPageEn,
    locationPickerPage: {} as typeof import('./EN/locationPickerPageEn').locationPickerPageEn,
    favoritesPage: {} as typeof import('./EN/favoritesPageEn').favoritesPageEn,
  },
  ar: {
    homePage: {} as typeof import('./AR/homePageAr').homePageAr,
    authPages: {} as typeof import('./AR/authPagesAr').authPagesAr,
    createListingPage: {} as typeof import('./AR/createListingPageAr').createListingPageAr,
    productDetailPage: {} as typeof import('./AR/productDetailPageAr').productDetailPageAr,
    searchPage: {} as typeof import('./AR/searchPageAr').searchPageAr,
    searchResultsPage: {} as typeof import('./AR/searchResultsPageAr').searchResultsPageAr,
    sellingPage: {} as typeof import('./AR/sellingPageAr').sellingPageAr,
    buyingPage: {} as typeof import('./AR/buyingPageAr').buyingPageAr,
    checkoutPage: {} as typeof import('./AR/checkoutPageAr').checkoutPageAr,
    accountPage: {} as typeof import('./AR/accountPageAr').accountPageAr,
    common: {} as typeof import('./AR/commonAr').commonAr,
    inboxPage: {} as typeof import('./AR/inboxPageAr').inboxPageAr,
    chatPage: {} as typeof import('./AR/chatPageAr').chatPageAr,
    categoryPage: {} as typeof import('./AR/categoryPageAr').categoryPageAr,
    sellerProfilePage: {} as typeof import('./AR/sellerProfilePageAr').sellerProfilePageAr,
    listingSuccessPage: {} as typeof import('./AR/listingSuccessPageAr').listingSuccessPageAr,
    explorePage: {} as typeof import('./AR/explorePageAr').explorePageAr,
    helpCenterPage: {} as typeof import('./AR/helpCenterPageAr').helpCenterPageAr,
    locationPickerPage: {} as typeof import('./AR/locationPickerPageAr').locationPickerPageAr,
    favoritesPage: {} as typeof import('./AR/favoritesPageAr').favoritesPageAr,
  },
};

// Helper to get translations dynamically (will be loaded lazily)
export const getTranslations = async (lang: Language) => {
  if (lang === 'ar') {
    const [
      { homePageAr },
      { authPagesAr },
      { createListingPageAr },
      { productDetailPageAr },
      { searchPageAr },
      { searchResultsPageAr },
      { sellingPageAr },
      { buyingPageAr },
      { checkoutPageAr },
      { accountPageAr },
      { commonAr },
      { inboxPageAr },
      { chatPageAr },
      { categoryPageAr },
      { sellerProfilePageAr },
      { listingSuccessPageAr },
      { explorePageAr },
      { helpCenterPageAr },
      { locationPickerPageAr },
      { favoritesPageAr },
    ] = await Promise.all([
      import('./AR/homePageAr'),
      import('./AR/authPagesAr'),
      import('./AR/createListingPageAr'),
      import('./AR/productDetailPageAr'),
      import('./AR/searchPageAr'),
      import('./AR/searchResultsPageAr'),
      import('./AR/sellingPageAr'),
      import('./AR/buyingPageAr'),
      import('./AR/checkoutPageAr'),
      import('./AR/accountPageAr'),
      import('./AR/commonAr'),
      import('./AR/inboxPageAr'),
      import('./AR/chatPageAr'),
      import('./AR/categoryPageAr'),
      import('./AR/sellerProfilePageAr'),
      import('./AR/listingSuccessPageAr'),
      import('./AR/explorePageAr'),
      import('./AR/helpCenterPageAr'),
      import('./AR/locationPickerPageAr'),
      import('./AR/favoritesPageAr'),
    ]);

    return {
      homePage: homePageAr,
      authPages: authPagesAr,
      createListingPage: createListingPageAr,
      productDetailPage: productDetailPageAr,
      searchPage: searchPageAr,
      searchResultsPage: searchResultsPageAr,
      sellingPage: sellingPageAr,
      buyingPage: buyingPageAr,
      checkoutPage: checkoutPageAr,
      accountPage: accountPageAr,
      common: commonAr,
      inboxPage: inboxPageAr,
      chatPage: chatPageAr,
      categoryPage: categoryPageAr,
      sellerProfilePage: sellerProfilePageAr,
      listingSuccessPage: listingSuccessPageAr,
      explorePage: explorePageAr,
      helpCenterPage: helpCenterPageAr,
      locationPickerPage: locationPickerPageAr,
      favoritesPage: favoritesPageAr,
    };
  }

  // Default to English
  const [
    { homePageEn },
    { authPagesEn },
    { createListingPageEn },
    { productDetailPageEn },
    { searchPageEn },
    { searchResultsPageEn },
    { sellingPageEn },
    { buyingPageEn },
    { checkoutPageEn },
    { accountPageEn },
    { commonEn },
    { inboxPageEn },
    { chatPageEn },
    { categoryPageEn },
    { sellerProfilePageEn },
      { listingSuccessPageEn },
      { explorePageEn },
      { helpCenterPageEn },
      { locationPickerPageEn },
      { favoritesPageEn },
    ] = await Promise.all([
      import('./EN/homePageEn'),
      import('./EN/authPagesEn'),
      import('./EN/createListingPageEn'),
      import('./EN/productDetailPageEn'),
      import('./EN/searchPageEn'),
      import('./EN/searchResultsPageEn'),
      import('./EN/sellingPageEn'),
      import('./EN/buyingPageEn'),
      import('./EN/checkoutPageEn'),
      import('./EN/accountPageEn'),
      import('./EN/commonEn'),
      import('./EN/inboxPageEn'),
      import('./EN/chatPageEn'),
      import('./EN/categoryPageEn'),
      import('./EN/sellerProfilePageEn'),
      import('./EN/listingSuccessPageEn'),
      import('./EN/explorePageEn'),
      import('./EN/helpCenterPageEn'),
      import('./EN/locationPickerPageEn'),
      import('./EN/favoritesPageEn'),
    ]);

  return {
    homePage: homePageEn,
    authPages: authPagesEn,
    createListingPage: createListingPageEn,
    productDetailPage: productDetailPageEn,
    searchPage: searchPageEn,
    searchResultsPage: searchResultsPageEn,
    sellingPage: sellingPageEn,
    buyingPage: buyingPageEn,
    checkoutPage: checkoutPageEn,
    accountPage: accountPageEn,
    common: commonEn,
    inboxPage: inboxPageEn,
    chatPage: chatPageEn,
    categoryPage: categoryPageEn,
    sellerProfilePage: sellerProfilePageEn,
    listingSuccessPage: listingSuccessPageEn,
    explorePage: explorePageEn,
    helpCenterPage: helpCenterPageEn,
    locationPickerPage: locationPickerPageEn,
    favoritesPage: favoritesPageEn,
  };
};

