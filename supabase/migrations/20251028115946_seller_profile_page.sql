alter table "public"."orders" alter column "status" drop default;

alter type "public"."delivery_type" rename to "delivery_type__old_version_to_be_dropped";

create type "public"."delivery_type" as enum ('home_delivery', 'pickup_point', 'seller_collection');

alter type "public"."order_status" rename to "order_status__old_version_to_be_dropped";

create type "public"."order_status" as enum ('pending_payment', 'payment_submitted', 'admin_approved', 'shipped', 'delivered', 'completed', 'cancelled', 'awaiting_collection');

alter table "public"."order_deliveries" alter column delivery_type type "public"."delivery_type" using delivery_type::text::"public"."delivery_type";

alter table "public"."order_statuses" alter column status type "public"."order_status" using status::text::"public"."order_status";

alter table "public"."orders" alter column delivery_type type "public"."delivery_type" using delivery_type::text::"public"."delivery_type";

alter table "public"."orders" alter column status type "public"."order_status" using status::text::"public"."order_status";

alter table "public"."orders" alter column "status" set default 'pending_payment'::order_status;

drop type "public"."delivery_type__old_version_to_be_dropped";

drop type "public"."order_status__old_version_to_be_dropped";

alter table "public"."products" add column "ar_tags" text[];

alter table "public"."users" add column "background_image_url" text;

CREATE INDEX idx_products_ar_tags ON public.products USING gin (ar_tags);

set check_function_bodies = off;

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
      p.ar_tags,
      (1 - (p.embedding <=> query_embedding)) as similarity_score
    FROM products p
    WHERE 
      p.status = 'active'
      AND p.embedding IS NOT NULL
      AND (
        p.tags IS NOT NULL OR p.ar_tags IS NOT NULL
      )
      AND (
        (1 - (p.embedding <=> query_embedding)) > 0.2
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.tags, '{}')) as tag
          WHERE tag ILIKE '%' || query_text || '%'
        )
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.ar_tags, '{}')) as ar_tag
          WHERE ar_tag ILIKE '%' || query_text || '%'
        )
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.tags, '{}')) as tag, query_words qw
          WHERE similarity(tag, qw.word) > 0.3
        )
        OR EXISTS (
          SELECT 1 FROM unnest(COALESCE(p.ar_tags, '{}')) as ar_tag, query_words qw
          WHERE similarity(ar_tag, qw.word) > 0.3
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
    unnest(COALESCE(sp.tags, '{}')) WITH ORDINALITY as t1(tag, ord1),
    unnest(COALESCE(sp.tags, '{}')) WITH ORDINALITY as t2(tag, ord2)
    WHERE t1.ord1 < t2.ord2
    GROUP BY t1.tag, t2.tag
    HAVING count(*) >= 1
    
    UNION ALL
    
    -- Also include Arabic tag pairs when query is in Arabic
    SELECT 
      t1.ar_tag as tag1,
      t2.ar_tag as tag2,
      count(*) as pair_count,
      avg(sp.similarity_score) as avg_score,
      -- Calculate relevance score based on query word matches
      (
        CASE 
          WHEN EXISTS (SELECT 1 FROM query_words qw WHERE t1.ar_tag ILIKE '%' || qw.word || '%') THEN 1 ELSE 0 END +
          CASE WHEN EXISTS (SELECT 1 FROM query_words qw WHERE t2.ar_tag ILIKE '%' || qw.word || '%') THEN 1 ELSE 0 END
      ) as tag_match_score
    FROM similar_products sp,
    unnest(COALESCE(sp.ar_tags, '{}')) WITH ORDINALITY as t1(ar_tag, ord1),
    unnest(COALESCE(sp.ar_tags, '{}')) WITH ORDINALITY as t2(ar_tag, ord2)
    WHERE t1.ord1 < t2.ord2
      AND query_text ~ '[\u0600-\u06FF]' -- Only include Arabic tags if query contains Arabic
    GROUP BY t1.ar_tag, t2.ar_tag
    HAVING count(*) >= 1
  ),
  suggestions AS (
    SELECT 
      gen_random_uuid() as suggestion_id,
      -- Use Arabic tags if query contains Arabic characters, otherwise English tags
      CASE 
        WHEN query_text ~ '[\u0600-\u06FF]' THEN 
          initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' '))
        ELSE 
          initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' '))
      END as suggestion_title,
      -- Always provide Arabic version
      CASE 
        WHEN query_text ~ '[\u0600-\u06FF]' THEN 
          initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' '))
        ELSE 
          initcap(replace(tag1, '-', ' ')) || ' ' || initcap(replace(tag2, '-', ' '))
      END as suggestion_ar_title,
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
    updated_at,
    background_image_url
   FROM users;



