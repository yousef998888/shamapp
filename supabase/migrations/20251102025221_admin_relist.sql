alter table "public"."products" alter column "status" drop default;

alter type "public"."product_status" rename to "product_status__old_version_to_be_dropped";

create type "public"."product_status" as enum ('active', 'inactive', 'sold', 'draft', 'removed');

alter table "public"."products" alter column status type "public"."product_status" using status::text::"public"."product_status";

alter table "public"."products" alter column "status" set default 'active'::product_status;

drop type "public"."product_status__old_version_to_be_dropped";

alter table "public"."orders" add column "relist_reason" text;

alter table "public"."orders" add column "relist_requested" boolean not null default false;

alter table "public"."orders" add column "relist_requested_at" timestamp with time zone;

alter table "public"."orders" add column "relist_resolved_at" timestamp with time zone;

alter table "public"."orders" add column "relist_resolved_by" uuid;

CREATE INDEX idx_orders_relist_requested ON public.orders USING btree (relist_requested) WHERE (relist_requested = true);

alter table "public"."orders" add constraint "orders_relist_resolved_by_fkey" FOREIGN KEY (relist_resolved_by) REFERENCES users(id) not valid;

alter table "public"."orders" validate constraint "orders_relist_resolved_by_fkey";


