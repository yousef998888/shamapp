create extension if not exists "pg_trgm" with schema "public" version '1.6';

create extension if not exists "pgroonga" with schema "public" version '3.2.5';

create extension if not exists "vector" with schema "public" version '0.8.0';

create type "public"."delivery_option_type" as enum ('both', 'postage', 'collection');

create type "public"."delivery_status" as enum ('pending', 'shipped', 'delivered');

create type "public"."delivery_type" as enum ('home_delivery', 'pickup_point');

create type "public"."message_type" as enum ('text', 'system', 'payment_status', 'shipping_update');

create type "public"."order_status" as enum ('pending_payment', 'payment_submitted', 'admin_approved', 'shipped', 'delivered', 'completed', 'cancelled');

create type "public"."payment_status" as enum ('pending', 'submitted', 'approved', 'rejected');

create type "public"."product_status" as enum ('active', 'inactive', 'sold');

create table "public"."categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "icon" text,
    "parent_id" uuid,
    "is_active" boolean default true,
    "sort_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "ar_description" text,
    "ar_name" text
);


alter table "public"."categories" enable row level security;

create table "public"."category_attribute_relationships" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid not null,
    "attribute_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."category_attributes" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid,
    "attribute_id" uuid,
    "created_at" timestamp with time zone default now()
);


create table "public"."category_tag_relationships" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."delivery_methods" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying not null,
    "display_name" character varying not null,
    "base_price" numeric(10,2) not null,
    "estimated_days" integer not null,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now()
);


create table "public"."favorites" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "product_id" uuid,
    "created_at" timestamp with time zone default now()
);


create table "public"."order_deliveries" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "delivery_method_id" uuid not null,
    "delivery_type" delivery_type not null,
    "delivery_address" jsonb,
    "pickup_location_data" jsonb,
    "tracking_number" character varying(255),
    "estimated_delivery_date" date,
    "actual_delivery_date" date,
    "delivery_status" delivery_status not null default 'pending'::delivery_status,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."order_messages" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "sender_id" uuid not null,
    "receiver_id" uuid not null,
    "message" text not null,
    "message_type" message_type not null default 'text'::message_type,
    "is_read" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."order_messages" enable row level security;

create table "public"."order_payments" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "payment_method" character varying(50) not null default 'sham_cash'::character varying,
    "payment_id" character varying(255) not null,
    "amount" numeric(10,2) not null,
    "currency" character varying(3) not null default 'GBP'::character varying,
    "status" payment_status not null default 'pending'::payment_status,
    "submitted_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "approved_by" uuid,
    "rejection_reason" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


create table "public"."order_statuses" (
    "id" uuid not null default gen_random_uuid(),
    "order_id" uuid not null,
    "status" order_status not null,
    "changed_by" uuid not null,
    "reason" text,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


create table "public"."orders" (
    "id" uuid not null default gen_random_uuid(),
    "buyer_id" uuid not null,
    "seller_id" uuid not null,
    "product_id" uuid not null,
    "quantity" integer not null default 1,
    "total_amount" numeric(10,2) not null,
    "status" order_status not null default 'pending_payment'::order_status,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "currency" character varying(3) not null default 'GBP'::character varying,
    "grand_total" numeric(10,2) not null,
    "payment_id" character varying(255),
    "payment_method" character varying(50) default 'sham_cash'::character varying,
    "shipping_fee" numeric(10,2) not null default 0,
    "unit_price" numeric(10,2) not null
);


alter table "public"."orders" enable row level security;

create table "public"."product_attribute_relationships" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "attribute_id" uuid not null,
    "term_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


alter table "public"."product_attribute_relationships" enable row level security;

create table "public"."product_attribute_terms" (
    "id" uuid not null default gen_random_uuid(),
    "attribute_id" uuid not null,
    "name" text not null,
    "slug" text not null,
    "description" text,
    "sort_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "ar_name" text,
    "ar_description" text
);


create table "public"."product_attributes" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone default now(),
    "ar_description" text,
    "ar_name" text,
    "description" text,
    "enable_archives" boolean default false,
    "is_active" boolean default true,
    "name" text not null,
    "slug" text not null,
    "sort_order" text default 'name'::text,
    "updated_at" timestamp with time zone default now()
);


create table "public"."product_images" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid,
    "image_url" text not null,
    "alt_text" text,
    "sort_order" integer default 0,
    "is_primary" boolean default false,
    "created_at" timestamp with time zone default now()
);


alter table "public"."product_images" enable row level security;

create table "public"."product_tag_relationships" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "tag_id" uuid not null,
    "created_at" timestamp with time zone default now()
);


create table "public"."product_tags" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "slug" text not null,
    "description" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "ar_name" text,
    "ar_description" text
);


create table "public"."products" (
    "id" uuid not null default gen_random_uuid(),
    "seller_id" uuid,
    "category_id" uuid,
    "title" text not null,
    "ar_title" text not null,
    "description" text,
    "ar_description" text,
    "price" numeric not null,
    "currency" text not null,
    "condition" text not null,
    "status" product_status not null default 'active'::product_status,
    "location" text,
    "is_negotiable" boolean default false,
    "view_count" integer default 0,
    "is_auction" boolean default false,
    "starting_price" numeric,
    "bid_end_date" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "latitude" numeric(10,8),
    "longitude" numeric(11,8),
    "delivery_option" delivery_option_type not null default 'both'::delivery_option_type,
    "tags" text[],
    "embedding" vector(384)
);


alter table "public"."products" enable row level security;

create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "email" text not null,
    "password_hash" text not null,
    "full_name" text,
    "username" text,
    "avatar_url" text,
    "phone" text,
    "location" text,
    "bio" text,
    "is_verified" boolean default false,
    "rating" numeric default 0,
    "total_sales" integer default 0,
    "member_since" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."users" enable row level security;

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);

CREATE UNIQUE INDEX category_attribute_relationships_pkey ON public.category_attribute_relationships USING btree (id);

CREATE UNIQUE INDEX category_attributes_category_id_attribute_id_key ON public.category_attributes USING btree (category_id, attribute_id);

CREATE UNIQUE INDEX category_attributes_pkey ON public.category_attributes USING btree (id);

CREATE UNIQUE INDEX category_tag_relationships_pkey ON public.category_tag_relationships USING btree (id);

CREATE UNIQUE INDEX delivery_methods_pkey ON public.delivery_methods USING btree (id);

CREATE UNIQUE INDEX favorites_pkey ON public.favorites USING btree (id);

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);

CREATE INDEX idx_order_deliveries_delivery_status ON public.order_deliveries USING btree (delivery_status);

CREATE INDEX idx_order_deliveries_order_id ON public.order_deliveries USING btree (order_id);

CREATE INDEX idx_order_messages_created_at ON public.order_messages USING btree (created_at);

