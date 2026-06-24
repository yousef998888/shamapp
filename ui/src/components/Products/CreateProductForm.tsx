import React, { useState, useEffect, forwardRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
import { ProductAttribute } from "@/types/database";
import { AttributeValueModal } from "./AttributeValueModal";
import { LocationPicker } from "./LocationPicker";
import { DeliveryOptionsSelector } from "./DeliveryOptionsSelector";
import { useCreateProduct, useCategoryAttributes } from "@/hooks/useProduct";
import CategoryService from "@/services/CategoryService";
import { ProductFormData } from "@/services/ProductService";
import ProductAIService from "@/services/ProductAIService";
import { useQuery } from "@tanstack/react-query";
import { getCategoryName, getAttributeName } from "@/utils/DisplayAtteibuteSupportedLanguage";
import { useAuth } from "@/hooks/useAuth";

interface LocationData {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

export const CreateProductForm = forwardRef<HTMLFormElement, {}>((props, ref) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attributeValues, setAttributeValues] = useState<Record<string, string[]>>({});
  const [attributeTermNames, setAttributeTermNames] = useState<Record<string, string[]>>({});
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [attributeModal, setAttributeModal] = useState<{ attr: ProductAttribute; open: boolean } | null>(null);
  const [locationData, setLocationData] = useState<LocationData>({
    address: '',
    latitude: null,
    longitude: null,
  });
  const deviceLanguage = useMemo(() => {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.toLowerCase().startsWith('ar') ? 'ar' : 'en';
    }
    return 'en';
  }, []);

  // React Query hooks
  const createProductMutation = useCreateProduct();
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: CategoryService.fetchCategories,
  });
  const { data: attributes = [] } = useCategoryAttributes(selectedCategory?.id);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    defaultValues: {
      title: "",
      ar_title: "",
      description: "",
      ar_description: "",
      price: 0,
      currency: "SYP",
      condition: undefined,
      category_id: undefined,
      is_negotiable: false,
      delivery_option: 'both',
    },
  });

  const isNegotiable = watch("is_negotiable");

  useEffect(() => {
    register('category_id', { required: 'Category is required' });
    register('condition', { required: 'Condition is required' });
    register('currency', { required: 'Currency is required' });
    register('delivery_option', { required: true });
  }, [register]);

  // When a category is selected from the modal
  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setValue("category_id", cat.id, { shouldValidate: true });
    // Reset attribute values on category change
    setAttributeValues({});
    setAttributeTermNames({});
  };

      const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 5) {
      alert(t('listing.create.maxImagesAlert'));
      return;
    }

    setImages((prev) => [...prev, ...files]);

    // Create previews
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreviews((prev) => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!user) {
      return;
    }

    try {
      const baseTitle = data.title.trim();
      const baseDescription = data.description.trim();

      // Include location data in the form data
      const formDataWithLocation: ProductFormData = {
        ...data,
        title: baseTitle,
        ar_title: baseTitle,
        description: baseDescription,
        ar_description: baseDescription,
        location: locationData.address,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        status: 'inactive' as const,
        tags: [],
        ar_tags: [],
      };

      // Create product first in inactive state
      const productId = await createProductMutation.mutateAsync({
        data: {
          ...formDataWithLocation,
        } as ProductFormData,
        sellerId: user.id,
        images,
        attributeValues,
      });

      console.log('Product created in inactive state:', productId);

      // Process with AI asynchronously to update the product when ready
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

      navigate(`/product/${productId}`);
    } catch (error) {
      // Error handling is done in the hook
      console.error("Error in form submission:", error);
    }
  };

      if (!user) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            {t('listing.create.loginRequired')}
          </p>
          <Button onClick={() => navigate("/login")}>{t('listing.create.login')}</Button>
        </div>
      );
    }

  return (
    <Card className="max-w-4xl mx-auto shadow-lg border bg-card text-card-foreground rounded-xl">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">{t('listing.create.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={ref} onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label htmlFor="title">{t('listing.create.productTitle')} *</Label>
              <Input
                id="title"
                {...register("title", { required: t('listing.errors.titleRequired') })}
                placeholder={t('listing.create.enterProductTitle')}
                aria-invalid={!!errors.title}
                autoComplete="off"
                onChange={e => setValue("title", e.target.value, { shouldValidate: true })}
              />
              {errors.title && (
                <p className="text-destructive text-sm mt-1">{errors.title.message}</p>
              )}
            </div>
            {/* Category Selection with Modal */}
            <div className="space-y-2">
              <Label htmlFor="category">{t('listing.create.category')} *</Label>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
                onClick={() => setCategoryModalOpen(true)}
                aria-invalid={!!errors.category_id}
                id="category"
                disabled={categoriesLoading}
              >
                {selectedCategory ? getCategoryName(selectedCategory) : t('listing.create.selectCategory')}
              </Button>
              {errors.category_id && (
                <p className="text-destructive text-sm mt-1">{errors.category_id.message}</p>
              )}
              <CategorySelectModal
                open={categoryModalOpen}
                onOpenChange={setCategoryModalOpen}
                onSelect={handleCategorySelect}
                selectedCategoryId={selectedCategory?.id}
              />
            </div>

            {/* Dynamic Attributes for Category */}
            {attributes.length > 0 && (
              <div className="space-y-2">
                <Label>{t('listing.create.itemDetails')}</Label>
                {attributes.map(attr => (
                  <div key={attr.id} className="mb-2">
                    <Label htmlFor={`attr-${attr.id}`}>{getAttributeName(attr)}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setAttributeModal({ attr, open: true })}
                    >
                      {attributeValues[attr.id] && attributeValues[attr.id].length > 0
                        ? (attributeTermNames[attr.id] || attributeValues[attr.id]).join(', ')
                        : `${t('listing.create.select')} ${getAttributeName(attr)}`}
                    </Button>
                    {attributeModal && attributeModal.open && attributeModal.attr.id === attr.id && (
                      <AttributeValueModal
                        open={attributeModal.open}
                        onOpenChange={open => setAttributeModal(open ? attributeModal : null)}
                        attribute={attr}
                        value={attributeValues[attr.id] || []}
                        onSelect={terms => {
                          setAttributeValues(v => ({
                            ...v,
                            [attr.id]: Array.isArray(terms) ? terms.map(t => t.id) : []
                          }));
                          setAttributeTermNames(n => ({
                            ...n,
                            [attr.id]: Array.isArray(terms) ? terms.map(t => t.name) : []
                          }));
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="condition">{t('listing.create.condition')} *</Label>
              <Select
                onValueChange={val => setValue("condition", val as any, { shouldValidate: true })}
                value={watch("condition") || ""}
              >
                <SelectTrigger className="w-full" aria-invalid={!!errors.condition} id="condition">
                  <SelectValue placeholder={t('listing.create.selectCondition')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{t('listing.conditions.new')}</SelectItem>
                  <SelectItem value="used">{t('listing.conditions.used')}</SelectItem>
                  <SelectItem value="refurbished">{t('listing.conditions.refurbished')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.condition && (
                <p className="text-destructive text-sm mt-1">{errors.condition.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">{t('listing.create.price')} *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price", {
                  required: t('listing.errors.priceRequired'),
                  min: { value: 0, message: t('listing.errors.pricePositive') },
                  valueAsNumber: true,
                })}
                aria-invalid={!!errors.price}
                placeholder="0.00"
                onChange={e => setValue("price", parseFloat(e.target.value) || 0, { shouldValidate: true })}
              />
              {errors.price && (
                <p className="text-destructive text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">{t('listing.create.currency')} *</Label>
              <Select
                onValueChange={val => setValue("currency", val as any, { shouldValidate: true })}
                value={watch("currency")}
              >
                <SelectTrigger className="w-full" id="currency">
                  <SelectValue placeholder={t('listing.create.selectCurrency')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYP">{t('listing.currencies.syp')}</SelectItem>
                  <SelectItem value="USD">{t('listing.currencies.usd')}</SelectItem>
                  <SelectItem value="EUR">{t('listing.currencies.eur')}</SelectItem>
                </SelectContent>
              </Select>
               {errors.currency && (
                <p className="text-destructive text-sm mt-1">{errors.currency.message}</p>
              )}
            </div>
            
            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label htmlFor="location">{t('listing.create.location')}</Label>
              <LocationPicker
                value={locationData}
                onChange={setLocationData}
                disabled={createProductMutation.isPending}
              />
            </div>

            <div className="flex items-center gap-2 mt-6">
              <Switch
                id="is_negotiable"
                checked={isNegotiable}
                onCheckedChange={checked => setValue("is_negotiable", checked as boolean, { shouldValidate: true })}
                className="mr-2"
              />
              <Label htmlFor="is_negotiable">{t('listing.create.priceNegotiable')}</Label>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('listing.create.description')} *</Label>
            <Textarea
              id="description"
              rows={6}
              {...register("description", { required: t('listing.errors.descriptionRequired') })}
              placeholder={t('listing.create.describeProduct')}
              aria-invalid={!!errors.description}
              onChange={e => setValue("description", e.target.value, { shouldValidate: true })}
            />
            {errors.description && (
              <p className="text-destructive text-sm mt-1">{errors.description.message}</p>
            )}
          </div>


          {/* Images */}
          <div className="space-y-2">
            <Label>{t('listing.create.maxImages')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 mt-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 h-6 w-6 p-0 opacity-80 group-hover:opacity-100"
                    aria-label={t('listing.create.removeImage')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="w-full h-32 border-2 border-dashed border-muted-foreground/40 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                  <div className="text-center">
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <span className="text-sm text-muted-foreground">{t('listing.create.addImage')}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    className="hidden"
                    aria-label={t('listing.create.uploadImages')}
                  />
                </label>
              )}
            </div>
          </div>
          
          {/* Delivery Options */}
          <div className="space-y-2">
            <Label>{t('delivery.title')}</Label>
            <DeliveryOptionsSelector
              selectedOption={(watch('delivery_option') as 'both' | 'postage' | 'collection') || 'both'}
              onOptionChange={(opt) => setValue('delivery_option', opt, { shouldValidate: true })}
              showPackageSize={true}
            />
          </div>


          <div className="flex flex-col md:flex-row justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
            >
              {t('listing.create.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={createProductMutation.isPending} 
              className="min-w-[140px]"
            >
              {createProductMutation.isPending ? t('listing.create.creating') : t('listing.create.createListing')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

// Add display name for debugging
CreateProductForm.displayName = 'CreateProductForm';
