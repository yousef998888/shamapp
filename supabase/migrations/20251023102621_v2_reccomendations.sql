create table "public"."user_interactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "product_id" uuid,
    "interaction_type" text not null,
    "metadata" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."user_interactions" enable row level security;

CREATE INDEX idx_user_interactions_created_at ON public.user_interactions USING btree (created_at);

CREATE INDEX idx_user_interactions_product_id ON public.user_interactions USING btree (product_id);

CREATE INDEX idx_user_interactions_type ON public.user_interactions USING btree (interaction_type);

CREATE INDEX idx_user_interactions_user_id ON public.user_interactions USING btree (user_id);

CREATE INDEX idx_user_interactions_user_type ON public.user_interactions USING btree (user_id, interaction_type);

CREATE UNIQUE INDEX user_interactions_pkey ON public.user_interactions USING btree (id);

alter table "public"."user_interactions" add constraint "user_interactions_pkey" PRIMARY KEY using index "user_interactions_pkey";

alter table "public"."user_interactions" add constraint "user_interactions_interaction_type_check" CHECK ((interaction_type = ANY (ARRAY['view'::text, 'favorite'::text, 'unfavorite'::text, 'search'::text, 'purchase'::text, 'share'::text]))) not valid;

alter table "public"."user_interactions" validate constraint "user_interactions_interaction_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_personalized_recommendations(user_id uuid, limit_count integer DEFAULT 20)
 RETURNS TABLE(id uuid, title text, ar_title text, price numeric, currency text, view_count integer, category_name text, category_slug text, primary_image_url text, seller_name text, recommendation_score numeric, recommendation_reason text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    WITH user_preferences AS (
        -- Get user's favorite categories
        SELECT category_id, COUNT(*) as interaction_count
        FROM public.user_interactions ui
        JOIN public.products p ON ui.product_id = p.id
        WHERE 
            ui.user_id = get_personalized_recommendations.user_id
            AND ui.interaction_type IN ('view', 'favorite', 'purchase')
            AND ui.created_at >= NOW() - INTERVAL '30 days'
            AND p.category_id IS NOT NULL
        GROUP BY p.category_id
        ORDER BY interaction_count DESC
        LIMIT 5
    ),
    similar_users AS (
        -- Find users with similar preferences
        SELECT DISTINCT ui2.user_id
        FROM public.user_interactions ui1
        JOIN public.user_interactions ui2 ON ui1.product_id = ui2.product_id
        JOIN public.products p ON ui1.product_id = p.id
        WHERE 
            ui1.user_id = get_personalized_recommendations.user_id
            AND ui2.user_id != get_personalized_recommendations.user_id
            AND ui1.interaction_type IN ('favorite', 'purchase')
            AND ui2.interaction_type IN ('favorite', 'purchase')
            AND p.category_id IN (SELECT category_id FROM user_preferences)
        GROUP BY ui2.user_id
        HAVING COUNT(DISTINCT ui1.product_id) >= 2
        LIMIT 10
    ),
    recommendations AS (
        -- Get products from similar users and preferred categories
        SELECT DISTINCT
            p.id,
            p.title,
            p.ar_title,
            p.price,
            p.currency,
            p.view_count,
            c.name as category_name,
            c.slug as category_slug,
            pi.image_url as primary_image_url,
            up.full_name as seller_name,
            CASE 
                WHEN p.category_id IN (SELECT category_id FROM user_preferences) THEN 0.8
                WHEN p.seller_id IN (SELECT user_id FROM similar_users) THEN 0.6
                ELSE 0.4
            END as recommendation_score,
            CASE 
                WHEN p.category_id IN (SELECT category_id FROM user_preferences) THEN 'Based on your interests'
                WHEN p.seller_id IN (SELECT user_id FROM similar_users) THEN 'Similar users also liked'
                ELSE 'Popular in your area'
            END as recommendation_reason
        FROM public.products p
        LEFT JOIN public.categories c ON p.category_id = c.id
        LEFT JOIN public.user_profiles up ON p.seller_id = up.id
        LEFT JOIN public.product_images pi ON p.id = pi.product_id AND pi.is_primary = true
        WHERE 
            p.status = 'active'
            AND (
                p.category_id IN (SELECT category_id FROM user_preferences)
                OR p.seller_id IN (SELECT user_id FROM similar_users)
            )
            AND p.id NOT IN (
                -- Exclude products user has already interacted with
                SELECT DISTINCT product_id 
                FROM public.user_interactions 
                WHERE user_id = get_personalized_recommendations.user_id
            )
    )
    SELECT * FROM recommendations
    ORDER BY recommendation_score DESC, view_count DESC
    LIMIT limit_count;
$function$
;

CREATE OR REPLACE FUNCTION public.get_search_based_recommendations(user_id_param uuid, search_queries text[], limit_param integer DEFAULT 4)
 RETURNS TABLE(id uuid, title text, description text, price numeric, currency text, category_id uuid, view_count integer, created_at timestamp with time zone, category_name text, category_slug text, seller_name text, seller_username text, seller_avatar_url text, image_url text, similarity_score double precision)
 LANGUAGE plpgsql
AS $function$
DECLARE
  search_query text;
  query_embedding vector(384);
  search_embedding vector(384);
BEGIN
  -- Use the most recent search query
  search_query := search_queries[array_length(search_queries, 1)];
  
  -- Get the embedding for the search query
  SELECT embedding INTO search_embedding
  FROM search_embeddings 
  WHERE query = search_query
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no embedding found, generate one using the AI service
  IF search_embedding IS NULL THEN
    -- This would call the AI service to generate embedding
    -- For now, we'll use a fallback approach
    RETURN QUERY
    SELECT 
      p.id,
      p.title,
      p.description,
      p.price,
      p.currency,
      p.category_id,
      p.view_count,
      p.created_at,
      c.name as category_name,
      c.slug as category_slug,
      up.full_name as seller_name,
      up.username as seller_username,
      up.avatar_url as seller_avatar_url,
      pi.image_url,
      0.5::float as similarity_score
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN user_profiles up ON p.seller_id = up.id
    LEFT JOIN LATERAL (
      SELECT image_url 
      FROM product_images pi2 
      WHERE pi2.product_id = p.id 
      ORDER BY pi2.sort_order 
      LIMIT 1
    ) pi ON true
    WHERE p.status = 'active'
      AND (
        p.title ILIKE '%' || search_query || '%'
        OR p.description ILIKE '%' || search_query || '%'
      )
    ORDER BY p.view_count DESC
    LIMIT limit_param;
    RETURN;
  END IF;
  
  -- Use semantic search with embeddings
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.currency,
    p.category_id,
    p.view_count,
    p.created_at,
    c.name as category_name,
    c.slug as category_slug,
    up.full_name as seller_name,
    up.username as seller_username,
    up.avatar_url as seller_avatar_url,
    pi.image_url,
    (1 - (p.embedding <=> search_embedding)) as similarity_score
  FROM products p
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN user_profiles up ON p.seller_id = up.id
  LEFT JOIN LATERAL (
    SELECT image_url 
    FROM product_images pi2 
    WHERE pi2.product_id = p.id 
    ORDER BY pi2.sort_order 
    LIMIT 1
  ) pi ON true
  WHERE p.status = 'active'
    AND p.embedding IS NOT NULL
  ORDER BY p.embedding <=> search_embedding
  LIMIT limit_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_trending_products(limit_count integer DEFAULT 20, days_back integer DEFAULT 7)
 RETURNS TABLE(id uuid, title text, ar_title text, price numeric, currency text, view_count integer, favorites_count bigint, created_at timestamp with time zone, category_name text, category_slug text, primary_image_url text, seller_name text, trending_score numeric)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT 
        p.id,
        p.title,
        p.ar_title,
        p.price,
        p.currency,
        p.view_count,
        COALESCE(fav_count.count, 0) as favorites_count,
        p.created_at,
        c.name as category_name,
        c.slug as category_slug,
        pi.image_url as primary_image_url,
        up.full_name as seller_name,
        -- Calculate trending score based on views, favorites, and recency
        (
            (p.view_count * 0.4) + 
            (COALESCE(fav_count.count, 0) * 0.3) + 
            (CASE 
                WHEN p.created_at >= NOW() - INTERVAL '1 day' THEN 1.0
                WHEN p.created_at >= NOW() - INTERVAL '3 days' THEN 0.8
                WHEN p.created_at >= NOW() - INTERVAL '7 days' THEN 0.6
                ELSE 0.4
            END * 0.3)
        ) as trending_score
    FROM public.products p
    LEFT JOIN public.categories c ON p.category_id = c.id
    LEFT JOIN public.user_profiles up ON p.seller_id = up.id
    LEFT JOIN public.product_images pi ON p.id = pi.product_id AND pi.is_primary = true
    LEFT JOIN (
        SELECT product_id, COUNT(*) as count
        FROM public.favorites
        WHERE created_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY product_id
    ) fav_count ON p.id = fav_count.product_id
    WHERE 
        p.status = 'active'
        AND p.created_at >= NOW() - INTERVAL '1 day' * days_back
    ORDER BY trending_score DESC
    LIMIT limit_count;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_favorite_categories(user_id uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(category_id uuid, interaction_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT 
        p.category_id,
        COUNT(*) as interaction_count
    FROM public.user_interactions ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE 
        ui.user_id = get_user_favorite_categories.user_id
        AND ui.interaction_type IN ('view', 'favorite', 'purchase')
        AND ui.created_at >= NOW() - INTERVAL '1 day' * days_back
        AND p.category_id IS NOT NULL
    GROUP BY p.category_id
    ORDER BY interaction_count DESC
    LIMIT 10;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_price_preferences(user_id uuid, days_back integer DEFAULT 30)
 RETURNS TABLE(min_price numeric, max_price numeric, avg_price numeric, currency text)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT 
        MIN(p.price) as min_price,
        MAX(p.price) as max_price,
        AVG(p.price) as avg_price,
        p.currency
    FROM public.user_interactions ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE 
        ui.user_id = get_user_price_preferences.user_id
        AND ui.interaction_type IN ('view', 'favorite', 'purchase')
        AND ui.created_at >= NOW() - INTERVAL '1 day' * days_back
        AND p.price > 0
    GROUP BY p.currency;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_product_view_count(product_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.products 
    SET view_count = view_count + 1 
    WHERE id = product_id;
END;
$function$
;

grant delete on table "public"."user_interactions" to "anon";

grant insert on table "public"."user_interactions" to "anon";

grant references on table "public"."user_interactions" to "anon";

grant select on table "public"."user_interactions" to "anon";

grant trigger on table "public"."user_interactions" to "anon";

grant truncate on table "public"."user_interactions" to "anon";

grant update on table "public"."user_interactions" to "anon";

grant delete on table "public"."user_interactions" to "authenticated";

grant insert on table "public"."user_interactions" to "authenticated";

grant references on table "public"."user_interactions" to "authenticated";

grant select on table "public"."user_interactions" to "authenticated";

grant trigger on table "public"."user_interactions" to "authenticated";

grant truncate on table "public"."user_interactions" to "authenticated";

grant update on table "public"."user_interactions" to "authenticated";

grant delete on table "public"."user_interactions" to "service_role";

grant insert on table "public"."user_interactions" to "service_role";

grant references on table "public"."user_interactions" to "service_role";

grant select on table "public"."user_interactions" to "service_role";

grant trigger on table "public"."user_interactions" to "service_role";

grant truncate on table "public"."user_interactions" to "service_role";

grant update on table "public"."user_interactions" to "service_role";

create policy "Users can insert their own interactions"
on "public"."user_interactions"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own interactions"
on "public"."user_interactions"
as permissive
for select
to public
using ((auth.uid() = user_id));



