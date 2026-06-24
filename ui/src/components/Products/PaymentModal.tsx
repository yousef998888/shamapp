import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Copy, CheckCircle, AlertCircle, CreditCard } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Badge } from '@/components/shadcn/badge';
import { toast } from 'react-hot-toast';

import { Order } from '../../types/database';

interface PaymentModalProps {
  chat: Order;
  onClose: () => void;
  onPaymentSubmitted: (paymentId: string) => void;
}

export function PaymentModal({ chat, onClose, onPaymentSubmitted }: PaymentModalProps) {
  const { t } = useTranslation();
  const [paymentId, setPaymentId] = useState(chat.payment_id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Account number copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleSubmit = async () => {
    if (!paymentId.trim()) {
      toast.error(t('payment.enterPaymentId'));
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      onPaymentSubmitted(paymentId);
      toast.success('Payment proof submitted successfully');
      setIsSubmitting(false);
    }, 1000);
  };

  const shamCashAccount = '1234567890';
  const totalAmount = (chat.product?.price || 0) + 0.75; // Product price + buyer protection

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">{t('payment.title')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{chat.product?.title || 'Product'}</h3>
                  <p className="text-sm text-gray-500">{t('checkout.order')}</p>
                </div>
                <span className="font-semibold">{formatPrice(chat.product?.price || 0, chat.product?.currency || 'USD')}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <p className="text-sm text-gray-500">{t('checkout.buyerProtection')}</p>
                </div>
                <span className="text-sm">£0.75</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t('checkout.totalToPay')}</span>
                  <span className="font-semibold text-lg">{formatPrice(totalAmount, chat.product?.currency || 'USD')}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {t('payment.instructions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">{t('payment.howToPay')}</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                  <li>{t('payment.steps.step1')}</li>
                  <li>{t('payment.steps.step2')}</li>
                  <li>{t('payment.steps.step3')}</li>
                  <li>{t('payment.steps.step4')} <strong>{formatPrice(totalAmount, chat.product?.currency || 'USD')}</strong></li>
                  <li>{t('payment.steps.step5')}</li>
                  <li>{t('payment.steps.step6')}</li>
                </ol>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{t('payment.accountNumber')}</p>
                    <p className="text-lg font-mono font-semibold">{shamCashAccount}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(shamCashAccount)}
                    className="flex items-center gap-2"
                  >
                    {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? t('payment.copied') : t('payment.copy')}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-1">{t('payment.importantNotes')}:</h4>
                    <ul className="text-sm text-yellow-700 space-y-1">
                      <li>• {t('payment.notes.note1')}</li>
                      <li>• {t('payment.notes.note2')}</li>
                      <li>• {t('payment.notes.note3')}</li>
                      <li>• {t('payment.notes.note4')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment ID Form */}
          <Card>
            <CardHeader>
              <CardTitle>{t('payment.submitProof')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="payment-id">{t('payment.paymentIdLabel')}</Label>
                <Input
                  id="payment-id"
                  placeholder={t('payment.paymentIdPlaceholder')}
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('payment.paymentIdHelp')}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !paymentId.trim()}
                  className="flex-1"
                >
                  {isSubmitting ? t('payment.submitting') : t('payment.submitProofButton')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 