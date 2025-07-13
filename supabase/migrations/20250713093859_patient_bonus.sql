/*
  # Create Audit System Database Schema

  1. New Tables
    - `websites`
      - `id` (uuid, primary key)
      - `url` (text, unique)
      - `name` (text)
      - `domain` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_by` (uuid, foreign key to auth.users)
      - `deleted_by` (uuid, foreign key to auth.users)

    - `schema_audits`
      - `id` (uuid, primary key)
      - `website_id` (uuid, foreign key to websites)
      - `url` (text)
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

    - `wordpress_integrations`
      - `id` (uuid, primary key)
      - `website_id` (uuid, foreign key to websites)
      - `domain` (text)
      - `username` (text)
      - `application_password` (text, encrypted)
      - `connection_status` (text)
      - `last_verified_at` (timestamp)
      - `user_info` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_by` (uuid, foreign key to auth.users)
      - `deleted_by` (uuid, foreign key to auth.users)

    - `schema_publications`
      - `id` (uuid, primary key)
      - `audit_id` (uuid, foreign key to schema_audits)
      - `wordpress_integration_id` (uuid, foreign key to wordpress_integrations)
      - `schema_content` (text)
      - `post_id` (text)
      - `publication_status` (text)
      - `published_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `deleted_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
      - `updated_by` (uuid, foreign key to auth.users)
      - `deleted_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to access their own data
    - Add policies for soft delete functionality

  3. Indexes
    - Add indexes for performance optimization
    - Add indexes on foreign keys and commonly queried fields
*/

-- Create websites table
CREATE TABLE IF NOT EXISTS websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  name text,
  domain text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_by uuid REFERENCES auth.users(id),
  UNIQUE(url, created_by)
);

-- Create schema_audits table
CREATE TABLE IF NOT EXISTS schema_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES websites(id),
  url text NOT NULL,
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
  deleted_by uuid REFERENCES auth.users(id)
);

-- Create wordpress_integrations table
CREATE TABLE IF NOT EXISTS wordpress_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id uuid REFERENCES websites(id),
  domain text NOT NULL,
  username text NOT NULL,
  application_password text NOT NULL,
  connection_status text DEFAULT 'pending',
  last_verified_at timestamptz,
  user_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_by uuid REFERENCES auth.users(id),
  UNIQUE(domain, username, created_by)
);

-- Create schema_publications table
CREATE TABLE IF NOT EXISTS schema_publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid REFERENCES schema_audits(id),
  wordpress_integration_id uuid REFERENCES wordpress_integrations(id),
  schema_content text NOT NULL,
  post_id text,
  publication_status text DEFAULT 'pending',
  published_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  deleted_by uuid REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE wordpress_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_publications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for websites
CREATE POLICY "Users can read own websites"
  ON websites
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own websites"
  ON websites
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own websites"
  ON websites
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Create RLS policies for schema_audits
CREATE POLICY "Users can read own schema audits"
  ON schema_audits
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own schema audits"
  ON schema_audits
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own schema audits"
  ON schema_audits
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Create RLS policies for wordpress_integrations
CREATE POLICY "Users can read own wordpress integrations"
  ON wordpress_integrations
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own wordpress integrations"
  ON wordpress_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own wordpress integrations"
  ON wordpress_integrations
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Create RLS policies for schema_publications
CREATE POLICY "Users can read own schema publications"
  ON schema_publications
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert own schema publications"
  ON schema_publications
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own schema publications"
  ON schema_publications
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (created_by = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_websites_created_by ON websites(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_websites_url ON websites(url) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schema_audits_created_by ON schema_audits(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schema_audits_website_id ON schema_audits(website_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schema_audits_created_at ON schema_audits(created_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wordpress_integrations_created_by ON wordpress_integrations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_wordpress_integrations_website_id ON wordpress_integrations(website_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schema_publications_created_by ON schema_publications(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_schema_publications_audit_id ON schema_publications(audit_id) WHERE deleted_at IS NULL;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schema_audits_updated_at BEFORE UPDATE ON schema_audits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wordpress_integrations_updated_at BEFORE UPDATE ON wordpress_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schema_publications_updated_at BEFORE UPDATE ON schema_publications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();