CREATE INDEX idx_order_messages_order_id ON public.order_messages USING btree (order_id);

CREATE INDEX idx_order_messages_receiver_id ON public.order_messages USING btree (receiver_id);

CREATE INDEX idx_order_messages_sender_id ON public.order_messages USING btree (sender_id);

CREATE INDEX idx_order_payments_order_id ON public.order_payments USING btree (order_id);

CREATE INDEX idx_order_payments_payment_id ON public.order_payments USING btree (payment_id);

CREATE INDEX idx_order_payments_status ON public.order_payments USING btree (status);

CREATE INDEX idx_order_statuses_created_at ON public.order_statuses USING btree (created_at);

CREATE INDEX idx_order_statuses_order_id ON public.order_statuses USING btree (order_id);

CREATE INDEX idx_orders_buyer_id ON public.orders USING btree (buyer_id);

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);

CREATE INDEX idx_orders_seller_id ON public.orders USING btree (seller_id);

CREATE INDEX idx_orders_status ON public.orders USING btree (status);

CREATE INDEX idx_product_attribute_relationships_attribute_id ON public.product_attribute_relationships USING btree (attribute_id);

CREATE INDEX idx_product_attribute_relationships_product_id ON public.product_attribute_relationships USING btree (product_id);

CREATE INDEX idx_product_attribute_relationships_term_id ON public.product_attribute_relationships USING btree (term_id);

CREATE INDEX idx_product_attribute_terms_attribute_id ON public.product_attribute_terms USING btree (attribute_id);

CREATE INDEX idx_product_attribute_terms_name ON public.product_attribute_terms USING btree (name);

CREATE INDEX idx_product_attributes_name ON public.product_attributes USING btree (name);

CREATE INDEX idx_product_images_product_id ON public.product_images USING btree (product_id);

CREATE INDEX idx_product_tag_relationships_product_id ON public.product_tag_relationships USING btree (product_id);

CREATE INDEX idx_product_tag_relationships_tag_id ON public.product_tag_relationships USING btree (tag_id);

CREATE INDEX idx_product_tags_name ON public.product_tags USING btree (name);

CREATE INDEX idx_products_category_id ON public.products USING btree (category_id);

CREATE INDEX idx_products_created_at ON public.products USING btree (created_at);

CREATE INDEX idx_products_location_coords ON public.products USING btree (latitude, longitude);

CREATE INDEX idx_products_seller_id ON public.products USING btree (seller_id);

CREATE INDEX idx_products_status ON public.products USING btree (status);

CREATE UNIQUE INDEX order_deliveries_pkey ON public.order_deliveries USING btree (id);

CREATE UNIQUE INDEX order_messages_pkey ON public.order_messages USING btree (id);

CREATE UNIQUE INDEX order_payments_pkey ON public.order_payments USING btree (id);

CREATE UNIQUE INDEX order_statuses_pkey ON public.order_statuses USING btree (id);

CREATE UNIQUE INDEX orders_pkey ON public.orders USING btree (id);

CREATE UNIQUE INDEX product_attribute_relationships_pkey ON public.product_attribute_relationships USING btree (id);

CREATE UNIQUE INDEX product_attribute_terms_pkey ON public.product_attribute_terms USING btree (id);

CREATE UNIQUE INDEX product_attribute_terms_slug_key ON public.product_attribute_terms USING btree (slug);

CREATE UNIQUE INDEX product_attributes_pkey ON public.product_attributes USING btree (id);

CREATE UNIQUE INDEX product_attributes_slug_key ON public.product_attributes USING btree (slug);

CREATE UNIQUE INDEX product_images_pkey ON public.product_images USING btree (id);

CREATE UNIQUE INDEX product_tag_relationships_pkey ON public.product_tag_relationships USING btree (id);

CREATE UNIQUE INDEX product_tags_pkey ON public.product_tags USING btree (id);

CREATE UNIQUE INDEX product_tags_slug_key ON public.product_tags USING btree (slug);

CREATE INDEX products_ar_title_pgroonga_idx ON public.products USING pgroonga (ar_title);

CREATE INDEX products_ar_title_trgm_idx ON public.products USING gin (ar_title gin_trgm_ops);

CREATE INDEX products_embedding_idx ON public.products USING ivfflat (embedding) WITH (lists='100');

CREATE UNIQUE INDEX products_pkey ON public.products USING btree (id);

CREATE INDEX products_title_pgroonga_idx ON public.products USING pgroonga (title);

CREATE INDEX products_title_trgm_idx ON public.products USING gin (title gin_trgm_ops);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."category_attribute_relationships" add constraint "category_attribute_relationships_pkey" PRIMARY KEY using index "category_attribute_relationships_pkey";

alter table "public"."category_attributes" add constraint "category_attributes_pkey" PRIMARY KEY using index "category_attributes_pkey";

alter table "public"."category_tag_relationships" add constraint "category_tag_relationships_pkey" PRIMARY KEY using index "category_tag_relationships_pkey";

alter table "public"."delivery_methods" add constraint "delivery_methods_pkey" PRIMARY KEY using index "delivery_methods_pkey";

alter table "public"."favorites" add constraint "favorites_pkey" PRIMARY KEY using index "favorites_pkey";

alter table "public"."order_deliveries" add constraint "order_deliveries_pkey" PRIMARY KEY using index "order_deliveries_pkey";

alter table "public"."order_messages" add constraint "order_messages_pkey" PRIMARY KEY using index "order_messages_pkey";

alter table "public"."order_payments" add constraint "order_payments_pkey" PRIMARY KEY using index "order_payments_pkey";

alter table "public"."order_statuses" add constraint "order_statuses_pkey" PRIMARY KEY using index "order_statuses_pkey";

alter table "public"."orders" add constraint "orders_pkey" PRIMARY KEY using index "orders_pkey";

alter table "public"."product_attribute_relationships" add constraint "product_attribute_relationships_pkey" PRIMARY KEY using index "product_attribute_relationships_pkey";

alter table "public"."product_attribute_terms" add constraint "product_attribute_terms_pkey" PRIMARY KEY using index "product_attribute_terms_pkey";

alter table "public"."product_attributes" add constraint "product_attributes_pkey" PRIMARY KEY using index "product_attributes_pkey";

alter table "public"."product_images" add constraint "product_images_pkey" PRIMARY KEY using index "product_images_pkey";

alter table "public"."product_tag_relationships" add constraint "product_tag_relationships_pkey" PRIMARY KEY using index "product_tag_relationships_pkey";

alter table "public"."product_tags" add constraint "product_tags_pkey" PRIMARY KEY using index "product_tags_pkey";

alter table "public"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."categories" add constraint "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE not valid;

alter table "public"."categories" validate constraint "categories_parent_id_fkey";

alter table "public"."categories" add constraint "categories_slug_key" UNIQUE using index "categories_slug_key";

