import { supabase } from './supabase'

export interface Website {
  id: string
  url: string
  name?: string
  domain?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by: string
  updated_by?: string
  deleted_by?: string
}

export interface SchemaAudit {
  id: string
  website_id?: string
  url: string
  schemas_found: any[]
  issues: string[]
  suggestions: string[]
  score: number
  audit_data: any
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by: string
  updated_by?: string
  deleted_by?: string
  website?: Website
}

export interface WordPressIntegration {
  id: string
  website_id?: string
  domain: string
  username: string
  application_password: string
  connection_status: 'pending' | 'connected' | 'failed'
  last_verified_at?: string
  user_info: any
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by: string
  updated_by?: string
  deleted_by?: string
  website?: Website
}

export interface SchemaPublication {
  id: string
  audit_id: string
  wordpress_integration_id: string
  schema_content: string
  post_id?: string
  publication_status: 'pending' | 'published' | 'failed'
  published_at?: string
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by: string
  updated_by?: string
  deleted_by?: string
}

export interface PostAudit {
  id: string
  website_id?: string
  wordpress_integration_id: string
  post_id: string
  post_title: string
  post_url: string
  schemas_found: any[]
  issues: string[]
  suggestions: string[]
  score: number
  audit_data: any
  created_at: string
  updated_at: string
  deleted_at?: string
  created_by: string
  updated_by?: string
  deleted_by?: string
  website?: Website
  wordpress_integration?: WordPressIntegration
}

// Website operations
export const websiteService = {
  async create(data: Partial<Website>) {
    const { data: result, error } = await supabase
      .from('websites')
      .insert({
        ...data,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single()

    if (error) throw error
    return result
  },

  async findOrCreate(url: string, name?: string) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    // Try to find existing website
    const { data: existing } = await supabase
      .from('websites')
      .select()
      .eq('url', url)
      .eq('created_by', userId)
      .is('deleted_at', null)
      .single()

    if (existing) return existing

    // Create new website
    const domain = new URL(url).hostname
    return await this.create({
      url,
      name: name || domain,
      domain
    })
  },

  async getAll() {
    const { data, error } = await supabase
      .from('websites')
      .select()
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('websites')
      .select()
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data
  }
}

// Schema audit operations
export const schemaAuditService = {
  async create(data: Partial<SchemaAudit>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('schema_audits')
      .insert({
        ...data,
        created_by: userId
      })
      .select(`
        *,
        website:websites(*)
      `)
      .single()

    if (error) throw error
    return result
  },

  async getAll() {
    const { data, error } = await supabase
      .from('schema_audits')
      .select(`
        *,
        website:websites(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('schema_audits')
      .select(`
        *,
        website:websites(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data
  },

  async getByWebsiteId(websiteId: string) {
    const { data, error } = await supabase
      .from('schema_audits')
      .select(`
        *,
        website:websites(*)
      `)
      .eq('website_id', websiteId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getStats() {
    const { data, error } = await supabase
      .from('schema_audits')
      .select('score')
      .is('deleted_at', null)

    if (error) throw error

    const totalAudits = data.length
    const avgScore = data.length > 0 
      ? Math.round(data.reduce((sum, audit) => sum + audit.score, 0) / data.length)
      : 0

    return { totalAudits, avgScore }
  }
}

// WordPress integration operations
export const wordpressService = {
  async create(data: Partial<WordPressIntegration>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('wordpress_integrations')
      .insert({
        ...data,
        created_by: userId
      })
      .select(`
        *,
        website:websites(*)
      `)
      .single()

    if (error) throw error
    return result
  },

  async update(id: string, data: Partial<WordPressIntegration>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('wordpress_integrations')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', id)
      .select(`
        *,
        website:websites(*)
      `)
      .single()

    if (error) throw error
    return result
  },

  async getAll() {
    const { data, error } = await supabase
      .from('wordpress_integrations')
      .select(`
        *,
        website:websites(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('wordpress_integrations')
      .select(`
        *,
        website:websites(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) throw error
    return data
  },

  async getConnectedCount() {
    const { data, error } = await supabase
      .from('wordpress_integrations')
      .select('id')
      .eq('connection_status', 'connected')
      .is('deleted_at', null)

    if (error) throw error
    return data.length
  }
}

// Schema publication operations
export const publicationService = {
  async create(data: Partial<SchemaPublication>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('schema_publications')
      .insert({
        ...data,
        created_by: userId
      })
      .select()
      .single()

    if (error) throw error
    return result
  },

  async update(id: string, data: Partial<SchemaPublication>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('schema_publications')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return result
  },

  async getAll() {
    const { data, error } = await supabase
      .from('schema_publications')
      .select()
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }
}

// Post audit operations
export const postAuditService = {
  async create(data: Partial<PostAudit>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('post_audits')
      .insert({
        ...data,
        created_by: userId
      })
      .select(`
        *,
        website:websites(*),
        wordpress_integration:wordpress_integrations(*)
      `)
      .single()

    if (error) throw error
    return result
  },

  async update(id: string, data: Partial<PostAudit>) {
    const userId = (await supabase.auth.getUser()).data.user?.id
    
    const { data: result, error } = await supabase
      .from('post_audits')
      .update({
        ...data,
        updated_by: userId
      })
      .eq('id', id)
      .select(`
        *,
        website:websites(*),
        wordpress_integration:wordpress_integrations(*)
      `)
      .single()

    if (error) throw error
    return result
  },

  async getAll() {
    const { data, error } = await supabase
      .from('post_audits')
      .select(`
        *,
        website:websites(*),
        wordpress_integration:wordpress_integrations(*)
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getByIntegrationId(integrationId: string) {
    const { data, error } = await supabase
      .from('post_audits')
      .select(`
        *,
        website:websites(*),
        wordpress_integration:wordpress_integrations(*)
      `)
      .eq('wordpress_integration_id', integrationId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getByPostId(integrationId: string, postId: string) {
    const { data, error } = await supabase
      .from('post_audits')
      .select(`
        *,
        website:websites(*),
        wordpress_integration:wordpress_integrations(*)
      `)
      .eq('wordpress_integration_id', integrationId)
      .eq('post_id', postId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error
    return data[0] || null
  }
}