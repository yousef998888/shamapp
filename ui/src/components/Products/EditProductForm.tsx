import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Upload, X, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Label } from "@/components/shadcn/label";
import { Category } from "@/types/database";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/shadcn/select";
import { Textarea } from "@/components/shadcn/textarea";
import { Switch } from "@/components/shadcn/switch";
import { CategorySelectModal } from "./CategorySelectModal";
import { AttributeValueModal } from "./AttributeValueModal";
import { LocationPicker } from "./LocationPicker";
import {
  useProduct,
  useCategoryAttributes,
  useUpdateProduct,
} from "../../hooks/useProduct";
import { ProductFormData } from "../../services/ProductService";
import {
  getCategoryName,
  getAttributeName,
} from "@/utils/DisplayAtteibuteSupportedLanguage";
import { DeliveryOptionsSelector } from "./DeliveryOptionsSelector";
import { useAuth } from "@/hooks/useAuth";

interface LocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
}


export function EditProductForm() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  // Local state for UI interactions
  const [attributeValues, setAttributeValues] = useState<
    Record<string, string[]>
  >({});
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [attributeTermNames, setAttributeTermNames] = useState<
    Record<string, string[]>
  >({});

  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [attributeModal, setAttributeModal] = useState<{
    attr: any;
    open: boolean;
  } | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    address: "",
    latitude: null,
    longitude: null,
  });

  // React Query hooks
  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useProduct(id, user?.id);

  const { data: attributes = [] } = useCategoryAttributes(selectedCategory?.id);

  const updateProductMutation = useUpdateProduct();

  console.log("attributes in edit paga", attributes);

  // Debug attribute values changes
  useEffect(() => {
    console.log("Attribute values changed:", attributeValues);
    console.log("Attribute term names changed:", attributeTermNames);
    
    // Log summary of selected attributes
    const selectedCount = Object.keys(attributeValues).filter(key => 
      attributeValues[key] && attributeValues[key].length > 0
    ).length;
    console.log(`Total attributes with values: ${selectedCount}`);
    
    // Check for any suspicious values
    Object.entries(attributeValues).forEach(([attrId, termIds]) => {
      if (termIds && Array.isArray(termIds)) {
        const invalidIds = termIds.filter(id => !id || id === 'undefined' || typeof id !== 'string');
        if (invalidIds.length > 0) {
          console.warn(`Invalid term IDs found for attribute ${attrId}:`, invalidIds);
        }
      }
    });
  }, [attributeValues, attributeTermNames]);

  // Form setup
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    // Remove default values to prevent showing empty values initially
    defaultValues: {
      title: "",
      description: "",
      ar_description: "",
      price: 0,
      currency: "SYP",
      condition: undefined,
      category_id: undefined,
      location: "",
      is_negotiable: false,
      delivery_option: 'both',
    },
  });

  const isNegotiable = watch("is_negotiable");

  // Register required form fields
  useEffect(() => {
    register("ar_title", { required: "Arabic title is required" });
    register("category_id", { required: "Category is required" });
    register("condition", { required: "Condition is required" });
    register("currency", { required: "Currency is required" });
    register("delivery_option", { required: true });
  }, [register]);

  // Populate form when product data is loaded
  useEffect(() => {
    if (product) {
      // Set form values only after product data is available
      reset({
        title: product.title || "",
        ar_title: product.ar_title || "",
        description: product.description || "",
        ar_description: product.ar_description || "",
        price: product.price || 0,
        currency: product.currency as "SYP" | "USD" | "EUR",
        condition: product.condition,
        category_id: product.category_id,
        location: product.location || "",
        latitude: product.latitude || null,
        longitude: product.longitude || null,
        is_negotiable: product.is_negotiable || false,
        delivery_option:
          (product.delivery_option as "both" | "postage" | "collection") ||
          "both",
        // is_negotiable: product.is_negotiable,
        // delivery_option: (product.delivery_option as 'both' | 'postage' | 'collection') || 'both',
      });

      // Set selected category
      if (product.category) {
        setSelectedCategory(product.category);
      }

      // Set existing attribute values
      const existingAttrValues: Record<string, string[]> = {};
      const existingAttrTermNames: Record<string, string[]> = {};
      
      console.log("Loading existing attributes:", product.attribute_relationships);
      
      product.attribute_relationships?.forEach((rel: any) => {
        // Validate that we have valid attribute_id and term_id
        if (rel.attribute_id && rel.term_id && 
            typeof rel.attribute_id === 'string' && 
            typeof rel.term_id === 'string' &&
            rel.attribute_id !== 'undefined' && 
            rel.term_id !== 'undefined') {
          
          if (!existingAttrValues[rel.attribute_id]) {
            existingAttrValues[rel.attribute_id] = [];
            existingAttrTermNames[rel.attribute_id] = [];
          }
          existingAttrValues[rel.attribute_id].push(rel.term_id);
          
          // Store the term name for display
          if (rel.term && rel.term.name) {
            existingAttrTermNames[rel.attribute_id].push(rel.term.name);
          } else {
            console.log("Missing term data for:", rel);
          }
        } else {
          console.warn("Invalid attribute relationship data:", rel);
        }
      });
      
      console.log("Set attribute values:", existingAttrValues);
      console.log("Set attribute term names:", existingAttrTermNames);
      
      setAttributeValues(existingAttrValues);
      setAttributeTermNames(existingAttrTermNames);

      // Set location data
      setLocationData({
        address: product.location || "",
        latitude: product.latitude || null,
        longitude: product.longitude || null,
      });
    }
  }, [product, reset]);

  // Handle category selection
  const handleCategorySelect = (cat: Category) => {
    const previousCategoryId = selectedCategory?.id;
    setSelectedCategory(cat);
    setValue("category_id", cat.id, { shouldValidate: true });
    
    // Only clear attribute values if category actually changed
    // When editing, we want to preserve existing values
    if (previousCategoryId !== cat.id) {
      // In edit mode, we might want to keep some values if they're still valid
      // For now, clear them and let the user reselect if needed
      setAttributeValues({});
      setAttributeTermNames({});
    }
  };

  // Clean up invalid attribute values
  const cleanupAttributeValues = () => {
    const cleanedValues: Record<string, string[]> = {};
    const cleanedNames: Record<string, string[]> = {};
    
    Object.entries(attributeValues).forEach(([attrId, termIds]) => {
      if (attrId && Array.isArray(termIds) && termIds.length > 0) {
        const validTermIds = termIds.filter(id => id && typeof id === 'string' && id !== 'undefined');
        if (validTermIds.length > 0) {
          cleanedValues[attrId] = validTermIds;
          cleanedNames[attrId] = (attributeTermNames[attrId] || []).filter(name => name && typeof name === 'string');
        }
      }
    });
    
    setAttributeValues(cleanedValues);
    setAttributeTermNames(cleanedNames);
  };

  // Clean up attribute values when component updates
  useEffect(() => {
    cleanupAttributeValues();
  }, []);

  // Handle location change
  const handleLocationChange = (location: LocationData) => {
    setLocationData(location);
    setValue("location", location.address);
    setValue("latitude", location.latitude);
    setValue("longitude", location.longitude);
  };

  // Handle new image upload
  const handleNewImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const currentImages =
      (product?.images || []).length - imagesToDelete.length;
    const totalImages = currentImages + newImages.length + files.length;

    if (totalImages > 5) {
      alert(t("listing.create.maxImagesAlert"));
      return;
    }

    setNewImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Image management functions
  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (imageId: string) => {
    setImagesToDelete((prev) => [...prev, imageId]);
  };

  const restoreExistingImage = (imageId: string) => {
    setImagesToDelete((prev) => prev.filter((id) => id !== imageId));
  };

  // Form submission
  const onSubmit = async (data: ProductFormData) => {
    if (!user || !id || !product) {
      alert(t("listing.create.editLoginRequired"));
      return;
    }

    // Clean attribute values to remove empty arrays and invalid values
    const cleanedAttributeValues = Object.entries(attributeValues)
      .filter(([attributeId, termIds]) => 
        attributeId && 
        Array.isArray(termIds) && 
        termIds.length > 0 && 
        termIds.every(termId => termId && typeof termId === 'string' && termId !== 'undefined')
      )
      .reduce((acc, [attributeId, termIds]) => {
        acc[attributeId] = termIds;
        return acc;
      }, {} as Record<string, string[]>);

    // Log the data being submitted for debugging
    console.log("Submitting form with data:", data);
    console.log("Original attribute values:", attributeValues);
    console.log("Cleaned attribute values:", cleanedAttributeValues);

    updateProductMutation.mutate(
      {
        id,
        data,
        sellerId: user.id,
        newImages,
        imagesToDelete,
        attributeValues: cleanedAttributeValues,
        existingImagesCount: product.images?.length || 0,
      },
      {
        onSuccess: () => {
          navigate(`/product/${id}`);
        },
      }
    );
  };

  // Loading state
  if (productLoading || !product) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure form is properly initialized before rendering
  const formValues = watch();
  if (!formValues.title && !formValues.ar_title) {
    return (
      <div className="max-w-4xl mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error or unauthorized state
  if (productError || !user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 mb-4">
          {productError?.message || t("listing.create.editLoginRequired")}
        </p>
        <Button
          onClick={() => navigate(user ? "/dashboard/selling" : "/login")}
        >
          {user
            ? t("listing.create.backToListings")
            : t("listing.create.login")}
        </Button>
      </div>
    );
  }

  const existingImages = product.images || [];

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border bg-card text-card-foreground rounded-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">
          {t("listing.edit.title")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-10"
          key={product?.id}
        >
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label htmlFor="title">
                {t("listing.create.productTitle")} *
              </Label>
              <Input
                id="title"
                {...register("title", {
                  required: t("listing.errors.titleRequired"),
                })}
                placeholder={t("listing.create.enterProductTitle")}
                aria-invalid={!!errors.title}
                value={watch("title") || ""}
                onChange={(e) =>
                  setValue("title", e.target.value, { shouldValidate: true })
                }
                autoComplete="off"
              />
              {errors.title && (
                <p className="text-destructive text-sm mt-1">
                  {errors.title.message}
                </p>
              )}
            </div>

            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label htmlFor="ar_title">
                {t("listing.create.productArTitle")} *
              </Label>
              <Input
                id="ar_title"
                {...register("ar_title", {
                  required: t("listing.errors.titleRequired"),
                })}
                placeholder={t("listing.create.enterProductTitle")}
                aria-invalid={!!errors.ar_title}
                value={watch("ar_title") || ""}
                autoComplete="off"
                onChange={(e) =>
                  setValue("ar_title", e.target.value, { shouldValidate: true })
                }
                dir="rtl"
              />
              {errors.ar_title && (
                <p className="text-destructive text-sm mt-1">
                  {errors.ar_title.message}
                </p>
              )}
            </div>

            {/* Category Selection */}
            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label>{t("listing.create.category")} *</Label>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryModalOpen(true)}
                className="w-full justify-start"
              >
                {selectedCategory
                  ? getCategoryName(selectedCategory)
                  : t("listing.create.selectCategory")}
              </Button>
              {errors.category_id && (
                <p className="text-destructive text-sm mt-1">
                  {errors.category_id.message}
                </p>
              )}
            </div>

            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label htmlFor="condition">
                {t("listing.create.condition")} *
              </Label>
              <Select
                onValueChange={(val) =>
                  setValue("condition", val as any, { shouldValidate: true })
                }
                value={watch("condition") || ""}
              >
                <SelectTrigger
                  className="w-full"
                  aria-invalid={!!errors.condition}
                  id="condition"
                >
                  <SelectValue
                    placeholder={t("listing.create.selectCondition")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">
                    {t("listing.conditions.new")}
                  </SelectItem>
                  <SelectItem value="used">
                    {t("listing.conditions.used")}
                  </SelectItem>
                  <SelectItem value="refurbished">
                    {t("listing.conditions.refurbished")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-destructive text-sm mt-1">
                  {errors.condition.message}
                </p>
              )}
            </div>

            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label htmlFor="price">{t("listing.create.price")} *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price", {
                  required: t("listing.errors.priceRequired"),
                  min: { value: 0, message: t("listing.errors.pricePositive") },
                  valueAsNumber: true,
                })}
                value={watch("price") || ""}
                onChange={(e) =>
                  setValue("price", parseFloat(e.target.value) || 0, {
                    shouldValidate: true,
                  })
                }
                aria-invalid={!!errors.price}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-destructive text-sm mt-1">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div className="lg:col-span-1 col-span-2 space-y-2">
              <Label htmlFor="currency">{t("listing.create.currency")} *</Label>
              <Select
                onValueChange={(val) =>
                  setValue("currency", val as any, { shouldValidate: true })
                }
                value={watch("currency")}
              >
                <SelectTrigger className="w-full" id="currency">
                  <SelectValue
                    placeholder={t("listing.create.selectCurrency")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYP">
                    {t("listing.currencies.syp")}
                  </SelectItem>
                  <SelectItem value="USD">
                    {t("listing.currencies.usd")}
                  </SelectItem>
                  <SelectItem value="EUR">
                    {t("listing.currencies.eur")}
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-destructive text-sm mt-1">
                  {errors.currency.message}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Switch
                id="is_negotiable"
                checked={isNegotiable}
                onCheckedChange={(checked) =>
                  setValue("is_negotiable", checked as boolean, {
                    shouldValidate: true,
                  })
                }
                className="mr-2"
              />
              <Label htmlFor="is_negotiable">
                {t("listing.create.priceNegotiable")}
              </Label>
            </div>
            <div className="space-y-2 col-span-2">
              <Label>{t("listing.create.location")}</Label>
              <LocationPicker
                value={locationData}
                onChange={handleLocationChange}
              />
            
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="description">
                {t("listing.create.description")} *
              </Label>
              <Textarea
                id="description"
                rows={6}
                {...register("description", {
                  required: t("listing.errors.descriptionRequired"),
                })}
                placeholder={t("listing.create.describeProduct")}
                value={watch("description") || ""}
                onChange={(e) =>
                  setValue("description", e.target.value, {
                    shouldValidate: true,
                  })
                }
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <p className="text-destructive text-sm mt-1">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Arabic Description */}
            <div className="space-y-2">
              <Label htmlFor="ar_description">
                {t("listing.create.productArDescription")} *
              </Label>
              <Textarea
                id="ar_description"
                rows={6}
                {...register("ar_description", {
                  required: t("listing.errors.descriptionRequired"),
                })}
                placeholder={t("listing.create.describeProductAr")}
                value={watch("ar_description") || ""}
                onChange={(e) =>
                  setValue("ar_description", e.target.value, {
                    shouldValidate: true,
                  })
                }
                aria-invalid={!!errors.ar_description}
                dir="rtl"
              />
              {errors.ar_description && (
                <p className="text-destructive text-sm mt-1">
                  {errors.ar_description.message}
                </p>
              )}
            </div>
          </div>

          {/* Images */}
          <div className="space-y-4">
            <Label>{t("listing.create.maxImages")}</Label>

            {/* Existing Images */}
            {existingImages.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600">
                  {t("listing.create.currentImages")}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  {existingImages.map((image) => (
                    <div
                      key={image.id}
                      className={`relative group ${
                        imagesToDelete.includes(image.id) ? "opacity-50" : ""
                      }`}
                    >
                      <img
                        src={image.image_url}
                        alt="Product"
                        className="w-full h-32 object-cover rounded-lg border shadow-sm"
                      />
                      {!imagesToDelete.includes(image.id) ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => removeExistingImage(image.id)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                          aria-label={t("listing.create.markForDeletion")}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => restoreExistingImage(image.id)}
                          className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                          aria-label={t("listing.create.restoreImage")}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                      {imagesToDelete.includes(image.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                          <span className="text-white text-xs">
                            {t("listing.create.willBeDeleted")}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* New Images */}
            {newImagePreviews.length > 0 && (
              <div>
                <Label className="text-sm text-gray-600">
                  {t("listing.create.newImages")}
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                  {newImagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`New preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border shadow-sm"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeNewImage(index)}
                        className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                        aria-label={t("listing.create.removeNewImage")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Images */}
            {existingImages.length - imagesToDelete.length + newImages.length <
              5 && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">
                  {t("listing.create.uploadAdditionalImages")}
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  {t("listing.create.fileFormats")}
                </p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewImageUpload}
                  className="hidden"
                  id="new-image-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    document.getElementById("new-image-upload")?.click()
                  }
                >
                  {t("listing.create.chooseFiles")}
                </Button>
              </div>
            )}
          </div>

          {/* Attributes */}
          {attributes.length > 0 && (
            <div className="space-y-2">
              <Label>{t("listing.create.productAttributes")}</Label>
              {attributes.map((attr) => (
                <div key={attr.id} className="mb-2">
                  <Label htmlFor={`attr-${attr.id}`} className="flex items-center gap-2">
                    {getAttributeName(attr)}
                    {attributeValues[attr.id] && attributeValues[attr.id].length > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {attributeValues[attr.id].length} {t("listing.create.selected")}
                      </span>
                    )}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => setAttributeModal({ attr, open: true })}
                  >
                    {attributeValues[attr.id] &&
                    attributeValues[attr.id].length > 0
                      ? (() => {
                          const termNames = attributeTermNames[attr.id];
                          if (termNames && termNames.length > 0) {
                            return termNames.join(", ");
                          }
                          // Fallback to showing count if names aren't available
                          return `${attributeValues[attr.id].length} ${t("listing.create.selected")}`;
                        })()
                      : `${t("listing.create.select")} ${getAttributeName(
                          attr
                        )}`}
                  </Button>
                  {attributeModal &&
                    attributeModal.open &&
                    attributeModal.attr.id === attr.id && (
                      <AttributeValueModal
                        open={attributeModal.open}
                        onOpenChange={(open) =>
                          setAttributeModal(open ? attributeModal : null)
                        }
                        attribute={attr}
                        value={attributeValues[attr.id] || []}
                        onSelect={(terms) => {
                          // Validate terms before setting state
                          const validTerms = Array.isArray(terms) 
                            ? terms.filter(term => term && term.id && typeof term.id === 'string' && term.id !== 'undefined')
                            : [];
                          
                          const validTermIds = validTerms.map(t => t.id);
                          const validTermNames = validTerms.map(t => t.name).filter(name => name && typeof name === 'string');
                          
                          setAttributeValues((v) => ({
                            ...v,
                            [attr.id]: validTermIds,
                          }));
                          setAttributeTermNames((n) => ({
                            ...n,
                            [attr.id]: validTermNames,
                          }));
                        }}
                      />
                    )}
                </div>
              ))}
            </div>
          )}

          {/* Delivery Options */}
          <div className="space-y-2">
            <Label>{t("delivery.title")}</Label>
            <DeliveryOptionsSelector
              selectedOption={
                (watch("delivery_option") as
                  | "both"
                  | "postage"
                  | "collection") || "both"
              }
              onOptionChange={(opt) =>
                setValue("delivery_option", opt, { shouldValidate: true })
              }
              showPackageSize={false}
            />
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/product/${id}`)}
            >
              {t("listing.create.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={updateProductMutation.isPending}
              className="min-w-[140px]"
            >
              {updateProductMutation.isPending
                ? t("listing.create.updating")
                : t("listing.create.updateListing")}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Category Selection Modal */}
      <CategorySelectModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        onSelect={handleCategorySelect}
      />
    </Card>
  );
}
