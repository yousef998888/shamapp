import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Category, CreateCategoryData, UpdateCategoryData, supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ProductAttribute } from '@/lib/supabase';
import { Search, X, Plus, Settings, Languages, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ar_name: z.string().optional(),
  slug: z.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  ar_description: z.string().optional(),
  icon: z.string().optional(),
  parent_id: z.string().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().default(0),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface ParentCategory {
  id: string;
  name: string;
  ar_name?: string;
}

interface CategoryFormProps {
  category?: Category | null;
  parentCategory?: Category | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function CategoryForm({ category, parentCategory, onClose, onSubmit }: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const [parentCategories, setParentCategories] = useState<ParentCategory[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<ProductAttribute[]>([]);
  const [parentAttributes, setParentAttributes] = useState<ProductAttribute[]>([]);
  const [showAttributeModal, setShowAttributeModal] = useState(false);
  const [attributeSearchTerm, setAttributeSearchTerm] = useState('');
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(parentCategory?.id);
  const [translatingName, setTranslatingName] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [translatingNameToEn, setTranslatingNameToEn] = useState(false);
  const [translatingDescriptionToEn, setTranslatingDescriptionToEn] = useState(false);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name || '',
      ar_name: category?.ar_name || '',
      slug: category?.slug || '',
      description: category?.description || '',
      ar_description: category?.ar_description || '',
      icon: category?.icon || '',
      parent_id: parentCategory?.id || category?.parent_id || '',
      is_active: category?.is_active ?? true,
      sort_order: category?.sort_order || 0,
    },
  });

  useEffect(() => {
    fetchParentCategories();
    fetchAttributes();
  }, []);

  useEffect(() => {
    const parentId = form.watch('parent_id');
    if (typeof parentId === 'string' && parentId && parentId !== 'none') {
      fetchParentAttributes(parentId);
    } else {
      setParentAttributes([]);
    }
  }, [form.watch('parent_id')]);

  useEffect(() => {
    if (category) {
      fetchCategoryAttributes(category.id);
    }
  }, [category]);

  // Subscribe to parent_id changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'parent_id') {
        setCurrentParentId(value.parent_id);
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Set initial parent_id and state on mount if adding child
  useEffect(() => {
    if (parentCategory && !category) {
      form.setValue('parent_id', parentCategory.id);
      setCurrentParentId(parentCategory.id);
      fetchParentAttributes(parentCategory.id);
    }
  }, [parentCategory, category, form]);

  const fetchParentCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, ar_name')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching parent categories:', error);
        return;
      }

      setParentCategories(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchAttributes = async () => {
    const { data } = await supabase.from('product_attributes').select('*').eq('is_active', true).order('name');
    setAttributes(data || []);
  };

  const fetchParentAttributes = async (parentId: string) => {
    if (!parentId || parentId === 'none') {
      setParentAttributes([]);
      return;
    }
    const { data: links } = await supabase.from('category_attribute_relationships').select('attribute_id').eq('category_id', parentId);
    if (!links) return setParentAttributes([]);
    const ids = links.map((l: any) => l.attribute_id);
    const { data: attrs } = await supabase.from('product_attributes').select('*').in('id', ids);
    setParentAttributes(attrs || []);
    if (selectedAttributes.length === 0) {
      setSelectedAttributes(attrs || []);
    }
  };

  const fetchCategoryAttributes = async (catId: string) => {
    const { data: links } = await supabase.from('category_attribute_relationships').select('attribute_id').eq('category_id', catId);
    if (!links) return;
    const ids = links.map((l: any) => l.attribute_id);
    const { data: attrs } = await supabase.from('product_attributes').select('*').in('id', ids);
    setSelectedAttributes(attrs || []);
  };

  const translateText = async (text: string, targetLanguage: 'ar' | 'en' = 'ar'): Promise<string> => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:6666';
    const response = await fetch(`${serverUrl}/api/translations-v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source_language: targetLanguage === 'ar' ? 'en' : 'ar',
        target_language: targetLanguage,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Translation failed');
    }

    const data = await response.json();
    if (!data.success || !data.translated_text) {
      throw new Error('Translation failed');
    }
    return data.translated_text;
  };

  const handleTranslateName = async () => {
    const englishName = form.watch('name');
    if (!englishName?.trim()) {
      toast.error('Please enter an English name first');
      return;
    }

    setTranslatingName(true);
    try {
      const translated = await translateText(englishName.trim(), 'ar');
      form.setValue('ar_name', translated);
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingName(false);
    }
  };

  const handleTranslateNameToEnglish = async () => {
    const arabicName = form.watch('ar_name');
    if (!arabicName?.trim()) {
      toast.error('Please enter an Arabic name first');
      return;
    }

    setTranslatingNameToEn(true);
    try {
      const translated = await translateText(arabicName.trim(), 'en');
      form.setValue('name', translated);
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingNameToEn(false);
    }
  };

  const handleTranslateDescription = async () => {
    const englishDesc = form.watch('description');
    if (!englishDesc?.trim()) {
      toast.error('Please enter an English description first');
      return;
    }

    setTranslatingDescription(true);
    try {
      const translated = await translateText(englishDesc.trim(), 'ar');
      form.setValue('ar_description', translated);
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescription(false);
    }
  };

  const handleTranslateDescriptionToEnglish = async () => {
    const arabicDesc = form.watch('ar_description');
    if (!arabicDesc?.trim()) {
      toast.error('Please enter an Arabic description first');
      return;
    }

    setTranslatingDescriptionToEn(true);
    try {
      const translated = await translateText(arabicDesc.trim(), 'en');
      form.setValue('description', translated);
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescriptionToEn(false);
    }
  };

  const handleAttributeSelect = (attribute: ProductAttribute) => {
    setSelectedAttributes(prev => 
      prev.some(attr => attr.id === attribute.id) 
        ? prev.filter(attr => attr.id !== attribute.id)
        : [...prev, attribute]
    );
  };

  const handleRemoveAttribute = (attributeId: string) => {
    setSelectedAttributes(prev => prev.filter(attr => attr.id !== attributeId));
  };

  const filteredAttributes = attributes.filter(attr =>
    attr.name.toLowerCase().includes(attributeSearchTerm.toLowerCase()) ||
    attr.description?.toLowerCase().includes(attributeSearchTerm.toLowerCase())
  );

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    form.setValue('name', name);
    if (!category?.slug) {
      const slug = generateSlug(name);
      form.setValue('slug', slug);
    }
  };

  const handleSubmit = async (data: CategoryFormData) => {
    try {
      setLoading(true);
      
      // Clean up the data - ensure parent_id is undefined when no parent is selected
      const cleanParentId = data.parent_id === 'none' || data.parent_id === '' || data.parent_id === null 
        ? undefined 
        : data.parent_id;
        
      const submitData = {
        ...data,
        parent_id: cleanParentId,
      };

      let catId = category?.id;
      
      if (category) {
        // Update existing category
        const updateData: UpdateCategoryData = {
          id: category.id,
          ...submitData,
        };

        const { error } = await supabase
          .from('categories')
          .update(updateData)
          .eq('id', category.id);

        if (error) {
          console.error('Error updating category:', error);
          return;
        }
      } else {
        // Create new category
        const createData: CreateCategoryData = { ...submitData };
        
        const { data: newCat, error } = await supabase
          .from('categories')
          .insert(createData)
          .select('id')
          .single();

        if (error) {
          console.error('Error creating category:', error);
          return;
        }
        
        catId = newCat.id;
      }

      // Handle attribute assignments
      let allAttributeIds: string[] = [];
      if (currentParentId && currentParentId !== 'none' && parentAttributes.length > 0) {
        allAttributeIds = [
          ...parentAttributes.map(attr => attr.id),
          ...selectedAttributes.filter(attr => !parentAttributes.some(pa => pa.id === attr.id)).map(attr => attr.id)
        ];
      } else {
        allAttributeIds = selectedAttributes.map(attr => attr.id);
      }

      if (catId) {
        // Remove all old links
        await supabase
          .from('category_attribute_relationships')
          .delete()
          .eq('category_id', catId);

        // Add new links
        if (allAttributeIds.length > 0) {
          const attributeLinks = allAttributeIds.map(attrId => ({
            category_id: catId,
            attribute_id: attrId
          }));

          const { error: linkError } = await supabase
            .from('category_attribute_relationships')
            .insert(attributeLinks);

          if (linkError) {
            console.error('Error updating attribute assignments:', linkError);
          }
        }
      }

      onSubmit();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {category ? 'Edit Category' : 'Add Category'}
            {parentCategory && (
              <span className="text-sm font-normal text-muted-foreground block">
                Adding to: {parentCategory.name}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* English Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Name (English)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateNameToEnglish}
                        disabled={!form.watch('ar_name')?.trim() || translatingNameToEn}
                        className="h-7 text-xs"
                      >
                        {translatingNameToEn ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="h-3 w-3 mr-1" />
                            Auto Translate
                          </>
                        )}
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="Enter category name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Arabic Name */}
              <FormField
                control={form.control}
                name="ar_name"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between mb-2">
                      <FormLabel>Name (Arabic)</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateName}
                        disabled={!form.watch('name')?.trim() || translatingName}
                        className="h-7 text-xs"
                      >
                        {translatingName ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Languages className="h-3 w-3 mr-1" />
                            Auto Translate
                          </>
                        )}
                      </Button>
                    </div>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="أدخل اسم الفئة"
                        dir="rtl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Slug */}
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="category-slug"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Icon */}
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Folder, Home, etc."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Parent Category */}
              <FormField
                control={form.control}
                name="parent_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No parent (Root category)</SelectItem>
                        {parentCategories.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name} {parent.ar_name && `(${parent.ar_name})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sort Order */}
              <FormField
                control={form.control}
                name="sort_order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* English Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Description (English)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTranslateDescriptionToEnglish}
                      disabled={!form.watch('ar_description')?.trim() || translatingDescriptionToEn}
                      className="h-7 text-xs"
                    >
                      {translatingDescriptionToEn ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        <>
                          <Languages className="h-3 w-3 mr-1" />
                          Auto Translate
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter category description"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Arabic Description */}
            <FormField
              control={form.control}
              name="ar_description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between mb-2">
                    <FormLabel>Description (Arabic)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTranslateDescription}
                      disabled={!form.watch('description')?.trim() || translatingDescription}
                      className="h-7 text-xs"
                    >
                      {translatingDescription ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        <>
                          <Languages className="h-3 w-3 mr-1" />
                          Auto Translate
                        </>
                      )}
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="أدخل وصف الفئة"
                      rows={3}
                      dir="rtl"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attribute Selection & Inheritance */}
            {currentParentId && currentParentId !== 'none' && parentAttributes.length > 0 && (
              <div className="border rounded p-4 mb-4">
                <div className="mb-2 text-sm font-medium">Inherited Attributes</div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {parentAttributes.map(attr => (
                    <Badge key={attr.id} variant="outline" className="opacity-60 cursor-not-allowed">
                      {attr.name}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Custom Attributes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttributeModal(true)}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attributes
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] border rounded p-2">
                  {selectedAttributes.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No custom attributes selected</span>
                  ) : (
                    selectedAttributes.map(attr => (
                      <Badge key={attr.id} variant="secondary" className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {attr.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(attr.id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* If no parent or root, always allow custom selection */}
            {(!currentParentId) && (
              <div className="border rounded p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Attributes</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttributeModal(true)}
                    className="h-8"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attributes
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px] border rounded p-2">
                  {selectedAttributes.length === 0 ? (
                    <span className="text-sm text-muted-foreground">No attributes selected</span>
                  ) : (
                    selectedAttributes.map(attr => (
                      <Badge key={attr.id} variant="secondary" className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {attr.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(attr.id)}
                          className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Attribute Selection Modal */}
            <Dialog open={showAttributeModal} onOpenChange={setShowAttributeModal}>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
                <DialogHeader>
                  <DialogTitle>Select Attributes</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search attributes..."
                      value={attributeSearchTerm}
                      onChange={(e) => setAttributeSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Attribute List */}
                  <div className="max-h-[400px] overflow-y-auto border rounded">
                    {filteredAttributes.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No attributes found
                      </div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredAttributes.map((attribute) => (
                          <div
                            key={attribute.id}
                            className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                            onClick={() => handleAttributeSelect(attribute)}
                          >
                            <Checkbox
                              checked={selectedAttributes.some(attr => attr.id === attribute.id)}
                              onCheckedChange={() => handleAttributeSelect(attribute)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{attribute.name}</span>
                                {attribute.ar_name && (
                                  <span className="text-sm text-muted-foreground">({attribute.ar_name})</span>
                                )}
                              </div>
                              {attribute.description && (
                                <p className="text-sm text-muted-foreground">{attribute.description}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected Count */}
                  <div className="text-sm text-muted-foreground">
                    {selectedAttributes.length} attribute{selectedAttributes.length !== 1 ? 's' : ''} selected
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAttributeModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowAttributeModal(false)}>
                      Done
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Make this category visible to users
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : (category ? 'Update Category' : 'Create Category')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 