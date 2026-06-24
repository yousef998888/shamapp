import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Category } from '@/types/database';
import CategoryService from '@/services/CategoryService';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandItem,
  CommandEmpty,
} from '@/components/shadcn/command';
import { Button } from '@/components/shadcn/button';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getCategoryName } from '@/utils/DisplayAtteibuteSupportedLanguage';

interface CategorySelectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (category: Category) => void;
  selectedCategoryId?: string;
}

export const CategorySelectModal: React.FC<CategorySelectModalProps> = ({ open, onOpenChange, onSelect, selectedCategoryId }) => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentParent, setCurrentParent] = useState<Category | null>(null);
  const [filtered, setFiltered] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch all categories on mount
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    CategoryService.fetchCategories()
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open]);

  // Filter categories by parent and search
  useEffect(() => {
    let cats = categories.filter(cat => cat.parent_id === (currentParent ? currentParent.id : null));
    if (search) {
      cats = cats.filter(cat => {
        const categoryName = getCategoryName(cat);
        return categoryName.toLowerCase().includes(search.toLowerCase());
      });
    }
    setFiltered(cats);
  }, [categories, currentParent, search]);

  // Find children for a category
  const hasChildren = (cat: Category) => categories.some(c => c.parent_id === cat.id);

  // Drill down to children
  const handleCategoryClick = (cat: Category) => {
    if (hasChildren(cat)) {
      setCurrentParent(cat);
      setSearch('');
    } else {
      onSelect(cat);
      onOpenChange(false);
    }
  };

  // Go back to parent
  const handleBack = () => {
    if (!currentParent) return;
    const parent = categories.find(cat => cat.id === currentParent.parent_id) || null;
    setCurrentParent(parent);
    setSearch('');
  };

  // Reset navigation when closed or set to selected category's parent when opened
  useEffect(() => {
    if (!open) {
      setCurrentParent(null);
      setSearch('');
    } else if (open && selectedCategoryId && categories.length > 0) {
      // Find the parent chain for the selected category
      let selected = categories.find(cat => cat.id === selectedCategoryId);
      if (selected && selected.parent_id) {
        let parent = categories.find(cat => cat.id === selected.parent_id) || null;
        setCurrentParent(parent);
      } else {
        setCurrentParent(null);
      }
      setSearch('');
    }
  }, [open, selectedCategoryId, categories]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title={t('listing.categoryModal.title')} description={t('listing.create.selectCategory')}>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        {currentParent ? (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ChevronLeft className="w-4 h-4 me-1" />
            {getCategoryName(currentParent)}
          </Button>
        ) : (
          <span className="font-semibold text-lg">{t('listing.categoryModal.title')}</span>
        )}
      </div>
      <CommandInput
        placeholder={t('listing.categoryModal.searchPlaceholder')}
        value={search}
        onValueChange={setSearch}
        disabled={loading}
      />
      <CommandList>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{t('listing.categoryModal.loading')}</div>
        ) : (
          filtered.map(cat => (
            <CommandItem
              key={cat.id}
              onSelect={() => handleCategoryClick(cat)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {getCategoryName(cat)}
                {selectedCategoryId === cat.id && (
                  <Check className="w-4 h-4 text-green-600 ml-2" />
                )}
              </span>
              {hasChildren(cat) && <ChevronRight className="w-4 h-4" />}
            </CommandItem>
          ))
        )}
        {!loading && filtered.length === 0 && <CommandEmpty>{t('listing.categoryModal.noResults')}</CommandEmpty>}
      </CommandList>
    </CommandDialog>
  );
}; 