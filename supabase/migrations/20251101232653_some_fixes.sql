alter table "public"."products" alter column "status" drop default;

alter type "public"."product_status" rename to "product_status__old_version_to_be_dropped";

create type "public"."product_status" as enum ('active', 'inactive', 'sold', 'draft');

create table "public"."user_push_tokens" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "token" text not null,
    "platform" text not null,
    "device_id" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_push_tokens" enable row level security;

alter table "public"."products" alter column status type "public"."product_status" using status::text::"public"."product_status";

alter table "public"."products" alter column "status" set default 'active'::product_status;

drop type "public"."product_status__old_version_to_be_dropped";

alter table "public"."order_payments" add column "receipt_url" text;

CREATE INDEX idx_user_push_tokens_active ON public.user_push_tokens USING btree (user_id, is_active) WHERE (is_active = true);

CREATE INDEX idx_user_push_tokens_user_id ON public.user_push_tokens USING btree (user_id);

CREATE UNIQUE INDEX user_push_tokens_pkey ON public.user_push_tokens USING btree (id);

CREATE UNIQUE INDEX user_push_tokens_user_id_token_key ON public.user_push_tokens USING btree (user_id, token);

alter table "public"."user_push_tokens" add constraint "user_push_tokens_pkey" PRIMARY KEY using index "user_push_tokens_pkey";

alter table "public"."user_push_tokens" add constraint "user_push_tokens_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_push_tokens" validate constraint "user_push_tokens_user_id_fkey";

alter table "public"."user_push_tokens" add constraint "user_push_tokens_user_id_token_key" UNIQUE using index "user_push_tokens_user_id_token_key";

grant delete on table "public"."user_push_tokens" to "anon";

grant insert on table "public"."user_push_tokens" to "anon";

grant references on table "public"."user_push_tokens" to "anon";

grant select on table "public"."user_push_tokens" to "anon";

grant trigger on table "public"."user_push_tokens" to "anon";

grant truncate on table "public"."user_push_tokens" to "anon";

grant update on table "public"."user_push_tokens" to "anon";

grant delete on table "public"."user_push_tokens" to "authenticated";

grant insert on table "public"."user_push_tokens" to "authenticated";

grant references on table "public"."user_push_tokens" to "authenticated";

grant select on table "public"."user_push_tokens" to "authenticated";

grant trigger on table "public"."user_push_tokens" to "authenticated";

grant truncate on table "public"."user_push_tokens" to "authenticated";

grant update on table "public"."user_push_tokens" to "authenticated";

grant delete on table "public"."user_push_tokens" to "service_role";

grant insert on table "public"."user_push_tokens" to "service_role";

grant references on table "public"."user_push_tokens" to "service_role";

grant select on table "public"."user_push_tokens" to "service_role";

grant trigger on table "public"."user_push_tokens" to "service_role";

grant truncate on table "public"."user_push_tokens" to "service_role";

grant update on table "public"."user_push_tokens" to "service_role";

create policy "Service role can read all tokens"
on "public"."user_push_tokens"
as permissive
for select
to public
using ((auth.role() = 'service_role'::text));


create policy "Users can delete their own tokens"
on "public"."user_push_tokens"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own tokens"
on "public"."user_push_tokens"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own tokens"
on "public"."user_push_tokens"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own tokens"
on "public"."user_push_tokens"
as permissive
for select
to public
using ((auth.uid() = user_id));



