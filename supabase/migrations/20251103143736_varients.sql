create type "public"."option_source" as enum ('custom', 'category_attribute');

create table "public"."product_option_groups" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "name" text not null,
    "source" option_source not null default 'custom'::option_source,
    "category_attribute_id" uuid,
    "display_order" smallint not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."product_option_values" (
    "id" uuid not null default gen_random_uuid(),
    "option_group_id" uuid not null,
    "name" text not null,
    "attribute_term_id" uuid,
    "is_custom" boolean not null default true,
    "display_order" smallint not null default 0,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


create table "public"."product_variant_values" (
    "variant_id" uuid not null,
    "option_value_id" uuid not null
);


create table "public"."product_variants" (
    "id" uuid not null default gen_random_uuid(),
    "product_id" uuid not null,
    "sku" text,
    "is_active" boolean not null default true,
    "quantity_available" integer not null default 0,
    "quantity_reserved" integer not null default 0,
    "price_override" numeric(10,2),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."orders" add column "product_variant_id" uuid;

alter table "public"."products" add column "has_variants" boolean not null default false;

alter table "public"."products" add column "quantity_available" integer;

CREATE UNIQUE INDEX product_option_groups_pkey ON public.product_option_groups USING btree (id);

CREATE INDEX product_option_groups_product_id_idx ON public.product_option_groups USING btree (product_id, display_order);

CREATE INDEX product_option_values_group_idx ON public.product_option_values USING btree (option_group_id, display_order);

CREATE UNIQUE INDEX product_option_values_pkey ON public.product_option_values USING btree (id);

CREATE UNIQUE INDEX product_variant_values_pkey ON public.product_variant_values USING btree (variant_id, option_value_id);

CREATE UNIQUE INDEX product_variants_pkey ON public.product_variants USING btree (id);

CREATE INDEX product_variants_product_id_idx ON public.product_variants USING btree (product_id);

CREATE UNIQUE INDEX product_variants_product_id_sku_key ON public.product_variants USING btree (product_id, sku);

alter table "public"."product_option_groups" add constraint "product_option_groups_pkey" PRIMARY KEY using index "product_option_groups_pkey";

alter table "public"."product_option_values" add constraint "product_option_values_pkey" PRIMARY KEY using index "product_option_values_pkey";

alter table "public"."product_variant_values" add constraint "product_variant_values_pkey" PRIMARY KEY using index "product_variant_values_pkey";

alter table "public"."product_variants" add constraint "product_variants_pkey" PRIMARY KEY using index "product_variants_pkey";

alter table "public"."orders" add constraint "orders_product_variant_id_fkey" FOREIGN KEY (product_variant_id) REFERENCES product_variants(id) not valid;

alter table "public"."orders" validate constraint "orders_product_variant_id_fkey";

alter table "public"."product_option_groups" add constraint "product_option_groups_category_attribute_id_fkey" FOREIGN KEY (category_attribute_id) REFERENCES product_attributes(id) not valid;

alter table "public"."product_option_groups" validate constraint "product_option_groups_category_attribute_id_fkey";

alter table "public"."product_option_groups" add constraint "product_option_groups_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_option_groups" validate constraint "product_option_groups_product_id_fkey";

alter table "public"."product_option_values" add constraint "product_option_values_attribute_term_id_fkey" FOREIGN KEY (attribute_term_id) REFERENCES product_attribute_terms(id) not valid;

alter table "public"."product_option_values" validate constraint "product_option_values_attribute_term_id_fkey";

alter table "public"."product_option_values" add constraint "product_option_values_option_group_id_fkey" FOREIGN KEY (option_group_id) REFERENCES product_option_groups(id) ON DELETE CASCADE not valid;

alter table "public"."product_option_values" validate constraint "product_option_values_option_group_id_fkey";

alter table "public"."product_variant_values" add constraint "product_variant_values_option_value_id_fkey" FOREIGN KEY (option_value_id) REFERENCES product_option_values(id) ON DELETE CASCADE not valid;

alter table "public"."product_variant_values" validate constraint "product_variant_values_option_value_id_fkey";

alter table "public"."product_variant_values" add constraint "product_variant_values_variant_id_fkey" FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE not valid;

alter table "public"."product_variant_values" validate constraint "product_variant_values_variant_id_fkey";

alter table "public"."product_variants" add constraint "product_variants_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE not valid;

alter table "public"."product_variants" validate constraint "product_variants_product_id_fkey";

alter table "public"."product_variants" add constraint "product_variants_product_id_sku_key" UNIQUE using index "product_variants_product_id_sku_key";

alter table "public"."products" add constraint "products_quantity_available_check" CHECK (((quantity_available IS NULL) OR (quantity_available >= 0))) not valid;

alter table "public"."products" validate constraint "products_quantity_available_check";

grant delete on table "public"."product_option_groups" to "anon";

grant insert on table "public"."product_option_groups" to "anon";

grant references on table "public"."product_option_groups" to "anon";

grant select on table "public"."product_option_groups" to "anon";

grant trigger on table "public"."product_option_groups" to "anon";

grant truncate on table "public"."product_option_groups" to "anon";

grant update on table "public"."product_option_groups" to "anon";

grant delete on table "public"."product_option_groups" to "authenticated";

grant insert on table "public"."product_option_groups" to "authenticated";

grant references on table "public"."product_option_groups" to "authenticated";

grant select on table "public"."product_option_groups" to "authenticated";

grant trigger on table "public"."product_option_groups" to "authenticated";

grant truncate on table "public"."product_option_groups" to "authenticated";

grant update on table "public"."product_option_groups" to "authenticated";

grant delete on table "public"."product_option_groups" to "service_role";

grant insert on table "public"."product_option_groups" to "service_role";

grant references on table "public"."product_option_groups" to "service_role";

grant select on table "public"."product_option_groups" to "service_role";

grant trigger on table "public"."product_option_groups" to "service_role";

grant truncate on table "public"."product_option_groups" to "service_role";

grant update on table "public"."product_option_groups" to "service_role";

grant delete on table "public"."product_option_values" to "anon";

grant insert on table "public"."product_option_values" to "anon";

grant references on table "public"."product_option_values" to "anon";

grant select on table "public"."product_option_values" to "anon";

grant trigger on table "public"."product_option_values" to "anon";

grant truncate on table "public"."product_option_values" to "anon";

grant update on table "public"."product_option_values" to "anon";

grant delete on table "public"."product_option_values" to "authenticated";

grant insert on table "public"."product_option_values" to "authenticated";

grant references on table "public"."product_option_values" to "authenticated";

grant select on table "public"."product_option_values" to "authenticated";

grant trigger on table "public"."product_option_values" to "authenticated";

grant truncate on table "public"."product_option_values" to "authenticated";

grant update on table "public"."product_option_values" to "authenticated";

grant delete on table "public"."product_option_values" to "service_role";

grant insert on table "public"."product_option_values" to "service_role";

grant references on table "public"."product_option_values" to "service_role";

grant select on table "public"."product_option_values" to "service_role";

grant trigger on table "public"."product_option_values" to "service_role";

grant truncate on table "public"."product_option_values" to "service_role";

grant update on table "public"."product_option_values" to "service_role";

grant delete on table "public"."product_variant_values" to "anon";

grant insert on table "public"."product_variant_values" to "anon";

grant references on table "public"."product_variant_values" to "anon";

grant select on table "public"."product_variant_values" to "anon";

grant trigger on table "public"."product_variant_values" to "anon";

grant truncate on table "public"."product_variant_values" to "anon";

grant update on table "public"."product_variant_values" to "anon";

grant delete on table "public"."product_variant_values" to "authenticated";

grant insert on table "public"."product_variant_values" to "authenticated";

grant references on table "public"."product_variant_values" to "authenticated";

grant select on table "public"."product_variant_values" to "authenticated";

grant trigger on table "public"."product_variant_values" to "authenticated";

grant truncate on table "public"."product_variant_values" to "authenticated";

grant update on table "public"."product_variant_values" to "authenticated";

grant delete on table "public"."product_variant_values" to "service_role";

grant insert on table "public"."product_variant_values" to "service_role";

grant references on table "public"."product_variant_values" to "service_role";

grant select on table "public"."product_variant_values" to "service_role";

grant trigger on table "public"."product_variant_values" to "service_role";

grant truncate on table "public"."product_variant_values" to "service_role";

grant update on table "public"."product_variant_values" to "service_role";

grant delete on table "public"."product_variants" to "anon";

grant insert on table "public"."product_variants" to "anon";

grant references on table "public"."product_variants" to "anon";

grant select on table "public"."product_variants" to "anon";

grant trigger on table "public"."product_variants" to "anon";

grant truncate on table "public"."product_variants" to "anon";

grant update on table "public"."product_variants" to "anon";

grant delete on table "public"."product_variants" to "authenticated";

grant insert on table "public"."product_variants" to "authenticated";

grant references on table "public"."product_variants" to "authenticated";

grant select on table "public"."product_variants" to "authenticated";

grant trigger on table "public"."product_variants" to "authenticated";

grant truncate on table "public"."product_variants" to "authenticated";

grant update on table "public"."product_variants" to "authenticated";

grant delete on table "public"."product_variants" to "service_role";

grant insert on table "public"."product_variants" to "service_role";

grant references on table "public"."product_variants" to "service_role";

grant select on table "public"."product_variants" to "service_role";

grant trigger on table "public"."product_variants" to "service_role";

grant truncate on table "public"."product_variants" to "service_role";

grant update on table "public"."product_variants" to "service_role";


