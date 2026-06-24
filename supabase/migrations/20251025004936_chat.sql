alter table "public"."orders" add column "is_conversation_only" boolean not null default false;

CREATE INDEX idx_orders_is_conversation_only ON public.orders USING btree (is_conversation_only);


