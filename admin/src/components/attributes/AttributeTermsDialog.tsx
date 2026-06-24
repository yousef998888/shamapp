import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Plus, Edit, Trash2, X, Settings, Languages, Loader2 } from 'lucide-react';
import { supabase, ProductAttribute, ProductAttributeTerm } from '@/lib/supabase';
import { toast } from 'sonner';

interface AttributeTermsDialogProps {
  attribute: ProductAttribute;
  onClose: () => void;
  onUpdate: () => void;
}

interface TermFormData {
  name: string;
  ar_name: string;
  slug: string;
  description: string;
  ar_description: string;
  sort_order: number;
  is_active: boolean;
}

export function AttributeTermsDialog({ attribute, onClose, onUpdate }: AttributeTermsDialogProps) {
  const [terms, setTerms] = useState<ProductAttributeTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState<ProductAttributeTerm | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<ProductAttributeTerm | null>(null);
  const [formData, setFormData] = useState<TermFormData>({
    name: '',
    ar_name: '',
    slug: '',
    description: '',
    ar_description: '',
    sort_order: 0,
    is_active: true,
  });
  const [translatingName, setTranslatingName] = useState(false);
  const [translatingDescription, setTranslatingDescription] = useState(false);
  const [translatingNameToEn, setTranslatingNameToEn] = useState(false);
  const [translatingDescriptionToEn, setTranslatingDescriptionToEn] = useState(false);

  useEffect(() => {
    fetchTerms();
  }, [attribute.id]);

  const fetchTerms = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_attribute_terms')
        .select('*')
        .eq('attribute_id', attribute.id)
        .order('sort_order');

      if (error) {
        console.error('Error fetching terms:', error);
        return;
      }

      setTerms(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTerm = () => {
    setEditingTerm(null);
    setFormData({
      name: '',
      ar_name: '',
      slug: '',
      description: '',
      ar_description: '',
      sort_order: 0,
      is_active: true,
    });
    setShowForm(true);
  };

  const handleEditTerm = (term: ProductAttributeTerm) => {
    setEditingTerm(term);
    setFormData({
      name: term.name,
      ar_name: term.ar_name || '',
      slug: term.slug,
      description: term.description || '',
      ar_description: term.ar_description || '',
      sort_order: term.sort_order,
      is_active: term.is_active,
    });
    setShowForm(true);
  };

  const handleDeleteTerm = (term: ProductAttributeTerm) => {
    setDeletingTerm(term);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      return;
    }

    try {
      const termData = {
        attribute_id: attribute.id,
        name: formData.name.trim(),
        ar_name: formData.ar_name.trim() || null,
        slug: formData.slug.trim(),
        description: formData.description.trim() || null,
        ar_description: formData.ar_description.trim() || null,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
      };

      if (editingTerm) {
        // Update existing term
        const { error } = await supabase
          .from('product_attribute_terms')
          .update(termData)
          .eq('id', editingTerm.id);

        if (error) {
          console.error('Error updating term:', error);
          return;
        }
      } else {
        // Create new term
        const { error } = await supabase
          .from('product_attribute_terms')
          .insert(termData);

        if (error) {
          console.error('Error creating term:', error);
          return;
        }
      }

      await fetchTerms();
      setShowForm(false);
      setEditingTerm(null);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deletingTerm) {
      try {
        const { error } = await supabase
          .from('product_attribute_terms')
          .delete()
          .eq('id', deletingTerm.id);

        if (error) {
          console.error('Error deleting term:', error);
          return;
        }

        await fetchTerms();
        setDeletingTerm(null);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  // Auto-generate slug from name
  useEffect(() => {
    if (!editingTerm) { // Only auto-generate for new terms
      const generatedSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug: generatedSlug }));
    }
  }, [formData.name, editingTerm]);

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
    if (!formData.name.trim()) {
      toast.error('Please enter an English name first');
      return;
    }

    setTranslatingName(true);
    try {
      const translated = await translateText(formData.name.trim(), 'ar');
      setFormData(prev => ({ ...prev, ar_name: translated }));
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingName(false);
    }
  };

  const handleTranslateDescription = async () => {
    if (!formData.description.trim()) {
      toast.error('Please enter an English description first');
      return;
    }

    setTranslatingDescription(true);
    try {
      const translated = await translateText(formData.description.trim(), 'ar');
      setFormData(prev => ({ ...prev, ar_description: translated }));
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescription(false);
    }
  };

  const handleTranslateNameToEnglish = async () => {
    if (!formData.ar_name.trim()) {
      toast.error('Please enter an Arabic name first');
      return;
    }

    setTranslatingNameToEn(true);
    try {
      const translated = await translateText(formData.ar_name.trim(), 'en');
      setFormData(prev => ({ ...prev, name: translated }));
      toast.success('Name translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate name');
    } finally {
      setTranslatingNameToEn(false);
    }
  };

  const handleTranslateDescriptionToEnglish = async () => {
    if (!formData.ar_description.trim()) {
      toast.error('Please enter an Arabic description first');
      return;
    }

    setTranslatingDescriptionToEn(true);
    try {
      const translated = await translateText(formData.ar_description.trim(), 'en');
      setFormData(prev => ({ ...prev, description: translated }));
      toast.success('Description translated successfully');
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate description');
    } finally {
      setTranslatingDescriptionToEn(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] h-[90vh] max-w-none max-h-none rounded-none overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Manage Terms: {attribute.name}</span>
            {attribute.ar_name && (
              <span className="text-sm text-muted-foreground" dir="rtl">
                ({attribute.ar_name})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {terms.length} terms for this attribute
            </p>
            <Button onClick={handleAddTerm} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Term
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : terms.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-muted-foreground mb-4">No terms yet</p>
                  <Button onClick={handleAddTerm} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Term
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {terms.map((term) => (
                  <Card key={term.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{term.name}</h4>
                            {term.ar_name && (
                              <span className="text-sm text-muted-foreground" dir="rtl">
                                ({term.ar_name})
                              </span>
                            )}
                            <Badge variant={term.is_active ? "default" : "secondary"} className="text-xs">
                              {term.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          {term.description && (
                            <p className="text-sm text-muted-foreground mb-1">
                              {term.description}
                            </p>
                          )}
                          {term.ar_description && (
                            <p className="text-sm text-muted-foreground mb-1" dir="rtl">
                              {term.ar_description}
                            </p>
                          )}
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <code className="bg-muted px-1 py-0.5 rounded">
                              {term.slug}
                            </code>
                            <span>Order: {term.sort_order}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTerm(term)}
                            className="h-8 w-8 p-0"
                            title="Edit term"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteTerm(term)}
                            className="h-8 w-8 p-0 text-destructive hover:text-red-200"
                            title="Delete term"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Term Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg">
                  {editingTerm ? 'Edit Term' : 'Add New Term'}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowForm(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="term-name">Name (English) *</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateNameToEnglish}
                        disabled={!formData.ar_name.trim() || translatingNameToEn}
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
                      id="term-name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter term name"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="term-ar-name">Name (Arabic)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateName}
                        disabled={!formData.name.trim() || translatingName}
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
                      id="term-ar-name"
                      value={formData.ar_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, ar_name: e.target.value }))}
                      placeholder="أدخل اسم المصطلح"
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="term-slug">Slug</Label>
                    <Input
                      id="term-slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="term-slug"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="term-description">Description (English)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateDescriptionToEnglish}
                        disabled={!formData.ar_description.trim() || translatingDescriptionToEn}
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
                      id="term-description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      rows={2}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="term-ar-description">Description (Arabic)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateDescription}
                        disabled={!formData.description.trim() || translatingDescription}
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
                      id="term-ar-description"
                      value={formData.ar_description}
                      onChange={(e) => setFormData(prev => ({ ...prev, ar_description: e.target.value }))}
                      placeholder="وصف اختياري"
                      rows={2}
                      dir="rtl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="term-sort-order">Sort Order</Label>
                    <Input
                      id="term-sort-order"
                      type="number"
                      value={formData.sort_order}
                      onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="term-is-active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="term-is-active">Active</Label>
                  </div>

                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="flex-1">
                      {editingTerm ? 'Update Term' : 'Create Term'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation */}
        {deletingTerm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Delete Term</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Are you sure you want to delete the term "{deletingTerm.name}"? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingTerm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 