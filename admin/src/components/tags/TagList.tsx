import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Edit, 
  Trash2,
  Tag,
  Search,
  Filter
} from 'lucide-react';
import { supabase, ProductTag } from '@/lib/supabase';
import { TagForm } from '@/components/tags/TagForm';
import { DeleteTagDialog } from '@/components/tags/DeleteTagDialog';

export function TagList() {
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<ProductTag | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      setLoading(true);
      
      // Get tags with product count - use left join to include tags without relationships
      const { data, error } = await supabase
        .from('product_tags')
        .select(`
          *,
          product_tag_relationships(product_id)
        `)
        .order('name');

      if (error) {
        console.error('Error fetching tags:', error);
        return;
      }

      // Process the data to get product counts
      const processedTags = data?.map(tag => ({
        ...tag,
        product_count: tag.product_tag_relationships?.length || 0
      })) || [];

      setTags(processedTags);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    setEditingTag(null);
    setShowForm(true);
  };

  const handleEditTag = (tag: ProductTag) => {
    setEditingTag(tag);
    setShowForm(true);
  };

  const handleDeleteTag = (tag: ProductTag) => {
    setDeletingTag(tag);
  };

  const handleFormSubmit = async () => {
    await fetchTags();
    setShowForm(false);
    setEditingTag(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingTag) {
      try {
        const { error } = await supabase
          .from('product_tags')
          .delete()
          .eq('id', deletingTag.id);

        if (error) {
          console.error('Error deleting tag:', error);
          return;
        }

        await fetchTags();
        setDeletingTag(null);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  // Filter tags based on search and filter
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterActive === 'all' || 
                         (filterActive === 'active' && tag.is_active) ||
                         (filterActive === 'inactive' && !tag.is_active);
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Product Tags</h2>
          <p className="text-muted-foreground">
            Manage product tags for better organization and filtering
          </p>
        </div>
        <Button onClick={handleAddTag}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      <Separator />

      {/* Search and Filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="filter" className="text-sm font-medium">Filter:</Label>
          <select
            id="filter"
            value={filterActive}
            onChange={(e) => setFilterActive(e.target.value as any)}
            className="border border-input bg-background px-3 py-2 rounded-md text-sm"
          >
            <option value="all">All Tags</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {filteredTags.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchTerm || filterActive !== 'all' ? 'No tags found' : 'No tags yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterActive !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Create your first tag to get started'
              }
            </p>
            {!searchTerm && filterActive === 'all' && (
              <Button onClick={handleAddTag}>
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map((tag) => (
            <Card key={tag.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <CardTitle className="text-lg">{tag.name}</CardTitle>
                  </div>
                  <Badge variant={tag.is_active ? "default" : "secondary"}>
                    {tag.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {tag.ar_name && (
                  <p className="text-sm text-muted-foreground" dir="rtl">
                    {tag.ar_name}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {tag.description && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {tag.description}
                  </p>
                )}
                {tag.ar_description && (
                  <p className="text-sm text-muted-foreground mb-3" dir="rtl">
                    {tag.ar_description}
                  </p>
                )}
                
                <div className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {tag.slug}
                  </code>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditTag(tag)}
                      className="h-8 w-8 p-0"
                      title="Edit tag"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteTag(tag)}
                      className="h-8 w-8 p-0 text-destructive hover:text-red-200"
                      title="Delete tag"
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

      {showForm && (
        <TagForm
          tag={editingTag}
          onClose={() => {
            setShowForm(false);
            setEditingTag(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {deletingTag && (
        <DeleteTagDialog
          tag={deletingTag}
          onClose={() => setDeletingTag(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
} 