alter table "public"."category_attribute_relationships" add constraint "category_attribute_relationships_attribute_id_fkey" FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE not valid;

alter table "public"."category_attribute_relationships" validate constraint "category_attribute_relationships_attribute_id_fkey";

alter table "public"."category_attribute_relationships" add constraint "category_attribute_relationships_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE not valid;

alter table "public"."category_attribute_relationships" validate constraint "category_attribute_relationships_category_id_fkey";

alter table "public"."category_attributes" add constraint "category_attributes_attribute_id_fkey" FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE not valid;

alter table "public"."category_attributes" validate constraint "category_attributes_attribute_id_fkey";

alter table "public"."category_attributes" add constraint "category_attributes_category_id_attribute_id_key" UNIQUE using index "category_attributes_category_id_attribute_id_key";

alter table "public"."category_attributes" add constraint "category_attributes_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE not valid;

alter table "public"."category_attributes" validate constraint "category_attributes_category_id_fkey";

alter table "public"."category_tag_relationships" add constraint "category_tag_relationships_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE not valid;

alter table "public"."category_tag_relationships" validate constraint "category_tag_relationships_category_id_fkey";

alter table "public"."category_tag_relationships" add constraint "category_tag_relationships_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES product_tags(id) ON DELETE CASCADE not valid;

alter table "public"."category_tag_relationships" validate constraint "category_tag_relationships_tag_id_fkey";

alter table "public"."favorites" add constraint "favorites_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) not valid;

alter table "public"."favorites" validate constraint "favorites_product_id_fkey";

alter table "public"."favorites" add constraint "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) not valid;

alter table "public"."favorites" validate constraint "favorites_user_id_fkey";

alter table "public"."order_deliveries" add constraint "order_deliveries_delivery_method_id_fkey" FOREIGN KEY (delivery_method_id) REFERENCES delivery_methods(id) not valid;

alter table "public"."order_deliveries" validate constraint "order_deliveries_delivery_method_id_fkey";

alter table "public"."order_deliveries" add constraint "order_deliveries_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_deliveries" validate constraint "order_deliveries_order_id_fkey";

alter table "public"."order_messages" add constraint "order_messages_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_messages" validate constraint "order_messages_order_id_fkey";

alter table "public"."order_messages" add constraint "order_messages_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."order_messages" validate constraint "order_messages_receiver_id_fkey";

alter table "public"."order_messages" add constraint "order_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."order_messages" validate constraint "order_messages_sender_id_fkey";

alter table "public"."order_payments" add constraint "order_payments_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(id) not valid;

alter table "public"."order_payments" validate constraint "order_payments_approved_by_fkey";

alter table "public"."order_payments" add constraint "order_payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_payments" validate constraint "order_payments_order_id_fkey";

alter table "public"."order_statuses" add constraint "order_statuses_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id) not valid;

alter table "public"."order_statuses" validate constraint "order_statuses_changed_by_fkey";

alter table "public"."order_statuses" add constraint "order_statuses_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE not valid;

alter table "public"."order_statuses" validate constraint "order_statuses_order_id_fkey";

alter table "public"."orders" add constraint "orders_buyer_id_fkey" FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_buyer_id_fkey";

alter table "public"."orders" add constraint "orders_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_product_id_fkey";

alter table "public"."orders" add constraint "orders_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."orders" validate constraint "orders_seller_id_fkey";

alter table "public"."product_attribute_relationships" add constraint "product_attribute_relationships_attribute_id_fkey" FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE not valid;

alter table "public"."product_attribute_relationships" validate constraint "product_attribute_relationships_attribute_id_fkey";

alter table "public"."product_attribute_relationships" add constraint "product_attribute_relationships_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_attribute_relationships" validate constraint "product_attribute_relationships_product_id_fkey";

alter table "public"."product_attribute_relationships" add constraint "product_attribute_relationships_term_id_fkey" FOREIGN KEY (term_id) REFERENCES product_attribute_terms(id) ON DELETE CASCADE not valid;

alter table "public"."product_attribute_relationships" validate constraint "product_attribute_relationships_term_id_fkey";

alter table "public"."product_attribute_terms" add constraint "product_attribute_terms_attribute_id_fkey" FOREIGN KEY (attribute_id) REFERENCES product_attributes(id) ON DELETE CASCADE not valid;

alter table "public"."product_attribute_terms" validate constraint "product_attribute_terms_attribute_id_fkey";

alter table "public"."product_attribute_terms" add constraint "product_attribute_terms_slug_key" UNIQUE using index "product_attribute_terms_slug_key";

alter table "public"."product_attributes" add constraint "product_attributes_slug_key" UNIQUE using index "product_attributes_slug_key";

alter table "public"."product_attributes" add constraint "product_attributes_sort_order_check" CHECK ((sort_order = ANY (ARRAY['name'::text, 'name_numeric'::text, 'term_id'::text, 'custom'::text]))) not valid;

alter table "public"."product_attributes" validate constraint "product_attributes_sort_order_check";

alter table "public"."product_images" add constraint "product_images_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) not valid;

alter table "public"."product_images" validate constraint "product_images_product_id_fkey";

alter table "public"."product_tag_relationships" add constraint "product_tag_relationships_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_tag_relationships" validate constraint "product_tag_relationships_product_id_fkey";

alter table "public"."product_tag_relationships" add constraint "product_tag_relationships_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES product_tags(id) ON DELETE CASCADE not valid;

alter table "public"."product_tag_relationships" validate constraint "product_tag_relationships_tag_id_fkey";

alter table "public"."product_tags" add constraint "product_tags_slug_key" UNIQUE using index "product_tags_slug_key";

alter table "public"."products" add constraint "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."products" validate constraint "products_category_id_fkey";

alter table "public"."products" add constraint "products_condition_check" CHECK ((condition = ANY (ARRAY['new'::text, 'used'::text, 'refurbished'::text]))) not valid;

alter table "public"."products" validate constraint "products_condition_check";

alter table "public"."products" add constraint "products_seller_id_fkey" FOREIGN KEY (seller_id) REFERENCES users(id) not valid;

alter table "public"."products" validate constraint "products_seller_id_fkey";

