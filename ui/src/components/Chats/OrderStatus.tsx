import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle, 
  Truck, 
  Package, 
  Star 
} from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { Order } from '../../types/database';

interface OrderStatusProps {
  order: Order;
  currentUserId: string;
  onShowPaymentModal: () => void;
  onShowReceiptModal: () => void;
}

export function OrderStatus({ 
  order, 
  currentUserId, 
  onShowPaymentModal, 
  onShowReceiptModal 
}: OrderStatusProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isBuyer = currentUserId === order.buyer_id;

  return (
    <div className="bg-white border-b text-xs p-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-xs text-blue-900 mb-2">
          {isBuyer ? t('chat.purchaseSuccessful') : 'Order Details'}
        </h4>
        <p className="text-xs text-blue-700  mb-4">
          {isBuyer ? t('chat.checkOrderDetails') : 'Order information and status updates'}
        </p>
        
        {order.status === 'pending_payment' && (
          <div className="space-y-3">
            {isBuyer ? (
              <>
                <div className="bg-yellow-50 border text-xs border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-800">{t('chat.paymentRequired')}</span>
                  </div>
                  <p className="text-xs text-yellow-700">
                    {t('chat.paymentRequiredDesc')}
                  </p>
                </div>
                
                <Button 
                  onClick={onShowPaymentModal}
                  className="w-full text-xs bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  {t('chat.sendPaymentProof')}
                </Button>
              </>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-800">Waiting for Payment</span>
                </div>
                <p className="text-xs text-yellow-700">
                  The buyer needs to submit payment proof. You'll be notified once payment is received.
                </p>
              </div>
            )}
          </div>
        )}
        
        {order.status === 'payment_submitted' && (
          <div className="space-y-3">
            {isBuyer ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-medium text-green-800">{t('chat.paymentSubmitted')}</span>
                  </div>
                  <p className="text-xs text-green-700 mb-2">
                    {t('chat.paymentSubmittedDesc')}
                  </p>
                  <p className="text-xs text-green-600">{t('chat.paymentId')}: {order.payment_id}</p>
                </div>
                
                <Button 
                  onClick={onShowPaymentModal}
                  variant="outline"
                  className="w-full text-xs border-green-200 text-green-700 hover:bg-green-50"
                >
                  {t('chat.editPaymentProof')}
                </Button>
              </>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Payment Submitted</span>
                </div>
                <p className="text-xs text-green-700 mb-2">
                  The buyer has submitted payment proof. Our team will review and approve the payment.
                </p>
                <p className="text-xs text-green-600">Payment ID: {order.payment_id}</p>
              </div>
            )}
          </div>
        )}

        {order.status === 'admin_approved' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            {isBuyer ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">{t('chat.paymentApproved')}</span>
                </div>
                <p className="text-xs text-blue-700">
                  {t('chat.paymentApprovedDesc')}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-800">Ready to Dispatch</span>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  Payment has been approved. You can now dispatch the item to the buyer.
                </p>
                <Button 
                  onClick={() => navigate(`/dashboard/selling`)}
                  className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Go to Selling Dashboard
                </Button>
              </>
            )}
          </div>
        )}

        {order.status === 'shipped' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            {isBuyer ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">{t('chat.itemShipped')}</span>
                </div>
                <p className="text-xs text-purple-700 mb-2">
                  {t('chat.itemShippedDesc')}
                </p>
                {order.delivery?.tracking_number && (
                  <p className="text-xs text-purple-600">{t('chat.tracking')}: {order.delivery.tracking_number}</p>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Truck className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-medium text-purple-800">Item Dispatched</span>
                </div>
                <p className="text-xs text-purple-700 mb-2">
                  Your item has been dispatched and is on its way to the buyer.
                </p>
                {order.delivery?.tracking_number && (
                  <p className="text-xs text-purple-600">Tracking: {order.delivery.tracking_number}</p>
                )}
              </>
            )}
          </div>
        )}

        {order.status === 'delivered' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            {isBuyer ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">{t('chat.itemDelivered')}</span>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  {t('chat.itemDeliveredDesc')}
                </p>
                <Button 
                  onClick={onShowReceiptModal}
                  className="w-full text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {t('chat.confirmReceipt')}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-green-600" />
                  <span className="text-xs font-medium text-green-800">Item Delivered</span>
                </div>
                <p className="text-xs text-green-700 mb-3">
                  The item has been delivered to the buyer. Waiting for confirmation of receipt.
                </p>
              </>
            )}
          </div>
        )}

        {order.status === 'completed' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            {isBuyer ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-800">{t('chat.transactionCompleted')}</span>
                </div>
                <p className="text-xs text-gray-700">
                  {t('chat.transactionCompletedDesc')}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-800">Transaction Completed</span>
                </div>
                <p className="text-xs text-gray-700">
                  The transaction has been completed successfully. Thank you for your business!
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 