create table "public"."wishlist_items" (
    "id" uuid not null default gen_random_uuid(),
    "wishlist_id" uuid not null,
    "product_id" uuid not null,
    "added_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."wishlist_items" enable row level security;

create table "public"."wishlists" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "name_ar" text,
    "description" text,
    "is_public" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."wishlists" enable row level security;

CREATE INDEX idx_wishlist_items_added_at ON public.wishlist_items USING btree (added_at DESC);

CREATE INDEX idx_wishlist_items_product_id ON public.wishlist_items USING btree (product_id);

CREATE INDEX idx_wishlist_items_wishlist_id ON public.wishlist_items USING btree (wishlist_id);

CREATE INDEX idx_wishlists_created_at ON public.wishlists USING btree (created_at DESC);

CREATE INDEX idx_wishlists_is_public ON public.wishlists USING btree (is_public) WHERE (is_public = true);

CREATE INDEX idx_wishlists_user_id ON public.wishlists USING btree (user_id);

CREATE UNIQUE INDEX wishlist_items_pkey ON public.wishlist_items USING btree (id);

CREATE UNIQUE INDEX wishlist_items_unique ON public.wishlist_items USING btree (wishlist_id, product_id);

CREATE UNIQUE INDEX wishlists_pkey ON public.wishlists USING btree (id);

alter table "public"."wishlist_items" add constraint "wishlist_items_pkey" PRIMARY KEY using index "wishlist_items_pkey";

alter table "public"."wishlists" add constraint "wishlists_pkey" PRIMARY KEY using index "wishlists_pkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_product_id_fkey";

alter table "public"."wishlist_items" add constraint "wishlist_items_unique" UNIQUE using index "wishlist_items_unique";

alter table "public"."wishlist_items" add constraint "wishlist_items_wishlist_id_fkey" FOREIGN KEY (wishlist_id) REFERENCES wishlists(id) ON DELETE CASCADE not valid;

alter table "public"."wishlist_items" validate constraint "wishlist_items_wishlist_id_fkey";

alter table "public"."wishlists" add constraint "wishlists_name_ar_length" CHECK (((name_ar IS NULL) OR ((char_length(name_ar) >= 1) AND (char_length(name_ar) <= 100)))) not valid;

alter table "public"."wishlists" validate constraint "wishlists_name_ar_length";

alter table "public"."wishlists" add constraint "wishlists_name_length" CHECK (((char_length(name) >= 1) AND (char_length(name) <= 100))) not valid;

alter table "public"."wishlists" validate constraint "wishlists_name_length";

alter table "public"."wishlists" add constraint "wishlists_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."wishlists" validate constraint "wishlists_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_wishlist_item_count(wishlist_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER
        FROM public.wishlist_items
        WHERE wishlist_id = wishlist_id_param
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_product_in_wishlist(wishlist_id_param uuid, product_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.wishlist_items
        WHERE wishlist_id = wishlist_id_param
        AND product_id = product_id_param
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.user_owns_wishlist(wishlist_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.wishlists
        WHERE id = wishlist_id_param
        AND user_id = auth.uid()
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."wishlist_items" to "anon";

grant insert on table "public"."wishlist_items" to "anon";

grant references on table "public"."wishlist_items" to "anon";

grant select on table "public"."wishlist_items" to "anon";

grant trigger on table "public"."wishlist_items" to "anon";

grant truncate on table "public"."wishlist_items" to "anon";

grant update on table "public"."wishlist_items" to "anon";

grant delete on table "public"."wishlist_items" to "authenticated";

grant insert on table "public"."wishlist_items" to "authenticated";

grant references on table "public"."wishlist_items" to "authenticated";

grant select on table "public"."wishlist_items" to "authenticated";

grant trigger on table "public"."wishlist_items" to "authenticated";

grant truncate on table "public"."wishlist_items" to "authenticated";

grant update on table "public"."wishlist_items" to "authenticated";

grant delete on table "public"."wishlist_items" to "service_role";

grant insert on table "public"."wishlist_items" to "service_role";

grant references on table "public"."wishlist_items" to "service_role";

grant select on table "public"."wishlist_items" to "service_role";

grant trigger on table "public"."wishlist_items" to "service_role";

grant truncate on table "public"."wishlist_items" to "service_role";

grant update on table "public"."wishlist_items" to "service_role";

grant delete on table "public"."wishlists" to "anon";

grant insert on table "public"."wishlists" to "anon";

grant references on table "public"."wishlists" to "anon";

grant select on table "public"."wishlists" to "anon";

grant trigger on table "public"."wishlists" to "anon";

grant truncate on table "public"."wishlists" to "anon";

grant update on table "public"."wishlists" to "anon";

grant delete on table "public"."wishlists" to "authenticated";

grant insert on table "public"."wishlists" to "authenticated";

grant references on table "public"."wishlists" to "authenticated";

grant select on table "public"."wishlists" to "authenticated";

grant trigger on table "public"."wishlists" to "authenticated";

grant truncate on table "public"."wishlists" to "authenticated";

grant update on table "public"."wishlists" to "authenticated";

grant delete on table "public"."wishlists" to "service_role";

grant insert on table "public"."wishlists" to "service_role";

grant references on table "public"."wishlists" to "service_role";

grant select on table "public"."wishlists" to "service_role";

grant trigger on table "public"."wishlists" to "service_role";

grant truncate on table "public"."wishlists" to "service_role";

grant update on table "public"."wishlists" to "service_role";

create policy "Users can add items to their own wishlists"
on "public"."wishlist_items"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM wishlists
  WHERE ((wishlists.id = wishlist_items.wishlist_id) AND (wishlists.user_id = auth.uid())))));


create policy "Users can remove items from their own wishlists"
on "public"."wishlist_items"
as permissive
for delete
to public
using ((EXISTS ( SELECT 1
   FROM wishlists
  WHERE ((wishlists.id = wishlist_items.wishlist_id) AND (wishlists.user_id = auth.uid())))));


create policy "Users can view items in public wishlists"
on "public"."wishlist_items"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM wishlists
  WHERE ((wishlists.id = wishlist_items.wishlist_id) AND (wishlists.is_public = true)))));


create policy "Users can view items in their own wishlists"
on "public"."wishlist_items"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM wishlists
  WHERE ((wishlists.id = wishlist_items.wishlist_id) AND (wishlists.user_id = auth.uid())))));


create policy "Users can create their own wishlists"
on "public"."wishlists"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can delete their own wishlists"
on "public"."wishlists"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can update their own wishlists"
on "public"."wishlists"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "Users can view public wishlists"
on "public"."wishlists"
as permissive
for select
to public
using ((is_public = true));


create policy "Users can view their own wishlists"
on "public"."wishlists"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_wishlists_updated_at BEFORE UPDATE ON public.wishlists FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


