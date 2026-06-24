import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { useAuthContext } from "../contexts/AuthContext";
import { useDirection } from "../hooks/useDirection";
// Commented out delivery estimation since AddressSelector is disabled
// import { useDeliveryEstimation } from "../hooks/useDeliveryEstimation";
import {
  ChevronLeft,
  Package,
  Shield,
  Edit,
  Plus,
  Phone,
  HelpCircle,
  // AlertCircle, // Commented out since delivery estimation is disabled
} from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { RadioGroup, RadioGroupItem } from "@/components/shadcn/radio-group";
import { Label } from "@/components/shadcn/label";
import { Input } from "@/components/shadcn/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Textarea } from "@/components/shadcn/textarea";
import { PickupLocationSelector } from "@/components/Products/PickupLocationSelector";
// Commented out AddressSelector since delivery address is disabled
// import {
//   AddressSelector,
//   Address,
// } from "@/components/Location/AddressSelector";
import { supabase } from "../lib/supabase";
import { Product, DeliveryMethod, PickupLocation } from "@/types/database";
import { OrderService } from "../services/OrderService";

const PHONE_COUNTRIES = [
  { code: "GB", dialCode: "+44", label: "United Kingdom" },
  { code: "SY", dialCode: "+963", label: "Syria" },
  { code: "AE", dialCode: "+971", label: "United Arab Emirates" },
  { code: "SA", dialCode: "+966", label: "Saudi Arabia" },
  { code: "US", dialCode: "+1", label: "United States" },
  { code: "FR", dialCode: "+33", label: "France" },
  { code: "DE", dialCode: "+49", label: "Germany" },
];

const MAX_INSTRUCTIONS_LENGTH = 300;

