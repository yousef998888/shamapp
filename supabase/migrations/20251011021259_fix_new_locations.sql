create table "public"."cities" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying not null,
    "country" character varying not null,
    "country_code" character varying(2) not null,
    "latitude" numeric(10,6) not null,
    "longitude" numeric(10,6) not null,
    "display_order" integer not null,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "is_active" boolean default true
);


alter table "public"."cities" enable row level security;

create table "public"."pickup_locations" (
    "id" uuid not null default gen_random_uuid(),
    "city_id" uuid not null,
    "name" character varying not null,
    "address" character varying not null,
    "phone" character varying not null,
    "latitude" numeric(10,6) not null,
    "longitude" numeric(10,6) not null,
    "type" character varying not null default 'branch'::character varying,
    "pickup_fee" numeric(10,2) not null default 0,
    "estimated_days" integer not null,
    "special_instructions" text,
    "is_active" boolean not null default true,
    "display_order" integer not null default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."pickup_locations" enable row level security;

create table "public"."user_addresses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" character varying(100) not null,
    "address_line_1" character varying(255) not null,
    "address_line_2" character varying(255),
    "city" character varying(100) not null,
    "state_province" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(100) not null,
    "latitude" numeric(10,8) not null,
    "longitude" numeric(11,8) not null,
    "is_default" boolean default false,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_addresses" enable row level security;

alter table "public"."products" add column "address_id" uuid;

CREATE UNIQUE INDEX cities_name_country_unique ON public.cities USING btree (name, country);

CREATE UNIQUE INDEX cities_pkey ON public.cities USING btree (id);

CREATE INDEX idx_cities_country_code ON public.cities USING btree (country_code);

CREATE INDEX idx_cities_display_order ON public.cities USING btree (display_order);

CREATE INDEX idx_pickup_locations_city_id ON public.pickup_locations USING btree (city_id);

CREATE INDEX idx_pickup_locations_display_order ON public.pickup_locations USING btree (display_order);

CREATE INDEX idx_pickup_locations_is_active ON public.pickup_locations USING btree (is_active);

CREATE INDEX idx_products_address_id ON public.products USING btree (address_id);

CREATE INDEX idx_user_addresses_default ON public.user_addresses USING btree (user_id, is_default) WHERE (is_default = true);

CREATE INDEX idx_user_addresses_location ON public.user_addresses USING btree (latitude, longitude);

CREATE INDEX idx_user_addresses_user_id ON public.user_addresses USING btree (user_id);

CREATE UNIQUE INDEX pickup_locations_pkey ON public.pickup_locations USING btree (id);

CREATE UNIQUE INDEX user_addresses_pkey ON public.user_addresses USING btree (id);

alter table "public"."cities" add constraint "cities_pkey" PRIMARY KEY using index "cities_pkey";

alter table "public"."pickup_locations" add constraint "pickup_locations_pkey" PRIMARY KEY using index "pickup_locations_pkey";

alter table "public"."user_addresses" add constraint "user_addresses_pkey" PRIMARY KEY using index "user_addresses_pkey";

alter table "public"."cities" add constraint "cities_name_country_unique" UNIQUE using index "cities_name_country_unique";

alter table "public"."pickup_locations" add constraint "pickup_locations_city_id_fkey" FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE not valid;

alter table "public"."pickup_locations" validate constraint "pickup_locations_city_id_fkey";

alter table "public"."products" add constraint "products_address_id_fkey" FOREIGN KEY (address_id) REFERENCES user_addresses(id) not valid;

alter table "public"."products" validate constraint "products_address_id_fkey";

alter table "public"."user_addresses" add constraint "user_addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_addresses" validate constraint "user_addresses_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- If setting this address as default, unset all other defaults for this user
  IF NEW.is_default = TRUE THEN
    UPDATE user_addresses 
    SET is_default = FALSE 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.product_search_with_relationships(query_embedding vector, query_text text, limit_count integer DEFAULT 10)
 RETURNS TABLE(id uuid, seller_id uuid, category_id uuid, title text, ar_title text, description text, ar_description text, price numeric, currency text, condition text, status text, location text, is_negotiable boolean, view_count integer, is_auction boolean, starting_price numeric, bid_end_date timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, latitude double precision, longitude double precision, delivery_option text, tags text[], embedding vector, category jsonb, seller jsonb, images jsonb, attribute_relationships jsonb)
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
  SELECT 
    p.id, p.seller_id, p.category_id, p.title, p.ar_title, p.description, p.ar_description,
    p.price, p.currency, p.condition, p.status, p.location, p.is_negotiable, p.view_count,
    p.is_auction, p.starting_price, p.bid_end_date, p.created_at, p.updated_at,
    p.latitude, p.longitude, p.delivery_option, p.tags, p.embedding,
    -- Category data
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'slug', c.slug
    ) as category,
    -- Seller data
    jsonb_build_object(
      'id', up.id,
      'full_name', up.full_name,
      'username', up.username,
      'avatar_url', up.avatar_url
    ) as seller,
    -- Images data
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', pi.id,
          'image_url', pi.image_url,
          'alt_text', pi.alt_text,
          'sort_order', pi.sort_order,
          'is_primary', pi.is_primary
        )
      ) FROM product_images pi WHERE pi.product_id = p.id),
      '[]'::jsonb
    ) as images,
    -- Attribute relationships data
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', par.id,
          'term_id', par.term_id,
          'attribute', jsonb_build_object(
            'id', pa.id,
            'name', pa.name,
            'slug', pa.slug,
            'description', pa.description
          ),
          'term', jsonb_build_object(
            'id', pat.id,
            'name', pat.name,
            'slug', pat.slug,
            'sort_order', pat.sort_order
          )
        )
      ) FROM product_attribute_relationships par
      LEFT JOIN product_attributes pa ON par.attribute_id = pa.id
      LEFT JOIN product_attribute_terms pat ON par.term_id = pat.id
      WHERE par.product_id = p.id),
      '[]'::jsonb
    ) as attribute_relationships
  FROM ranked_products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN user_profiles up ON p.seller_id = up.id
  ORDER BY (
    0.7 * p.embedding_score + 
    0.3 * (p.matching_tags / NULLIF(p.total_words, 0))
  ) DESC
  LIMIT limit_count;
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

