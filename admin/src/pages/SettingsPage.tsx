import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { SystemSettingsService } from '@/services/SystemSettingsService';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Percent } from 'lucide-react';

export function SettingsPage() {
  const { admin } = useAdminAuth();
  const [sellingFeePercentage, setSellingFeePercentage] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch current selling fee percentage
  const fetchSellingFee = useCallback(async () => {
    setLoading(true);
    try {
      const fee = await SystemSettingsService.getSellingFeePercentage();
      setSellingFeePercentage(fee.toString());
    } catch (error: any) {
      console.error('Error fetching selling fee:', error);
      toast.error('Failed to load selling fee percentage');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellingFee();
  }, [fetchSellingFee]);

  const handleSave = async () => {
    const percentage = parseFloat(sellingFeePercentage);
    
    if (isNaN(percentage)) {
      toast.error('Please enter a valid number');
      return;
    }

    if (percentage < 0 || percentage > 100) {
      toast.error('Selling fee percentage must be between 0 and 100');
      return;
    }

    setSaving(true);
    try {
      await SystemSettingsService.updateSellingFeePercentage(percentage, admin?.id);
      toast.success('Selling fee percentage updated successfully');
      await fetchSellingFee(); // Refresh to confirm
    } catch (error: any) {
      console.error('Error updating selling fee:', error);
      toast.error(`Failed to update selling fee: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage system-wide configuration settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            <CardTitle>Selling Fees</CardTitle>
          </div>
          <CardDescription>
            Configure the percentage fee charged to sellers on each sale. This fee will be
            automatically deducted from the seller's payout after the buyer receives the item.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="selling-fee-percentage">Selling Fee Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="selling-fee-percentage"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={sellingFeePercentage}
                onChange={(e) => setSellingFeePercentage(e.target.value)}
                className="w-32"
                placeholder="10"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a value between 0 and 100. For example, 10 means 10% of the sale price.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Example Calculation:</p>
            <p className="text-sm text-muted-foreground">
              If a product sells for $100 with a {sellingFeePercentage || '10'}% fee:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Sale Price: $100.00</li>
              <li>
                Selling Fee ({sellingFeePercentage || '10'}%): $
                {((parseFloat(sellingFeePercentage) || 10) / 100 * 100).toFixed(2)}
              </li>
              <li>
                Seller Payout: $
                {(100 - (parseFloat(sellingFeePercentage) || 10) / 100 * 100).toFixed(2)}
              </li>
            </ul>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

