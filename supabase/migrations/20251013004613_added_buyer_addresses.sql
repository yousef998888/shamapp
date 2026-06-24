alter table "public"."order_deliveries" add column "contact_phone" character varying(20);

alter table "public"."order_deliveries" add column "delivery_fee" numeric(10,2) default 0;

alter table "public"."order_deliveries" add column "pickup_address_id" uuid;

alter table "public"."order_deliveries" add column "shipping_address_id" uuid;

alter table "public"."orders" add column "contact_phone" character varying(20);

alter table "public"."orders" add column "delivery_fee" numeric(10,2) default 0;

alter table "public"."orders" add column "delivery_method_id" uuid;

alter table "public"."orders" add column "delivery_type" delivery_type;

alter table "public"."orders" add column "estimated_delivery_date" date;

alter table "public"."orders" add column "pickup_address_id" uuid;

alter table "public"."orders" add column "shipping_address_id" uuid;

alter table "public"."orders" add column "special_instructions" text;

CREATE INDEX idx_order_deliveries_contact_phone ON public.order_deliveries USING btree (contact_phone);

CREATE INDEX idx_order_deliveries_pickup_address_id ON public.order_deliveries USING btree (pickup_address_id);

CREATE INDEX idx_order_deliveries_shipping_address_id ON public.order_deliveries USING btree (shipping_address_id);

CREATE INDEX idx_orders_contact_phone ON public.orders USING btree (contact_phone);

CREATE INDEX idx_orders_delivery_method_id ON public.orders USING btree (delivery_method_id);

CREATE INDEX idx_orders_delivery_type ON public.orders USING btree (delivery_type);

CREATE INDEX idx_orders_pickup_address_id ON public.orders USING btree (pickup_address_id);

CREATE INDEX idx_orders_shipping_address_id ON public.orders USING btree (shipping_address_id);

alter table "public"."order_deliveries" add constraint "fk_order_deliveries_pickup_address" FOREIGN KEY (pickup_address_id) REFERENCES user_pickup_addresses(id) ON DELETE SET NULL not valid;

alter table "public"."order_deliveries" validate constraint "fk_order_deliveries_pickup_address";

alter table "public"."order_deliveries" add constraint "fk_order_deliveries_shipping_address" FOREIGN KEY (shipping_address_id) REFERENCES user_addresses(id) ON DELETE SET NULL not valid;

alter table "public"."order_deliveries" validate constraint "fk_order_deliveries_shipping_address";

alter table "public"."orders" add constraint "fk_orders_delivery_method" FOREIGN KEY (delivery_method_id) REFERENCES delivery_methods(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "fk_orders_delivery_method";

alter table "public"."orders" add constraint "fk_orders_pickup_address" FOREIGN KEY (pickup_address_id) REFERENCES user_pickup_addresses(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "fk_orders_pickup_address";

alter table "public"."orders" add constraint "fk_orders_shipping_address" FOREIGN KEY (shipping_address_id) REFERENCES user_addresses(id) ON DELETE SET NULL not valid;

alter table "public"."orders" validate constraint "fk_orders_shipping_address";


