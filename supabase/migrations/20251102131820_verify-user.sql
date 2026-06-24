create type "public"."user_verification_status" as enum ('pending', 'approved', 'rejected');

create table "public"."user_verification_requests" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "document_path" text not null,
    "status" user_verification_status not null default 'pending'::user_verification_status,
    "review_notes" text,
    "reviewed_by" uuid,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."user_verification_requests" enable row level security;

CREATE UNIQUE INDEX user_verification_requests_pending_user_idx ON public.user_verification_requests USING btree (user_id) WHERE (status = 'pending'::user_verification_status);

CREATE UNIQUE INDEX user_verification_requests_pkey ON public.user_verification_requests USING btree (id);

alter table "public"."user_verification_requests" add constraint "user_verification_requests_pkey" PRIMARY KEY using index "user_verification_requests_pkey";

alter table "public"."user_verification_requests" add constraint "user_verification_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL not valid;

alter table "public"."user_verification_requests" validate constraint "user_verification_requests_reviewed_by_fkey";

alter table "public"."user_verification_requests" add constraint "user_verification_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE not valid;

alter table "public"."user_verification_requests" validate constraint "user_verification_requests_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.set_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

grant delete on table "public"."user_verification_requests" to "anon";

grant insert on table "public"."user_verification_requests" to "anon";

grant references on table "public"."user_verification_requests" to "anon";

grant select on table "public"."user_verification_requests" to "anon";

grant trigger on table "public"."user_verification_requests" to "anon";

grant truncate on table "public"."user_verification_requests" to "anon";

grant update on table "public"."user_verification_requests" to "anon";

grant delete on table "public"."user_verification_requests" to "authenticated";

grant insert on table "public"."user_verification_requests" to "authenticated";

grant references on table "public"."user_verification_requests" to "authenticated";

grant select on table "public"."user_verification_requests" to "authenticated";

grant trigger on table "public"."user_verification_requests" to "authenticated";

grant truncate on table "public"."user_verification_requests" to "authenticated";

grant update on table "public"."user_verification_requests" to "authenticated";

grant delete on table "public"."user_verification_requests" to "service_role";

grant insert on table "public"."user_verification_requests" to "service_role";

grant references on table "public"."user_verification_requests" to "service_role";

grant select on table "public"."user_verification_requests" to "service_role";

grant trigger on table "public"."user_verification_requests" to "service_role";

grant truncate on table "public"."user_verification_requests" to "service_role";

grant update on table "public"."user_verification_requests" to "service_role";

create policy "Users can submit a verification request"
on "public"."user_verification_requests"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their pending verification request"
on "public"."user_verification_requests"
as permissive
for update
to public
using (((auth.uid() = user_id) AND (status = 'pending'::user_verification_status)))
with check ((auth.uid() = user_id));


create policy "Users can view their own verification requests"
on "public"."user_verification_requests"
as permissive
for select
to public
using ((auth.uid() = user_id));


-- Policy: Service role can manage all verification requests (for admin panel)
create policy "Service role can manage all verification requests"
on "public"."user_verification_requests"
as permissive
for all
to service_role
using (true)
with check (true);


CREATE TRIGGER set_user_verification_requests_updated_at BEFORE UPDATE ON public.user_verification_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();


