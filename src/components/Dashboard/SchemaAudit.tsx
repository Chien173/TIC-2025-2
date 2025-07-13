import React, { useState, useEffect } from 'react'
import { Search, ExternalLink, CheckCircle, AlertTriangle, XCircle, Zap, Save } from 'lucide-react'
import { schemaAuditService, websiteService, ISchemaAudit } from '../../lib/database'

interface SchemaResult {
  url: string
  schemas: any[]
  issues: string[]
  suggestions: string[]
  score: number
}

const SchemaAudit: React.FC = () => {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SchemaResult | null>(null)
  const [recentAudits, setRecentAudits] = useState<ISchemaAudit[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadRecentAudits()
  }, [])

  const loadRecentAudits = async () => {
    try {
      const audits = await schemaAuditService.getAll()
      setRecentAudits(audits.slice(0, 5)) // Show last 5 audits
    } catch (error) {
      console.error('Error loading recent audits:', error)
    }
  }

  const analyzeSchema = async () => {
    if (!url) return
    
    setLoading(true)
    try {
      // Simulate API call for demo - in production, this would call a real schema analysis service
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock result based on URL analysis
      const mockResult: SchemaResult = {
        url,
        schemas: [
          { '@type': 'Organization', name: 'Example Company', url: url },
          { '@type': 'WebSite', name: 'Example Website', url: url }
        ],
        issues: [
          'Missing breadcrumb schema for better navigation understanding',
          'Product schema lacks aggregateRating property',
          'Article schema missing dateModified for content freshness'
        ],
        suggestions: [
          'Add LocalBusiness schema for improved local SEO visibility',
          'Implement FAQ schema to enhance search result snippets',
          'Add Review schema to build trust and credibility',
          'Include Person schema for author information and E-A-T'
        ],
        score: Math.floor(Math.random() * 40) + 60 // Random score between 60-100
      }
      
      setResult(mockResult)
    } catch (error) {
      console.error('Error analyzing schema:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateAISuggestions = async () => {
    if (!result) return
    
    setLoading(true)
    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiSuggestions = [
        `Based on ${result.url}, add Product schema with price and availability information`,
        'Implement Organization schema with complete social media profiles',
        'Add Person schema for author information to improve E-A-T signals',
        'Include WebPage schema with breadcrumb navigation for better page understanding',
        'Add Review and Rating schemas to enhance trust signals',
        'Implement Event schema if your site promotes events or webinars'
      ]
      
      setResult(prev => prev ? { ...prev, suggestions: aiSuggestions } : null)
    } catch (error) {
      console.error('Error generating AI suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveAuditResult = async () => {
    if (!result) return
    
    setSaving(true)
    try {
      // Find or create website
      const website = await websiteService.findOrCreate(result.url)
      
      // Save audit result
      await schemaAuditService.create({
        website_id: website.id,
        url: result.url,
        schemas_found: result.schemas,
        issues: result.issues,
        suggestions: result.suggestions,
        score: result.score,
        audit_data: {
          analyzed_at: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      })
      
      // Reload recent audits
      await loadRecentAudits()
      
      alert('Audit result saved successfully!')
    } catch (error) {
      console.error('Error saving audit result:', error)
      alert('Failed to save audit result. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">JSON-LD Schema Audit</h2>
          <p className="text-gray-600">Analyze and optimize structured data for better SEO performance</p>
        </div>

        <div className="mb-6">
          <div className="flex space-x-3">
            <div className="flex-1">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL to audit (e.g., https://example.com)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={analyzeSchema}
              disabled={loading || !url}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-all"
            >
              <Search className="w-4 h-4" />
              <span>{loading ? 'Analyzing...' : 'Audit'}</span>
            </button>
          </div>
        </div>

        {result && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Audit Results</h3>
                <p className="text-sm text-gray-600">{result.url}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={`text-2xl font-bold ${
                    result.score >= 80 ? 'text-green-600' : 
                    result.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {result.score}
                  </div>
                  <div className="text-sm text-gray-500">/ 100</div>
                </div>
                <button
                  onClick={saveAuditResult}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save'}</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Found Schemas ({result.schemas.length})
                </h4>
                <div className="space-y-2">
                  {result.schemas.map((schema, index) => (
                    <div key={index} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="font-medium text-green-800">{schema['@type']}</div>
                      {schema.name && <div className="text-sm text-green-600">{schema.name}</div>}
                      {schema.url && <div className="text-xs text-green-500 truncate">{schema.url}</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 mr-2" />
                  Issues Found ({result.issues.length})
                </h4>
                <div className="space-y-2">
                  {result.issues.map((issue, index) => (
                    <div key={index} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm text-yellow-800">{issue}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Zap className="w-5 h-5 text-blue-500 mr-2" />
                  AI Suggestions ({result.suggestions.length})
                </h4>
                <button
                  onClick={generateAISuggestions}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Generating...' : 'Refresh AI Suggestions'}
                </button>
              </div>
              <div className="space-y-2">
                {result.suggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-sm text-blue-800">{suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {recentAudits.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Audits</h3>
          <div className="space-y-3">
            {recentAudits.map((audit) => (
              <div key={audit.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{audit.url}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(audit.created_at).toLocaleDateString()} • 
                    {audit.schemas_found.length} schemas found • 
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
                  <button
                    onClick={() => {
                      setUrl(audit.url)
                      setResult({
                        url: audit.url,
                        schemas: audit.schemas_found,
                        issues: audit.issues,
                        suggestions: audit.suggestions,
                        score: audit.score
                      })
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default SchemaAudit