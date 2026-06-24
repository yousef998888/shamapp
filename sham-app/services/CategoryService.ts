import { supabase } from '@/utils/supabase';
import type { Category } from '@/types/database';
import type { ProductWithRelations } from './ProductService';

export interface CategoryBreadcrumb {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryDetail extends Category {
  breadcrumbs: CategoryBreadcrumb[];
  children: Category[];
}

const fetchCategories = async (): Promise<Category[]> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
};

const fetchAttributesAndTermsForCategories = async (categoryIds: string[]) => {
  // Get all attribute IDs for these categories
  const { data: links, error: linkError } = await supabase
    .from('category_attribute_relationships')
    .select('attribute_id')
    .in('category_id', categoryIds);
  
  if (linkError) throw linkError;
  if (!links || links.length === 0) return [];
  
  const attributeIds = Array.from(new Set(links.map((l: any) => l.attribute_id)));
  
  // Get attribute details
  const { data: attrs, error: attrError } = await supabase
    .from('product_attributes')
    .select('*')
    .in('id', attributeIds)
    .eq('is_active', true)
    .order('name');
  
  if (attrError) throw attrError;
  
  // For each attribute, fetch its terms
  const attributesWithTerms = await Promise.all(
    (attrs || []).map(async (attr) => {
      const { data: terms } = await supabase
        .from('product_attribute_terms')
        .select('*')
        .eq('attribute_id', attr.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });
      return { ...attr, terms: terms || [] };
    })
  );
  
  return attributesWithTerms;
};

const fetchCategoryDetail = async (slug: string): Promise<CategoryDetail | null> => {
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  if (!category) {
    return null;
  }

  // Build breadcrumb trail (ancestors to current category)
  const breadcrumbs: CategoryBreadcrumb[] = [];
  let currentParentId = category.parent_id ?? null;

  while (currentParentId) {
    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .eq('id', currentParentId)
      .single();

    if (parentError) {
      console.warn('[CategoryService] Failed to fetch parent category', parentError);
      break;
    }

    if (!parent) {
      break;
    }

    breadcrumbs.unshift({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
    });

    currentParentId = parent.parent_id;
  }

  // Append the current category to breadcrumb trail
  breadcrumbs.push({
    id: category.id,
    name: category.name,
    slug: category.slug,
  });

  // Fetch child categories
  const { data: children, error: childrenError } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', category.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (childrenError) {
    throw childrenError;
  }

  return {
    ...category,
    breadcrumbs,
    children: children ?? [],
  };
};

type FetchCategoryProductsOptions = {
  limit?: number;
  includeChildren?: boolean;
};

const fetchProductsForCategory = async (
  categoryId: string,
  options: FetchCategoryProductsOptions = {},
): Promise<{ products: ProductWithRelations[]; count: number }> => {
  const { limit = 6, includeChildren = true } = options;
  const categoryIds = new Set<string>([categoryId]);

  if (includeChildren) {
    const { data: children } = await supabase
      .from('categories')
      .select('id')
      .eq('parent_id', categoryId)
      .eq('is_active', true);

    children?.forEach((child) => categoryIds.add(child.id));
  }

  const { data, error, count } = await supabase
    .from('products')
    .select(
      `
        *,
        category:categories(id, name, slug),
        images:product_images(*),
        seller:user_profiles(full_name, username, avatar_url),
        attribute_relationships:product_attribute_relationships(
          *,
          attribute:product_attributes(*),
          term:product_attribute_terms(*)
        )
      `,
      { count: 'exact' },
    )
    .eq('status', 'active')
    .in('category_id', Array.from(categoryIds))
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return {
    products: (data as ProductWithRelations[] | null) ?? [],
    count: count ?? 0,
  };
};

const CategoryService = {
  fetchCategories,
  fetchAttributesAndTermsForCategories,
  fetchCategoryDetail,
  fetchProductsForCategory,
};

export default CategoryService;
