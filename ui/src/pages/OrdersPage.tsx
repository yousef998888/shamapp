import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';

export function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Orders</h1>
      </div>

      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-xl">Order Placed Successfully!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Thank you for your purchase. Your order has been confirmed and will be processed shortly.
          </p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Order ID: #12345</p>
            <p>Estimated delivery: 3-5 business days</p>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={() => navigate('/dashboard/buying')} className="flex-1">
              View Orders
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Continue Shopping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 