grant delete on table "public"."cities" to "anon";

grant insert on table "public"."cities" to "anon";

grant references on table "public"."cities" to "anon";

grant select on table "public"."cities" to "anon";

grant trigger on table "public"."cities" to "anon";

grant truncate on table "public"."cities" to "anon";

grant update on table "public"."cities" to "anon";

grant delete on table "public"."cities" to "authenticated";

grant insert on table "public"."cities" to "authenticated";

grant references on table "public"."cities" to "authenticated";

grant select on table "public"."cities" to "authenticated";

grant trigger on table "public"."cities" to "authenticated";

grant truncate on table "public"."cities" to "authenticated";

grant update on table "public"."cities" to "authenticated";

grant delete on table "public"."cities" to "service_role";

grant insert on table "public"."cities" to "service_role";

grant references on table "public"."cities" to "service_role";

grant select on table "public"."cities" to "service_role";

grant trigger on table "public"."cities" to "service_role";

grant truncate on table "public"."cities" to "service_role";

grant update on table "public"."cities" to "service_role";

grant delete on table "public"."pickup_locations" to "anon";

grant insert on table "public"."pickup_locations" to "anon";

grant references on table "public"."pickup_locations" to "anon";

grant select on table "public"."pickup_locations" to "anon";

grant trigger on table "public"."pickup_locations" to "anon";

grant truncate on table "public"."pickup_locations" to "anon";

grant update on table "public"."pickup_locations" to "anon";

grant delete on table "public"."pickup_locations" to "authenticated";

grant insert on table "public"."pickup_locations" to "authenticated";

grant references on table "public"."pickup_locations" to "authenticated";

grant select on table "public"."pickup_locations" to "authenticated";

grant trigger on table "public"."pickup_locations" to "authenticated";

grant truncate on table "public"."pickup_locations" to "authenticated";

grant update on table "public"."pickup_locations" to "authenticated";

grant delete on table "public"."pickup_locations" to "service_role";

grant insert on table "public"."pickup_locations" to "service_role";

grant references on table "public"."pickup_locations" to "service_role";

grant select on table "public"."pickup_locations" to "service_role";

grant trigger on table "public"."pickup_locations" to "service_role";

grant truncate on table "public"."pickup_locations" to "service_role";

grant update on table "public"."pickup_locations" to "service_role";

grant delete on table "public"."user_addresses" to "anon";

grant insert on table "public"."user_addresses" to "anon";

grant references on table "public"."user_addresses" to "anon";

grant select on table "public"."user_addresses" to "anon";

grant trigger on table "public"."user_addresses" to "anon";

grant truncate on table "public"."user_addresses" to "anon";

grant update on table "public"."user_addresses" to "anon";

grant delete on table "public"."user_addresses" to "authenticated";

grant insert on table "public"."user_addresses" to "authenticated";

grant references on table "public"."user_addresses" to "authenticated";

grant select on table "public"."user_addresses" to "authenticated";

grant trigger on table "public"."user_addresses" to "authenticated";

grant truncate on table "public"."user_addresses" to "authenticated";

grant update on table "public"."user_addresses" to "authenticated";

grant delete on table "public"."user_addresses" to "service_role";

grant insert on table "public"."user_addresses" to "service_role";

grant references on table "public"."user_addresses" to "service_role";

grant select on table "public"."user_addresses" to "service_role";

grant trigger on table "public"."user_addresses" to "service_role";

grant truncate on table "public"."user_addresses" to "service_role";

grant update on table "public"."user_addresses" to "service_role";

create policy "Cities are viewable by everyone"
on "public"."cities"
as permissive
for select
to public
using (true);


create policy "Pickup locations are viewable by everyone"
on "public"."pickup_locations"
as permissive
for select
to public
using (true);


create policy "Users can delete own addresses"
on "public"."user_addresses"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert own addresses"
on "public"."user_addresses"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update own addresses"
on "public"."user_addresses"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view own addresses"
on "public"."user_addresses"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER trigger_ensure_single_default_address BEFORE INSERT OR UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION ensure_single_default_address();

CREATE TRIGGER trigger_update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


