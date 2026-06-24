import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase, Category, ProductAttribute } from '@/lib/supabase';

interface CategoryAttributeLink {
  id: string;
  category_id: string;
  attribute_id: string;
}

export default function BulkAttributeAssignmentPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [links, setLinks] = useState<CategoryAttributeLink[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedAttributeIds, setSelectedAttributeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch categories
    const { data: catData } = await supabase.from('categories').select('*');
    // Fetch attributes
    const { data: attrData } = await supabase.from('product_attributes').select('*');
    // Fetch links
    const { data: linkData } = await supabase.from('category_attribute_relationships').select('*');
    setCategories(catData || []);
    setAttributes(attrData || []);
    setLinks(linkData || []);
    setLoading(false);
  };

  const isLinked = (categoryId: string, attributeId: string) =>
    links.some(link => link.category_id === categoryId && link.attribute_id === attributeId);

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleAttributeSelect = (id: string) => {
    setSelectedAttributeIds(prev =>
      prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]
    );
  };

  const handleBulkAssign = async () => {
    setSaving(true);
    // Find all missing links to add
    const toAdd: { category_id: string; attribute_id: string }[] = [];
    selectedCategoryIds.forEach(category_id => {
      selectedAttributeIds.forEach(attribute_id => {
        if (!isLinked(category_id, attribute_id)) {
          toAdd.push({ category_id, attribute_id });
        }
      });
    });
    if (toAdd.length > 0) {
      await supabase.from('category_attribute_relationships').insert(toAdd);
    }
    await fetchData();
    setSaving(false);
  };

  const handleBulkUnassign = async () => {
    setSaving(true);
    // Remove all selected links
    for (const category_id of selectedCategoryIds) {
      for (const attribute_id of selectedAttributeIds) {
        const link = links.find(l => l.category_id === category_id && l.attribute_id === attribute_id);
        if (link) {
          await supabase.from('category_attribute_relationships').delete().eq('id', link.id);
        }
      }
    }
    await fetchData();
    setSaving(false);
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Assign Attributes to Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-2">Categories</h3>
              <div className="max-h-64 overflow-y-auto border rounded p-2">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      checked={selectedCategoryIds.includes(cat.id)}
                      onCheckedChange={() => handleCategorySelect(cat.id)}
                      id={`cat-${cat.id}`}
                    />
                    <label htmlFor={`cat-${cat.id}`}>{cat.name}</label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Attributes</h3>
              <div className="max-h-64 overflow-y-auto border rounded p-2">
                {attributes.map(attr => (
                  <div key={attr.id} className="flex items-center space-x-2 mb-1">
                    <Checkbox
                      checked={selectedAttributeIds.includes(attr.id)}
                      onCheckedChange={() => handleAttributeSelect(attr.id)}
                      id={`attr-${attr.id}`}
                    />
                    <label htmlFor={`attr-${attr.id}`}>{attr.name}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Separator className="my-6" />
          <div className="flex space-x-2">
            <Button onClick={handleBulkAssign} disabled={saving || !selectedCategoryIds.length || !selectedAttributeIds.length}>
              Assign Selected Attributes
            </Button>
            <Button variant="outline" onClick={handleBulkUnassign} disabled={saving || !selectedCategoryIds.length || !selectedAttributeIds.length}>
              Unassign Selected Attributes
            </Button>
          </div>
          <Separator className="my-6" />
          <h3 className="font-semibold mb-2">Current Assignments</h3>
          <div className="max-h-64 overflow-y-auto border rounded p-2">
            {categories.map(cat => (
              <div key={cat.id} className="mb-2">
                <div className="font-medium">{cat.name}</div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {attributes.filter(attr => isLinked(cat.id, attr.id)).map(attr => (
                    <span key={attr.id} className="px-2 py-1 bg-gray-100 rounded text-xs">
                      {attr.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 