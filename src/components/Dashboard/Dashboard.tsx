import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import SchemaAudit from './SchemaAudit'
import WordPressIntegration from './WordPressIntegration'
import { BarChart3, Globe, Zap, Users, FileText, ArrowRight } from 'lucide-react'
import { schemaAuditService, wordpressService } from '../../lib/database'

interface DashboardStats {
  totalAudits: number
  connectedSites: number
  aiSuggestions: number
  avgScore: number
}

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalAudits: 0,
    connectedSites: 0,
    aiSuggestions: 0,
    avgScore: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      
      // Load audit stats
      const auditStats = await schemaAuditService.getStats()
      
      // Load connected sites count
      const connectedSites = await wordpressService.getConnectedCount()
      
      // Load all audits to count AI suggestions
      const allAudits = await schemaAuditService.getAll()
      const totalSuggestions = allAudits.reduce((sum, audit) => sum + audit.suggestions.length, 0)
      
      setStats({
        totalAudits: auditStats.totalAudits,
        connectedSites,
        aiSuggestions: totalSuggestions,
        avgScore: auditStats.avgScore
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  // Refresh stats when audits or integrations are updated
  const refreshStats = () => {
    loadDashboardStats()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">SEO Audit Dashboard</h1>
        <p className="text-gray-600">Analyze and optimize your website's structured data for better search engine visibility</p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">WordPress Post Schema Audit</h2>
            <p className="text-blue-100 mb-4">Analyze individual WordPress posts for schema optimization opportunities</p>
            <Link
              to="/wordpress-audit"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              Audit WordPress Posts
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="hidden md:block">
            <FileText className="w-16 h-16 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Audits</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.totalAudits}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connected Sites</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.connectedSites}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Suggestions</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.aiSuggestions}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Score</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.avgScore}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <SchemaAudit />
        <WordPressIntegration />
      </div>
    </div>
  )
}