alter table "public"."users" add constraint "fk_auth_user" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."users" validate constraint "fk_auth_user";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_initial_order_status()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    INSERT INTO order_statuses (order_id, status, changed_by, reason)
    VALUES (NEW.id, NEW.status, NEW.buyer_id, 'Order created');
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_search_suggestions(query_embedding vector, query_text text, limit_count integer DEFAULT 8)
 RETURNS TABLE(suggestion_id uuid, suggestion_title text, suggestion_ar_title text, category_name text, category_slug text, product_count bigint, avg_score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  WITH query_words AS (
    SELECT unnest(string_to_array(lower(query_text), ' ')) as word
  ),
  similar_products AS (
    SELECT 
      p.id,
      p.title,
      p.ar_title,
      p.tags,
      (1 - (p.embedding <=> query_embedding)) as similarity_score
    FROM products p
    WHERE 
      p.status = 'active'
      AND p.embedding IS NOT NULL
      AND p.tags IS NOT NULL
      AND (
        (1 - (p.embedding <=> query_embedding)) > 0.2
        OR EXISTS (
          SELECT 1 FROM unnest(p.tags) as tag
          WHERE tag ILIKE '%' || query_text || '%'
        )
        OR EXISTS (
          SELECT 1 FROM unnest(p.tags) as tag, query_words qw
          WHERE similarity(tag, qw.word) > 0.3
        )
      )
  ),
  tag_pairs AS (
    SELECT 
      t1.tag as tag1,
      t2.tag as tag2,
      count(*) as pair_count,
      avg(sp.similarity_score) as avg_score,
      -- Calculate relevance score based on query word matches
      (
        CASE 
          WHEN EXISTS (SELECT 1 FROM query_words qw WHERE t1.tag ILIKE '%' || qw.word || '%') THEN 1 ELSE 0 END +
          CASE WHEN EXISTS (SELECT 1 FROM query_words qw WHERE t2.tag ILIKE '%' || qw.word || '%') THEN 1 ELSE 0 END
      ) as tag_match_score
    FROM similar_products sp,
    unnest(sp.tags) WITH ORDINALITY as t1(tag, ord1),
    unnest(sp.tags) WITH ORDINALITY as t2(tag, ord2)
    WHERE t1.ord1 < t2.ord2
    GROUP BY t1.tag, t2.tag
    HAVING count(*) >= 1
  ),
  suggestions AS (
    SELECT 
      gen_random_uuid() as suggestion_id,
      initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' ')) as suggestion_title,
      initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' ')) as suggestion_ar_title,
      'General' as category_name,
      'general' as category_slug,
      pair_count as product_count,
      avg_score,
      tag_match_score
    FROM tag_pairs
  )
  SELECT 
    suggestion_id,
    suggestion_title,
    suggestion_ar_title,
    category_name,
    category_slug,
    product_count,
    avg_score
  FROM suggestions
  -- Sort by: 1) how many query words match, 2) embedding similarity, 3) product count
  ORDER BY tag_match_score DESC, avg_score DESC, product_count DESC
  LIMIT limit_count;
$function$
;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pgroonga_condition') THEN
        create type "public"."pgroonga_condition" as ("query" text, "weigths" integer[], "scorers" text[], "schema_name" text, "index_name" text, "column_name" text, "fuzzy_max_distance_ratio" real);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pgroonga_full_text_search_condition') THEN
        create type "public"."pgroonga_full_text_search_condition" as ("query" text, "weigths" integer[], "indexname" text);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pgroonga_full_text_search_condition_with_scorers') THEN
        create type "public"."pgroonga_full_text_search_condition_with_scorers" as ("query" text, "weigths" integer[], "scorers" text[], "indexname" text);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION public.product_search(query_embedding vector, query_text text, limit_count integer DEFAULT 10)
 RETURNS SETOF products
 LANGUAGE sql
 STABLE
AS $function$
  WITH query_words AS (
    SELECT word
    FROM unnest(string_to_array(lower(query_text), ' ')) as word
    WHERE length(word) > 2
  ),
  ranked_products AS (
    SELECT 
      p.*,
      (1 - (p.embedding <=> query_embedding)) as embedding_score,
      (
        SELECT count(DISTINCT qw.word)
        FROM query_words qw
        WHERE EXISTS (
          SELECT 1 FROM unnest(p.tags) as tag
          WHERE tag ILIKE '%' || qw.word || '%'
          OR similarity(tag, qw.word) > 0.3
        )
      )::float as matching_tags,
      (SELECT count(*)::float FROM query_words) as total_words
    FROM products p
    WHERE 
      p.status = 'active'
      AND p.embedding IS NOT NULL
      AND (1 - (p.embedding <=> query_embedding)) > 0.25
  )
  SELECT id, seller_id, category_id, title, ar_title, description, ar_description, 
         price, currency, condition, status, location, is_negotiable, view_count,
         is_auction, starting_price, bid_end_date, created_at, updated_at,
         latitude, longitude, delivery_option, tags, embedding
  FROM ranked_products
  ORDER BY (
    0.7 * embedding_score + 
    0.3 * (matching_tags / NULLIF(total_words, 0))
  ) DESC
  LIMIT limit_count;
$function$
;

CREATE OR REPLACE FUNCTION public.product_search_results(p_input text, p_max_results integer)
 RETURNS TABLE(id uuid, seller_id uuid, category_id uuid, title text, ar_title text, description text, ar_description text, price numeric, currency text, condition text, status text, location text, is_negotiable boolean, view_count integer, is_auction boolean, starting_price numeric, bid_end_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, category jsonb, seller jsonb, images jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH ranked_products AS (
    SELECT
      p.*,
      GREATEST(similarity(p.title, p_input), similarity(p.ar_title, p_input)) AS rank
    FROM products AS p
    WHERE (p.title % p_input OR p.ar_title % p_input) AND p.status::text = 'active'
    ORDER BY rank DESC
    LIMIT p_max_results
  )
  SELECT
    rp.id,
    rp.seller_id,
    rp.category_id,
    rp.title,
    rp.ar_title,
    rp.description,
    rp.ar_description,
    rp.price,
    rp.currency,
    rp.condition,
    rp.status::text AS status,
    rp.location,
    rp.is_negotiable,
    rp.view_count,
    rp.is_auction,
    rp.starting_price,
    rp.bid_end_date,
    rp.created_at,
    rp.updated_at,
    -- Category
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'ar_name', c.ar_name,
      'slug', c.slug
    ) AS category,
    -- Seller
    jsonb_build_object(
      'id', up.id,
      'full_name', up.full_name,
      'username', up.username,
      'avatar_url', up.avatar_url
    ) AS seller,
    -- Images
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'image_url', pi.image_url,
          'sort_order', pi.sort_order,
          'is_primary', pi.is_primary
        )
        ORDER BY pi.sort_order
      )
      FROM product_images AS pi
      WHERE pi.product_id = rp.id
    ) AS images
  FROM ranked_products AS rp
  LEFT JOIN categories AS c ON rp.category_id = c.id
  LEFT JOIN user_profiles AS up ON rp.seller_id = up.id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.product_suggestion(input text, max_results integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, ar_title text, category_name text, category_slug text, score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  WITH tag_search AS (
    -- Search by tag overlap (exact matches get highest score)
    SELECT 
      p.id,
      p.title,
      p.ar_title,
      c.name as category_name,
      c.slug as category_slug,
      CASE 
        WHEN p.tags && string_to_array(lower(input), ' ') THEN 1.0
        WHEN p.tags && string_to_array(lower(input), ' ') THEN 0.9
        ELSE 0.8
      END as score
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 
      p.status = 'active'
      AND p.tags && string_to_array(lower(input), ' ')
  ),
  text_search AS (
    -- Traditional text search (title/description matches)
    SELECT 
      p.id,
      p.title,
      p.ar_title,
      c.name as category_name,
      c.slug as category_slug,
      CASE 
        WHEN p.title ILIKE '%' || input || '%' THEN 0.9
        WHEN p.ar_title ILIKE '%' || input || '%' THEN 0.8
        WHEN p.description ILIKE '%' || input || '%' THEN 0.7
        WHEN c.name ILIKE '%' || input || '%' THEN 0.6
        ELSE 0.5
      END as score
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 
      p.status = 'active'
      AND (
        p.title ILIKE '%' || input || '%'
        OR p.ar_title ILIKE '%' || input || '%'
        OR p.description ILIKE '%' || input || '%'
        OR c.name ILIKE '%' || input || '%'
      )
  ),
  combined_results AS (
    SELECT * FROM tag_search
    UNION ALL
    SELECT * FROM text_search
  )
  SELECT DISTINCT ON (id) *
  FROM combined_results
  ORDER BY id, score DESC
  LIMIT max_results;
$function$
;

CREATE OR REPLACE FUNCTION public.search_products_by_suggestion(suggestion_title text, query_embedding vector, limit_count integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, ar_title text, category_name text, category_slug text, score double precision)
 LANGUAGE sql
 STABLE
AS $function$
  SELECT 
    p.id,
    p.title,
    p.ar_title,
    c.name as category_name,
    c.slug as category_slug,
    (1 - (p.embedding <=> query_embedding)) as score
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  WHERE 
    p.status = 'active'
    AND p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) > 0.3
  ORDER BY score DESC
  LIMIT limit_count;
