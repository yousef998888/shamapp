import React from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Category } from '@/lib/supabase';

interface DeleteCategoryDialogProps {
  category: Category;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCategoryDialog({ category, onClose, onConfirm }: DeleteCategoryDialogProps) {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Category</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{category.name}"?
            {hasChildren && (
              <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Warning: This category has {category.children!.length} child categories.
                </p>
                <p className="text-sm text-destructive/80 mt-1">
                  Deleting this category will also delete all its child categories and any products associated with them.
                </p>
              </div>
            )}
            {!hasChildren && (
              <p className="text-sm text-muted-foreground mt-2">
                This action cannot be undone. Any products in this category will lose their category association.
              </p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete Category
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
} 