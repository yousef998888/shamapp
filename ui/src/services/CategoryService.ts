// src/services/CategoryService.ts
import { supabase } from "@/lib/supabase";
import { Category } from '@/types/database'; 


const fetchCategories = async (): Promise<Category[]> => { // Explicitly define return type
  const { data, error: supabaseError } = await supabase
    .from("categories")
    .select("*")
    .eq('is_active', true) // Added active and sort_order from your previous code
    .order('sort_order');

  if (supabaseError) {
    throw supabaseError;
  }

  // Ensure data is always an array, even if null from Supabase
  return data || [];
};

const fetchCategoryAttributes = async (categoryId: string) => {
  // Get attribute IDs for this category
  const { data: links, error: linkError } = await supabase
    .from('category_attribute_relationships')
    .select('attribute_id')
    .eq('category_id', categoryId);
  if (linkError) throw linkError;
  if (!links || links.length === 0) return [];
  const ids = links.map((l: any) => l.attribute_id);
  // Get attribute details
  const { data: attrs, error: attrError } = await supabase
    .from('product_attributes')
    .select('*')
    .in('id', ids)
    .eq('is_active', true)
    .order('name');
  if (attrError) throw attrError;
  return attrs || [];
};

const fetchAttributeTerms = async (attributeId: string) => {
  const { data, error } = await supabase
    .from('product_attribute_terms')
    .select('*')
    .eq('attribute_id', attributeId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return data || [];
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

const CategoryService = {
  fetchCategories,
  fetchCategoryAttributes,
  fetchAttributeTerms,
  fetchAttributesAndTermsForCategories,
};

export default CategoryService;