$function$
;

CREATE OR REPLACE FUNCTION public.track_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO order_statuses (order_id, status, changed_by, reason)
        VALUES (NEW.id, NEW.status, COALESCE(NEW.buyer_id, OLD.buyer_id), 'Status updated');
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."user_profiles" as  SELECT id,
    username,
    full_name,
    avatar_url,
    phone,
    location,
    bio,
    is_verified,
    rating,
    total_sales,
    member_since,
    updated_at
   FROM users;


grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."category_attribute_relationships" to "anon";

grant insert on table "public"."category_attribute_relationships" to "anon";

grant references on table "public"."category_attribute_relationships" to "anon";

grant select on table "public"."category_attribute_relationships" to "anon";

grant trigger on table "public"."category_attribute_relationships" to "anon";

grant truncate on table "public"."category_attribute_relationships" to "anon";

grant update on table "public"."category_attribute_relationships" to "anon";

grant delete on table "public"."category_attribute_relationships" to "authenticated";

grant insert on table "public"."category_attribute_relationships" to "authenticated";

grant references on table "public"."category_attribute_relationships" to "authenticated";

grant select on table "public"."category_attribute_relationships" to "authenticated";

grant trigger on table "public"."category_attribute_relationships" to "authenticated";

grant truncate on table "public"."category_attribute_relationships" to "authenticated";

grant update on table "public"."category_attribute_relationships" to "authenticated";

grant delete on table "public"."category_attribute_relationships" to "service_role";

grant insert on table "public"."category_attribute_relationships" to "service_role";

grant references on table "public"."category_attribute_relationships" to "service_role";

grant select on table "public"."category_attribute_relationships" to "service_role";

grant trigger on table "public"."category_attribute_relationships" to "service_role";

grant truncate on table "public"."category_attribute_relationships" to "service_role";

grant update on table "public"."category_attribute_relationships" to "service_role";

grant delete on table "public"."category_attributes" to "anon";

grant insert on table "public"."category_attributes" to "anon";

grant references on table "public"."category_attributes" to "anon";

grant select on table "public"."category_attributes" to "anon";

grant trigger on table "public"."category_attributes" to "anon";

grant truncate on table "public"."category_attributes" to "anon";

grant update on table "public"."category_attributes" to "anon";

grant delete on table "public"."category_attributes" to "authenticated";

grant insert on table "public"."category_attributes" to "authenticated";

grant references on table "public"."category_attributes" to "authenticated";

grant select on table "public"."category_attributes" to "authenticated";

grant trigger on table "public"."category_attributes" to "authenticated";

grant truncate on table "public"."category_attributes" to "authenticated";

grant update on table "public"."category_attributes" to "authenticated";

grant delete on table "public"."category_attributes" to "service_role";

grant insert on table "public"."category_attributes" to "service_role";

grant references on table "public"."category_attributes" to "service_role";

grant select on table "public"."category_attributes" to "service_role";

grant trigger on table "public"."category_attributes" to "service_role";

grant truncate on table "public"."category_attributes" to "service_role";

grant update on table "public"."category_attributes" to "service_role";

grant delete on table "public"."category_tag_relationships" to "anon";

grant insert on table "public"."category_tag_relationships" to "anon";

grant references on table "public"."category_tag_relationships" to "anon";

grant select on table "public"."category_tag_relationships" to "anon";

grant trigger on table "public"."category_tag_relationships" to "anon";

grant truncate on table "public"."category_tag_relationships" to "anon";

grant update on table "public"."category_tag_relationships" to "anon";

grant delete on table "public"."category_tag_relationships" to "authenticated";

grant insert on table "public"."category_tag_relationships" to "authenticated";

grant references on table "public"."category_tag_relationships" to "authenticated";

grant select on table "public"."category_tag_relationships" to "authenticated";

grant trigger on table "public"."category_tag_relationships" to "authenticated";

grant truncate on table "public"."category_tag_relationships" to "authenticated";

grant update on table "public"."category_tag_relationships" to "authenticated";

grant delete on table "public"."category_tag_relationships" to "service_role";

grant insert on table "public"."category_tag_relationships" to "service_role";

grant references on table "public"."category_tag_relationships" to "service_role";

grant select on table "public"."category_tag_relationships" to "service_role";

grant trigger on table "public"."category_tag_relationships" to "service_role";

grant truncate on table "public"."category_tag_relationships" to "service_role";

grant update on table "public"."category_tag_relationships" to "service_role";

grant delete on table "public"."delivery_methods" to "anon";

grant insert on table "public"."delivery_methods" to "anon";

grant references on table "public"."delivery_methods" to "anon";

grant select on table "public"."delivery_methods" to "anon";

grant trigger on table "public"."delivery_methods" to "anon";

grant truncate on table "public"."delivery_methods" to "anon";

grant update on table "public"."delivery_methods" to "anon";

grant delete on table "public"."delivery_methods" to "authenticated";

grant insert on table "public"."delivery_methods" to "authenticated";

grant references on table "public"."delivery_methods" to "authenticated";