export function CheckoutPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthContext();
  const { isRTL } = useDirection();
  const navigate = useNavigate();
  // Commented out delivery estimation since AddressSelector is disabled
  // const { homeDelivery, pickupDelivery, estimateDelivery } =
  //   useDeliveryEstimation();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<"pickup" | "home">(
    "pickup"
  );
  const [deliveryMethod, setDeliveryMethod] = useState<
    "both" | "postage" | "collection"
  >("both");
  const [selectedPickupLocation, setSelectedPickupLocation] =
    useState<PickupLocation | null>(null);
  const [showPickupSelector, setShowPickupSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  // Commented out address-related state since AddressSelector is disabled
  // const [deliveryAddress, setDeliveryAddress] = useState<Address | null>(null);
  // const [hasEstimatedDelivery, setHasEstimatedDelivery] = useState(false);
  const [contactCountry, setContactCountry] = useState("GB");
  const [contactPhone, setContactPhone] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  // New state for enhanced order fields
  // const [shippingAddressId, setShippingAddressId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState<string | null>(null);
  const [dbDeliveryMethod, setDbDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const selectedPhoneCountry =
    PHONE_COUNTRIES.find((country) => country.code === contactCountry) ??
    PHONE_COUNTRIES[0];

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchDeliveryMethods();
    }
  }, [id]);

  // Calculate delivery fee and estimated delivery date when delivery method changes
  useEffect(() => {
    if (dbDeliveryMethod) {
      setDeliveryFee(dbDeliveryMethod.base_price);
      
      // Calculate estimated delivery date
      const today = new Date();
      const estimatedDate = new Date(today.getTime() + (dbDeliveryMethod.estimated_days * 24 * 60 * 60 * 1000));
      setEstimatedDeliveryDate(estimatedDate.toISOString().split('T')[0]);
    }
  }, [dbDeliveryMethod]);

  // When product loads, align delivery options with seller's configuration
  useEffect(() => {
    if (!product) return;
    const option = (product.delivery_option as 'both' | 'postage' | 'collection') || 'both';
    setDeliveryMethod(option);
    if (option === 'collection') {
      setDeliveryOption('pickup');
    }
    if (option === 'postage') {
      // default to home delivery in postage-only context
      setDeliveryOption('home');
    }
  }, [product]);

  // Commented out delivery estimation since AddressSelector is disabled
  /*
  // Estimate delivery costs when address changes
  useEffect(() => {
    console.log("Delivery estimation useEffect triggered:", {
      deliveryAddress,
      hasProduct: !!product,
      hasEstimatedDelivery,
    });

    if (deliveryAddress && product && !hasEstimatedDelivery) {
      console.log("Starting delivery estimation for:", deliveryAddress);

      const productLocation: Address = {
        street: product.location || "Warehouse",
        city: "London", // Default seller location, should come from product/seller data
        postcode: "SW1A 1AA",
        country: "UK",
      };

      estimateDelivery(deliveryAddress, productLocation);
      setHasEstimatedDelivery(true);
    }
  }, [deliveryAddress, product, estimateDelivery, hasEstimatedDelivery]);
  */

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          category:categories(*),
          seller:users!products_seller_id_fkey(*),
          images:product_images(*)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching product:", error);
        return;
      }

      setProduct(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryMethods = async () => {
    try {
      const methods = await OrderService.getDeliveryMethods();
      setDeliveryMethods(methods);
    } catch (error) {
      console.error("Error fetching delivery methods:", error);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency || "GBP",
      minimumFractionDigits: 2,
    }).format(price);
  };

  const calculateShipping = () => {
    // Collection only has no shipping costs
    if (deliveryMethod === "collection") {
      return 0;
    }

    if (deliveryOption === "pickup") {
      return selectedPickupLocation?.pickup_fee || 0;
    }
    // Default shipping cost for home delivery since estimation is disabled
    return 5.00; // Default shipping fee
  };

  // Commented out address handling since AddressSelector is disabled
  /*
  const handleAddressChange = (address: Address) => {
    console.log("Address changed:", address); // Debug log
    setDeliveryAddress(address);
    setHasEstimatedDelivery(false); // Reset to trigger new estimation
    // Don't call reset() here as it clears the delivery estimates we want to calculate
  };
  */

  const calculateTotal = () => {
    if (!product) return 0;
    const shipping = calculateShipping();
    const buyerProtection = 0.75;
    return product.price + shipping + buyerProtection;
  };

  const handlePickupLocationSelect = (location: PickupLocation) => {
    setSelectedPickupLocation(location);
    setShowPickupSelector(false);
  };

  // Placeholder for future shipping address selection
  // const handleShippingAddressSelect = (addressId: string) => {
  //   setShippingAddressId(addressId);
  // };

  const handlePayment = async () => {
    const digitsOnlyPhone = contactPhone.replace(/[^\d()+-\s]/g, "").trim();
    const trimmedInstructions = deliveryInstructions.trim();
    const deliveryPreferences =
      digitsOnlyPhone || trimmedInstructions
        ? {
            ...(digitsOnlyPhone && {
              contact_phone: `${
                selectedPhoneCountry?.dialCode ?? ""
              } ${digitsOnlyPhone}`.trim(),
            }),
            ...(selectedPhoneCountry && {
              contact_country: selectedPhoneCountry.code,
            }),
            ...(trimmedInstructions && {
              delivery_instructions: trimmedInstructions,
            }),
          }
        : undefined;

    console.log("Payment attempt:", {
      hasUser: !!user,
      hasProduct: !!product,
      deliveryOption,
      hasSelectedPickupLocation: !!selectedPickupLocation,
      hasContactPhone: !!digitsOnlyPhone,
      // Commented out deliveryAddress references since AddressSelector is disabled
      // hasDeliveryAddress: !!deliveryAddress,
      // deliveryAddress,
    });

    if (!digitsOnlyPhone) {
      toast.error(t("checkout.phoneRequired"));
      return;
    }

    if (!user || !product) {
      toast.error(t("auth.login.title"));
      navigate("/login");
      return;
    }

    // Skip address and pickup validation for collection-only
    if (deliveryMethod !== "collection") {
      if (deliveryOption === "pickup" && !selectedPickupLocation) {
        toast.error("Please select a pickup location");
        return;
      }

      // Commented out address validation since AddressSelector is disabled
      /*
      if (!deliveryAddress) {
        toast.error("Please provide a delivery address");
        return;
      }
      */
    }

    setIsProcessing(true);

    try {
      // Find the appropriate delivery method from database
      const foundDeliveryMethod = deliveryMethods.find(
        (method) =>
          (deliveryOption === "home" && method.name === "home_delivery") ||
          (deliveryOption === "pickup" && method.name === "pickup_point")
      );

      console.log("foundDeliveryMethod", foundDeliveryMethod);
      if (!foundDeliveryMethod) {
        toast.error("Delivery method not found");
        setIsProcessing(false);
        return;
      }

      // Set the delivery method state
      setDbDeliveryMethod(foundDeliveryMethod);

      // Create order in database
      const order = await OrderService.createOrder({
        buyer_id: user.id,
        seller_id: product.seller_id,
        product_id: product.id,
        quantity: 1,
        unit_price: product.price,
        total_amount: product.price,
        shipping_fee: calculateShipping(),
        grand_total: calculateTotal(),
        currency: product.currency,
        delivery_method_id: foundDeliveryMethod.id,
        delivery_type:
          deliveryOption === "home" ? "home_delivery" : "pickup_point",
        pickup_location_id: selectedPickupLocation?.id,
        pickup_location_data:
          deliveryOption === "pickup" && selectedPickupLocation
            ? {
                id: selectedPickupLocation.id,
                name: selectedPickupLocation.name,
                address: selectedPickupLocation.address,
                coordinates: {
                  lat: selectedPickupLocation.latitude,
                  lng: selectedPickupLocation.longitude,
                },
                type: selectedPickupLocation.type,
                provider: "branch",
                price: selectedPickupLocation.pickup_fee,
                delivery_time: `${selectedPickupLocation.estimated_days} days`,
                address_id: selectedPickupLocation.id,
                contact_phone: contactPhone ? `${selectedPhoneCountry.dialCode}${contactPhone}` : undefined,
                ...(deliveryPreferences && {
                  delivery_preferences: deliveryPreferences,
                }),
              }
            : undefined,
        // Address details matching mobile app pattern
        delivery_address: {
          contact_phone: contactPhone ? `${selectedPhoneCountry.dialCode}${contactPhone}` : undefined,
          instructions: deliveryInstructions || undefined,
        },
        // Enhanced fields
        delivery_fee: deliveryFee,
        estimated_delivery_date: estimatedDeliveryDate || undefined,
      });

      if (order) {
        toast.success("Order placed successfully!");
        // Redirect to the order chat
        navigate(`/dashboard/chats/${order.id}`);
      } else {
        toast.error("Failed to create order");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t("errors.pageNotFound")}
            </h1>
            <p className="text-muted-foreground">
              {t("errors.somethingWentWrong")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentImage = product.images?.[0];

  return (
    <div className={`max-w-4xl mx-auto p-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Checkout Details */}
        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {currentImage ? (
                    <img
                      src={currentImage.image_url}
                      alt={currentImage.alt_text || product.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{product.title}</h3>
                  <p className="text-sm text-gray-500">Very good</p>
                  <p className="font-semibold text-lg">
                    {formatPrice(product.price, product.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          {/* 
          <AddressSelector
            onAddressChange={handleAddressChange}
            initialAddress={deliveryAddress || undefined}
          />
          */}

          {/* Delivery Options */}
          {/* Commented out address dependency - always show delivery options */}
          <div className="space-y-6">
            {/* 
          {deliveryAddress || product?.location ? (
            <div className="space-y-6">
            */}

              {/* Specific Delivery Options with Pricing */}
              {(deliveryMethod === "both" || deliveryMethod === "postage") && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-4">
                      {t("checkout.deliveryOptions")}
                    </h3>
                    <RadioGroup
                      value={deliveryOption}
                      onValueChange={(value: string) =>
                        setDeliveryOption(value as "pickup" | "home")
                      }
                    >
                      <div className="space-y-3">
                        {deliveryMethod === "both" && (
                          <div className="flex items-center space-x-3">
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label
                              htmlFor="pickup"
                              className="flex-1 cursor-pointer"
                            >
                              <div className="flex items-center justify-between">
                                <span>{t("checkout.shipToPickup")}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-600">
                                    {t("checkout.from")}{" "}
                                    {formatPrice(0, "GBP")}
                                  </span>
                                </div>
                              </div>
                            </Label>
                          </div>
                        )}
                        <div className="flex items-center space-x-3">
                          <RadioGroupItem value="home" id="home" />
                          <Label
                            htmlFor="home"
                            className="flex-1 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <span>{t("checkout.shipToHome")}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-sm text-gray-600">
                                  {t("checkout.from")}{" "}
                                  {formatPrice(5.00, "GBP")}
                                </span>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              )}

              {/* Collection Only Option */}
              {deliveryMethod === "collection" && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center py-6">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h3 className="font-medium text-lg mb-2">
                        {t("delivery.collectionOnly")}
                      </h3>
                      <p className="text-gray-600 text-sm mb-4">
                        {t("delivery.collectionOnlyDesc")}
                      </p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-green-800 text-sm font-medium">
                          {t("checkout.collectionNoShipping")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            {/* 
          ) : (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-4">
                  {t("checkout.deliveryOptions")}
                </h3>
                <p className="text-gray-500 text-center py-4">
                  {t("checkout.selectAddressForDelivery")}
                </p>
              </CardContent>
            </Card>
          )}
            */}

          {/* Delivery Details */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium">{t("checkout.deliveryDetails")}</h3>
                {deliveryOption === "pickup" && deliveryMethod !== "collection" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPickupSelector(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {deliveryOption === "pickup" ? (
                selectedPickupLocation ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <Package className="h-5 w-5 mt-0.5 text-gray-500" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">
                            {selectedPickupLocation.name}
                          </p>
                          <p className="font-semibold text-green-600">
                            {selectedPickupLocation.pickup_fee > 0 
                              ? formatPrice(selectedPickupLocation.pickup_fee, "GBP")
                              : t("common.free")
                            }
                          </p>
                        </div>
                        <p className="text-sm text-gray-600">
                          {selectedPickupLocation.address}
                        </p>
                        <p className="text-xs text-gray-500">
                          {selectedPickupLocation.estimated_days} {t("common.days")}
                        </p>
                        {selectedPickupLocation.phone && (
                          <p className="text-xs text-gray-500">
                            📞 {selectedPickupLocation.phone}
                          </p>
                        )}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setShowPickupSelector(true)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>{t("checkout.choosePickupPoint")}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowPickupSelector(true)}
                    >
                      {t("checkout.selectPickupLocation")}
                    </Button>
                  </div>
                )
              ) : (
                <div className="text-sm text-gray-600">
                  <p>{t("checkout.standardDelivery")}</p>
                  <p>{t("checkout.estimatedDelivery")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Price Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t("checkout.priceSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>{t("checkout.order")}</span>
                <span>{formatPrice(product.price, product.currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span>{t("checkout.buyerProtection")}</span>
                  <Shield className="h-4 w-4 text-gray-400" />
                </div>
                <span>£0.75</span>
              </div>
              <div className="flex justify-between">
                <span>{t("checkout.shipping")}</span>
                <span>{formatPrice(calculateShipping(), "GBP")}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>{t("checkout.totalToPay")}</span>
                  <span>{formatPrice(calculateTotal(), "GBP")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pay Button */}
          <Button
            onClick={handlePayment}
            disabled={
              isProcessing ||
              !contactPhone.trim() ||
              (deliveryMethod !== "collection" &&
                (deliveryOption === "pickup" && !selectedPickupLocation))
            }
            className="w-full"
            size="lg"
          >
            {isProcessing ? t("checkout.processing") : t("checkout.pay")}
          </Button>

          <p className="text-xs text-center text-gray-500">
            {t("checkout.paymentSecure")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <h3 className="font-medium text-sm uppercase tracking-wide">
                    {t("checkout.mobileContact")}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {t("checkout.mobileContactDescription")}
                </p>
              </div>
              <Button variant="link" className="px-0">
                {t("checkout.seeAll")}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={contactCountry}
                onValueChange={(value) => setContactCountry(value)}
              >
                <SelectTrigger
                  className="sm:w-40"
                  aria-label={selectedPhoneCountry?.label || undefined}
                >
                  {selectedPhoneCountry ? (
                    <div className="flex flex-col text-left leading-tight">
                      <span className="font-medium">
                        {selectedPhoneCountry.dialCode}
                      </span>
                      <span className="text-xs text-gray-500">
                        {selectedPhoneCountry.label}
                      </span>
                    </div>
                  ) : (
                    <SelectValue
                      placeholder={t("checkout.selectCountryCode")}
                    />
                  )}
                </SelectTrigger>
                <SelectContent>
                  {PHONE_COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.dialCode} · {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1">
                <Input
                  value={contactPhone}
                  onChange={(event) =>
                    setContactPhone(
                      event.target.value.replace(/[^\d()+-\s]/g, "")
                    )
                  }
                  placeholder={t("checkout.mobileContactPlaceholder")}
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5" />
              {t("checkout.mobileContactHelper")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-gray-500" />
                <h3 className="font-medium text-sm uppercase tracking-wide">
                  {t("checkout.deliveryInstructionsTitle")}
                </h3>
              </div>
              <Button variant="link" className="px-0">
                {t("checkout.seeAll")}
              </Button>
            </div>
            <Textarea
              value={deliveryInstructions}
              onChange={(event) =>
                setDeliveryInstructions(
                  event.target.value.slice(0, MAX_INSTRUCTIONS_LENGTH)
                )
              }
              placeholder={t("checkout.deliveryInstructionsPlaceholder")}
              rows={5}
            />
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>{t("checkout.deliveryInstructionsHelper")}</span>
              <span>
                {deliveryInstructions.length}/{MAX_INSTRUCTIONS_LENGTH}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pickup Location Selector Modal */}
      {showPickupSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{t("checkout.selectPickupLocation")}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPickupSelector(false)}
                >
                  <Plus className="h-4 w-4 rotate-45" />
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <PickupLocationSelector
                selectedLocation={selectedPickupLocation}
                onLocationSelect={handlePickupLocationSelect}
                currency="GBP"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
