-- Make phone_number optional on instances.
-- When an instance is created from the admin panel, the phone number is not
-- yet known (it is bound to the instance after QR code scan). The
-- wpp_session_id is used as the primary session identifier instead.

ALTER TABLE public.instances
  ALTER COLUMN phone_number DROP NOT NULL,
  ALTER COLUMN phone_number SET DEFAULT '';

-- Replace the strict UNIQUE constraint with a partial index that only
-- enforces uniqueness when phone_number is actually set.
ALTER TABLE public.instances
  DROP CONSTRAINT IF EXISTS instances_tenant_id_phone_number_key;

CREATE UNIQUE INDEX instances_tenant_phone_unique
  ON public.instances (tenant_id, phone_number)
  WHERE phone_number <> '';