grant select on table "public"."delivery_methods" to "authenticated";

grant trigger on table "public"."delivery_methods" to "authenticated";

grant truncate on table "public"."delivery_methods" to "authenticated";

grant update on table "public"."delivery_methods" to "authenticated";

grant delete on table "public"."delivery_methods" to "service_role";

grant insert on table "public"."delivery_methods" to "service_role";

grant references on table "public"."delivery_methods" to "service_role";

grant select on table "public"."delivery_methods" to "service_role";

grant trigger on table "public"."delivery_methods" to "service_role";

grant truncate on table "public"."delivery_methods" to "service_role";

grant update on table "public"."delivery_methods" to "service_role";

grant delete on table "public"."favorites" to "anon";

grant insert on table "public"."favorites" to "anon";

grant references on table "public"."favorites" to "anon";

grant select on table "public"."favorites" to "anon";

grant trigger on table "public"."favorites" to "anon";

grant truncate on table "public"."favorites" to "anon";

grant update on table "public"."favorites" to "anon";

grant delete on table "public"."favorites" to "authenticated";

grant insert on table "public"."favorites" to "authenticated";

grant references on table "public"."favorites" to "authenticated";

grant select on table "public"."favorites" to "authenticated";

grant trigger on table "public"."favorites" to "authenticated";

grant truncate on table "public"."favorites" to "authenticated";

grant update on table "public"."favorites" to "authenticated";

grant delete on table "public"."favorites" to "service_role";

grant insert on table "public"."favorites" to "service_role";

grant references on table "public"."favorites" to "service_role";

grant select on table "public"."favorites" to "service_role";

grant trigger on table "public"."favorites" to "service_role";

grant truncate on table "public"."favorites" to "service_role";

grant update on table "public"."favorites" to "service_role";

grant delete on table "public"."order_deliveries" to "anon";

grant insert on table "public"."order_deliveries" to "anon";

grant references on table "public"."order_deliveries" to "anon";

grant select on table "public"."order_deliveries" to "anon";

grant trigger on table "public"."order_deliveries" to "anon";

grant truncate on table "public"."order_deliveries" to "anon";

grant update on table "public"."order_deliveries" to "anon";

grant delete on table "public"."order_deliveries" to "authenticated";

grant insert on table "public"."order_deliveries" to "authenticated";

grant references on table "public"."order_deliveries" to "authenticated";

grant select on table "public"."order_deliveries" to "authenticated";

grant trigger on table "public"."order_deliveries" to "authenticated";

grant truncate on table "public"."order_deliveries" to "authenticated";

grant update on table "public"."order_deliveries" to "authenticated";

grant delete on table "public"."order_deliveries" to "service_role";

grant insert on table "public"."order_deliveries" to "service_role";

grant references on table "public"."order_deliveries" to "service_role";

grant select on table "public"."order_deliveries" to "service_role";

grant trigger on table "public"."order_deliveries" to "service_role";

grant truncate on table "public"."order_deliveries" to "service_role";

grant update on table "public"."order_deliveries" to "service_role";

grant delete on table "public"."order_messages" to "anon";

grant insert on table "public"."order_messages" to "anon";

grant references on table "public"."order_messages" to "anon";

grant select on table "public"."order_messages" to "anon";

grant trigger on table "public"."order_messages" to "anon";

grant truncate on table "public"."order_messages" to "anon";

grant update on table "public"."order_messages" to "anon";

grant delete on table "public"."order_messages" to "authenticated";

grant insert on table "public"."order_messages" to "authenticated";

grant references on table "public"."order_messages" to "authenticated";

grant select on table "public"."order_messages" to "authenticated";

grant trigger on table "public"."order_messages" to "authenticated";

grant truncate on table "public"."order_messages" to "authenticated";

grant update on table "public"."order_messages" to "authenticated";

grant delete on table "public"."order_messages" to "service_role";

grant insert on table "public"."order_messages" to "service_role";

grant references on table "public"."order_messages" to "service_role";

grant select on table "public"."order_messages" to "service_role";

grant trigger on table "public"."order_messages" to "service_role";

grant truncate on table "public"."order_messages" to "service_role";

grant update on table "public"."order_messages" to "service_role";

grant delete on table "public"."order_payments" to "anon";

grant insert on table "public"."order_payments" to "anon";

grant references on table "public"."order_payments" to "anon";

grant select on table "public"."order_payments" to "anon";

grant trigger on table "public"."order_payments" to "anon";

grant truncate on table "public"."order_payments" to "anon";

grant update on table "public"."order_payments" to "anon";

grant delete on table "public"."order_payments" to "authenticated";

grant insert on table "public"."order_payments" to "authenticated";

grant references on table "public"."order_payments" to "authenticated";

grant select on table "public"."order_payments" to "authenticated";

grant trigger on table "public"."order_payments" to "authenticated";

grant truncate on table "public"."order_payments" to "authenticated";

grant update on table "public"."order_payments" to "authenticated";

grant delete on table "public"."order_payments" to "service_role";

grant insert on table "public"."order_payments" to "service_role";

grant references on table "public"."order_payments" to "service_role";

grant select on table "public"."order_payments" to "service_role";

grant trigger on table "public"."order_payments" to "service_role";

grant truncate on table "public"."order_payments" to "service_role";

grant update on table "public"."order_payments" to "service_role";

grant delete on table "public"."order_statuses" to "anon";

grant insert on table "public"."order_statuses" to "anon";

grant references on table "public"."order_statuses" to "anon";

grant select on table "public"."order_statuses" to "anon";

grant trigger on table "public"."order_statuses" to "anon";

grant truncate on table "public"."order_statuses" to "anon";

grant update on table "public"."order_statuses" to "anon";

grant delete on table "public"."order_statuses" to "authenticated";

grant insert on table "public"."order_statuses" to "authenticated";

grant references on table "public"."order_statuses" to "authenticated";

grant select on table "public"."order_statuses" to "authenticated";

grant trigger on table "public"."order_statuses" to "authenticated";

grant truncate on table "public"."order_statuses" to "authenticated";

grant update on table "public"."order_statuses" to "authenticated";

grant delete on table "public"."order_statuses" to "service_role";

grant insert on table "public"."order_statuses" to "service_role";

grant references on table "public"."order_statuses" to "service_role";

grant select on table "public"."order_statuses" to "service_role";

grant trigger on table "public"."order_statuses" to "service_role";

grant truncate on table "public"."order_statuses" to "service_role";

grant update on table "public"."order_statuses" to "service_role";

grant delete on table "public"."orders" to "anon";

grant insert on table "public"."orders" to "anon";

grant references on table "public"."orders" to "anon";

grant select on table "public"."orders" to "anon";

grant trigger on table "public"."orders" to "anon";

grant truncate on table "public"."orders" to "anon";

grant update on table "public"."orders" to "anon";

