import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Real Al-Haram Shipping Company locations data
const citiesData = [
  {
    name: 'Damascus',
    name_ar: 'دمشق',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 33.5138,
    longitude: 36.2765,
    display_order: 1
  },
  {
    name: 'Aleppo',
    name_ar: 'حلب',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 36.2021,
    longitude: 37.1343,
    display_order: 2
  },
  {
    name: 'Homs',
    name_ar: 'حمص',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 34.7298,
    longitude: 36.7156,
    display_order: 3
  },
  {
    name: 'Latakia',
    name_ar: 'اللاذقية',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 35.5311,
    longitude: 35.7817,
    display_order: 4
  },
  {
    name: 'Hama',
    name_ar: 'حماة',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 35.1324,
    longitude: 36.7531,
    display_order: 5
  },
  {
    name: 'Tartus',
    name_ar: 'طرطوس',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 34.8889,
    longitude: 35.8869,
    display_order: 6
  },
  {
    name: 'Sweida',
    name_ar: 'السويداء',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 32.7089,
    longitude: 36.5692,
    display_order: 7
  },
  {
    name: 'Daraa',
    name_ar: 'درعا',
    country: 'Syria',
    country_ar: 'سوريا',
    country_code: 'SY',
    latitude: 32.6189,
    longitude: 36.1019,
    display_order: 8
  }
];

