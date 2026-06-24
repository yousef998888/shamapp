import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
  Modal,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthContext } from '@/contexts/AuthContext';
import CategorySelectModal from '@/components/modals/CategorySelectModal';
import ConditionSelectModal from '@/components/modals/ConditionSelectModal';
import CurrencySelectModal from '@/components/modals/CurrencySelectModal';
import DeliverySelectModal from '@/components/modals/DeliverySelectModal';
import AttributeValueModal from '@/components/modals/AttributeValueModal';
import DeliveryOptionsModal from '@/components/modals/DeliveryOptionsModal';
import PackageSizeModal from '@/components/modals/PackageSizeModal';
import ImagePickerModal from '@/components/modals/ImagePickerModal';
import ImagePreview from '@/components/ImagePreview';
import LocationPicker from '@/components/LocationPicker';
import AddressCard from '@/components/AddressCard';
import type { Category, UserAddress } from '@/types/database';
// Import UI services directly
import { useCreateProduct } from '@/hooks/useCreateProduct';
import ProductAIService from '@/services/ProductAIService';
import CategoryService from '@/services/CategoryService';
import SystemSettingsService from '@/services/SystemSettingsService';
import type { InventoryConfiguration } from '@/services/ProductService';
import { getDeviceLanguage } from '@/utils/languageDetection';
import VerificationModal from '@/components/modals/VerificationModal';
import { useUserVerification } from '@/hooks/useUserVerification';
import { usePageTranslation } from '@/hooks/useTranslation';
import { UI } from '@/constants/theme';

const MAX_VARIANT_TYPES = 3;
const defaultVariantTypeNames = ['Option 1', 'Option 2', 'Option 3'];

const createId = () => Math.random().toString(36).slice(2, 10);

interface VariantOption {
  id: string;
  value: string;
  isCustom?: boolean;
}

interface VariantType {
  id: string;
  name: string;
  options: VariantOption[];
  source: 'custom' | 'attribute';
  attributeId?: string | null;
}

interface VariantCombinationOption {
  typeId: string;
  typeLabel: string;
  optionId: string;
  value: string;
}

interface VariantCombination {
  key: string;
  label: string;
  options: VariantCombinationOption[];
}

const buildVariantCombinations = (types: VariantType[]): VariantCombination[] => {
  const normalized = types
    .map(type => ({
      id: type.id,
      label: type.name.trim(),
      options: type.options
        .map(option => ({
          ...option,
          value: option.value.trim(),
        }))
        .filter(option => option.value.length > 0),
    }))
    .filter(type => type.label.length > 0 && type.options.length > 0);

  if (normalized.length === 0) {
    return [];
  }

  const combinations: VariantCombination[] = [];

  const build = (index: number, path: VariantCombinationOption[]) => {
    if (index === normalized.length) {
      const key = path.map(option => `${option.typeId}:${option.optionId}`).join('|');
      const label = path.map(option => `${option.typeLabel}: ${option.value}`).join(' • ');

      combinations.push({
        key,
        label,
        options: path,
      });
      return;
    }

    const currentType = normalized[index];

    currentType.options.forEach(option => {
      build(index + 1, [
        ...path,
        {
          typeId: currentType.id,
          typeLabel: currentType.label,
          optionId: option.id,
          value: option.value,
        },
      ]);
    });
  };

  build(0, []);
  return combinations;
};

