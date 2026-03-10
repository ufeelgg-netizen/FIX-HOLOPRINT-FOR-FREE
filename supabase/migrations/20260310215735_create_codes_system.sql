/*
  # FIX HOLOPRINT Codes System
  
  1. New Tables
    - `codes`
      - `id` (uuid, primary key)
      - `code` (text, unique) - Format: XXXX-XXXX-XXXX
      - `type` (text) - 'unlimited' or 'limited'
      - `max_uses` (integer, nullable) - NULL for unlimited, number for limited
      - `current_uses` (integer) - Tracks how many times code has been used
      - `device_id` (text, nullable) - Stores the device fingerprint when first used
      - `is_active` (boolean) - Whether the code can be used
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
  2. Security
    - Enable RLS on `codes` table
    - Add policies for public read access (for validation)
    - Add policies for admin-only write access
*/

CREATE TABLE IF NOT EXISTS codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  type text NOT NULL CHECK (type IN ('unlimited', 'limited')),
  max_uses integer,
  current_uses integer DEFAULT 0 NOT NULL,
  device_id text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read codes for validation"
  ON codes FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role can insert codes"
  ON codes FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update codes"
  ON codes FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can delete codes"
  ON codes FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_codes_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_codes_device_id ON codes(device_id);
CREATE INDEX IF NOT EXISTS idx_codes_is_active ON codes(is_active);