// Real pickup locations from Al-Haram Shipping Company
const pickupLocationsData = [
  // Damascus locations
  {
    city_name: 'Damascus',
    name: 'Al-Sina\'a Branch',
    name_ar: 'فرع الصناعة',
    address: 'Al-Sina\'a - Sayyida Zeinab Garage',
    address_ar: 'الصناعة - كراج السيدة زينب',
    phone: '0989555831',
    latitude: 33.5138,
    longitude: 36.2765,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Located near Sayyida Zeinab garage',
    special_instructions_ar: 'يقع بالقرب من كراج السيدة زينب'
  },
  {
    city_name: 'Damascus',
    name: 'Al-Hamra Branch',
    name_ar: 'فرع الحمرا',
    address: 'Al-Hamra - Opposite Al-Amirada Mall',
    address_ar: 'الحمرا - مقابل مول اللاميرادا',
    phone: '0989555834',
    latitude: 33.5200,
    longitude: 36.2800,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Opposite Al-Amirada Mall',
    special_instructions_ar: 'مقابل مول اللاميرادا'
  },
  {
    city_name: 'Damascus',
    name: 'Al-Hariqa Branch',
    name_ar: 'فرع الحريقة',
    address: 'Al-Hariqa - Ghassan Street before the Post Office',
    address_ar: 'الحريقة - شارع غسان قبل البريد',
    phone: '0989555833',
    latitude: 33.5100,
    longitude: 36.2700,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'On Ghassan Street before the Post Office',
    special_instructions_ar: 'في شارع غسان قبل البريد'
  },
  {
    city_name: 'Damascus',
    name: 'Baramkeh Branch',
    name_ar: 'فرع برامكة',
    address: 'Baramkeh - Al-Fahama Roundabout, Pakistan Street',
    address_ar: 'برامكة - دوار الفحامة شارع الباكستان',
    phone: '0989555848',
    latitude: 33.5000,
    longitude: 36.2600,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'At Al-Fahama Roundabout on Pakistan Street',
    special_instructions_ar: 'في دوار الفحامة شارع الباكستان'
  },
  {
    city_name: 'Damascus',
    name: 'Nahr Aisha Branch',
    name_ar: 'فرع نهر عيشة',
    address: 'Nahr Aisha - Behind Town Center',
    address_ar: 'نهر عيشة - خلف التاون سنتر',
    phone: '0989555837',
    latitude: 33.4900,
    longitude: 36.2500,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Behind Town Center',
    special_instructions_ar: 'خلف التاون سنتر'
  },
  {
    city_name: 'Damascus',
    name: 'Arbin Branch',
    name_ar: 'فرع عربين',
    address: 'Arbin - Al-Halazounah Square',
    address_ar: 'عربين - ساحة الحلزونة',
    phone: '0953440724',
    latitude: 33.4800,
    longitude: 36.2400,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'At Al-Halazounah Square',
    special_instructions_ar: 'في ساحة الحلزونة'
  },
  {
    city_name: 'Damascus',
    name: 'Jaramana Branch',
    name_ar: 'فرع جرمانا',
    address: 'Jaramana - Al-Qaryat Junction',
    address_ar: 'جرمانا - مفرق القريات',
    phone: '0989555836',
    latitude: 33.4700,
    longitude: 36.2300,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'At Al-Qaryat Junction',
    special_instructions_ar: 'في مفرق القريات'
  },
  {
    city_name: 'Damascus',
    name: 'Al-Qutaifa Branch',
    name_ar: 'فرع القطيفة',
    address: 'Al-Qutaifa - Next to Al-Haram Al-Mali',
    address_ar: 'القطيفة - جانب الهرم المالي',
    phone: '0989555882',
    latitude: 33.4600,
    longitude: 36.2200,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Next to Al-Haram Al-Mali',
    special_instructions_ar: 'جانب الهرم المالي'
  },
  {
    city_name: 'Damascus',
    name: 'Al-Kiswah Branch',
    name_ar: 'فرع الكسوة',
    address: 'Al-Kiswah - Opposite the Military Gas Station',
    address_ar: 'الكسوة - مقابل الكازية العسكرية',
    phone: '0989555858',
    latitude: 33.4500,
    longitude: 36.2100,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Opposite the Military Gas Station',
    special_instructions_ar: 'مقابل الكازية العسكرية'
  },
  {
    city_name: 'Damascus',
    name: 'Yabroud Branch',
    name_ar: 'فرع يبرود',
    address: 'Yabroud - Next to Ajawid Bakery',
    address_ar: 'يبرود - جانب فرن أجاويد',
    phone: '0989555856',
    latitude: 33.4400,
    longitude: 36.2000,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 1,
    special_instructions: 'Next to Ajawid Bakery',
    special_instructions_ar: 'جانب فرن أجاويد'
  },

  // Latakia locations
  {
    city_name: 'Latakia',
    name: 'Al-Rijeh Branch',
    name_ar: 'فرع الريجة',
    address: 'Al-Rijeh - Behind New Al-Rijeh',
    address_ar: 'الريجة - خلف الريجة الجديدة',
    phone: '0989555886',
    latitude: 35.5400,
    longitude: 35.7800,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Behind New Al-Rijeh',
    special_instructions_ar: 'خلف الريجة الجديدة'
  },
  {
    city_name: 'Latakia',
    name: 'Industrial Area Branch',
    name_ar: 'فرع المنطقة الصناعية',
    address: 'Industrial Area - Behind the Police Station',
    address_ar: 'المنطقة الصناعية - خلف شارع المخفر',
    phone: '0989555866',
    latitude: 35.5300,
    longitude: 35.7700,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Behind the Police Station',
    special_instructions_ar: 'خلف شارع المخفر'
  },
  {
    city_name: 'Latakia',
    name: 'Sheikh Daher Branch',
    name_ar: 'فرع شيخ ضاهر',
    address: 'Sheikh Daher - First Al-Oweina Street',
    address_ar: 'شيخ ضاهر - اول شارع العوينة',
    phone: '0989555868',
    latitude: 35.5200,
    longitude: 35.7600,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'First Al-Oweina Street',
    special_instructions_ar: 'اول شارع العوينة'
  },
  {
    city_name: 'Latakia',
    name: 'Agriculture Branch',
    name_ar: 'فرع الزراعة',
    address: 'Agriculture - Agriculture Roundabout next to Antar Gas Station',
    address_ar: 'الزراعة - دوار الزراعة جانب كازية عنتر',
    phone: '0989555867',
    latitude: 35.5100,
    longitude: 35.7500,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Agriculture Roundabout next to Antar Gas Station',
    special_instructions_ar: 'دوار الزراعة جانب كازية عنتر'
  },

  // Hama locations
  {
    city_name: 'Hama',
    name: 'Al-Hadher Branch',
    name_ar: 'فرع الحاضر',
    address: 'Al-Hadher - Behind Immigration and Passports',
    address_ar: 'الحاضر خلف الهجرة والجوازات',
    phone: '0989555880',
    latitude: 35.1300,
    longitude: 36.7500,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Behind Immigration and Passports',
    special_instructions_ar: 'خلف الهجرة والجوازات'
  },
  {
    city_name: 'Hama',
    name: 'Mhardeh Branch',
    name_ar: 'فرع محردة',
    address: 'Mhardeh - Next to Al-Haram Al-Mali',
    address_ar: 'محردة – جانب الهرم المالي',
    phone: '0989555892',
    latitude: 35.1200,
    longitude: 36.7400,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Haram Al-Mali',
    special_instructions_ar: 'جانب الهرم المالي'
  },
  {
    city_name: 'Hama',
    name: 'Salamiyah Branch',
    name_ar: 'فرع سلمية',
    address: 'Salamiyah - Southern Garage',
    address_ar: 'سلمية - الكراج الجنوبي',
    phone: '0989555830',
    latitude: 35.1100,
    longitude: 36.7300,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Southern Garage',
    special_instructions_ar: 'الكراج الجنوبي'
  },
  {
    city_name: 'Hama',
    name: '8th March Street Branch',
    name_ar: 'فرع شارع ٨ أذار',
    address: '8th of March Street',
    address_ar: 'شارع ٨ أذار',
    phone: '0989555872',
    latitude: 35.1000,
    longitude: 36.7200,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'On 8th of March Street',
    special_instructions_ar: 'في شارع ٨ أذار'
  },
  {
    city_name: 'Hama',
    name: 'Sqeilbiyyeh Branch',
    name_ar: 'فرع سقيلبية',
    address: 'Sqeilbiyyeh - South of Al-Karaj Roundabout',
    address_ar: 'سقيلبية جنوب دوار الكراج',
    phone: '0989555898',
    latitude: 35.0900,
    longitude: 36.7100,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'South of Al-Karaj Roundabout',
    special_instructions_ar: 'جنوب دوار الكراج'
  },

  // Homs locations
  {
    city_name: 'Homs',
    name: 'Industrial Area Branch',
    name_ar: 'فرع المنطقة الصناعية',
    address: 'Industrial Area - Next to Ice Factory',
    address_ar: 'الصناعة جانب معمل الثلج',
    phone: '0989555876',
    latitude: 34.7200,
    longitude: 36.7100,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Ice Factory',
    special_instructions_ar: 'جانب معمل الثلج'
  },
  {
    city_name: 'Homs',
    name: 'Dilan Branch',
    name_ar: 'فرع ديلان',
    address: 'Dilan Al-Plaza Complex',
    address_ar: 'ديلان مجمع البلازا',
    phone: '0989555873',
    latitude: 34.7100,
    longitude: 36.7000,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Al-Plaza Complex',
    special_instructions_ar: 'مجمع البلازا'
  },
  {
    city_name: 'Homs',
    name: 'Ain Al-Ajoz Branch',
    name_ar: 'فرع عين العجوز',
    address: 'Ain Al-Ajoz - Public Road',
    address_ar: 'عين العجوز - الطريق العام',
    phone: '0989555890',
    latitude: 34.7000,
    longitude: 36.6900,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'On Public Road',
    special_instructions_ar: 'في الطريق العام'
  },
  {
    city_name: 'Homs',
    name: 'Shin Branch',
    name_ar: 'فرع شين',
    address: 'Shin - Next to Al-Karaj',
    address_ar: 'شين - جانب الكراج',
    phone: '0989555895',
    latitude: 34.6900,
    longitude: 36.6800,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Karaj',
    special_instructions_ar: 'جانب الكراج'
  },

  // Aleppo locations
  {
    city_name: 'Aleppo',
    name: 'Bustan Al-Basha Branch 1',
    name_ar: 'فرع بستان الباشا 1',
    address: 'Bustan Al-Basha - Next to Al-Hamiyat Hospital',
    address_ar: 'بستان الباشا - جانب مشفى الحميات',
    phone: '0989555801',
    latitude: 36.2000,
    longitude: 37.1300,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Hamiyat Hospital',
    special_instructions_ar: 'جانب مشفى الحميات'
  },
  {
    city_name: 'Aleppo',
    name: 'Bustan Al-Basha Branch 2',
    name_ar: 'فرع بستان الباشا 2',
    address: 'Bustan Al-Basha - Opposite Dairy Factory',
    address_ar: 'بستان الباشا - مقابل معمل الألبان',
    phone: '0989555822',
    latitude: 36.1900,
    longitude: 37.1200,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Opposite Dairy Factory',
    special_instructions_ar: 'مقابل معمل الألبان'
  },

  // Tartus locations
  {
    city_name: 'Tartus',
    name: 'Industrial Area Branch',
    name_ar: 'فرع المنطقة الصناعية',
    address: 'Industrial Area - Near the Police Station',
    address_ar: 'المنطقة الصناعية - قرب المخفر',
    phone: '0989555858',
    latitude: 34.8800,
    longitude: 35.8800,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Near the Police Station',
    special_instructions_ar: 'قرب المخفر'
  },
  {
    city_name: 'Tartus',
    name: 'Al-Thawra Street Branch',
    name_ar: 'فرع شارع الثورة',
    address: 'Al-Thawra Street - Opposite Syrian Trade',
    address_ar: 'شارع الثورة - مقابل السورية للتجارة',
    phone: '0989555857',
    latitude: 34.8700,
    longitude: 35.8700,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Opposite Syrian Trade',
    special_instructions_ar: 'مقابل السورية للتجارة'
  },
  {
    city_name: 'Tartus',
    name: 'Al-Safsafah Branch',
    name_ar: 'فرع الصفصافة',
    address: 'Al-Safsafah - Al-Safsafah Junction',
    address_ar: 'الصفصافة - مفرق الصفصافة',
    phone: '0989555878',
    latitude: 34.8600,
    longitude: 35.8600,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'At Al-Safsafah Junction',
    special_instructions_ar: 'في مفرق الصفصافة'
  },
  {
    city_name: 'Tartus',
    name: 'Al-Kharab Branch',
    name_ar: 'فرع الخراب',
    address: 'Al-Kharab - Kharab Marqiyeh - Next to Al-Haram Al-Mali',
    address_ar: 'الخراب - خراب مرقيه - جانب الهرم المالي',
    phone: '0989555879',
    latitude: 34.8500,
    longitude: 35.8500,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Haram Al-Mali',
    special_instructions_ar: 'جانب الهرم المالي'
  },
  {
    city_name: 'Tartus',
    name: 'Safita Branch',
    name_ar: 'فرع صافيتا',
    address: 'Safita - Main Street',
    address_ar: 'صافيتا - الشارع الرئيسي',
    phone: '0989555896',
    latitude: 34.8400,
    longitude: 35.8400,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'On Main Street',
    special_instructions_ar: 'في الشارع الرئيسي'
  },
  {
    city_name: 'Tartus',
    name: 'Al-Qadmus Branch',
    name_ar: 'فرع القدموس',
    address: 'Al-Qadmus - Next to Al-Qusour Roastery',
    address_ar: 'القدموس - جانب محمصة القصور',
    phone: '0989555893',
    latitude: 34.8300,
    longitude: 35.8300,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Qusour Roastery',
    special_instructions_ar: 'جانب محمصة القصور'
  },
  {
    city_name: 'Tartus',
    name: 'Baniyas Branch',
    name_ar: 'فرع بانياس',
    address: 'Baniyas - First Al-Manzala Road',
    address_ar: 'بانياس اول طريق المنزلة',
    phone: '0989555884',
    latitude: 34.8200,
    longitude: 35.8200,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'First Al-Manzala Road',
    special_instructions_ar: 'اول طريق المنزلة'
  },
  {
    city_name: 'Tartus',
    name: 'Draikish Branch',
    name_ar: 'فرع دريكيش',
    address: 'Draikish - Al-Mahkama Street',
    address_ar: 'دريكيش - شارع المحكمة',
    phone: '0989555897',
    latitude: 34.8100,
    longitude: 35.8100,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'On Al-Mahkama Street',
    special_instructions_ar: 'في شارع المحكمة'
  },
  {
    city_name: 'Tartus',
    name: 'Jableh Industrial Branch',
    name_ar: 'فرع جبلة الصناعية',
    address: 'Jableh - Industrial Area',
    address_ar: 'جبلة - المنطقة الصناعية',
    phone: '0989555885',
    latitude: 34.8000,
    longitude: 35.8000,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'In Industrial Area',
    special_instructions_ar: 'في المنطقة الصناعية'
  },
  {
    city_name: 'Tartus',
    name: 'Jableh Al-Fawwar Branch',
    name_ar: 'فرع جبلة الفوار',
    address: 'Jableh - Al-Fawwar - Next to Al-Haram Al-Mali',
    address_ar: 'جبلة - الفوار جانب الهرم المالي',
    phone: '0989555863',
    latitude: 34.7900,
    longitude: 35.7900,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Next to Al-Haram Al-Mali',
    special_instructions_ar: 'جانب الهرم المالي'
  },
  {
    city_name: 'Tartus',
    name: 'Masyaf Branch',
    name_ar: 'فرع مصياف',
    address: 'Masyaf - Shtiwi Seifo Street',
    address_ar: 'مصياف - شارع شتيوي سيفو',
    phone: '0989555891',
    latitude: 34.7800,
    longitude: 35.7800,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'On Shtiwi Seifo Street',
    special_instructions_ar: 'في شارع شتيوي سيفو'
  },

  // Sweida locations
  {
    city_name: 'Sweida',
    name: 'Education Theater Branch',
    name_ar: 'فرع مسرح التربية',
    address: 'Behind the Education Theater',
    address_ar: 'خلف مسرح التربية',
    phone: '0989555889',
    latitude: 32.7000,
    longitude: 36.5600,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'Behind the Education Theater',
    special_instructions_ar: 'خلف مسرح التربية'
  },

  // Daraa locations
  {
    city_name: 'Daraa',
    name: 'Al-Sanamayn Branch',
    name_ar: 'فرع الصنمين',
    address: 'Al-Sanamayn',
    address_ar: 'الصنمين',
    phone: '0989555887',
    latitude: 32.6100,
    longitude: 36.0900,
    type: 'branch',
    pickup_fee: 0,
    estimated_days: 2,
    special_instructions: 'In Al-Sanamayn area',
    special_instructions_ar: 'في منطقة الصنمين'
  }
];

