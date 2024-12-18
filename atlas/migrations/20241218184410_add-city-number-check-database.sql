-- Modify "users" table
ALTER TABLE "public"."users" ADD CONSTRAINT "city_with_number" CHECK ((city)::text !~ '[0-9]'::text);
