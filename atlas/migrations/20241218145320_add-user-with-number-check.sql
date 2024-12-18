-- Modify "users" table
ALTER TABLE "public"."users" ADD CONSTRAINT "username_with_number" CHECK ((username)::text !~ '[0-9]'::text);