grant delete on table "public"."orders" to "authenticated";

grant insert on table "public"."orders" to "authenticated";

grant references on table "public"."orders" to "authenticated";

grant select on table "public"."orders" to "authenticated";

grant trigger on table "public"."orders" to "authenticated";

grant truncate on table "public"."orders" to "authenticated";

grant update on table "public"."orders" to "authenticated";

grant delete on table "public"."orders" to "service_role";

grant insert on table "public"."orders" to "service_role";

grant references on table "public"."orders" to "service_role";

grant select on table "public"."orders" to "service_role";

grant trigger on table "public"."orders" to "service_role";

grant truncate on table "public"."orders" to "service_role";

grant update on table "public"."orders" to "service_role";

grant delete on table "public"."product_attribute_relationships" to "anon";

grant insert on table "public"."product_attribute_relationships" to "anon";

grant references on table "public"."product_attribute_relationships" to "anon";

grant select on table "public"."product_attribute_relationships" to "anon";

grant trigger on table "public"."product_attribute_relationships" to "anon";

grant truncate on table "public"."product_attribute_relationships" to "anon";

grant update on table "public"."product_attribute_relationships" to "anon";

grant delete on table "public"."product_attribute_relationships" to "authenticated";

grant insert on table "public"."product_attribute_relationships" to "authenticated";

grant references on table "public"."product_attribute_relationships" to "authenticated";

grant select on table "public"."product_attribute_relationships" to "authenticated";

grant trigger on table "public"."product_attribute_relationships" to "authenticated";

grant truncate on table "public"."product_attribute_relationships" to "authenticated";

grant update on table "public"."product_attribute_relationships" to "authenticated";

grant delete on table "public"."product_attribute_relationships" to "service_role";

grant insert on table "public"."product_attribute_relationships" to "service_role";

grant references on table "public"."product_attribute_relationships" to "service_role";

grant select on table "public"."product_attribute_relationships" to "service_role";

grant trigger on table "public"."product_attribute_relationships" to "service_role";

grant truncate on table "public"."product_attribute_relationships" to "service_role";

grant update on table "public"."product_attribute_relationships" to "service_role";

grant delete on table "public"."product_attribute_terms" to "anon";

grant insert on table "public"."product_attribute_terms" to "anon";

grant references on table "public"."product_attribute_terms" to "anon";

grant select on table "public"."product_attribute_terms" to "anon";

grant trigger on table "public"."product_attribute_terms" to "anon";

grant truncate on table "public"."product_attribute_terms" to "anon";

grant update on table "public"."product_attribute_terms" to "anon";

grant delete on table "public"."product_attribute_terms" to "authenticated";

grant insert on table "public"."product_attribute_terms" to "authenticated";

grant references on table "public"."product_attribute_terms" to "authenticated";

grant select on table "public"."product_attribute_terms" to "authenticated";

grant trigger on table "public"."product_attribute_terms" to "authenticated";

grant truncate on table "public"."product_attribute_terms" to "authenticated";

grant update on table "public"."product_attribute_terms" to "authenticated";

grant delete on table "public"."product_attribute_terms" to "service_role";

grant insert on table "public"."product_attribute_terms" to "service_role";

grant references on table "public"."product_attribute_terms" to "service_role";

grant select on table "public"."product_attribute_terms" to "service_role";

grant trigger on table "public"."product_attribute_terms" to "service_role";

grant truncate on table "public"."product_attribute_terms" to "service_role";

grant update on table "public"."product_attribute_terms" to "service_role";

grant delete on table "public"."product_attributes" to "anon";

grant insert on table "public"."product_attributes" to "anon";

grant references on table "public"."product_attributes" to "anon";

grant select on table "public"."product_attributes" to "anon";

grant trigger on table "public"."product_attributes" to "anon";

grant truncate on table "public"."product_attributes" to "anon";

grant update on table "public"."product_attributes" to "anon";

grant delete on table "public"."product_attributes" to "authenticated";

grant insert on table "public"."product_attributes" to "authenticated";

grant references on table "public"."product_attributes" to "authenticated";

grant select on table "public"."product_attributes" to "authenticated";

grant trigger on table "public"."product_attributes" to "authenticated";

grant truncate on table "public"."product_attributes" to "authenticated";

grant update on table "public"."product_attributes" to "authenticated";

grant delete on table "public"."product_attributes" to "service_role";

grant insert on table "public"."product_attributes" to "service_role";

grant references on table "public"."product_attributes" to "service_role";

grant select on table "public"."product_attributes" to "service_role";

grant trigger on table "public"."product_attributes" to "service_role";

grant truncate on table "public"."product_attributes" to "service_role";

grant update on table "public"."product_attributes" to "service_role";

grant delete on table "public"."product_images" to "anon";

grant insert on table "public"."product_images" to "anon";

grant references on table "public"."product_images" to "anon";

grant select on table "public"."product_images" to "anon";

grant trigger on table "public"."product_images" to "anon";

grant truncate on table "public"."product_images" to "anon";

grant update on table "public"."product_images" to "anon";

grant delete on table "public"."product_images" to "authenticated";

grant insert on table "public"."product_images" to "authenticated";

grant references on table "public"."product_images" to "authenticated";

grant select on table "public"."product_images" to "authenticated";

grant trigger on table "public"."product_images" to "authenticated";

grant truncate on table "public"."product_images" to "authenticated";

grant update on table "public"."product_images" to "authenticated";

grant delete on table "public"."product_images" to "service_role";

grant insert on table "public"."product_images" to "service_role";

grant references on table "public"."product_images" to "service_role";

grant select on table "public"."product_images" to "service_role";

grant trigger on table "public"."product_images" to "service_role";

grant truncate on table "public"."product_images" to "service_role";

grant update on table "public"."product_images" to "service_role";

grant delete on table "public"."product_tag_relationships" to "anon";

grant insert on table "public"."product_tag_relationships" to "anon";

grant references on table "public"."product_tag_relationships" to "anon";

grant select on table "public"."product_tag_relationships" to "anon";

grant trigger on table "public"."product_tag_relationships" to "anon";

grant truncate on table "public"."product_tag_relationships" to "anon";

grant update on table "public"."product_tag_relationships" to "anon";

grant delete on table "public"."product_tag_relationships" to "authenticated";

grant insert on table "public"."product_tag_relationships" to "authenticated";

grant references on table "public"."product_tag_relationships" to "authenticated";

grant select on table "public"."product_tag_relationships" to "authenticated";

grant trigger on table "public"."product_tag_relationships" to "authenticated";

grant truncate on table "public"."product_tag_relationships" to "authenticated";

grant update on table "public"."product_tag_relationships" to "authenticated";

grant delete on table "public"."product_tag_relationships" to "service_role";

grant insert on table "public"."product_tag_relationships" to "service_role";

grant references on table "public"."product_tag_relationships" to "service_role";

