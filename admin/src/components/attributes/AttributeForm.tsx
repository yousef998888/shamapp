import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Languages, Loader2 } from 'lucide-react';
import { supabase, ProductAttribute } from '@/lib/supabase';
import { toast } from 'sonner';

interface AttributeFormProps {
  attribute?: ProductAttribute | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function AttributeForm({ attribute, onClose, onSubmit }: AttributeFormProps) {
  const [name, setName] = useState('');
  const [arName, setArName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [arDescription, setArDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [enableArchives, setEnableArchives] = useState(false);
  const [sortOrder, setSortOrder] = useState<'name' | 'name_numeric' | 'term_id' | 'custom'>('name');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [translatingName, setTranslatingName] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [translatingNameToEn, setTranslatingNameToEn] = useState(false);
  const [translatingDescriptionToEn, setTranslatingDescriptionToEn] = useState(false);

  useEffect(() => {
    if (attribute) {
      setName(attribute.name);
      setArName(attribute.ar_name || '');
      setSlug(attribute.slug);
      setDescription(attribute.description || '');
      setArDescription(attribute.ar_description || '');
      setIsActive(attribute.is_active);
      setEnableArchives(attribute.enable_archives);
      setSortOrder(attribute.sort_order);
    }
  }, [attribute]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!attribute) { // Only auto-generate for new attributes
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [name, attribute]);

  const translateText = async (text: string, targetLanguage: 'ar' | 'en' = 'ar'): Promise<string> => {
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:6666';
    const response = await fetch(`${serverUrl}/api/translations-v2/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        source_language: 'en',
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
    if (!name.trim()) {
      toast.error('Please enter an English name first');
      return;
    }

    setTranslatingName(true);
    try {
      const translated = await translateText(name.trim(), 'ar');
      setArName(translated);
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingName(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!description.trim()) {
      toast.error('Please enter an English description first');
      return;
    }

    setTranslatingDescription(true);
    try {
      const translated = await translateText(description.trim(), 'ar');
      setArDescription(translated);
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescription(false);
    }
  };

  const handleTranslateNameToEnglish = async () => {
    if (!arName.trim()) {
      toast.error('Please enter an Arabic name first');
      return;
    }

    setTranslatingNameToEn(true);
    try {
      const translated = await translateText(arName.trim(), 'en');
      setName(translated);
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingNameToEn(false);
    }
  };

  const handleTranslateDescriptionToEnglish = async () => {
    if (!arDescription.trim()) {
      toast.error('Please enter an Arabic description first');
      return;
    }

    setTranslatingDescriptionToEn(true);
    try {
      const translated = await translateText(arDescription.trim(), 'en');
      setDescription(translated);
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescriptionToEn(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const attributeData = {
        name: name.trim(),
        ar_name: arName.trim() || null,
        slug: slug.trim(),
        description: description.trim() || null,
        ar_description: arDescription.trim() || null,
        is_active: isActive,
        enable_archives: enableArchives,
        sort_order: sortOrder,
      };

      if (attribute) {
        // Update existing attribute
        const { error } = await supabase
          .from('product_attributes')
          .update(attributeData)
          .eq('id', attribute.id);

        if (error) {
          console.error('Error updating attribute:', error);
          setErrors({ submit: 'Failed to update attribute' });
          return;
        }
      } else {
        // Create new attribute
        const { error } = await supabase
          .from('product_attributes')
          .insert(attributeData);

        if (error) {
          console.error('Error creating attribute:', error);
          if (error.code === '23505') {
            setErrors({ slug: 'An attribute with this slug already exists' });
          } else {
            setErrors({ submit: 'Failed to create attribute' });
          }
          return;
        }
      }

      onSubmit();
    } catch (error) {
      console.error('Error:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg">
            {attribute ? 'Edit Attribute' : 'Add New Attribute'}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="name">Name (English) *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateNameToEnglish}
                  disabled={!arName.trim() || translatingNameToEn}
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
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter attribute name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="ar-name">Name (Arabic)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateName}
                  disabled={!name.trim() || translatingName}
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
              <Input
                id="ar-name"
                value={arName}
                onChange={(e) => setArName(e.target.value)}
                placeholder="أدخل اسم الخاصية"
                dir="rtl"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="attribute-slug"
                className={errors.slug ? 'border-red-500' : ''}
              />
              {errors.slug && (
                <p className="text-sm text-red-500 mt-1">{errors.slug}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                URL-friendly version of the name
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="description">Description (English)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateDescriptionToEnglish}
                  disabled={!arDescription.trim() || translatingDescriptionToEn}
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
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="ar-description">Description (Arabic)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTranslateDescription}
                  disabled={!description.trim() || translatingDescription}
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
              <Textarea
                id="ar-description"
                value={arDescription}
                onChange={(e) => setArDescription(e.target.value)}
                placeholder="وصف اختياري"
                rows={3}
                dir="rtl"
              />
            </div>

            <div>
              <Label htmlFor="sort-order">Sort Order</Label>
              <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="name_numeric">Name (Numeric)</SelectItem>
                  <SelectItem value="term_id">Term ID</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is-active">Active</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enable-archives"
                checked={enableArchives}
                onCheckedChange={setEnableArchives}
              />
              <Label htmlFor="enable-archives">Enable Archives</Label>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}

            <div className="flex space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : (attribute ? 'Update Attribute' : 'Create Attribute')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 