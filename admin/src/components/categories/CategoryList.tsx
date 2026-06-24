import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Plus, 
  Edit, 
  Trash2,
  Eye,
  EyeOff,
  Users
} from 'lucide-react';
import { Category, supabase } from '@/lib/supabase';
import { CategoryForm } from './CategoryForm';
import { DeleteCategoryDialog } from './DeleteCategoryDialog';
import { BulkAssignmentDialog } from './BulkAssignmentDialog';
import { useNavigate } from 'react-router-dom';

interface CategoryListProps {
  onCategorySelect?: (category: Category) => void;
}

export function CategoryList({ onCategorySelect }: CategoryListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [showBulkAssignment, setShowBulkAssignment] = useState(false);
  const [selectedCategoryForAssignment, setSelectedCategoryForAssignment] = useState<Category | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  // Helper to build a tree from flat categories
  const buildCategoryTree = (flatCategories: Category[]): Category[] => {
    const idToCategory: Record<string, Category & { children: Category[] }> = {};
    const roots: Category[] = [];

    // Initialize map and children arrays
    flatCategories.forEach(cat => {
      idToCategory[cat.id] = { ...cat, children: [] };
    });

    // Build tree
    flatCategories.forEach(cat => {
      if (cat.parent_id && idToCategory[cat.parent_id]) {
        idToCategory[cat.parent_id].children.push(idToCategory[cat.id]);
      } else {
        roots.push(idToCategory[cat.id]);
      }
    });

    return roots;
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order');

      if (error) {
        console.error('Error fetching categories:', error);
        return;
      }

      // Build tree from flat data
      setCategories(data ? buildCategoryTree(data) : []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleAddCategory = (parent?: Category) => {
    setParentCategory(parent || null);
    setEditingCategory(null);
    setShowForm(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setParentCategory(null);
    setShowForm(true);
  };

  const handleDeleteCategory = (category: Category) => {
    setDeletingCategory(category);
  };

  const handleBulkAssignment = (category: Category) => {
    setSelectedCategoryForAssignment(category);
    setShowBulkAssignment(true);
  };

  const handleFormSubmit = async () => {
    await fetchCategories();
    setShowForm(false);
    setEditingCategory(null);
    setParentCategory(null);
  };

  const handleDeleteConfirm = async () => {
    if (deletingCategory) {
      try {
        const { error, data } = await supabase
          .from('categories')
          .delete()
          .eq('id', deletingCategory.id);

        console.log("data", data);

        if (error) {
          console.error('Error deleting category:', error);
          return;
        }

        await fetchCategories();
        setDeletingCategory(null);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="space-y-2">
        <div 
          className={`
            flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors
            ${level > 0 ? 'ml-6' : ''}
          `}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleExpanded(category.id)}
                className="h-6 w-6 p-0"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <div className="flex items-center space-x-2">
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4 text-blue-500" />
                ) : (
                  <Folder className="h-4 w-4 text-blue-500" />
                )
              ) : (
                <Folder className="h-4 w-4 text-gray-400" />
              )}
              
              <div>
                <div className="flex items-center space-x-2">
                  <span
                    className="font-medium cursor-pointer hover:underline"
                    onClick={() => navigate(`/cat/${category.id}`)}
                  >
                    {category.name}
                  </span>
                  {category.ar_name && (
                    <span className="text-sm text-muted-foreground">({category.ar_name})</span>
                  )}
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {category.description && (
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs bg-gray-100 text-gray-800 border-gray-300">
              {category.children?.length || 0} children
            </Badge>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAssignment(category)}
                className="h-8 w-8 p-0 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-300"
                title="Assign tags & attributes"
              >
                <Users className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddCategory(category)}
                className="h-8 w-8 p-0 bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                title="Add child category"
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditCategory(category)}
                className="h-8 w-8 p-0 bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
                title="Edit category"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDeleteCategory(category)}
                className="h-8 w-8 p-0 text-destructive hover:text-red-200 bg-white border-gray-300"
                title="Delete category"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-2">
            {category.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

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
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">
            Manage your product categories and subcategories
          </p>
        </div>
        <Button onClick={() => handleAddCategory()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <Separator />

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Folder className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first category to get started
            </p>
            <Button onClick={() => handleAddCategory()}>
              <Plus className="h-4 w-4 mr-2" />
              Create Category
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => renderCategory(category))}
        </div>
      )}

      {showForm && (
        <CategoryForm
          category={editingCategory}
          parentCategory={parentCategory}
          onClose={() => {
            setShowForm(false);
            setEditingCategory(null);
            setParentCategory(null);
          }}
          onSubmit={handleFormSubmit}
        />
      )}

      {deletingCategory && (
        <DeleteCategoryDialog
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {showBulkAssignment && selectedCategoryForAssignment && (
        <BulkAssignmentDialog
          category={selectedCategoryForAssignment}
          onClose={() => {
            setShowBulkAssignment(false);
            setSelectedCategoryForAssignment(null);
          }}
          onUpdate={fetchCategories}
        />
      )}
    </div>
  );
} 