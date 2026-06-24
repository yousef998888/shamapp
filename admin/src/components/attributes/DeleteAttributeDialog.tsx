import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  enable_archives: boolean;
  sort_order: string;
  terms_count?: number;
  product_count?: number;
}

interface DeleteAttributeDialogProps {
  attribute: ProductAttribute;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAttributeDialog({ attribute, onClose, onConfirm }: DeleteAttributeDialogProps) {
  const hasProducts = (attribute.product_count || 0) > 0;
  const hasTerms = (attribute.terms_count || 0) > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete Attribute</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the attribute "{attribute.name}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Attribute Details:</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {attribute.name}</p>
              <p><strong>Slug:</strong> {attribute.slug}</p>
              {attribute.description && (
                <p><strong>Description:</strong> {attribute.description}</p>
              )}
              <p><strong>Status:</strong> {attribute.is_active ? 'Active' : 'Inactive'}</p>
              <p><strong>Archives:</strong> {attribute.enable_archives ? 'Enabled' : 'Disabled'}</p>
              <p><strong>Sort Order:</strong> {attribute.sort_order}</p>
              <p><strong>Terms:</strong> {attribute.terms_count || 0}</p>
              <p><strong>Products:</strong> {attribute.product_count || 0}</p>
            </div>
          </div>

          {hasTerms && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This attribute has {attribute.terms_count} term(s). 
                    Deleting it will also remove all associated terms.
                  </p>
                </div>
              </div>
            </div>
          )}

          {hasProducts && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Critical Warning</h4>
                  <p className="text-sm text-red-700 mt-1">
                    This attribute is currently assigned to {attribute.product_count} product(s). 
                    Deleting it will remove the attribute from all associated products.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete Attribute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 