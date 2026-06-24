create table "public"."user_pickup_addresses" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "pickup_location_id" uuid not null,
    "title" character varying not null,
    "is_default" boolean default false,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_pickup_addresses" enable row level security;

CREATE INDEX idx_user_pickup_addresses_is_active ON public.user_pickup_addresses USING btree (is_active);

CREATE INDEX idx_user_pickup_addresses_is_default ON public.user_pickup_addresses USING btree (is_default);

CREATE INDEX idx_user_pickup_addresses_pickup_location_id ON public.user_pickup_addresses USING btree (pickup_location_id);

CREATE UNIQUE INDEX idx_user_pickup_addresses_user_default ON public.user_pickup_addresses USING btree (user_id) WHERE ((is_default = true) AND (is_active = true));

CREATE INDEX idx_user_pickup_addresses_user_id ON public.user_pickup_addresses USING btree (user_id);

CREATE UNIQUE INDEX user_pickup_addresses_pkey ON public.user_pickup_addresses USING btree (id);

alter table "public"."user_pickup_addresses" add constraint "user_pickup_addresses_pkey" PRIMARY KEY using index "user_pickup_addresses_pkey";

alter table "public"."user_pickup_addresses" add constraint "user_pickup_addresses_pickup_location_id_fkey" FOREIGN KEY (pickup_location_id) REFERENCES pickup_locations(id) ON DELETE CASCADE not valid;

alter table "public"."user_pickup_addresses" validate constraint "user_pickup_addresses_pickup_location_id_fkey";

alter table "public"."user_pickup_addresses" add constraint "user_pickup_addresses_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_pickup_addresses" validate constraint "user_pickup_addresses_user_id_fkey";

grant delete on table "public"."user_pickup_addresses" to "anon";

grant insert on table "public"."user_pickup_addresses" to "anon";

grant references on table "public"."user_pickup_addresses" to "anon";

grant select on table "public"."user_pickup_addresses" to "anon";

grant trigger on table "public"."user_pickup_addresses" to "anon";

grant truncate on table "public"."user_pickup_addresses" to "anon";

grant update on table "public"."user_pickup_addresses" to "anon";

grant delete on table "public"."user_pickup_addresses" to "authenticated";

grant insert on table "public"."user_pickup_addresses" to "authenticated";

grant references on table "public"."user_pickup_addresses" to "authenticated";

grant select on table "public"."user_pickup_addresses" to "authenticated";

grant trigger on table "public"."user_pickup_addresses" to "authenticated";

grant truncate on table "public"."user_pickup_addresses" to "authenticated";

grant update on table "public"."user_pickup_addresses" to "authenticated";

grant delete on table "public"."user_pickup_addresses" to "service_role";

grant insert on table "public"."user_pickup_addresses" to "service_role";

grant references on table "public"."user_pickup_addresses" to "service_role";

grant select on table "public"."user_pickup_addresses" to "service_role";

grant trigger on table "public"."user_pickup_addresses" to "service_role";

grant truncate on table "public"."user_pickup_addresses" to "service_role";

grant update on table "public"."user_pickup_addresses" to "service_role";

create policy "Users can delete their own pickup addresses"
on "public"."user_pickup_addresses"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own pickup addresses"
on "public"."user_pickup_addresses"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own pickup addresses"
on "public"."user_pickup_addresses"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own pickup addresses"
on "public"."user_pickup_addresses"
as permissive
for select
to public
using ((auth.uid() = user_id));



