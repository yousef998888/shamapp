export interface NavItem {
    title: string;
    icon?: React.ReactNode;
    href: string;
    count?: number;
  }

// Re-export database types
export type {
  City,
  PickupLocation,
  Category,
  Product,
  ProductImage,
  ProductAttribute,
  ProductAttributeTerm,
  ProductAttributeRelationship,
  Order,
  DeliveryMethod,
  OrderDelivery,
  OrderPayment,
  OrderMessage,
  OrderStatus,
  UserProfile,
  Favorite,
} from './database';
  
