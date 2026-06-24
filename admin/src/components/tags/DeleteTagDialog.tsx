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

interface ProductTag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  product_count?: number;
}

interface DeleteTagDialogProps {
  tag: ProductTag;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteTagDialog({ tag, onClose, onConfirm }: DeleteTagDialogProps) {
  const hasProducts = (tag.product_count || 0) > 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Delete Tag</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the tag "{tag.name}"?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Tag Details:</h4>
            <div className="space-y-1 text-sm">
              <p><strong>Name:</strong> {tag.name}</p>
              <p><strong>Slug:</strong> {tag.slug}</p>
              {tag.description && (
                <p><strong>Description:</strong> {tag.description}</p>
              )}
              <p><strong>Status:</strong> {tag.is_active ? 'Active' : 'Inactive'}</p>
              <p><strong>Products:</strong> {tag.product_count || 0}</p>
            </div>
          </div>

          {hasProducts && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">Warning</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This tag is currently assigned to {tag.product_count} product(s). 
                    Deleting it will remove the tag from all associated products.
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
            Delete Tag
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 