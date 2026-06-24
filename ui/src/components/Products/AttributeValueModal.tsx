import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/shadcn/dialog";
import { Button } from "@/components/shadcn/button";
import CategoryService from "@/services/CategoryService";
import { ProductAttribute, ProductAttributeTerm } from "@/types/database";
import { Checkbox } from "@/components/shadcn/checkbox";
import { getAttributeName, getAttributeTermName } from "@/utils/DisplayAtteibuteSupportedLanguage";

interface AttributeValueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attribute: ProductAttribute;
  value?: string[];
  onSelect: (terms: ProductAttributeTerm[]) => void;
}

export const AttributeValueModal: React.FC<AttributeValueModalProps> = ({ open, onOpenChange, attribute, value = [], onSelect }) => {
  const { t } = useTranslation();
  const [terms, setTerms] = useState<ProductAttributeTerm[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string[]>(value);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    CategoryService.fetchAttributeTerms(attribute.id)
      .then(setTerms)
      .finally(() => setLoading(false));
    setSelected(value);
  }, [open, attribute.id, value]);

  const handleToggle = (termId: string) => {
    setSelected(prev =>
      prev.includes(termId) ? prev.filter(id => id !== termId) : [...prev, termId]
    );
  };

  const handleSave = () => {
    const selectedTerms = terms.filter(t => selected.includes(t.id));
    onSelect(selectedTerms);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('listing.attributeModal.selectPrefix')} {getAttributeName(attribute)}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">{t('listing.attributeModal.loading')}</div>
        ) : terms.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">{t('listing.attributeModal.noOptions')}</div>
        ) : (
          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {terms.map(term => (
              <label key={term.id} className="flex items-center gap-2 cursor-pointer px-2 py-1 rounded hover:bg-accent">
                <Checkbox
                  checked={selected.includes(term.id)}
                  onCheckedChange={() => handleToggle(term.id)}
                  className="mr-2"
                />
                <span>{getAttributeTermName(term)}</span>
              </label>
            ))}
          </div>
        )}
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} type="button">{t('listing.attributeModal.cancel')}</Button>
          <Button onClick={handleSave} disabled={loading || terms.length === 0} type="button">{t('listing.attributeModal.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 