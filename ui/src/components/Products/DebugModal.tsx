import React, { useState } from 'react';
import { X, Settings, Play, CheckCircle, Truck, Package, Star } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';

interface DebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: string;
  onStatusChange: (status: string) => void;
}

const statusOptions = [
  { 
    value: 'pending_payment', 
    label: 'Pending Payment', 
    description: 'Buyer needs to submit payment proof',
    icon: <Package className="h-4 w-4" />
  },
  { 
    value: 'payment_submitted', 
    label: 'Payment Submitted', 
    description: 'Payment proof submitted, waiting for admin approval',
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    value: 'admin_approved', 
    label: 'Admin Approved', 
    description: 'Payment verified, seller can now ship',
    icon: <CheckCircle className="h-4 w-4" />
  },
  { 
    value: 'shipped', 
    label: 'Shipped', 
    description: 'Seller has shipped the item',
    icon: <Truck className="h-4 w-4" />
  },
  { 
    value: 'delivered', 
    label: 'Delivered', 
    description: 'Item delivered, buyer can confirm receipt',
    icon: <Package className="h-4 w-4" />
  },
  { 
    value: 'completed', 
    label: 'Completed', 
    description: 'Transaction completed, buyer can leave review',
    icon: <Star className="h-4 w-4" />
  }
];

export function DebugModal({ isOpen, onClose, currentStatus, onStatusChange }: DebugModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);

  const handleStatusChange = () => {
    onStatusChange(selectedStatus);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute bottom-0 left-0 rbg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Debug Panel</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h3 className="font-medium mb-2">Current Status</h3>
            <Badge variant="outline" className="text-sm">
              {statusOptions.find(s => s.value === currentStatus)?.label}
            </Badge>
          </div>

          <div>
            <h3 className="font-medium mb-3">Change Status To:</h3>
            <div className="space-y-2">
              {statusOptions.map((status) => (
                <div
                  key={status.value}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedStatus === status.value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedStatus(status.value)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1 rounded ${
                      selectedStatus === status.value ? 'bg-blue-500 text-white' : 'bg-gray-100'
                    }`}>
                      {status.icon}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{status.label}</p>
                      <p className="text-xs text-gray-500">{status.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={selectedStatus === currentStatus}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              Apply Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 