import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, FileText, Search, CheckCircle, AlertTriangle, Zap, Upload, ExternalLink, Clock, RefreshCw } from 'lucide-react'
import { wordpressService, postAuditService, WordPressIntegration as IWordPressIntegration, PostAudit as IPostAudit } from '../../lib/database'

interface WordPressPost {
  id: number
  title: { rendered: string }
  content: { rendered: string }
  link: string
  date: string
  author: number
  status: string
  excerpt: { rendered: string }
}

interface PostAuditResult {
  post: WordPressPost
  schemas: any[]
  issues: string[]
  suggestions: string[]
  score: number
}

export const WordPressPostAudit: React.FC = () => {
  const [integrations, setIntegrations] = useState<IWordPressIntegration[]>([])
  const [selectedIntegration, setSelectedIntegration] = useState<IWordPressIntegration | null>(null)
  const [posts, setPosts] = useState<WordPressPost[]>([])
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null)
  const [auditResult, setAuditResult] = useState<PostAuditResult | null>(null)
  const [auditHistory, setAuditHistory] = useState<IPostAudit[]>([])
  const [loading, setLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)
  const [publishLoading, setPublishLoading] = useState(false)
  const [savingAudit, setSavingAudit] = useState(false)

  useEffect(() => {
    loadIntegrations()
  }, [])

  const loadIntegrations = async () => {
    try {
      const data = await wordpressService.getAll()
      const connectedIntegrations = data.filter(integration => integration.connection_status === 'connected')
      setIntegrations(connectedIntegrations)
      
      if (connectedIntegrations.length === 1) {
        setSelectedIntegration(connectedIntegrations[0])
        loadPosts(connectedIntegrations[0])
      }
    } catch (error) {
      console.error('Error loading integrations:', error)
    }
  }

  const loadPosts = async (integration: IWordPressIntegration) => {
    setPostsLoading(true)
    try {
      const { domain, username, application_password } = integration
      const auth = btoa(`${username}:${application_password}`)
      
      const response = await fetch(`${domain}/wp-json/wp/v2/posts?per_page=20&status=publish`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const postsData = await response.json()
        setPosts(postsData)
        
        // Load audit history for this integration
        await loadAuditHistory(integration.id)
      } else {
        throw new Error('Failed to load posts')
      }
    } catch (error) {
      console.error('Error loading posts:', error)
      alert('Failed to load WordPress posts. Please check your connection.')
    } finally {
      setPostsLoading(false)
    }
  }

  const loadAuditHistory = async (integrationId: string) => {
    try {
      const audits = await postAuditService.getByIntegrationId(integrationId)
      setAuditHistory(audits)
    } catch (error) {
      console.error('Error loading audit history:', error)
    }
  }

  const auditPost = async (post: WordPressPost) => {
    setLoading(true)
    setSelectedPost(post)
    
    try {
      // Simulate schema analysis of the post content
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Parse content for existing schemas
      const content = post.content.rendered
      const hasJsonLd = content.includes('application/ld+json')
      const hasArticleSchema = content.includes('"@type":"Article"') || content.includes('"@type": "Article"')
      const hasBreadcrumbSchema = content.includes('"@type":"BreadcrumbList"')
      const hasAuthorSchema = content.includes('"@type":"Person"')
      
      const schemas = []
      const issues = []
      const suggestions = []
      
      if (hasJsonLd) {
        if (hasArticleSchema) {
          schemas.push({ '@type': 'Article', title: post.title.rendered })
        }
        if (hasAuthorSchema) {
          schemas.push({ '@type': 'Person', name: 'Author' })
        }
        if (hasBreadcrumbSchema) {
          schemas.push({ '@type': 'BreadcrumbList' })
        }
      }
      
      // Generate issues based on missing schemas
      if (!hasArticleSchema) {
        issues.push('Missing Article schema for better content understanding')
      }
      if (!hasAuthorSchema) {
        issues.push('Missing Person schema for author information and E-A-T')
      }
      if (!hasBreadcrumbSchema) {
        issues.push('Missing BreadcrumbList schema for navigation context')
      }
      if (!content.includes('datePublished')) {
        issues.push('Missing datePublished property in Article schema')
      }
      if (!content.includes('dateModified')) {
        issues.push('Missing dateModified property for content freshness')
      }
      
      // Generate AI suggestions
      suggestions.push(
        `Add comprehensive Article schema with headline: "${post.title.rendered}"`,
        'Include Person schema for author with name and social profiles',
        'Add Organization schema for publisher information',
        'Implement BreadcrumbList schema for better navigation understanding',
        'Include WebPage schema with main entity reference',
        'Add FAQ schema if the post contains questions and answers'
      )
      
      const score = Math.max(20, 100 - (issues.length * 15) + (schemas.length * 10))
      
      setAuditResult({
        post,
        schemas,
        issues,
        suggestions,
        score
      })
      
      // Auto-save audit result
      await saveAuditResult(post, schemas, issues, suggestions, score)
    } catch (error) {
      console.error('Error auditing post:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveAuditResult = async (
    post: WordPressPost, 
    schemas: any[], 
    issues: string[], 
    suggestions: string[], 
    score: number
  ) => {
    if (!selectedIntegration) return
    
    setSavingAudit(true)
    try {
      // Check if audit already exists for this post
      const existingAudit = await postAuditService.getByPostId(selectedIntegration.id, post.id.toString())
      
      if (existingAudit) {
        // Update existing audit
        await postAuditService.update(existingAudit.id, {
          schemas_found: schemas,
          issues,
          suggestions,
          score,
          audit_data: {
            analyzed_at: new Date().toISOString(),
            post_content_length: post.content.rendered.length,
            post_excerpt: post.excerpt.rendered
          }
        })
      } else {
        // Create new audit
        await postAuditService.create({
          website_id: selectedIntegration.website_id,
          wordpress_integration_id: selectedIntegration.id,
          post_id: post.id.toString(),
          post_title: post.title.rendered,
          post_url: post.link,
          schemas_found: schemas,
          issues,
          suggestions,
          score,
          audit_data: {
            analyzed_at: new Date().toISOString(),
            post_content_length: post.content.rendered.length,
            post_excerpt: post.excerpt.rendered
          }
        })
      }
      
      // Refresh audit history
      await loadAuditHistory(selectedIntegration.id)
    } catch (error) {
      console.error('Error saving audit result:', error)
    } finally {
      setSavingAudit(false)
    }
  }

  const publishSchema = async () => {
    if (!auditResult || !selectedIntegration) return
    
    setPublishLoading(true)
    try {
      // Generate optimized schema based on audit results
      const optimizedSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": auditResult.post.title.rendered,
        "author": {
          "@type": "Person",
          "name": "Author Name"
        },
        "publisher": {
          "@type": "Organization",
          "name": "Your Organization",
          "logo": {
            "@type": "ImageObject",
            "url": `${selectedIntegration.domain}/wp-content/uploads/logo.png`
          }
        },
        "datePublished": auditResult.post.date,
        "dateModified": auditResult.post.date,
        "url": auditResult.post.link,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": auditResult.post.link
        }
      }
      
      // Call the custom API endpoint with correct website_id
      const websiteId = selectedIntegration.website_id || selectedIntegration.website?.id
      const response = await fetch(`https://wordpress.dev.teko.vn/wp-json/custom-schema-connector/v1/schema/${websiteId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': 'MySecretKey_2025!@#$ForSchema'
        },
        body: JSON.stringify({
          schema: JSON.stringify(optimizedSchema)
        })
      })

      if (response.ok) {
        const result = await response.json()
        alert('Schema successfully published to WordPress!')
        console.log('Publish result:', result)
      } else {
        const errorText = await response.text()
        throw new Error(`Failed to publish schema: ${response.status} - ${errorText}`)
      }
    } catch (error: any) {
      console.error('Publish error:', error)
      alert(`Error publishing schema: ${error.message}`)
    } finally {
      setPublishLoading(false)
    }
  }

  const handleIntegrationChange = (integration: IWordPressIntegration) => {
    setSelectedIntegration(integration)
    setSelectedPost(null)
    setAuditResult(null)
    setPosts([])
    setAuditHistory([])
    loadPosts(integration)
  }

  const getPostAuditStatus = (postId: number) => {
    return auditHistory.find(audit => audit.post_id === postId.toString())
  }

  const refreshPosts = () => {
    if (selectedIntegration) {
      loadPosts(selectedIntegration)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">WordPress Post Schema Audit</h1>
        <p className="text-gray-600">Analyze individual WordPress posts and optimize their schema markup for better SEO</p>
      </div>

      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No WordPress Sites Connected</h3>
          <p className="text-gray-600 mb-4">You need to connect a WordPress site first to audit posts.</p>
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect WordPress Site
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {integrations.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select WordPress Site</h3>
              <div className="grid gap-3">
                {integrations.map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => handleIntegrationChange(integration)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedIntegration?.id === integration.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{integration.domain}</div>
                    <div className="text-sm text-gray-600">User: {integration.username}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedIntegration && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Posts from {selectedIntegration.domain}
                </h3>
                <button
                  onClick={refreshPosts}
                  disabled={postsLoading}
                  className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${postsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              
              {postsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No published posts found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.map((post) => {
                    const auditStatus = getPostAuditStatus(post.id)
                    return (
                      <div
                        key={post.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedPost?.id === post.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {auditStatus && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                auditStatus.score >= 80 ? 'bg-green-100 text-green-800' :
                                auditStatus.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                Score: {auditStatus.score}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: post.title.rendered }} />
                            <div className="text-sm text-gray-600">
                              Published: {new Date(post.date).toLocaleDateString()}
                              {auditStatus && (
                                <> • Last audited: {new Date(auditStatus.created_at).toLocaleDateString()}</>
                              )}
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            <a href={post.link} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 flex items-center">
                              <ExternalLink className="w-3 h-3 mr-1" />
                              View Post
                            </a>
                          </div>
                          <div className="flex items-center space-x-2">
                            {savingAudit && selectedPost?.id === post.id && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>Saving...</span>
                              </div>
                            )}
                            <button
                              onClick={() => auditPost(post)}
                              disabled={loading}
                              className={`px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all ${
                                auditStatus ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                              }`}
                            >
                              <Search className="w-4 h-4" />
                              <span>
                                {loading && selectedPost?.id === post.id ? 'Auditing...' : 
                                 auditStatus ? 'Re-audit' : 'Audit'}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {auditHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Audits</h3>
              <div className="space-y-3">
                {auditHistory.slice(0, 10).map((audit) => (
                  <div key={audit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: audit.post_title }} />
                      <div className="text-sm text-gray-600">
                        Audited: {new Date(audit.created_at).toLocaleDateString()} • 
                        {audit.schemas_found.length} schemas • 
                        {audit.issues.length} issues
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className={`text-lg font-bold ${
                        audit.score >= 80 ? 'text-green-600' : 
                        audit.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {audit.score}
                      </div>
                      <a
                        href={audit.post_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
                      >
                        <ExternalLink className="w-3 h-3 mr-1" />
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {auditResult && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Audit Results</h3>
                  <p className="text-gray-600" dangerouslySetInnerHTML={{ __html: auditResult.post.title.rendered }} />
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className={`text-2xl font-bold ${
                      auditResult.score >= 80 ? 'text-green-600' : 
                      auditResult.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {auditResult.score}
                    </div>
                    <div className="text-sm text-gray-500">/ 100</div>
                  </div>
                  <button
                    onClick={publishSchema}
                    disabled={publishLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{publishLoading ? 'Publishing...' : 'Publish Schema'}</span>
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    Found Schemas ({auditResult.schemas.length})
                  </h4>
                  <div className="space-y-2">
                    {auditResult.schemas.length === 0 ? (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-sm text-gray-600">No structured data found</div>
                      </div>
                    ) : (
                      auditResult.schemas.map((schema, index) => (
                        <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="font-medium text-green-800">{schema['@type']}</div>
                          {schema.title && <div className="text-sm text-green-600">{schema.title}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                    Issues Found ({auditResult.issues.length})
                  </h4>
                  <div className="space-y-2">
                    {auditResult.issues.map((issue, index) => (
                      <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="text-sm text-yellow-800">{issue}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Zap className="w-5 h-5 text-blue-500 mr-2" />
                  AI Suggestions ({auditResult.suggestions.length})
                </h4>
                <div className="space-y-2">
                  {auditResult.suggestions.map((suggestion, index) => (
                    <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm text-blue-800">{suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}