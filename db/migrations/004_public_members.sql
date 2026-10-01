-- Public members page data, separate from private profiles.
-- Additive: existing members, votes and files are left as they are.
-- Cards are the original placeholders (gradient and initials, no photo file).
-- A private profile edit must not change this table.

CREATE TABLE IF NOT EXISTS public_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  public_role text,
  bio text,
  city text,
  jurisdiction text,
  photo_key text,
  sort integer NOT NULL
);

REVOKE ALL ON public_members FROM PUBLIC;
ALTER TABLE public_members ENABLE ROW LEVEL SECURITY;

DO $public_members$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nocap_app') THEN
    EXECUTE 'GRANT SELECT ON public_members TO nocap_app';
    EXECUTE 'DROP POLICY IF EXISTS nocap_app_select ON public_members';
    EXECUTE 'CREATE POLICY nocap_app_select ON public_members FOR SELECT TO nocap_app USING (true)';
  END IF;
END
$public_members$;

INSERT INTO public_members (slug, display_name, public_role, bio, city, jurisdiction, photo_key, sort)
VALUES
  (
    'andres-vidal',
    'Andrés Vidal',
    'Junior Partner · Corporate',
    'Growth equity and venture transactions, with a practice split between Madrid and Lisbon.',
    'Madrid',
    'Spain',
    NULL,
    1
  ),
  (
    'camille-baptiste',
    'Camille Baptiste',
    'Managing Associate · Private Equity',
    'Sponsor-side work in the French mid-market, with a standing interest in how technology reaches the deal table.',
    'Paris',
    'France',
    NULL,
    2
  ),
  (
    'elena-rossi',
    'Elena Rossi',
    'Senior Associate · M&A',
    'Private equity and carve-outs in the industrial mid-market. Two years in New York before returning to Milan.',
    'Milan',
    'Italy',
    NULL,
    3
  ),
  (
    'erik-lindqvist',
    'Erik Lindqvist',
    'Associate · M&A',
    'Nordic sell-side processes and cross-border auctions, mostly in technology and healthcare.',
    'Stockholm',
    'Sweden',
    NULL,
    4
  ),
  (
    'lukas-brandt',
    'Lukas Brandt',
    'Counsel · Corporate',
    'Cross-border acquisitions with a focus on foreign investment screening and public M&A.',
    'Frankfurt',
    'Germany',
    NULL,
    5
  ),
  (
    'paolo-piccirilli',
    'Paolo Piccirilli',
    'Chair (example)',
    'Example profile from the members-area mockup. Not a real biography.',
    'Rome',
    'Italy',
    NULL,
    6
  ),
  (
    'sofie-jansen',
    'Sofie Jansen',
    'Senior Associate · Transactions',
    'Buy-side private equity and W&I-backed deals across the Benelux.',
    'Amsterdam',
    'Netherlands',
    NULL,
    7
  )
ON CONFLICT (slug) DO NOTHING;

-- Demo chair returns to the initials placeholder. Seed never stored a photo file.
UPDATE profiles
SET photo_key = NULL, updated_at = now()
WHERE email = 'paolo.piccirilli@example.invalid'
  AND photo_key IS NOT NULL;