async function clearExistingData() {
  console.log('🗑️ Clearing existing location data...');
  
  try {
    // Delete pickup locations first (due to foreign key constraint)
    const { error: locationsError } = await supabase
      .from('pickup_locations')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (locationsError) {
      console.log('⚠️ Error clearing pickup locations:', locationsError.message);
    } else {
      console.log('✅ Cleared pickup locations');
    }

    // Delete cities
    const { error: citiesError } = await supabase
      .from('cities')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (citiesError) {
      console.log('⚠️ Error clearing cities:', citiesError.message);
    } else {
      console.log('✅ Cleared cities');
    }
  } catch (error) {
    console.log('⚠️ Error clearing data:', error.message);
  }
}

async function createCities() {
  console.log('🏙️ Creating cities...');
  
  try {
    const { data, error } = await supabase
      .from('cities')
      .insert(citiesData)
      .select();

    if (error) {
      console.error('❌ Error creating cities:', error);
      throw error;
    }

    console.log(`✅ Created ${data.length} cities`);
    return data;
  } catch (error) {
    console.error('❌ Error creating cities:', error);
    throw error;
  }
}

async function createPickupLocations() {
  console.log('📍 Creating pickup locations...');
  
  try {
    // First, get all cities to map city names to IDs
    const { data: cities, error: citiesError } = await supabase
      .from('cities')
      .select('id, name');

    if (citiesError) {
      console.error('❌ Error fetching cities:', citiesError);
      throw citiesError;
    }

    // Create a map of city names to IDs
    const cityMap = {};
    cities.forEach(city => {
      cityMap[city.name] = city.id;
    });

    // Transform pickup locations data to include city_id
    const locationsWithCityIds = pickupLocationsData.map(location => {
      const cityId = cityMap[location.city_name];
      if (!cityId) {
        console.log(`⚠️ City not found: ${location.city_name}`);
        return null;
      }

      const { city_name, ...locationData } = location; // Remove city_name
      return {
        ...locationData,
        city_id: cityId,
        is_active: true,
        display_order: 0
      };
    }).filter(Boolean); // Remove null entries

    const { data, error } = await supabase
      .from('pickup_locations')
      .insert(locationsWithCityIds)
      .select();

    if (error) {
      console.error('❌ Error creating pickup locations:', error);
      throw error;
    }

    console.log(`✅ Created ${data.length} pickup locations`);
    return data;
  } catch (error) {
    console.error('❌ Error creating pickup locations:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting location data seeding...\n');

    // Step 1: Clear existing data
    await clearExistingData();

    // Step 2: Create cities
    await createCities();

    // Step 3: Create pickup locations
    await createPickupLocations();

    console.log('\n🎉 Location data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${citiesData.length} cities created`);
    console.log(`   - ${pickupLocationsData.length} pickup locations created`);
    console.log('   - All locations are from real Al-Haram Shipping Company branches');

  } catch (error) {
    console.error('\n❌ Location seeding failed:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export {
  createCities,
  createPickupLocations,
  citiesData,
  pickupLocationsData
};
