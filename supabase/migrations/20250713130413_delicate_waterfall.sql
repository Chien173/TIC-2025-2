/*
  # Create Post Audits Table

  1. New Tables
    - `post_audits`
      - `id` (uuid, primary key)
      - `website_id` (uuid, foreign key to websites)
      - `wordpress_integration_id` (uuid, foreign key to wordpress_integrations)
      - `post_id` (text, WordPress post ID)
      - `post_title` (text)
      - `post_url` (text)
      - `schemas_found` (jsonb)
      - `issues` (jsonb)
      - `suggestions` (jsonb)
      - `score` (integer)
      - `audit_data` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_by` (uuid, foreign key to auth.users)
      - `deleted_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on `post_audits` table
    - Add policies for authenticated users to access their own data

  3. Indexes
    - Add indexes for performance optimization
*/

-- Create post_audits table
CREATE TABLE IF NOT EXISTS post_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES websites(id),
  wordpress_integration_id uuid REFERENCES wordpress_integrations(id) NOT NULL,
  post_id text NOT NULL,
  post_title text NOT NULL,
  post_url text NOT NULL,
  schemas_found jsonb DEFAULT '[]'::jsonb,
  issues jsonb DEFAULT '[]'::jsonb,
  suggestions jsonb DEFAULT '[]'::jsonb,
  score integer DEFAULT 0,
  audit_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_by uuid REFERENCES auth.users(id),
  UNIQUE(wordpress_integration_id, post_id, created_by)
);

-- Enable Row Level Security
ALTER TABLE post_audits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for post_audits
CREATE POLICY "Users can read own post audits"
  ON post_audits
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own post audits"
  ON post_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own post audits"
  ON post_audits
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_audits_created_by ON post_audits(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_audits_wordpress_integration_id ON post_audits(wordpress_integration_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_audits_post_id ON post_audits(post_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_post_audits_created_at ON post_audits(created_at) WHERE deleted_at IS NULL;

-- Create trigger for updated_at
CREATE TRIGGER update_post_audits_updated_at BEFORE UPDATE ON post_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();