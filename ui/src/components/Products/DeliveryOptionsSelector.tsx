import React from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Package2, HandHeart, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/shadcn/card';
import { RadioGroup, RadioGroupItem } from '@/components/shadcn/radio-group';
import { Label } from '@/components/shadcn/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog';
import { Button } from '@/components/shadcn/button';

interface DeliveryOptionsSelectorProps {
  selectedOption: 'both' | 'postage' | 'collection';
  onOptionChange: (option: 'both' | 'postage' | 'collection') => void;
  showPackageSize?: boolean;
  packageSizeId?: string;
  onPackageSizeChange?: (id: string) => void;
}

export function DeliveryOptionsSelector({ 
  selectedOption, 
  onOptionChange, 
  showPackageSize = false,
  packageSizeId,
  onPackageSizeChange,
}: DeliveryOptionsSelectorProps) {
  const { t } = useTranslation();
  const [isPackageModalOpen, setIsPackageModalOpen] = React.useState(false);
  const [selectedPackage, setSelectedPackage] = React.useState<string>(packageSizeId || '');

  React.useEffect(() => {
    if (packageSizeId) setSelectedPackage(packageSizeId);
  }, [packageSizeId]);

  const handleConfirmPackage = () => {
    onPackageSizeChange?.(selectedPackage);
    setIsPackageModalOpen(false);
  };

  const deliveryOptions = [
    {
      id: 'both',
      icon: Package2,
      title: t('delivery.postageOrCollection'),
      description: t('delivery.postageOrCollectionDesc'),
      isSelected: selectedOption === 'both'
    },
    {
      id: 'postage',
      icon: Truck,
      title: t('delivery.postageOnly'),
      description: t('delivery.postageOnlyDesc'),
      isSelected: selectedOption === 'postage'
    },
    {
      id: 'collection',
      icon: HandHeart,
      title: t('delivery.collectionOnly'),
      description: t('delivery.collectionOnlyDesc'),
      isSelected: selectedOption === 'collection'
    }
  ];

  // Human-readable label for current selection
  const packageSummary = React.useMemo(() => {
    const map: Record<string, string> = {
      'large_letter': 'Large letter (35×25×2.5 cm)',
      'small_1kg': 'Small parcel – up to 1 kg',
      'small_2kg': 'Small parcel – up to 2 kg',
      'medium_1kg': 'Medium parcel – up to 1 kg',
      'medium_2kg': 'Medium parcel – up to 2 kg',
    };
    return map[selectedPackage] || t('delivery.smallParcel');
  }, [selectedPackage, t]);

  return (
    <div className="space-y-6">
      {/* Delivery Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4">{t('delivery.title')}</h2>
        
        <RadioGroup 
          value={selectedOption} 
          onValueChange={(value) => onOptionChange(value as 'both' | 'postage' | 'collection')}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {deliveryOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div key={option.id} className="relative">
                <RadioGroupItem
                  value={option.id}
                  id={option.id}
                  className="sr-only"
                />
                <Label
                  htmlFor={option.id}
                  className="cursor-pointer block"
                >
                  <Card 
                    className={`transition-all hover:shadow-md ${
                      option.isSelected 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between">
                        <Icon className="h-6 w-6 text-gray-700" />
                        {option.isSelected && (
                          <div className="w-5 h-5 bg-pr rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="font-semibold text-gray-900">
                          {option.title}
                        </h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Package Size Section */}
      {showPackageSize && (
        <div>
          <h2 className="text-xl font-semibold mb-4">{t('delivery.packageSize')}</h2>
          
          <Card 
            className="border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setIsPackageModalOpen(true)}
            role="button"
            aria-label="Choose package size"
          >
            <CardContent className="">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900">
                    {packageSummary}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('delivery.smallParcelSize')}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Dialog open={isPackageModalOpen} onOpenChange={setIsPackageModalOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('delivery.packageSize')}</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Large letter */}
                <div className="border rounded-md p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Large letter</p>
                      <p className="text-xs text-gray-600">Up to 35 × 25 × 2.5 cm</p>
                    </div>
                    <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage}>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem id="large_letter" value="large_letter" />
                        <Label htmlFor="large_letter">Select</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Small parcel */}
                <div className="border rounded-md p-4">
                  <p className="font-medium">Small parcel</p>
                  <p className="text-xs text-gray-600 mb-2">Up to 45 × 35 × 16 cm</p>
                  <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage} className="space-y-3">
                    <div className="flex items-start gap-2">
                      <RadioGroupItem id="small_1kg" value="small_1kg" />
                      <Label htmlFor="small_1kg" className="cursor-pointer">
                        <span className="block">Up to 1 kg</span>
                        <span className="block text-xs text-gray-600">Fits items like a tablet or sandals</span>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem id="small_2kg" value="small_2kg" />
                      <Label htmlFor="small_2kg" className="cursor-pointer">
                        <span className="block">Up to 2 kg</span>
                        <span className="block text-xs text-gray-600">Fits items like a hand mixer or hiking boots</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Medium parcel */}
                <div className="border rounded-md p-4">
                  <p className="font-medium">Medium parcel</p>
                  <p className="text-xs text-gray-600 mb-2">Up to 61 × 46 × 46 cm</p>
                  <RadioGroup value={selectedPackage} onValueChange={setSelectedPackage} className="space-y-3">
                    <div className="flex items-start gap-2">
                      <RadioGroupItem id="medium_1kg" value="medium_1kg" />
                      <Label htmlFor="medium_1kg" className="cursor-pointer">
                        <span className="block">Up to 1 kg</span>
                        <span className="block text-xs text-gray-600">Fits items like a throw or cushion or picture frame</span>
                      </Label>
                    </div>
                    <div className="flex items-start gap-2">
                      <RadioGroupItem id="medium_2kg" value="medium_2kg" />
                      <Label htmlFor="medium_2kg" className="cursor-pointer">
                        <span className="block">Up to 2 kg</span>
                        <span className="block text-xs text-gray-600">Fits items like a laptop or wall clock</span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPackageModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirmPackage} disabled={!selectedPackage}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
} 