export default function CreateListingPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, loading: authLoading } = useAuthContext();

  const { t } = usePageTranslation('createListingPage');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      Alert.alert(
        t.signInRequired || 'Sign in required',
        t.signInToCreateListing || 'Please sign in to create a listing',
        [
          { text: t.cancel || 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: t.signIn || 'Sign In', onPress: () => router.push('/auth/login') },
        ]
      );
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#61d5b6" />
          <Text style={{ marginTop: 12, color: '#6B7280' }}>{t.loading || 'Loading...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  const createProductMutation = useCreateProduct();
  const deviceLanguage = useMemo(() => (getDeviceLanguage() === 'ar' ? 'ar' : 'en'), []);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    currency: 'SYP',
    condition: '',
    category_id: '',
    is_negotiable: false,
    delivery_option: 'both',
    location: '',
    latitude: null,
    longitude: null,
  });

  const [images, setImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<any>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string | null>(null);
  const [selectedPackageSize, setSelectedPackageSize] = useState<string | null>(null);
  const [attributeValues, setAttributeValues] = useState<Record<string, string[]>>({});
  const [attributeTermNames, setAttributeTermNames] = useState<Record<string, string[]>>({});
  const [attributes, setAttributes] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const verification = useUserVerification();
  const [simpleQuantity, setSimpleQuantity] = useState('1');
  const [sellingFeePercentage, setSellingFeePercentage] = useState<number>(0);
  const [feeAgreementAccepted, setFeeAgreementAccepted] = useState(false);

  // Fetch selling fee percentage on mount
  useEffect(() => {
    SystemSettingsService.getSellingFeePercentage()
      .then((fee: number) => {
        console.log('Selling fee percentage:', fee);
        setSellingFeePercentage(fee);
      })
      .catch((error: Error) => {
        console.error('Error fetching selling fee percentage:', error);
        setSellingFeePercentage(0);
      });
  }, []);

  // Handle back button to navigate to selling page
  useEffect(() => {
    const backAction = () => {
      router.replace('/selling');
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  // Variant configuration
  const [variantsEnabled, setVariantsEnabled] = useState(false);
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [variantStocks, setVariantStocks] = useState<Record<string, string>>({});
  const [variantDisabledMap, setVariantDisabledMap] = useState<Record<string, boolean>>({});
  const [variantManagerVisible, setVariantManagerVisible] = useState(false);

  // Modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [conditionModalVisible, setConditionModalVisible] = useState(false);
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [deliveryOptionsModalVisible, setDeliveryOptionsModalVisible] = useState(false);
  const [packageSizeModalVisible, setPackageSizeModalVisible] = useState(false);
  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [attributeModal, setAttributeModal] = useState<{ attr: any; open: boolean } | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);

  const conditions = [
    { value: 'new', label: t.condNew || 'New' },
    { value: 'used', label: t.condUsed || 'Used' },
    { value: 'refurbished', label: t.condRefurbished || 'Refurbished' },
  ];

  const currencies = [
    { value: 'SYP', label: 'SYP' },
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
  ];

  const deliveryOptions = [
    { value: 'both', label: t.both || 'Both' },
    { value: 'postage', label: t.postageOnly || 'Postage Only' },
    { value: 'collection', label: t.collectionOnly || 'Collection Only' },
  ];

  const attributeMap = useMemo(() => {
    const map = new Map<string, any>();
    attributes.forEach(attr => {
      map.set(attr.id, attr);
    });
    return map;
  }, [attributes]);

  const handleVariantToggle = (enabled: boolean) => {
    if (enabled) {
      setVariantsEnabled(true);
      setVariantManagerVisible(true);
    } else {
      setVariantsEnabled(false);
      setVariantTypes([]);
      setVariantStocks({});
      setVariantDisabledMap({});
      setVariantManagerVisible(false);
    }
  };

  const openVariantManager = () => {
    if (!variantsEnabled && variantTypes.length === 0) {
      setVariantsEnabled(true);
    }
    setVariantManagerVisible(true);
  };

  const variantCombinations = useMemo<VariantCombination[]>(() => {
    if (!variantsEnabled) return [];
    return buildVariantCombinations(variantTypes);
  }, [variantsEnabled, variantTypes]);

  const activeVariantCombinations = useMemo(
    () => variantCombinations.filter(combo => !variantDisabledMap[combo.key]),
    [variantCombinations, variantDisabledMap]
  );

  useEffect(() => {
    if (!variantsEnabled) return;
    const comboKeys = new Set(variantCombinations.map(combo => combo.key));

    setVariantStocks(prev => {
      let changed = false;
      const next: Record<string, string> = {};

      comboKeys.forEach(key => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        } else {
          next[key] = '';
          changed = true;
        }
      });

      Object.keys(prev).forEach(key => {
        if (!comboKeys.has(key)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    setVariantDisabledMap(prev => {
      let changed = false;
      const next: Record<string, boolean> = {};

      comboKeys.forEach(key => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        } else {
          next[key] = false;
          changed = true;
        }
      });

      Object.keys(prev).forEach(key => {
        if (!comboKeys.has(key)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [variantsEnabled, variantCombinations]);

  const handleVariantManagerSave = (nextState: {
    types: VariantType[];
    stocks: Record<string, string>;
    disabledMap: Record<string, boolean>;
  }) => {
    setVariantTypes(nextState.types);
    setVariantStocks(nextState.stocks);
    setVariantDisabledMap(nextState.disabledMap);
    setVariantManagerVisible(false);
    if (nextState.types.length === 0) {
      setVariantsEnabled(false);
    } else {
      setVariantsEnabled(true);
    }
  };

  const handleVariantManagerCancel = () => {
    setVariantManagerVisible(false);
    if (variantTypes.length === 0) {
      setVariantsEnabled(false);
    }
  };

  const variantSummary = useMemo(() => {
    if (!variantsEnabled || variantTypes.length === 0) {
      return { optionCount: 0, valueCount: 0, activeCombinationCount: 0 };
    }
    const optionCount = variantTypes.length;
    const valueCount = variantTypes.reduce((total, type) => total + type.options.length, 0);
    const activeCombinationCount = activeVariantCombinations.length;
    return { optionCount, valueCount, activeCombinationCount };
  }, [variantsEnabled, variantTypes, activeVariantCombinations]);

  // Fetch attributes when category changes
  useEffect(() => {
    if (selectedCategory?.id) {
      CategoryService.fetchAttributesAndTermsForCategories([selectedCategory.id])
        .then((data) => {
          setAttributes(data);
          // Reset attribute values when category changes
          setAttributeValues({});
          setAttributeTermNames({});
        })
        .catch((error) => {
          console.error('Error fetching attributes:', error);
          setAttributes([]);
        });
    } else {
      setAttributes([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    setVariantTypes(prev => {
      if (prev.length === 0) return prev;

      if (attributes.length === 0) {
        if (!prev.some(type => type.source === 'attribute')) {
          return prev;
        }
        return prev.map(type =>
          type.source === 'attribute'
            ? {
              ...type,
              source: 'custom',
              attributeId: null,
              options: type.options.map(option => ({
                ...option,
                isCustom: undefined,
              })),
            }
            : type
        );
      }

      const validAttributeIds = new Set(attributes.map(attr => attr.id));
      let changed = false;
      const fallbackAttribute = attributes[0];

      const next = prev.map(type => {
        if (type.source !== 'attribute') {
          return type;
        }

        if (type.attributeId && validAttributeIds.has(type.attributeId)) {
          return type;
        }

        changed = true;
        return {
          ...type,
          attributeId: fallbackAttribute?.id ?? null,
          name:
            fallbackAttribute && (type.name.trim().length === 0 ||
              defaultVariantTypeNames.includes(type.name.trim()) ||
              (type.attributeId &&
                attributeMap.get(type.attributeId)?.name === type.name))
              ? fallbackAttribute.name
              : type.name,
          options: type.options.filter(option => option.isCustom),
        };
      });

      return changed ? next : prev;
    });
  }, [attributes, attributeMap]);

  const handleQuantityChange = (value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setSimpleQuantity(sanitized);
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert(t.error || 'Error', t.loginToCreate || 'Please log in to create a listing');
      return;
    }

    if (!profile?.is_verified) {
      if (verification.status === 'pending') {
        Alert.alert(
          'Verification pending',
          'Your verification is currently under review. We will notify you as soon as it is complete.'
        );
      } else if (verification.status === 'rejected') {
        Alert.alert(
          'Verification required',
          'Your previous submission was rejected. Please upload a clearer photo of your ID.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry verification', onPress: () => setVerificationModalVisible(true) },
          ]
        );
      } else {
        Alert.alert(
          'Verification required',
          'Verify your identity once to list and sell items on Sham.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start verification', onPress: () => setVerificationModalVisible(true) },
          ]
        );
      }
      return;
    }

    if (!formData.title || !formData.description || !formData.price || !formData.condition) {
      Alert.alert(t.error || 'Error', t.fillRequired || 'Please fill in all required fields');
      return;
    }

    const parsedQuantity = parseInt(simpleQuantity, 10);

    if (!variantsEnabled) {
      if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
        Alert.alert(t.invalidQuantity || 'Invalid quantity', t.invalidQuantityMessage || 'Please enter a quantity of at least 1.');
        return;
      }
    }

    if (!selectedAddress) {
      Alert.alert(t.error || 'Error', t.selectAddress || 'Please select an address');
      return;
    }

    if (!selectedDeliveryOption) {
      Alert.alert(t.error || 'Error', t.selectDeliveryOption || 'Please select a delivery option');
      return;
    }

    if (!selectedPackageSize) {
      Alert.alert(t.error || 'Error', t.selectPackageSize || 'Please select a package size');
      return;
    }

    if (images.length === 0) {
      Alert.alert(t.error || 'Error', t.addAtLeastOnePhoto || 'Please add at least one photo');
      return;
    }

    if (!feeAgreementAccepted && sellingFeePercentage > 0) {
      Alert.alert(
        t.feeAgreementRequired || 'Fee Agreement Required',
        t.feeAgreementMessage || 'Please agree to the selling fee terms to continue.'
      );
      return;
    }

    if (variantsEnabled) {
      if (variantTypes.length === 0 || variantCombinations.length === 0) {
        Alert.alert(
          t.variantsIncomplete || 'Variants incomplete',
          t.variantsIncompleteAddOptions || 'Add at least one option name with values. If you are using category attributes, choose an attribute and select or add at least one term.'
        );
        return;
      }

      if (activeVariantCombinations.length === 0) {
        Alert.alert(
          t.variantsIncomplete || 'Variants incomplete',
          t.variantsIncompleteEnableCombinations || 'Enable at least one variant combination to sell.'
        );
        return;
      }

      const invalidStock = activeVariantCombinations.some(combo => {
        const rawValue = variantStocks[combo.key];
        if (!rawValue || rawValue.trim() === '') {
          return true;
        }
        const quantityValue = parseInt(rawValue, 10);
        return Number.isNaN(quantityValue) || quantityValue <= 0;
      });

      if (invalidStock) {
        Alert.alert(
          t.variantsIncomplete || 'Variants incomplete',
          t.variantsIncompleteStock || 'Please enter stock of at least 1 for every enabled variant combination.'
        );
        return;
      }
    }

    let inventoryPayload: InventoryConfiguration;

    if (variantsEnabled) {
      const optionGroupsConfig = variantTypes.map((group, groupIndex) => {
        const groupName = group.name.trim() || `Option ${groupIndex + 1}`;
        const backendSource: 'custom' | 'category_attribute' =
          group.source === 'attribute' ? 'category_attribute' : 'custom';
        return {
          tempId: group.id,
          name: groupName,
          source: backendSource,
          attributeId: backendSource === 'category_attribute' ? group.attributeId ?? null : null,
          displayOrder: groupIndex,
          values: group.options.map((option, valueIndex) => {
            const optionName = option.value.trim();
            const isAttributeSource = backendSource === 'category_attribute';
            const isCustom = isAttributeSource ? option.isCustom === true : true;
            const attributeTermId =
              isAttributeSource && option.isCustom !== true ? option.id : null;

            return {
              tempId: option.id,
              name: optionName,
              attributeTermId,
              isCustom,
              displayOrder: valueIndex,
            };
          }),
        };
      });

      if (optionGroupsConfig.length === 0) {
        Alert.alert(t.variantsIncomplete || 'Variants incomplete', t.variantsIncompleteAddGroup || 'Add at least one option group.');
        return;
      }

      const validGroupIds = new Set(optionGroupsConfig.map(group => group.tempId));
      const validValueIds = new Set(
        optionGroupsConfig.flatMap(group => group.values.map(value => value.tempId))
      );

      const variantCombinationConfig = variantCombinations
        .map(combo => {
          const quantityValue = parseInt(variantStocks[combo.key] || '0', 10);
          return {
            options: combo.options.map(option => ({
              groupTempId: option.typeId,
              valueTempId: option.optionId,
            })),
            quantity: Number.isNaN(quantityValue) ? 0 : quantityValue,
            enabled: variantDisabledMap[combo.key] !== true,
            sku: null,
          };
        })
        .filter(combo =>
          combo.options.every(
            option =>
              validGroupIds.has(option.groupTempId) && validValueIds.has(option.valueTempId)
          )
        );

      if (variantCombinationConfig.length === 0) {
        Alert.alert(
          t.variantsIncomplete || 'Variants incomplete',
          t.variantsIncompleteBuildError || 'Unable to build variant combinations. Please review option values.'
        );
        return;
      }

      inventoryPayload = {
        type: 'variants',
        optionGroups: optionGroupsConfig,
        variants: variantCombinationConfig,
      };
    } else {
      inventoryPayload = {
        type: 'simple',
        quantity: parsedQuantity,
      };
    }

    setLoading(true);
    try {
      const baseTitle = formData.title.trim();
      const baseDescription = formData.description.trim();
      const currencyCode = selectedCurrency?.code || formData.currency || 'SYP';

      // Include location data in the form data (exactly like UI)
      const formDataWithLocation = {
        title: baseTitle,
        ar_title: baseTitle,
        description: baseDescription,
        ar_description: baseDescription,
        price: parseFloat(formData.price),
        currency: currencyCode,
        condition: selectedCondition as "new" | "used" | "refurbished",
        category_id: selectedCategory?.id || '',
        location: selectedAddress.address_line_1 + ', ' + selectedAddress.city,
        latitude: selectedAddress.latitude,
        longitude: selectedAddress.longitude,
        is_negotiable: false,
        delivery_option: (selectedDeliveryOption as 'both' | 'postage' | 'collection') || 'both',
        status: 'inactive' as const,
        tags: [],
        ar_tags: [],
        has_variants: variantsEnabled,
        quantity_available: variantsEnabled ? null : parsedQuantity,
      };

      // Create product in pending state before AI processing
      const productId = await createProductMutation.mutateAsync({
        data: {
          ...formDataWithLocation,
        },
        sellerId: user.id,
        images: images,
        attributeValues: attributeValues,
        inventory: inventoryPayload,
      });

      console.log('Product created in inactive state:', productId);
      console.log('Inventory configuration saved:', inventoryPayload);

      // Kick off AI processing in the background to update listing when ready
      ProductAIService.processProduct({
        productId,
        title: baseTitle,
        description: baseDescription,
        ar_title: baseTitle,
        ar_description: baseDescription,
        deviceLanguage,
      })
        .then((aiResult) => {
          console.log('✅ AI processing complete in background:', {
            productId,
            tags: aiResult.tags,
            arTags: aiResult.ar_tags,
            embeddingDimension: aiResult.stats.embedding_dimension,
            productStatusAfterUpdate: aiResult.productStatusAfterUpdate,
            translations: aiResult.translations,
          });
        })
        .catch((backgroundError) => {
          console.error('Background AI processing failed:', backgroundError);
        });

      // Navigate to success screen
      router.push({
        pathname: '/listing-success',
        params: {
          productName: formData.title,
          price: formData.price,
          currency: currencyCode,
          imageUri: images[0],
          productId: productId,
        }
      });
    } catch (error) {
      console.error('Error creating product:', error);
      Alert.alert(t.error || 'Error', t.createFailed || 'Failed to create product listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderInputField = (
    label: string,
    value: string,
    placeholder: string,
    icon: any,
    onChangeText: (text: string) => void,
    hint?: string,
    isDropdown = false
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <IconSymbol name={icon} size={20} color="#6B7280" />
        <TextInput
          style={styles.textInput}
          value={value}
          placeholder={placeholder}
          onChangeText={onChangeText}
          editable={!isDropdown}
        />
        {isDropdown && (
          <IconSymbol name="chevron.down" size={16} color="#6B7280" />
        )}
      </View>
      {hint && <Text style={styles.hintText}>{hint}</Text>}
    </View>
  );

  // Test function to populate with dummy data
  const populateTestData = () => {
    setFormData({
      title: 'Vintage Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
      price: '89.99',
      currency: 'USD',
      condition: 'excellent',
      category_id: 'electronics',
      is_negotiable: false,
      delivery_option: 'both',
      location: 'New York, NY',
      latitude: null,
      longitude: null,
    });

    // Set test images (you can add some test image URLs)
    setImages([
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=400',
    ]);

    // Set test category (you might need to adjust this based on your actual categories)
    setSelectedCategory({
      id: 'electronics',
      name: 'Electronics',
      slug: 'electronics',
      parent_id: undefined,
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set test condition
    setSelectedCondition('excellent');

    // Set test currency
    setSelectedCurrency({
      code: 'USD',
      name: 'US Dollar',
      symbol: '$',
    });

    // Set test delivery option
    setSelectedDeliveryOption('both');

    // Set test package size
    setSelectedPackageSize('medium_1kg');
    setSimpleQuantity('10');

    // Set test address
    setSelectedAddress({
      id: 'test-address',
      user_id: user?.id || 'test-user',
      title: 'Home',
      address_line_1: '123 Main Street',
      city: 'New York',
      state_province: 'NY',
      postal_code: '10001',
      country: 'United States',
      latitude: 40.7128,
      longitude: -74.0060,
      is_default: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Set test attributes
    setAttributeValues({
      'color': ['black', 'white'],
      'brand': ['Sony'],
      'connectivity': ['wireless'],
    });

    Alert.alert(t.testDataLoaded || 'Test Data Loaded', t.testDataLoadedMessage || 'Form has been populated with test data for easy testing!');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />

      {/* Test Button */}
      {/* <TouchableOpacity style={styles.testButton} onPress={populateTestData}>
        <Text style={styles.testButtonText}>🧪 LOAD TEST DATA</Text>
      </TouchableOpacity> */}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/selling')} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={20} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t.addNewProduct || 'Add New Product'}</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Terms Notice */}
        <View style={styles.termsContainer}>
          <Text style={styles.termsText}>
            {t.termsNotice || 'Please make sure your product aligns with our'}{' '}
            <Text style={styles.termsLink}>{t.termsAndConditions || 'Terms & Conditions'}</Text>
          </Text>
        </View>

        {!profile?.is_verified && (
          <View style={styles.verificationCard}>
            <View style={styles.verificationHeader}>
              <MaterialCommunityIcons name="shield-check" size={22} color="#047857" />
              <Text style={styles.verificationTitle}>{t.verifyIdentityTitle || 'Verify your identity to list items'}</Text>
            </View>
            <Text style={styles.verificationDescription}>
              Upload a clear photo of your passport, ID card, or driving licence to start selling on Sham.
            </Text>
            <TouchableOpacity
              style={styles.verificationButton}
              onPress={() => setVerificationModalVisible(true)}
            >
              <Text style={styles.verificationButtonText}>
                {verification.status === 'pending' ? 'Verification in progress' : 'Start verification'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Product Details Form */}
        <View style={styles.formContainer}>
          {/* Product Title */}
          {renderInputField(
            t.productTitle || 'Product Title *',
            formData.title,
            (t.enterProductTitle || 'Enter product title'),
            'doc.text',
            (text) => setFormData({ ...formData, title: text })
          )}

          {/* Category Selection */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text style={styles.inputLabel}>{t.category || 'Category *'}</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol name="tag" size={20} color="#6B7280" />
              <Text style={[styles.textInput, !selectedCategory && styles.placeholderText]}>
                {selectedCategory?.name || t.selectCategory || 'Select category'}
              </Text>
              <IconSymbol name="chevron.down" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* Condition */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setConditionModalVisible(true)}
          >
            <Text style={styles.inputLabel}>{t.condition || 'Condition *'}</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol name="checkmark.circle" size={20} color="#6B7280" />
              <Text style={[styles.textInput, !selectedCondition && styles.placeholderText]}>
                {selectedCondition ?
                  (selectedCondition === 'new' ? (t.brandNew || 'Brand New') :
                    selectedCondition === 'used' ? (t.condUsed || 'Used') :
                      selectedCondition === 'refurbished' ? (t.condRefurbished || 'Refurbished') : (t.selectCondition || 'Select condition'))
                  : (t.selectCondition || 'Select condition')}
              </Text>
              <IconSymbol name="chevron.down" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* Price and Currency */}
          <View>


            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setCurrencyModalVisible(true)}
            >
              <Text style={styles.inputLabel}>{t.currency || 'Currency *'}</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol name="globe" size={20} color="#6B7280" />
                <Text style={[styles.textInput, !selectedCurrency && styles.placeholderText]}>
                  {selectedCurrency?.name || t.selectCurrency || 'Select currency'}
                </Text>
                <IconSymbol name="chevron.down" size={16} color="#6B7280" />
              </View>
            </TouchableOpacity>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{t.price || 'Price *'}</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol name="dollarsign.circle" size={20} color="#6B7280" />
                <TextInput
                  style={styles.textInput}
                  value={formData.price}
                  placeholder="0.00"
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Address Selection */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t.location || 'Location *'}</Text>
            {selectedAddress ? (
              <AddressCard
                address={selectedAddress}
                onEdit={() => setLocationPickerVisible(true)}
              />
            ) : (
              <TouchableOpacity
                style={styles.addressSelector}
                onPress={() => setLocationPickerVisible(true)}
              >
                <IconSymbol name="location.fill" size={20} color="#6B7280" />
                <Text style={styles.addressSelectorText}>{t.selectOrAddAddress || 'Select or add an address'}</Text>
                <IconSymbol name="chevron.down" size={16} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Dynamic Attributes for Category */}
          {attributes.length > 0 && (
            <View style={styles.attributesContainer}>
              <Text style={styles.attributesTitle}>{t.itemDetails || 'Item Details'}</Text>
              {attributes.map(attr => (
                <View key={attr.id} style={styles.attributeContainer}>
                  <Text style={styles.attributeLabel}>{attr.name}</Text>
                  <TouchableOpacity
                    style={styles.attributeButton}
                    onPress={() => setAttributeModal({ attr, open: true })}
                  >
                    <Text style={styles.attributeButtonText}>
                      {attributeValues[attr.id] && attributeValues[attr.id].length > 0
                        ? (attributeTermNames[attr.id] || attributeValues[attr.id]).join(', ')
                        : `Select ${attr.name}`}
                    </Text>
                    <IconSymbol name="chevron.down" size={16} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Variants */}
          <View style={styles.variantContainer}>
            <View style={styles.variantHeader}>
              <View style={styles.variantHeaderTextBlock}>
                <Text style={styles.variantLabel}>{t.variants || 'Variants'}</Text>
                <Text style={styles.variantHelperText}>
                  {t.variantsDescription || 'Offer different options (like size or colour) and track stock for each combination.'}
                </Text>
              </View>
              <Switch
                value={variantsEnabled}
                onValueChange={handleVariantToggle}
                trackColor={{ false: '#E2E8F0', true: '#bbf7d0' }}
                thumbColor={variantsEnabled ? '#047857' : '#f4f3f4'}
                ios_backgroundColor="#E2E8F0"
              />
            </View>

            {!variantsEnabled ? (
              <Text style={styles.variantHelperText}>
                {t.variantsDisabledHelper || 'Keep variants off to rely on the quantity field above, or enable variants to manage stock per option (e.g. Size or Colour).'}
              </Text>
            ) : (
              <View style={styles.variantSummaryCard}>
                {variantTypes.length === 0 ? (
                  <Text style={styles.variantHelperText}>
                    {t.noVariantsConfigured || 'No variants configured yet. Add option types to get started.'}
                  </Text>
                ) : (
                  <>
                    <View style={styles.variantSummaryRow}>
                      <Text style={styles.variantSummaryLabel}>{t.optionTypesLabel || 'Option types'}</Text>
                      <Text style={styles.variantSummaryValue}>{variantSummary.optionCount}</Text>
                    </View>
                    <View style={styles.variantSummaryRow}>
                      <Text style={styles.variantSummaryLabel}>{t.optionValuesLabel || 'Option values'}</Text>
                      <Text style={styles.variantSummaryValue}>{variantSummary.valueCount}</Text>
                    </View>
                    <View style={styles.variantSummaryRow}>
                      <Text style={styles.variantSummaryLabel}>{t.activeCombinationsLabel || 'Active combinations'}</Text>
                      <Text style={styles.variantSummaryValue}>
                        {variantSummary.activeCombinationCount}
                      </Text>
                    </View>
                    <View style={styles.variantChipRow}>
                      {variantTypes.map(type => (
                        <View key={type.id} style={styles.variantChip}>
                          <Text style={styles.variantChipLabel}>{type.name || (t.untitledOption || 'Untitled option')}</Text>
                          <Text style={styles.variantChipValue}>{type.options.length} {t.values || 'values'}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            )}

            {variantsEnabled && (
              <TouchableOpacity style={styles.variantManageButton} onPress={openVariantManager}>
                <MaterialCommunityIcons name="tune" size={18} color="#0F172A" />
                <Text style={styles.variantManageButtonText}>
                  {variantTypes.length === 0 ? (t.addVariants || 'Add variants') : (t.manageVariantsButton || 'Manage variants')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t.availableQuantity || 'Available Quantity *'}</Text>
            <View
              style={[
                styles.inputWrapper,
                variantsEnabled && styles.inputWrapperDisabled,
              ]}
            >
              <IconSymbol name="number" size={20} color="#6B7280" />
              <TextInput
                style={[
                  styles.textInput,
                  variantsEnabled && styles.textInputDisabled,
                ]}
                value={simpleQuantity}
                placeholder={t.quantityPlaceholder || 'e.g. 5'}
                onChangeText={handleQuantityChange}
                editable={!variantsEnabled}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
            {variantsEnabled ? (
              <Text style={styles.hintText}>
                {t.quantityManagedPerVariant || 'Quantity is managed per variant when variants are enabled.'}
              </Text>
            ) : (
              <Text style={styles.hintText}>
                {t.quantityHint || 'Buyers will see this many items in stock. Minimum 1.'}
              </Text>
            )}
          </View>

          {/* Description */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t.description || 'Description *'}</Text>
            <View style={styles.textAreaWrapper}>
              <TextInput
                style={styles.textArea}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder={t.describeYourProduct || 'Describe your product...'}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Images */}
          <ImagePreview
            images={images}
            onAddMore={() => setImagePickerVisible(true)}
            onRemoveImage={(index) => setImages(images.filter((_, i) => i !== index))}
            maxImages={10}
          />

          {/* Price Negotiable */}
          <View style={styles.switchContainer}>
            <TouchableOpacity
              style={styles.switchRow}
              onPress={() => setFormData({ ...formData, is_negotiable: !formData.is_negotiable })}
            >
              <View style={[styles.switch, formData.is_negotiable && styles.switchActive]}>
                <View style={[styles.switchThumb, formData.is_negotiable && styles.switchThumbActive]} />
              </View>
              <Text style={styles.switchLabel}>{t.priceNegotiable || 'Price is negotiable'}</Text>
            </TouchableOpacity>
          </View>

          {/* Delivery Options */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setDeliveryOptionsModalVisible(true)}
          >
            <Text style={styles.inputLabel}>{t.deliveryOptions || 'Delivery Options'}</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol name="shippingbox" size={20} color="#6B7280" />
              <Text style={[styles.textInput, !selectedDeliveryOption && styles.placeholderText]}>
                {selectedDeliveryOption ?
                  (selectedDeliveryOption === 'both' ? (t.both || 'Both') :
                    selectedDeliveryOption === 'postage' ? (t.postageOnly || 'Postage Only') :
                      selectedDeliveryOption === 'collection' ? (t.collectionOnly || 'Collection Only') : (t.selectDeliveryOption || 'Select delivery option'))
                  : (t.selectDeliveryOption || 'Select delivery option')}
              </Text>
              <IconSymbol name="chevron.down" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>

          {/* Package Size */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setPackageSizeModalVisible(true)}
          >
            <Text style={styles.inputLabel}>{t.packageSize || 'Package Size'}</Text>
            <View style={styles.inputWrapper}>
              <IconSymbol name="shippingbox" size={20} color="#6B7280" />
              <Text style={[styles.textInput, !selectedPackageSize && styles.placeholderText]}>
                {selectedPackageSize ?
                  (selectedPackageSize === 'large_letter' ? (t.largeLetter || 'Large letter (35×25×2.5 cm)') :
                    selectedPackageSize === 'small_1kg' ? (t.small1kg || 'Small parcel – up to 1 kg') :
                      selectedPackageSize === 'small_2kg' ? (t.small2kg || 'Small parcel – up to 2 kg') :
                        selectedPackageSize === 'medium_1kg' ? (t.medium1kg || 'Medium parcel – up to 1 kg') :
                          selectedPackageSize === 'medium_2kg' ? (t.medium2kg || 'Medium parcel – up to 2 kg') : (t.selectPackageSize || 'Select package size'))
                  : (t.selectPackageSize || 'Select package size')}
              </Text>
              <IconSymbol name="chevron.down" size={16} color="#6B7280" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Selling Fee Information */}
        <View style={styles.feeContainer}>
          <View style={styles.feeHeader}>
            <MaterialCommunityIcons name="information" size={20} color="#0F172A" />
            <Text style={styles.feeTitle}>{t.sellingFee || 'Selling Fee'}</Text>
          </View>
          
          {sellingFeePercentage > 0 ? (
            <>
              <Text style={styles.feeDescription}>
                {t.feeDescription || 'A selling fee will be deducted from your payout after the buyer receives the item.'}
              </Text>

              {(() => {
                const priceValue = formData.price ? parseFloat(formData.price) : 0;
                const isValidPrice = !isNaN(priceValue) && priceValue > 0;

                if (!isValidPrice) {
                  return (
                    <View style={styles.feeBreakdownPlaceholder}>
                      <Text style={styles.feeBreakdownPlaceholderText}>
                        {t.feeBreakdownPlaceholder || 'Enter a price above to see the commission breakdown'}
                      </Text>
                    </View>
                  );
                }

                return (
                  <View style={styles.feeBreakdown}>
                    <Text style={styles.feeBreakdownTitle}>{t.commissionBreakdown || 'Commission Breakdown'}</Text>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>{t.salePrice || 'Sale Price'}:</Text>
                      <Text style={styles.feeValue}>
                        {selectedCurrency?.symbol || formData.currency || 'SYP'}{priceValue.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.feeRow}>
                      <Text style={styles.feeLabel}>
                        {t.sellingFee || 'Selling Fee'} ({sellingFeePercentage}%):
                      </Text>
                      <Text style={[styles.feeValue, styles.feeValueNegative]}>
                        -{selectedCurrency?.symbol || formData.currency || 'SYP'}
                        {((priceValue * sellingFeePercentage) / 100).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.feeDivider} />
                    <View style={[styles.feeRow, styles.feeRowTotal]}>
                      <Text style={styles.feeLabelTotal}>{t.youWillReceive || 'You Will Receive'}:</Text>
                      <Text style={styles.feeValueTotal}>
                        {selectedCurrency?.symbol || formData.currency || 'SYP'}
                        {(priceValue * (1 - sellingFeePercentage / 100)).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              <TouchableOpacity
                style={styles.feeAgreementRow}
                onPress={() => setFeeAgreementAccepted(!feeAgreementAccepted)}
              >
                <View style={[styles.checkbox, feeAgreementAccepted && styles.checkboxChecked]}>
                  {feeAgreementAccepted && (
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.feeAgreementText}>
                  {t.feeAgreement || 'I agree to pay the selling fee when my item is sold.'}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.feeDescription}>
              {t.noSellingFee || 'No selling fees apply. You will receive the full sale price.'}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.replace('/selling')}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? (t.creating || 'Creating...') : (t.createListing || 'Create Listing')}
            </Text>
            {!loading && <IconSymbol name="arrow.right" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      <VariantManagerModal
        visible={variantManagerVisible}
        onCancel={handleVariantManagerCancel}
        onSave={handleVariantManagerSave}
        attributes={attributes}
        initialTypes={variantTypes}
        initialStocks={variantStocks}
        initialDisabledMap={variantDisabledMap}
        translations={t}
      />

      {/* Modals */}
      <CategorySelectModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={(category) => {
          setSelectedCategory(category);
          setFormData({ ...formData, category_id: category.id });
        }}
        selectedCategoryId={selectedCategory?.id}
      />

      <ConditionSelectModal
        visible={conditionModalVisible}
        onClose={() => setConditionModalVisible(false)}
        onSelect={(condition) => {
          setSelectedCondition(condition.id);
          setFormData(prev => ({ ...prev, condition: condition.id }));
        }}
        selectedConditionId={selectedCondition || undefined}
      />

      <CurrencySelectModal
        visible={currencyModalVisible}
        onClose={() => setCurrencyModalVisible(false)}
        onSelect={(currency) => {
          setSelectedCurrency(currency);
          setFormData({ ...formData, currency: currency.id });
        }}
        selectedCurrencyId={selectedCurrency?.id}
      />

      <DeliverySelectModal
        visible={deliveryModalVisible}
        onClose={() => setDeliveryModalVisible(false)}
        onSelect={(delivery) => {
          setSelectedDelivery(delivery);
          setFormData({ ...formData, delivery_option: delivery.id });
        }}
        selectedOptionId={selectedDelivery?.id}
      />

      {attributeModal?.attr && (
        <AttributeValueModal
          visible={attributeModal.open}
          onClose={() => setAttributeModal(null)}
          onSelect={(terms) => {
            setAttributeValues(v => ({
              ...v,
              [attributeModal.attr.id]: terms.map(t => t.id)
            }));
            setAttributeTermNames(n => ({
              ...n,
              [attributeModal.attr.id]: terms.map(t => t.name)
            }));
          }}
          attribute={attributeModal.attr}
          value={attributeValues[attributeModal.attr.id] || []}
        />
      )}

      <LocationPicker
        visible={locationPickerVisible}
        onClose={() => setLocationPickerVisible(false)}
        onSelect={(address) => {
          setSelectedAddress(address);
          setFormData({ ...formData, location: address.address_line_1 });
        }}
        selectedAddressId={selectedAddress?.id}
      />

      <DeliveryOptionsModal
        visible={deliveryOptionsModalVisible}
        onClose={() => setDeliveryOptionsModalVisible(false)}
        onSelect={(option) => {
          setSelectedDeliveryOption(option.id);
          setFormData(prev => ({ ...prev, delivery_option: option.id }));
        }}
        selectedOptionId={selectedDeliveryOption || undefined}
      />

      <PackageSizeModal
        visible={packageSizeModalVisible}
        onClose={() => setPackageSizeModalVisible(false)}
        onSelect={(size) => {
          setSelectedPackageSize(size.id);
        }}
        selectedSizeId={selectedPackageSize || undefined}
      />

      <ImagePickerModal
        visible={imagePickerVisible}
        onClose={() => setImagePickerVisible(false)}
        onImagesSelected={setImages}
        selectedImages={images}
        maxImages={10}
      />
      <VerificationModal
        visible={verificationModalVisible}
        onClose={() => setVerificationModalVisible(false)}
        onSubmitted={() => {
          verification.refetch();
          setVerificationModalVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  testButton: {
    backgroundColor: '#10B981',
    margin: 20,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  termsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  termsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  termsLink: {
    color: '#61d5b6',
    fontWeight: '600',
  },
  verificationCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 12,
  },
  verificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065f46',
  },
  verificationDescription: {
    fontSize: 14,
    color: '#047857',
    lineHeight: 20,
  },
  verificationButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    height: UI.dimensions.buttonHeight,
    justifyContent: 'center',
    borderRadius: UI.dimensions.borderRadius,
  },
  verificationButtonText: {
    color: '#ecfdf5',
    fontSize: 14,
    fontWeight: '600',
  },
  formContainer: {
    paddingHorizontal: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.borderRadius,
    paddingHorizontal: 16,
    height: UI.dimensions.inputHeight,
    gap: 12,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
  },
  inputWrapperDisabled: {
    backgroundColor: '#F3F4F6',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  textInputDisabled: {
    color: '#9CA3AF',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  textAreaWrapper: {
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.borderRadius,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
    padding: 16,
  },
  textArea: {
    fontSize: 16,
    color: '#000',
    minHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#61d5b6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  browseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shippingCard: {
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.borderRadius,
    padding: 16,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
  },
  shippingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  shippingLogo: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  shippingLogoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shippingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  shippingDetails: {
    gap: 4,
  },
  shippingDetail: {
    fontSize: 14,
    color: '#6B7280',
  },
  scoreContainer: {
    backgroundColor: UI.colors.background,
    borderRadius: UI.dimensions.borderRadius,
    padding: 16,
    marginBottom: 20,
    borderWidth: UI.dimensions.borderWidth,
    borderColor: UI.colors.border,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#61d5b6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreInfo: {
    flex: 1,
  },
  scoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  scoreDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.colors.primary,
    marginHorizontal: 20,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    gap: 8,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreview: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadArea: {
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  uploadText: {
    fontSize: 12,
    color: '#6B7280',
  },
  switchContainer: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#61d5b6',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchThumbActive: {
    transform: [{ translateX: 20 }],
  },
  switchLabel: {
    fontSize: 16,
    color: '#000',
  },
  deliveryOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  deliveryOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  deliveryOptionActive: {
    backgroundColor: '#61d5b6',
  },
  deliveryOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  deliveryOptionTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: UI.dimensions.buttonHeight,
    borderRadius: UI.dimensions.borderRadius,
    backgroundColor: UI.colors.primary,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  variantContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  variantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  variantHeaderTextBlock: {
    flex: 1,
    gap: 4,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  variantHelperText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  variantSummaryCard: {
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  variantSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantSummaryLabel: {
    fontSize: 13,
    color: '#475569',
  },
  variantSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  variantChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantChipValue: {
    fontSize: 11,
    color: '#475569',
  },
  variantManageButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  variantManageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantContent: {
    gap: 16,
  },
  variantTypeCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    backgroundColor: '#F8FAFC',
  },
  variantTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  variantSourceToggle: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 4,
    gap: 4,
  },
  variantSourceOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  variantSourceOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  variantSourceOptionDisabled: {
    opacity: 0.4,
  },
  variantSourceOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  variantSourceOptionTextActive: {
    color: '#0F172A',
  },
  variantSourceOptionTextDisabled: {
    color: '#94A3B8',
  },
  variantTypeInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#0F172A',
    paddingVertical: 6,
  },
  variantIconButton: {
    padding: 8,
  },
  variantAttributeSection: {
    gap: 12,
  },
  variantAttributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  variantAttributeButtonTextBlock: {
    flex: 1,
    gap: 2,
  },
  variantAttributeButtonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantAttributeButtonSub: {
    fontSize: 12,
    color: '#0F172A',
    opacity: 0.8,
  },
  attributeTermList: {
    gap: 8,
  },
  attributeTermLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  attributeTermChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attributeTermChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#F0F9FF',
  },
  attributeTermChipActive: {
    backgroundColor: '#0EA5E9',
    borderColor: '#0EA5E9',
  },
  attributeTermChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0369A1',
  },
  attributeTermChipTextActive: {
    color: '#FFFFFF',
  },
  variantValueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variantValueInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  variantAddValueButton: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  variantAddValueButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  variantAddValueButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  variantValuePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantValuePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  variantValuePillSynced: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    borderWidth: 1,
  },
  variantValuePillText: {
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '600',
  },
  variantValuePillTextSynced: {
    color: '#047857',
  },
  variantPillRemove: {
    padding: 2,
  },
  variantAddTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  variantAddTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantGroupingContainer: {
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  variantGroupingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  variantGroupingTextBlock: {
    flex: 1,
    gap: 4,
  },
  variantGroupingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  variantGroupingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantGroupingOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  variantGroupingOptionActive: {
    backgroundColor: '#0EA5E9',
  },
  variantGroupingOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  variantGroupingOptionTextActive: {
    color: '#FFFFFF',
  },
  variantInventoryContainer: {
    gap: 12,
  },
  variantInventoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  variantInventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  variantInventoryLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  variantInventoryInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 15,
    color: '#0F172A',
  },
  variantGroupContainer: {
    gap: 8,
  },
  variantGroupLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  variantGroupRows: {
    gap: 8,
  },
  variantManagerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  variantManagerHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  variantManagerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  variantManagerScroll: {
    flex: 1,
  },
  variantManagerScrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  variantManagerSection: {
    gap: 12,
  },
  variantManagerSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantManagerSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  variantManagerAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  variantManagerAddButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
  },
  variantManagerOptionCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  variantManagerOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  variantManagerOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  variantManagerOptionMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantManagerOptionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  variantManagerOptionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantManagerOptionActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
  variantManagerValueChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantManagerValueChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  variantManagerValueChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  variantManagerInfoText: {
    fontSize: 12,
    color: '#6B7280',
  },
  variantManagerCombinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  variantManagerCombinationToggle: {
    padding: 4,
  },
  variantManagerCombinationLabel: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  variantManagerCombinationLabelDisabled: {
    color: '#94A3B8',
  },
  variantManagerCombinationInput: {
    width: 80,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    textAlign: 'center',
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  variantManagerCombinationInputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  variantManagerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  variantManagerSecondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  variantManagerSecondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  variantManagerPrimaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#61d5b6',
  },
  variantManagerPrimaryButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  variantManagerPrimaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  variantManagerFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    marginBottom: 6,
  },
  variantManagerTextInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#000',
    backgroundColor: '#fff',
  },
  variantManagerAttributeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variantManagerAttributeNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  variantManagerAttributeNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  variantManagerAttributeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  variantManagerAttributeChipActive: {
    borderColor: '#61d5b6',
    backgroundColor: '#F3F4F6',
  },
  variantManagerAttributeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  variantManagerAttributeChipTextActive: {
    color: '#61d5b6',
  },
  variantManagerAttributeTerms: {
    gap: 8,
  },
  variantEditorContainer: {
    gap: 16,
  },
  variantEditorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantEditorBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  variantEditorScrollContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  variantManagerModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  attributesContainer: {
    marginBottom: 20,
  },
  attributesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  attributeContainer: {
    marginBottom: 16,
  },
  attributeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  attributeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  attributeButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  addressSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  addressSelectorText: {
    flex: 1,
    fontSize: 16,
    color: '#6B7280',
  },
  feeContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  feeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  feeDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  feeBreakdown: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  feeBreakdownTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  feeBreakdownPlaceholder: {
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  feeBreakdownPlaceholderText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feeRowTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  feeLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  feeValueNegative: {
    color: '#DC2626',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  feeLabelTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  feeValueTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#047857',
  },
  feeAgreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#047857',
    borderColor: '#047857',
  },
  feeAgreementText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
});

export const options = {
  headerShown: false,
};

interface VariantManagerModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (data: {
    types: VariantType[];
    stocks: Record<string, string>;
    disabledMap: Record<string, boolean>;
  }) => void;
  attributes: any[];
  initialTypes: VariantType[];
  initialStocks: Record<string, string>;
  initialDisabledMap: Record<string, boolean>;
  translations: any;
}

type VariantEditorState = {
  mode: 'create' | 'edit';
  typeId?: string;
  name: string;
  source: 'custom' | 'attribute';
  attributeId: string | null;
  options: VariantOption[];
  draftValue: string;
};

function VariantManagerModal({
  visible,
  onCancel,
  onSave,
  attributes,
  initialTypes,
  initialStocks,
  initialDisabledMap,
  translations: t,
}: VariantManagerModalProps) {
  const [draftTypes, setDraftTypes] = useState<VariantType[]>([]);
  const [draftStocks, setDraftStocks] = useState<Record<string, string>>({});
  const [draftDisabledMap, setDraftDisabledMap] = useState<Record<string, boolean>>({});
  const [editorState, setEditorState] = useState<VariantEditorState | null>(null);
  const [variantEditorVisible, setVariantEditorVisible] = useState(false);

  const attributeMap = useMemo(() => {
    const map = new Map<string, any>();
    attributes.forEach(attr => map.set(attr.id, attr));
    return map;
  }, [attributes]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const clonedTypes = initialTypes.map(type => ({
      ...type,
      options: type.options.map(option => ({ ...option })),
    }));
    setDraftTypes(clonedTypes);
    setDraftStocks({ ...initialStocks });
    setDraftDisabledMap({ ...initialDisabledMap });
    setEditorState(null);
    setVariantEditorVisible(false);
  }, [visible, initialTypes, initialStocks, initialDisabledMap]);

  const draftCombinations = useMemo(
    () => buildVariantCombinations(draftTypes),
    [draftTypes]
  );

  useEffect(() => {
    if (!visible) return;
    const keys = new Set(draftCombinations.map(combo => combo.key));

    setDraftStocks(prev => {
      let changed = false;
      const next: Record<string, string> = {};

      keys.forEach(key => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        } else {
          next[key] = '';
          changed = true;
        }
      });

      Object.keys(prev).forEach(key => {
        if (!keys.has(key)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    setDraftDisabledMap(prev => {
      let changed = false;
      const next: Record<string, boolean> = {};

      keys.forEach(key => {
        if (prev[key] !== undefined) {
          next[key] = prev[key];
        } else {
          next[key] = false;
          changed = true;
        }
      });

      Object.keys(prev).forEach(key => {
        if (!keys.has(key)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [visible, draftCombinations]);

  const canAddMoreTypes = draftTypes.length < MAX_VARIANT_TYPES;

  const startCreateType = () => {
    setEditorState({
      mode: 'create',
      name: '',
      source: 'custom',
      attributeId: attributes.length > 0 ? attributes[0].id : null,
      options: [],
      draftValue: '',
    });
    setVariantEditorVisible(true);
  };

  const startEditType = (type: VariantType) => {
    setEditorState({
      mode: 'edit',
      typeId: type.id,
      name: type.name,
      source: type.source,
      attributeId: type.attributeId ?? null,
      options: type.options.map(option => ({ ...option })),
      draftValue: '',
    });
    setVariantEditorVisible(true);
  };

  const removeType = (typeId: string) => {
    setDraftTypes(prev => prev.filter(type => type.id !== typeId));
  };

  const handleCombinationToggle = (comboKey: string) => {
    setDraftDisabledMap(prev => ({
      ...prev,
      [comboKey]: !(prev[comboKey] ?? false),
    }));
  };

  const handleCombinationStockChange = (comboKey: string, value: string) => {
    const sanitized = value.replace(/[^0-9]/g, '');
    setDraftStocks(prev => ({
      ...prev,
      [comboKey]: sanitized,
    }));
  };

  const handleEditorSourceChange = (source: 'custom' | 'attribute') => {
    if (!editorState) return;
    if (source === 'attribute' && attributes.length === 0) {
      Alert.alert(
        t.noCategoryAttributesAlert || 'No category attributes',
        t.noCategoryAttributesMessage || 'Select a category with attributes before using this option type.'
      );
      return;
    }

    setEditorState(prev => {
      if (!prev) return prev;
      if (source === prev.source) return prev;

      const nextAttributeId =
        source === 'attribute'
          ? (prev.attributeId && attributeMap.has(prev.attributeId)
            ? prev.attributeId
            : attributes[0]?.id ?? null)
          : null;

      const attribute = nextAttributeId ? attributeMap.get(nextAttributeId) : null;
      const shouldRename =
        source === 'attribute' &&
        (!prev.name.trim().length ||
          defaultVariantTypeNames.includes(prev.name.trim()) ||
          attribute?.name === prev.name);

      return {
        ...prev,
        source,
        attributeId: source === 'attribute' ? nextAttributeId : null,
        name:
          shouldRename && attribute ? attribute.name : prev.name,
        options:
          source === 'attribute'
            ? prev.options.filter(option => option.isCustom)
            : prev.options.map(option => ({ ...option, isCustom: undefined })),
      };
    });
  };

  const handleEditorAttributeSelect = (attributeId: string) => {
    setEditorState(prev => {
      if (!prev || prev.source !== 'attribute') return prev;
      const attribute = attributeMap.get(attributeId);
      if (!attribute) return prev;

      const shouldRename =
        !prev.name.trim().length ||
        defaultVariantTypeNames.includes(prev.name.trim()) ||
        (prev.attributeId && attributeMap.get(prev.attributeId)?.name === prev.name);

      return {
        ...prev,
        attributeId,
        name: shouldRename ? attribute.name : prev.name,
        options: prev.options.filter(option => option.isCustom),
      };
    });
  };

  const handleEditorAddValue = () => {
    if (!editorState) return;
    const value = editorState.draftValue.trim();
    if (!value) return;

    const exists = editorState.options.some(
      option => option.value.toLowerCase() === value.toLowerCase()
    );

    if (exists) {
      Alert.alert(t.duplicateValue || 'Duplicate value', t.duplicateValueMessage || 'This value has already been added.');
      return;
    }

    setEditorState(prev => {
      if (!prev) return prev;
      const newOption: VariantOption = {
        id: createId(),
        value,
        ...(prev.source === 'attribute' ? { isCustom: true } : {}),
      };
      return {
        ...prev,
        options: [...prev.options, newOption],
        draftValue: '',
      };
    });
  };

  const handleEditorRemoveValue = (optionId: string) => {
    setEditorState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        options: prev.options.filter(option => option.id !== optionId),
      };
    });
  };

  const handleToggleAttributeTerm = (term: any) => {
    setEditorState(prev => {
      if (!prev || prev.source !== 'attribute') return prev;
      const exists = prev.options.some(option => option.id === term.id);
      return {
        ...prev,
        options: exists
          ? prev.options.filter(option => option.id !== term.id)
          : [
            ...prev.options,
            { id: term.id, value: term.name, isCustom: false },
          ],
      };
    });
  };

  const handleEditorSave = () => {
    if (!editorState) return;
    const trimmedName = editorState.name.trim();
    if (editorState.source === 'custom') {
      if (!trimmedName) {
        Alert.alert(t.nameRequired || 'Name required', t.nameRequiredMessage || 'Enter a name for this option type.');
        return;
      }
    }

    if (editorState.source === 'attribute' && !editorState.attributeId) {
      Alert.alert(t.attributeRequired || 'Attribute required', t.attributeRequiredMessage || 'Choose an attribute to pull terms from.');
      return;
    }

    if (editorState.options.length === 0) {
      Alert.alert(t.addValues || 'Add values', t.addValuesMessage || 'Add at least one value for this option type.');
      return;
    }

    const attribute =
      editorState.source === 'attribute' && editorState.attributeId
        ? attributeMap.get(editorState.attributeId)
        : null;

    const finalName =
      editorState.source === 'attribute'
        ? attribute?.name || trimmedName || 'Option'
        : trimmedName;

    const normalizedOptions = editorState.options.map(option => ({
      ...option,
      value: option.value.trim(),
    }));

    const newType: VariantType = {
      id: editorState.mode === 'edit' && editorState.typeId ? editorState.typeId : createId(),
      name: finalName,
      source: editorState.source,
      attributeId:
        editorState.source === 'attribute' ? editorState.attributeId : null,
      options: normalizedOptions,
    };

    setDraftTypes(prev => {
      if (editorState.mode === 'edit' && editorState.typeId) {
        return prev.map(type => (type.id === editorState.typeId ? newType : type));
      }
      if (prev.length >= MAX_VARIANT_TYPES) {
        return prev;
      }
      return [...prev, newType];
    });

    setVariantEditorVisible(false);
    setEditorState(null);
  };

  const handleEditorCancel = () => {
    setVariantEditorVisible(false);
    setEditorState(null);
  };

  const handleSave = () => {
    const cleanedTypes = draftTypes.map(type => ({
      ...type,
      options: type.options.map(option => ({ ...option })),
    }));
    onSave({
      types: cleanedTypes,
      stocks: { ...draftStocks },
      disabledMap: { ...draftDisabledMap },
    });
  };

  if (!visible) {
    return null;
  }

  const renderOverview = () => (
    <>
      {/* Header */}
      <View style={styles.variantManagerHeader}>
        <Text style={styles.variantManagerHeaderTitle}>{t.manageVariants || 'Manage variants'}</Text>
        <TouchableOpacity onPress={handleOverviewCancel} style={styles.variantManagerCloseButton}>
          <IconSymbol name="xmark" size={20} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.variantManagerScroll}
        contentContainerStyle={styles.variantManagerScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.variantManagerSection}>
          <View style={styles.variantManagerSectionHeader}>
            <Text style={styles.variantManagerSectionTitle}>{t.optionTypes || 'Option types'}</Text>
            {canAddMoreTypes && (
              <TouchableOpacity
                style={styles.variantManagerAddButton}
                onPress={startCreateType}
              >
                <MaterialCommunityIcons name="plus-circle" size={18} color="#0F172A" />
                <Text style={styles.variantManagerAddButtonText}>{t.addOption || 'Add option'}</Text>
              </TouchableOpacity>
            )}
          </View>
          {draftTypes.length === 0 ? (
            <Text style={styles.variantHelperText}>
              {t.createOptionTypeHelper || 'Create an option type (e.g. Size) and add the values customers can choose from.'}
            </Text>
          ) : (
            draftTypes.map(type => (
              <View key={type.id} style={styles.variantManagerOptionCard}>
                <View style={styles.variantManagerOptionHeader}>
                  <View>
                    <Text style={styles.variantManagerOptionTitle}>{type.name}</Text>
                    <Text style={styles.variantManagerOptionMeta}>
                      {type.options.length} {type.options.length === 1 ? (t.value || 'value') : (t.values || 'values')}
                    </Text>
                  </View>
                  <View style={styles.variantManagerOptionActions}>
                    <TouchableOpacity
                      style={styles.variantManagerOptionAction}
                      onPress={() => startEditType(type)}
                    >
                      <MaterialCommunityIcons name="pencil" size={16} color="#0F172A" />
                      <Text style={styles.variantManagerOptionActionText}>{t.edit || 'Edit'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.variantManagerOptionAction}
                      onPress={() => removeType(type.id)}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
                      <Text style={[styles.variantManagerOptionActionText, { color: '#EF4444' }]}>
                        {t.remove || 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.variantManagerValueChips}>
                  {type.options.slice(0, 4).map(option => (
                    <View key={option.id} style={styles.variantManagerValueChip}>
                      <Text style={styles.variantManagerValueChipText}>{option.value}</Text>
                    </View>
                  ))}
                  {type.options.length > 4 && (
                    <View style={styles.variantManagerValueChip}>
                      <Text style={styles.variantManagerValueChipText}>
                        +{type.options.length - 4} {t.more || 'more'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
          {!canAddMoreTypes && draftTypes.length >= MAX_VARIANT_TYPES && (
            <Text style={styles.variantManagerInfoText}>
              {(t.maxOptionTypes || 'You can add up to {max} option types.').replace('{max}', MAX_VARIANT_TYPES.toString())}
            </Text>
          )}
        </View>

        <View style={styles.variantManagerSection}>
          <Text style={styles.variantManagerSectionTitle}>{t.inventoryCombinations || 'Inventory combinations'}</Text>
          {draftCombinations.length === 0 ? (
            <Text style={styles.variantHelperText}>
              {t.inventoryCombinationsHelper || 'Once each option type has at least one value, all combinations will appear here so you can set availability and stock.'}
            </Text>
          ) : (
            draftCombinations.map(combo => {
              const disabled = draftDisabledMap[combo.key] ?? false;
              return (
                <View key={combo.key} style={styles.variantManagerCombinationRow}>
                  <TouchableOpacity
                    style={styles.variantManagerCombinationToggle}
                    onPress={() => handleCombinationToggle(combo.key)}
                  >
                    <MaterialCommunityIcons
                      name={disabled ? 'checkbox-blank-outline' : 'checkbox-marked'}
                      size={20}
                      color={disabled ? '#94A3B8' : '#61d5b6'}
                    />
                  </TouchableOpacity>
                  <Text
                    style={[
                      styles.variantManagerCombinationLabel,
                      disabled && styles.variantManagerCombinationLabelDisabled,
                    ]}
                  >
                    {combo.label}
                  </Text>
                  <TextInput
                    style={[
                      styles.variantManagerCombinationInput,
                      disabled && styles.variantManagerCombinationInputDisabled,
                    ]}
                    value={draftStocks[combo.key] || ''}
                    onChangeText={value => handleCombinationStockChange(combo.key, value)}
                    editable={!disabled}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.variantManagerFooter}>
        <TouchableOpacity style={styles.variantManagerSecondaryButton} onPress={handleOverviewCancel}>
          <Text style={styles.variantManagerSecondaryButtonText}>{t.cancel || 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.variantManagerPrimaryButton,
            draftTypes.length === 0 && styles.variantManagerPrimaryButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={draftTypes.length === 0}
        >
          <Text style={styles.variantManagerPrimaryButtonText}>{t.saveVariants || 'Save variants'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderEditor = () => {
    if (!editorState) return null;
    const selectedAttribute =
      editorState.source === 'attribute' && editorState.attributeId
        ? attributeMap.get(editorState.attributeId)
        : null;

    return (
      <>
        {/* Header */}
        <View style={styles.variantManagerHeader}>
          <Text style={styles.variantManagerHeaderTitle}>
            {editorState.mode === 'create' ? (t.addOptionType || 'Add option type') : (t.editOptionType || 'Edit option type')}
          </Text>
          <TouchableOpacity onPress={handleEditorCancel} style={styles.variantManagerCloseButton}>
            <IconSymbol name="xmark" size={20} color="#000" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.variantManagerScroll}
          contentContainerStyle={styles.variantEditorScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.variantManagerSection}>
            <Text style={styles.variantManagerFieldLabel}>{t.valueSource || 'Value source'}</Text>
            <View style={styles.variantSourceToggle}>
              <TouchableOpacity
                style={[
                  styles.variantSourceOption,
                  editorState.source === 'custom' && styles.variantSourceOptionActive,
                ]}
                onPress={() => handleEditorSourceChange('custom')}
              >
                <MaterialCommunityIcons
                  name="pencil-circle-outline"
                  size={16}
                  color={editorState.source === 'custom' ? '#0F172A' : '#64748B'}
                />
                <Text
                  style={[
                    styles.variantSourceOptionText,
                    editorState.source === 'custom' && styles.variantSourceOptionTextActive,
                  ]}
                >
                  {t.customList || 'Custom list'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.variantSourceOption,
                  editorState.source === 'attribute' && styles.variantSourceOptionActive,
                  attributes.length === 0 && styles.variantSourceOptionDisabled,
                ]}
                disabled={attributes.length === 0}
                onPress={() => handleEditorSourceChange('attribute')}
              >
                <MaterialCommunityIcons
                  name="tag-multiple-outline"
                  size={16}
                  color={editorState.source === 'attribute' ? '#0F172A' : '#64748B'}
                />
                <Text
                  style={[
                    styles.variantSourceOptionText,
                    editorState.source === 'attribute' &&
                    styles.variantSourceOptionTextActive,
                    attributes.length === 0 && styles.variantSourceOptionTextDisabled,
                  ]}
                >
                  {t.categoryAttribute || 'Category attribute'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {editorState.source === 'custom' ? (
            <View style={styles.variantManagerSection}>
              <Text style={styles.variantManagerFieldLabel}>{t.optionName || 'Option name'}</Text>
              <TextInput
                style={styles.variantManagerTextInput}
                value={editorState.name}
                onChangeText={name => setEditorState(prev => prev && { ...prev, name })}
                placeholder={t.optionNamePlaceholder || 'e.g. Size'}
                placeholderTextColor="#94A3B8"
              />
            </View>
          ) : selectedAttribute ? (
            <View style={styles.variantManagerSection}>
              <Text style={styles.variantManagerFieldLabel}>{t.optionName || 'Option name'}</Text>
              <View style={styles.variantManagerAttributeNameBadge}>
                <MaterialCommunityIcons name="tag-outline" size={16} color="#0F172A" />
                <Text style={styles.variantManagerAttributeNameText}>
                  {selectedAttribute.name}
                </Text>
              </View>
            </View>
          ) : null}

          {editorState.source === 'attribute' && (
            <View style={styles.variantManagerSection}>
              <Text style={styles.variantManagerFieldLabel}>{t.attribute || 'Attribute'}</Text>
              {attributes.length === 0 ? (
                <Text style={styles.variantHelperText}>
                  {t.noCategoryAttributes || 'The selected category has no attributes. Switch back to a custom list.'}
                </Text>
              ) : (
                <View style={styles.variantManagerAttributeList}>
                  {attributes.map(attr => {
                    const isActive = attr.id === editorState.attributeId;
                    return (
                      <TouchableOpacity
                        key={attr.id}
                        style={[
                          styles.variantManagerAttributeChip,
                          isActive && styles.variantManagerAttributeChipActive,
                        ]}
                        onPress={() => handleEditorAttributeSelect(attr.id)}
                      >
                        <Text
                          style={[
                            styles.variantManagerAttributeChipText,
                            isActive && styles.variantManagerAttributeChipTextActive,
                          ]}
                        >
                          {attr.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {selectedAttribute && selectedAttribute.terms?.length > 0 && (
                <View style={styles.variantManagerAttributeTerms}>
                  <Text style={styles.variantManagerFieldLabel}>
                    {(t.attributeTerms || '{name} terms').replace('{name}', selectedAttribute.name)}
                  </Text>
                  <View style={styles.attributeTermChips}>
                    {selectedAttribute.terms.map((term: any) => {
                      const selected = editorState.options.some(option => option.id === term.id);
                      return (
                        <TouchableOpacity
                          key={term.id}
                          style={[
                            styles.attributeTermChip,
                            selected && styles.attributeTermChipActive,
                          ]}
                          onPress={() => handleToggleAttributeTerm(term)}
                        >
                          <Text
                            style={[
                              styles.attributeTermChipText,
                              selected && styles.attributeTermChipTextActive,
                            ]}
                          >
                            {term.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {selectedAttribute && (!selectedAttribute.terms || selectedAttribute.terms.length === 0) && (
                <Text style={styles.variantHelperText}>
                  {t.noAttributeTerms || 'This attribute has no predefined terms. Add custom values below.'}
                </Text>
              )}
            </View>
          )}

          <View style={styles.variantManagerSection}>
            <Text style={styles.variantManagerFieldLabel}>{t.valuesLabel || 'Values'}</Text>
            <View style={styles.variantValueInputRow}>
              <TextInput
                style={styles.variantValueInput}
                value={editorState.draftValue}
                onChangeText={value => setEditorState(prev => prev && { ...prev, draftValue: value })}
                placeholder={t.addValuePlaceholder || 'Add a value (e.g. Red)'}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity
                style={[
                  styles.variantAddValueButton,
                  !editorState.draftValue.trim() && styles.variantAddValueButtonDisabled,
                ]}
                onPress={handleEditorAddValue}
                disabled={!editorState.draftValue.trim()}
              >
                <Text style={styles.variantAddValueButtonText}>{t.add || 'Add'}</Text>
              </TouchableOpacity>
            </View>
            {editorState.options.length === 0 ? (
              <Text style={styles.variantHelperText}>
                {t.valuesHelper || 'Added values will appear here. You can remove them at any time.'}
              </Text>
            ) : (
              <View style={styles.variantValuePills}>
                {editorState.options.map(option => (
                  <View
                    key={option.id}
                    style={[
                      styles.variantValuePill,
                      editorState.source === 'attribute' &&
                      !option.isCustom &&
                      styles.variantValuePillSynced,
                    ]}
                  >
                    <Text
                      style={[
                        styles.variantValuePillText,
                        editorState.source === 'attribute' &&
                        !option.isCustom &&
                        styles.variantValuePillTextSynced,
                      ]}
                    >
                      {option.value}
                    </Text>
                    <TouchableOpacity
                      style={styles.variantPillRemove}
                      onPress={() => handleEditorRemoveValue(option.id)}
                      accessibilityLabel={`${t.remove || 'Remove'} ${option.value}`}
                    >
                      <MaterialCommunityIcons name="close-circle" size={16} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.variantManagerFooter}>
          <TouchableOpacity
            style={styles.variantManagerSecondaryButton}
            onPress={handleEditorCancel}
          >
            <Text style={styles.variantManagerSecondaryButtonText}>{t.cancel || 'Cancel'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.variantManagerPrimaryButton} onPress={handleEditorSave}>
            <Text style={styles.variantManagerPrimaryButtonText}>{t.saveOption || 'Save option'}</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const handleOverviewCancel = () => {
    setVariantEditorVisible(false);
    setEditorState(null);
    onCancel();
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleOverviewCancel}
      >
        <SafeAreaView style={styles.variantManagerModal}>
          {renderOverview()}
        </SafeAreaView>
        <Modal
          visible={variantEditorVisible && visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleEditorCancel}
        >
          <SafeAreaView style={styles.variantManagerModal}>
            {renderEditor()}
          </SafeAreaView>
        </Modal>
      </Modal>

    </>
  );
}
