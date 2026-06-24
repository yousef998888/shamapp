import express, { Request, Response } from 'express';
import { z } from 'zod';
import { ShippingService } from '../lib/shippingService.js';

const router = express.Router();

// Validation schemas
const pingSchema = z.object({});

const createOrderSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  destination: z.string().min(1, 'Destination is required'),
  sender_name: z.string().min(1, 'Sender name is required'),
  sender_phone: z.string().min(1, 'Sender phone is required'),
  sender_address: z.string().min(1, 'Sender address is required'),
  receiver_name: z.string().min(1, 'Receiver name is required'),
  receiver_phone: z.string().min(1, 'Receiver phone is required'),
  receiver_address: z.string().min(1, 'Receiver address is required'),
  products_count: z.number().positive('Products count must be positive'),
  weight_class: z.string().min(1, 'Weight class is required'),
  pickup_date: z.string().min(1, 'Pickup date is required'),
  products: z.array(z.object({
    name: z.string().min(1, 'Product name is required'),
    price: z.number().positive('Product price must be positive'),
    quantity: z.number().positive('Product quantity must be positive')
  })).min(1, 'At least one product is required')
});

const orderStatusSchema = z.object({
  order_code: z.string().min(1, 'Order code is required')
});

const pricingSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  destination: z.string().min(1, 'Destination is required'),
  weight_class: z.string().min(1, 'Weight class is required')
});

// Ping endpoint to check if shipping API is active
router.post('/ping', async (req: Request, res: Response) => {
  try {
    const response = await ShippingService.ping();
    return res.json(response);
  } catch (error) {
    console.error('Error in ping endpoint:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to ping shipping API'
    });
  }
});



router.post('/orders', async (req: Request, res: Response) => {
  try {
    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validationResult.error.errors[0].message
      });
    }

    const orderData = validationResult.data;

    console.log('orderData', orderData);
    const response = await ShippingService.createOrder(orderData);
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating shipping order:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to create shipping order'
    });
  }
});



// Get order status
router.post('/orders/status', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = orderStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validationResult.error.errors[0].message
      });
    }

    const { order_code } = validationResult.data;
    const response = await ShippingService.getOrderStatus(order_code);
    
    return res.json(response);
  } catch (error) {
    console.error('Error getting order status:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get order status'
    });
  }
});

// Get pricing estimate
router.post('/pricing', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = pricingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: validationResult.error.errors[0].message
      });
    }

    const { source, destination, weight_class } = validationResult.data;
    const response = await ShippingService.getPricing({ source, destination, weight_class });
    
    return res.json(response);
  } catch (error) {
    console.error('Error getting pricing:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get pricing'
    });
  }
});

// Get available cities
router.get('/cities', async (req: Request, res: Response) => {
  try {
    const response = await ShippingService.getCities();
    return res.json(response);
  } catch (error) {
    console.error('Error fetching cities:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch cities'
    });
  }
});

export default router; 