import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle, Package, Star } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Checkbox } from '@/components/shadcn/checkbox';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { toast } from 'react-hot-toast';

interface ReceiptConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  onConfirmReceipt: (review: string, rating: number) => void;
}

const checklistItems = [
  'Item matches the description',
  'Item is in good condition',
  'All parts/accessories included',
  'No damage or defects',
  'Item works as expected'
];

export function ReceiptConfirmationModal({ 
  isOpen, 
  onClose, 
  productTitle, 
  onConfirmReceipt 
}: ReceiptConfirmationModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [review, setReview] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (index: number, checked: boolean) => {
    const newCheckedItems = new Set(checkedItems);
    if (checked) {
      newCheckedItems.add(index);
    } else {
      newCheckedItems.delete(index);
    }
    setCheckedItems(newCheckedItems);
  };

  const handleConfirm = async () => {
    if (checkedItems.size < checklistItems.length) {
      toast.error('Please verify all checklist items before confirming receipt');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      onConfirmReceipt(review, rating);
      toast.success('Receipt confirmed! Transaction completed.');
      setIsSubmitting(false);
      onClose();
    }, 1000);
  };

  const allChecked = checkedItems.size === checklistItems.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Confirm Item Receipt</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-medium mb-2">Confirming receipt for:</h3>
              <p className="text-lg font-semibold text-blue-600">{productTitle}</p>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Item Verification Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {checklistItems.map((item, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Checkbox
                    id={`check-${index}`}
                    checked={checkedItems.has(index)}
                    onCheckedChange={(checked) => handleCheckboxChange(index, checked as boolean)}
                  />
                  <Label htmlFor={`check-${index}`} className="text-sm cursor-pointer">
                    {item}
                  </Label>
                </div>
              ))}
              
              {!allChecked && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <p className="text-sm text-yellow-700">
                      Please verify all items before confirming receipt
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Leave a Review (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="rating">Rating</Label>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1"
                    >
                      <Star 
                        className={`h-6 w-6 ${
                          star <= rating 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
                </div>
              </div>
              
              <div>
                <Label htmlFor="review">Review (Optional)</Label>
                <Textarea
                  id="review"
                  placeholder="Share your experience with this seller and product..."
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!allChecked || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Receipt & Complete Transaction'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 