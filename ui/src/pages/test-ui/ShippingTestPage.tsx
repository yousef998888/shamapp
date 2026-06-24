import React, { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Label } from '@/components/shadcn/label';
import { Textarea } from '@/components/shadcn/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { 
  ping, 
  createOrder, 
  getOrderStatus, 
  getPricing, 
  getCities,
  CreateOrderRequest,
} from '@/services/DeliveryService';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

export function ShippingTestPage() {
  const [pingResult, setPingResult] = useState<any>(null);
  const [cities, setCities] = useState<any[]>([]);
  const [pricingResult, setPricingResult] = useState<any>(null);
  const [orderResult, setOrderResult] = useState<any>(null);
  const [orderStatusResult, setOrderStatusResult] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Form states
  const [orderForm, setOrderForm] = useState<CreateOrderRequest>({
    source: '14',
    destination: '15',
    sender_name: 'John Doe',
    sender_phone: '+963123456789',
    sender_address: '123 Main St, Damascus',
    receiver_name: 'Jane Smith',
    receiver_phone: '+963987654321',
    receiver_address: '456 Oak Ave, Aleppo',
    products_count: 2,
    weight_class: 'M',
    pickup_date: '2024-01-15',
    products: [
      { name: 'Product 1', price: 25.99, quantity: 1 },
      { name: 'Product 2', price: 15.50, quantity: 1 }
    ]
  });

  const [pricingForm, setPricingForm] = useState({
    source: '12',
    destination: '13',
    weight_class: 'M'
  });

  const [orderCode, setOrderCode] = useState('');

  // Helper function to render error messages
  const renderError = (error: any) => {
    if (!error) return null;

    // If it's a validation error with field-specific messages
    if (error.validationErrors && Array.isArray(error.validationErrors)) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-2">{error.message || 'Validation failed'}</div>
            <ul className="list-disc list-inside space-y-1">
              {error.validationErrors.map((validationError: any, index: number) => (
                <li key={index} className="text-sm">
                  <span className="font-medium">{validationError.field}:</span> {validationError.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      );
    }

    // If it's a general error
    if (error.message) {
      return (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      );
    }

    // If it's a string error
    if (typeof error === 'string') {
      return (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    // If it's an object with error property
    if (error.error) {
      return (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error.error}</AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  // Helper function to render success messages
  const renderSuccess = (result: any) => {
    if (!result || result.error) return null;

    return (
      <Alert className="mb-4">
        <CheckCircle className="h-4 w-4" />
        <AlertDescription>
          {result.message || 'Operation completed successfully'}
        </AlertDescription>
      </Alert>
    );
  };

  // Helper function to get field-specific error
  const getFieldError = (fieldName: string) => {
    if (!orderResult?.validationErrors) return null;
    return orderResult.validationErrors.find((error: any) => error.field === fieldName);
  };

  // Helper function to render input with error styling
  const renderInputWithError = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    type: string = 'text',
    fieldName?: string
  ) => {
    const fieldError = fieldName ? getFieldError(fieldName) : null;
    
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          type={type}
          className={fieldError ? 'border-red-500 focus:border-red-500' : ''}
        />
        {fieldError && (
          <p className="text-red-500 text-sm mt-1">{fieldError.message}</p>
        )}
      </div>
    );
  };

  // Helper function to render textarea with error styling
  const renderTextareaWithError = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    fieldName?: string
  ) => {
    const fieldError = fieldName ? getFieldError(fieldName) : null;
    
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={fieldError ? 'border-red-500 focus:border-red-500' : ''}
        />
        {fieldError && (
          <p className="text-red-500 text-sm mt-1">{fieldError.message}</p>
        )}
      </div>
    );
  };

  // Helper function to render select with error styling
  const renderSelectWithError = (
    id: string,
    label: string,
    value: string,
    onValueChange: (value: string) => void,
    options: { value: string; label: string }[],
    fieldName?: string
  ) => {
    const fieldError = fieldName ? getFieldError(fieldName) : null;
    
    return (
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className={fieldError ? 'border-red-500 focus:border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldError && (
          <p className="text-red-500 text-sm mt-1">{fieldError.message}</p>
        )}
      </div>
    );
  };

  const handleTestPing = async () => {
    setLoading('ping');
    setPingResult(null);
    try {
      const result = await ping();
      setPingResult(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPingResult({ error: errorMessage });
    } finally {
      setLoading(null);
    }
  };

  const handleTestCities = async () => {
    setLoading('cities');
    setCities([]);
    try {
      const result = await getCities();
      setCities(result.data || []);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCities([{ error: errorMessage }]);
    } finally {
      setLoading(null);
    }
  };

  const handleTestPricing = async () => {
    setLoading('pricing');
    setPricingResult(null);
    try {
      const result = await getPricing(pricingForm);
      setPricingResult(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setPricingResult({ error: errorMessage });
    } finally {
      setLoading(null);
    }
  };

  const handleTestCreateOrder = async () => {
    setLoading('order');
    setOrderResult(null);
    try {
      const result = await createOrder(orderForm);
      setOrderResult(result);
      if (result.success) {
        setOrderCode(result.data.order_code);
      }
    } catch (error: unknown) {
      // Handle the custom error with validation details
      if (error instanceof Error) {
        const customError = error as any;
        setOrderResult({
          error: customError.message,
          statusCode: customError.statusCode,
          validationErrors: customError.validationErrors,
          apiError: customError.apiError
        });
      } else {
        setOrderResult({ error: 'Unknown error occurred' });
      }
    } finally {
      setLoading(null);
    }
  };

  const handleTestOrderStatus = async () => {
    if (!orderCode) return;
    setLoading('status');
    setOrderStatusResult(null);
    try {
      const result = await getOrderStatus(orderCode);
      setOrderStatusResult(result);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setOrderStatusResult({ error: errorMessage });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center mb-8">Shipping API Test Page</h1>
      
      {/* Ping Test */}
      <Card>
        <CardHeader>
          <CardTitle>1. Ping Shipping API</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestPing} 
            disabled={loading === 'ping'}
            className="mb-4"
          >
            {loading === 'ping' ? 'Testing...' : 'Test Ping'}
          </Button>
          {renderError(pingResult?.error)}
          {renderSuccess(pingResult)}
          {pingResult && !pingResult.error && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(pingResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Cities Test */}
      <Card>
        <CardHeader>
          <CardTitle>2. Get Available Cities</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleTestCities} 
            disabled={loading === 'cities'}
            className="mb-4"
          >
            {loading === 'cities' ? 'Loading...' : 'Get Cities'}
          </Button>
          {cities.length > 0 && cities[0]?.error ? (
            renderError(cities[0])
          ) : cities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cities.map((city, index) => (
                <div key={index} className="bg-gray-100 p-3 rounded">
                  <div className="font-semibold">{city.name}</div>
                  <div className="text-sm text-gray-600">Code: {city.code}</div>
                  <div className="text-sm text-gray-600">Category: {city.category}</div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Pricing Test */}
      <Card>
        <CardHeader>
          <CardTitle>3. Get Pricing Estimate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="pricing-source">Source</Label>
              <Input
                id="pricing-source"
                value={pricingForm.source}
                onChange={(e) => setPricingForm(prev => ({ ...prev, source: e.target.value }))}
                placeholder="Source city"
              />
            </div>
            <div>
              <Label htmlFor="pricing-destination">Destination</Label>
              <Input
                id="pricing-destination"
                value={pricingForm.destination}
                onChange={(e) => setPricingForm(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Destination city"
              />
            </div>
            <div>
              <Label htmlFor="pricing-weight">Weight Class</Label>
              <Select 
                value={pricingForm.weight_class} 
                onValueChange={(value) => setPricingForm(prev => ({ ...prev, weight_class: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="S">Small</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Large</SelectItem>
                  <SelectItem value="XL">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={handleTestPricing} 
            disabled={loading === 'pricing'}
            className="mb-4"
          >
            {loading === 'pricing' ? 'Getting...' : 'Get Pricing'}
          </Button>
          {renderError(pricingResult?.error)}
          {renderSuccess(pricingResult)}
          {pricingResult && !pricingResult.error && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(pricingResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Create Order Test */}
      <Card>
        <CardHeader>
          <CardTitle>4. Create Shipping Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {renderInputWithError(
              'order-source',
              'Source',
              orderForm.source,
              (value) => setOrderForm(prev => ({ ...prev, source: value })),
              'Source city',
              'number'
            )}
            {renderInputWithError(
              'order-destination',
              'Destination',
              orderForm.destination,
              (value) => setOrderForm(prev => ({ ...prev, destination: value })),
              'Destination city',
              'number'
            )}
            {renderInputWithError(
              'order-sender-name',
              'Sender Name',
              orderForm.sender_name,
              (value) => setOrderForm(prev => ({ ...prev, sender_name: value })),
              'Sender name'
            )}
            {renderInputWithError(
              'order-sender-phone',
              'Sender Phone',
              orderForm.sender_phone,
              (value) => setOrderForm(prev => ({ ...prev, sender_phone: value })),
              'Sender phone'
            )}
            {renderTextareaWithError(
              'order-sender-address',
              'Sender Address',
              orderForm.sender_address,
              (value) => setOrderForm(prev => ({ ...prev, sender_address: value })),
              'Sender address'
            )}
            {renderInputWithError(
              'order-receiver-name',
              'Receiver Name',
              orderForm.receiver_name,
              (value) => setOrderForm(prev => ({ ...prev, receiver_name: value })),
              'Receiver name'
            )}
            {renderInputWithError(
              'order-receiver-phone',
              'Receiver Phone',
              orderForm.receiver_phone,
              (value) => setOrderForm(prev => ({ ...prev, receiver_phone: value })),
              'Receiver phone'
            )}
            {renderTextareaWithError(
              'order-receiver-address',
              'Receiver Address',
              orderForm.receiver_address,
              (value) => setOrderForm(prev => ({ ...prev, receiver_address: value })),
              'Receiver address'
            )}
            {renderSelectWithError(
              'order-weight',
              'Weight Class',
              orderForm.weight_class,
              (value) => setOrderForm(prev => ({ ...prev, weight_class: value })),
              [
                { value: 'S', label: 'Small' },
                { value: 'M', label: 'Medium' },
                { value: 'L', label: 'Large' },
                { value: 'XL', label: 'Extra Large' }
              ]
            )}
            {renderInputWithError(
              'order-pickup-date',
              'Pickup Date',
              orderForm.pickup_date,
              (value) => setOrderForm(prev => ({ ...prev, pickup_date: value })),
              'Pickup date',
              'date'
            )}
          </div>
          
          {/* Products Section */}
          <div className="mb-4">
            <Label className="text-base font-medium">Products</Label>
            <div className="space-y-3 mt-2">
              {orderForm.products.map((product, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 border rounded">
                  <div>
                    <Label htmlFor={`product-name-${index}`}>Name</Label>
                    <Input
                      id={`product-name-${index}`}
                      value={product.name}
                      onChange={(e) => {
                        const newProducts = [...orderForm.products];
                        newProducts[index].name = e.target.value;
                        setOrderForm(prev => ({ 
                          ...prev, 
                          products: newProducts,
                          products_count: newProducts.length
                        }));
                      }}
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`product-price-${index}`}>Price</Label>
                    <Input
                      id={`product-price-${index}`}
                      type="number"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => {
                        const newProducts = [...orderForm.products];
                        newProducts[index].price = parseFloat(e.target.value) || 0;
                        setOrderForm(prev => ({ ...prev, products: newProducts }));
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`product-quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`product-quantity-${index}`}
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => {
                        const newProducts = [...orderForm.products];
                        newProducts[index].quantity = parseInt(e.target.value) || 1;
                        setOrderForm(prev => ({ 
                          ...prev, 
                          products: newProducts,
                          products_count: newProducts.length
                        }));
                      }}
                      placeholder="1"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newProducts = orderForm.products.filter((_, i) => i !== index);
                        setOrderForm(prev => ({ 
                          ...prev, 
                          products: newProducts,
                          products_count: newProducts.length
                        }));
                      }}
                      className="w-full"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOrderForm(prev => ({
                    ...prev,
                    products: [...prev.products, { name: '', price: 0, quantity: 1 }],
                    products_count: prev.products.length + 1
                  }));
                }}
                className="w-full"
              >
                + Add Product
              </Button>
            </div>
          </div>
          
          {/* Form Summary */}
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <h4 className="font-medium mb-2">Order Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Source:</span>
                <span className="ml-2 font-medium">{orderForm.source}</span>
              </div>
              <div>
                <span className="text-gray-600">Destination:</span>
                <span className="ml-2 font-medium">{orderForm.destination}</span>
              </div>
              <div>
                <span className="text-gray-600">Weight Class:</span>
                <span className="ml-2 font-medium">{orderForm.weight_class}</span>
              </div>
              <div>
                <span className="text-gray-600">Products:</span>
                <span className="ml-2 font-medium">{orderForm.products_count}</span>
              </div>
              <div>
                <span className="text-gray-600">Pickup Date:</span>
                <span className="ml-2 font-medium">{orderForm.pickup_date}</span>
              </div>
              <div>
                <span className="text-gray-600">Total Value:</span>
                <span className="ml-2 font-medium">
                  ${orderForm.products.reduce((sum, p) => sum + (p.price * p.quantity), 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Validation Warnings */}
          {(() => {
            const warnings = [];
            if (!orderForm.sender_name.trim()) warnings.push('Sender name is required');
            if (!orderForm.receiver_name.trim()) warnings.push('Receiver name is required');
            if (!orderForm.pickup_date) warnings.push('Pickup date is required');
            if (orderForm.products.some(p => !p.name.trim())) warnings.push('All products must have names');
            if (orderForm.products.some(p => p.price <= 0)) warnings.push('All products must have valid prices');
            if (orderForm.products.some(p => p.quantity <= 0)) warnings.push('All products must have valid quantities');
            
            if (warnings.length === 0) return null;
            
            return (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-2">Please fix the following issues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {warnings.map((warning, index) => (
                      <li key={index} className="text-sm">{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            );
          })()}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mb-4">
            <Button 
              onClick={handleTestCreateOrder} 
              disabled={loading === 'order'}
              className="flex-1"
            >
              {loading === 'order' ? 'Creating...' : 'Create Order'}
            </Button>
            <Button 
              type="button"
              variant="outline"
              onClick={() => {
                setOrderForm({
                  source: '14',
                  destination: '15',
                  sender_name: 'John Doe',
                  sender_phone: '+963123456789',
                  sender_address: '123 Main St, Damascus',
                  receiver_name: 'Jane Smith',
                  receiver_phone: '+963987654321',
                  receiver_address: '456 Oak Ave, Aleppo',
                  products_count: 2,
                  weight_class: 'M',
                  pickup_date: '2024-01-15',
                  products: [
                    { name: 'Product 1', price: 25.99, quantity: 1 },
                    { name: 'Product 2', price: 15.50, quantity: 1 }
                  ]
                });
                setOrderResult(null);
              }}
              disabled={loading === 'order'}
            >
              Reset Form
            </Button>
          </div>
          {renderError(orderResult?.error)}
          {renderSuccess(orderResult)}
          {orderResult && !orderResult.error && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(orderResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Order Status Test */}
      <Card>
        <CardHeader>
          <CardTitle>5. Get Order Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <Input
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="Enter order code"
              className="flex-1"
            />
            <Button 
              onClick={handleTestOrderStatus} 
              disabled={loading === 'status' || !orderCode}
            >
              {loading === 'status' ? 'Checking...' : 'Check Status'}
            </Button>
          </div>
          {renderError(orderStatusResult?.error)}
          {renderSuccess(orderStatusResult)}
          {orderStatusResult && !orderStatusResult.error && (
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {JSON.stringify(orderStatusResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 