grant select on table "public"."product_tag_relationships" to "service_role";

grant trigger on table "public"."product_tag_relationships" to "service_role";

grant truncate on table "public"."product_tag_relationships" to "service_role";

grant update on table "public"."product_tag_relationships" to "service_role";

grant delete on table "public"."product_tags" to "anon";

grant insert on table "public"."product_tags" to "anon";

grant references on table "public"."product_tags" to "anon";

grant select on table "public"."product_tags" to "anon";

grant trigger on table "public"."product_tags" to "anon";

grant truncate on table "public"."product_tags" to "anon";

grant update on table "public"."product_tags" to "anon";

grant delete on table "public"."product_tags" to "authenticated";

grant insert on table "public"."product_tags" to "authenticated";

grant references on table "public"."product_tags" to "authenticated";

grant select on table "public"."product_tags" to "authenticated";

grant trigger on table "public"."product_tags" to "authenticated";

grant truncate on table "public"."product_tags" to "authenticated";

grant update on table "public"."product_tags" to "authenticated";

grant delete on table "public"."product_tags" to "service_role";

grant insert on table "public"."product_tags" to "service_role";

grant references on table "public"."product_tags" to "service_role";

grant select on table "public"."product_tags" to "service_role";

grant trigger on table "public"."product_tags" to "service_role";

grant truncate on table "public"."product_tags" to "service_role";

grant update on table "public"."product_tags" to "service_role";

grant delete on table "public"."products" to "anon";

grant insert on table "public"."products" to "anon";

grant references on table "public"."products" to "anon";

grant select on table "public"."products" to "anon";

grant trigger on table "public"."products" to "anon";

grant truncate on table "public"."products" to "anon";

grant update on table "public"."products" to "anon";

grant delete on table "public"."products" to "authenticated";

grant insert on table "public"."products" to "authenticated";

grant references on table "public"."products" to "authenticated";

grant select on table "public"."products" to "authenticated";

grant trigger on table "public"."products" to "authenticated";

grant truncate on table "public"."products" to "authenticated";

grant update on table "public"."products" to "authenticated";

grant delete on table "public"."products" to "service_role";

grant insert on table "public"."products" to "service_role";

grant references on table "public"."products" to "service_role";

grant select on table "public"."products" to "service_role";

grant trigger on table "public"."products" to "service_role";

grant truncate on table "public"."products" to "service_role";

grant update on table "public"."products" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";

create policy "Allow all deletes"
on "public"."categories"
as permissive
for delete
to public
using (true);


create policy "Allow all inserts"
on "public"."categories"
as permissive
for insert
to public
with check (true);


create policy "Allow all updates"
on "public"."categories"
as permissive
for update
to public
using (true)
with check (true);


create policy "Allow public read"
on "public"."categories"
as permissive
for select
to public
using (true);


create policy "Enable delete for authenticated users"
on "public"."category_attribute_relationships"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."category_attribute_relationships"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."category_attribute_relationships"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."category_attribute_relationships"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable delete for authenticated users"
on "public"."category_tag_relationships"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."category_tag_relationships"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."category_tag_relationships"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."category_tag_relationships"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Users can delete their own messages"
on "public"."order_messages"
as permissive
for delete
to public
using ((auth.uid() = sender_id));


create policy "Users can insert messages as sender"
on "public"."order_messages"
as permissive
for insert
to public
with check ((auth.uid() = sender_id));


create policy "Users can update messages they are part of"
on "public"."order_messages"
as permissive
for update
to public
using (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


create policy "Users can view messages they are part of"
on "public"."order_messages"
as permissive
for select
to public
using (((auth.uid() = sender_id) OR (auth.uid() = receiver_id)));


create policy "Users can insert orders as buyer"
on "public"."orders"
as permissive
for insert
to public
with check ((auth.uid() = buyer_id));


create policy "Users can update orders they are part of"
on "public"."orders"
as permissive
for update
to public
using (((auth.uid() = buyer_id) OR (auth.uid() = seller_id)));


create policy "Users can view orders they are part of"
on "public"."orders"
as permissive
for select
to public
using (((auth.uid() = buyer_id) OR (auth.uid() = seller_id)));


create policy "Enable delete for authenticated users"
on "public"."product_attribute_relationships"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."product_attribute_relationships"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."product_attribute_relationships"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_attribute_relationships"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Service role can manage all product_attribute_relationships"
on "public"."product_attribute_relationships"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Enable delete for authenticated users"
on "public"."product_attribute_terms"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."product_attribute_terms"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."product_attribute_terms"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_attribute_terms"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable delete for authenticated users"
on "public"."product_attributes"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."product_attributes"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."product_attributes"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_attributes"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable delete for authenticated users"
on "public"."product_images"
as permissive
for delete
to authenticated
using (true);


create policy "Enable insert for authenticated users"
on "public"."product_images"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."product_images"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_images"
as permissive
for update
to authenticated
using (true)
with check (true);


create policy "Service role can manage all product_images"
on "public"."product_images"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Enable delete for authenticated users"
on "public"."product_tag_relationships"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."product_tag_relationships"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."product_tag_relationships"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_tag_relationships"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable delete for authenticated users"
on "public"."product_tags"
as permissive
for delete
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable insert for authenticated users"
on "public"."product_tags"
as permissive
for insert
to public
with check ((auth.role() = 'authenticated'::text));


create policy "Enable read access for all users"
on "public"."product_tags"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."product_tags"
as permissive
for update
to public
using ((auth.role() = 'authenticated'::text));


create policy "Enable delete for authenticated users"
on "public"."products"
as permissive
for delete
to authenticated
using ((auth.uid() = seller_id));


create policy "Enable insert for authenticated users"
on "public"."products"
as permissive
for insert
to authenticated
with check ((auth.uid() = seller_id));


create policy "Enable read access for all users"
on "public"."products"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users"
on "public"."products"
as permissive
for update
to authenticated
using ((auth.uid() = seller_id))
with check ((auth.uid() = seller_id));


create policy "Service role can manage all products"
on "public"."products"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Public can view basic user info"
on "public"."users"
as permissive
for select
to public
using (true);


create policy "Service role can manage all users"
on "public"."users"
as permissive
for all
to service_role
using (true)
with check (true);


create policy "Users can insert their own profile"
on "public"."users"
as permissive
for insert
to authenticated
with check ((auth.uid() = id));


create policy "Users can update their own profile"
on "public"."users"
as permissive
for update
to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can view their own profile"
on "public"."users"
as permissive
for select
to authenticated
using ((auth.uid() = id));


CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_deliveries_updated_at BEFORE UPDATE ON public.order_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_payments_updated_at BEFORE UPDATE ON public.order_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER create_initial_order_status_trigger AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION create_initial_order_status();

CREATE TRIGGER track_order_status_change_trigger AFTER UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION track_order_status_change();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


