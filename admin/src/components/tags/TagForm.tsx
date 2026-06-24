import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { supabase, ProductTag } from '@/lib/supabase';

interface TagFormProps {
  tag?: ProductTag | null;
  onClose: () => void;
  onSubmit: () => void;
}

export function TagForm({ tag, onClose, onSubmit }: TagFormProps) {
  const [name, setName] = useState('');
  const [arName, setArName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [arDescription, setArDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setArName(tag.ar_name || '');
      setSlug(tag.slug);
      setDescription(tag.description || '');
      setArDescription(tag.ar_description || '');
      setIsActive(tag.is_active);
    }
  }, [tag]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!tag) { // Only auto-generate for new tags
      const generatedSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setSlug(generatedSlug);
    }
  }, [name, tag]);

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
      const tagData = {
        name: name.trim(),
        ar_name: arName.trim() || null,
        slug: slug.trim(),
        description: description.trim() || null,
        ar_description: arDescription.trim() || null,
        is_active: isActive,
      };

      if (tag) {
        // Update existing tag
        const { error } = await supabase
          .from('product_tags')
          .update(tagData)
          .eq('id', tag.id);

        if (error) {
          console.error('Error updating tag:', error);
          setErrors({ submit: 'Failed to update tag' });
          return;
        }
      } else {
        // Create new tag
        const { error } = await supabase
          .from('product_tags')
          .insert(tagData);

        if (error) {
          console.error('Error creating tag:', error);
          if (error.code === '23505') {
            setErrors({ slug: 'A tag with this slug already exists' });
          } else {
            setErrors({ submit: 'Failed to create tag' });
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
            {tag ? 'Edit Tag' : 'Add New Tag'}
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
              <Label htmlFor="name">Name (English) *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter tag name"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="ar-name">Name (Arabic)</Label>
              <Input
                id="ar-name"
                value={arName}
                onChange={(e) => setArName(e.target.value)}
                placeholder="أدخل اسم العلامة"
                dir="rtl"
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="tag-slug"
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
              <Label htmlFor="description">Description (English)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="ar-description">Description (Arabic)</Label>
              <Textarea
                id="ar-description"
                value={arDescription}
                onChange={(e) => setArDescription(e.target.value)}
                placeholder="وصف اختياري"
                rows={3}
                dir="rtl"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is-active">Active</Label>
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
                {loading ? 'Saving...' : (tag ? 'Update Tag' : 'Create Tag')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 