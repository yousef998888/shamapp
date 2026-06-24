import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  X, 
  Tag, 
  Settings,
  Search,
  Users,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/supabase';

interface ProductTag {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
}

interface BulkAssignmentDialogProps {
  category: Category;
  onClose: () => void;
  onUpdate: () => void;
}

export function BulkAssignmentDialog({ category, onClose, onUpdate }: BulkAssignmentDialogProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'attributes'>('tags');
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedAttributes, setSelectedAttributes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentAssignments, setCurrentAssignments] = useState<{
    tags: string[];
    attributes: string[];
  }>({ tags: [], attributes: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all active tags
      const { data: tagsData } = await supabase
        .from('product_tags')
        .select('id, name, slug, is_active')
        .eq('is_active', true)
        .order('name');

      // Fetch all active attributes
      const { data: attributesData } = await supabase
        .from('product_attributes')
        .select('id, name, slug, is_active')
        .eq('is_active', true)
        .order('name');

      // Fetch current assignments for this category
      const { data: currentTags } = await supabase
        .from('category_tag_relationships')
        .select('tag_id')
        .eq('category_id', category.id);

      const { data: currentAttributes } = await supabase
        .from('category_attribute_relationships')
        .select('attribute_id')
        .eq('category_id', category.id);

      setTags(tagsData || []);
      setAttributes(attributesData || []);
      setCurrentAssignments({
        tags: currentTags?.map(t => t.tag_id) || [],
        attributes: currentAttributes?.map(a => a.attribute_id) || []
      });
      setSelectedTags(currentTags?.map(t => t.tag_id) || []);
      setSelectedAttributes(currentAttributes?.map(a => a.attribute_id) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Handle tag assignments
      const tagsToAdd = selectedTags.filter(tagId => !currentAssignments.tags.includes(tagId));
      const tagsToRemove = currentAssignments.tags.filter(tagId => !selectedTags.includes(tagId));

      if (tagsToAdd.length > 0) {
        await supabase
          .from('category_tag_relationships')
          .insert(tagsToAdd.map(tagId => ({
            category_id: category.id,
            tag_id: tagId
          })));
      }

      if (tagsToRemove.length > 0) {
        await supabase
          .from('category_tag_relationships')
          .delete()
          .eq('category_id', category.id)
          .in('tag_id', tagsToRemove);
      }

      // Handle attribute assignments
      const attributesToAdd = selectedAttributes.filter(attrId => !currentAssignments.attributes.includes(attrId));
      const attributesToRemove = currentAssignments.attributes.filter(attrId => !selectedAttributes.includes(attrId));

      if (attributesToAdd.length > 0) {
        await supabase
          .from('category_attribute_relationships')
          .insert(attributesToAdd.map(attrId => ({
            category_id: category.id,
            attribute_id: attrId
          })));
      }

      if (attributesToRemove.length > 0) {
        await supabase
          .from('category_attribute_relationships')
          .delete()
          .eq('category_id', category.id)
          .in('attribute_id', attributesToRemove);
      }

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAttributes = attributes.filter(attr =>
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Bulk Assignment</CardTitle>
            <p className="text-sm text-muted-foreground">
              Assign tags and attributes to: {category.name}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabs */}
          <div className="flex space-x-1 border-b">
            <Button
              variant={activeTab === 'tags' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('tags')}
              className="flex items-center space-x-2"
            >
              <Tag className="h-4 w-4" />
              <span>Tags ({selectedTags.length})</span>
            </Button>
            <Button
              variant={activeTab === 'attributes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('attributes')}
              className="flex items-center space-x-2"
            >
              <Settings className="h-4 w-4" />
              <span>Attributes ({selectedAttributes.length})</span>
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'tags' ? (
              <div className="space-y-2">
                {filteredTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTags([...selectedTags, tag.id]);
                        } else {
                          setSelectedTags(selectedTags.filter(id => id !== tag.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{tag.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tag.slug}
                        </Badge>
                      </div>
                    </div>
                    {currentAssignments.tags.includes(tag.id) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
                {filteredTags.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No tags found
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAttributes.map((attribute) => (
                  <div
                    key={attribute.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={selectedAttributes.includes(attribute.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAttributes([...selectedAttributes, attribute.id]);
                        } else {
                          setSelectedAttributes(selectedAttributes.filter(id => id !== attribute.id));
                        }
                      }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{attribute.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {attribute.slug}
                        </Badge>
                      </div>
                    </div>
                    {currentAssignments.attributes.includes(attribute.id) && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                ))}
                {filteredAttributes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No attributes found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {activeTab === 'tags' 
                ? `${selectedTags.length} tags selected`
                : `${selectedAttributes.length} attributes selected`
              }
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Assignments'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 