import { useState } from 'react';
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
import { PickupLocation, supabase } from '@/lib/supabase';

interface DeleteLocationDialogProps {
  location: PickupLocation;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteLocationDialog({ location, onClose, onConfirm }: DeleteLocationDialogProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('pickup_locations')
        .delete()
        .eq('id', location.id);

      if (error) {
        console.error('Error deleting location:', error);
        return;
      }

      onConfirm();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Location</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{location.name}"? This action cannot be undone.
            <br /><br />
            <strong>Location Details:</strong>
            <br />
            • Address: {location.address}
            <br />
            • Type: {location.type}
            <br />
            • City: {location.city?.name || 'Unknown'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Deleting...' : 'Delete Location'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
