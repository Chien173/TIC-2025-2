import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import SchemaAudit from "./SchemaAudit";
import WordPressIntegration from "./WordPressIntegration";
import ContentAudit from "./ContentAudit";
import {
  BarChart3,
  Globe,
  Upload,
  FileText,
  ArrowRight,
} from "lucide-react";
import { schemaAuditService, wordpressService } from "../../lib/database";

interface DashboardStats {
  totalAudits: number;
  totalPublished: number;
  connectedSites: number;
}

export const Dashboard: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'schema' | 'content'>('schema');
  const [stats, setStats] = useState<DashboardStats>({
    totalAudits: 0,
    totalPublished: 0,
    connectedSites: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Load audit stats
      const auditStats = await schemaAuditService.getStats();

      // Load connected sites count
      const connectedSites = await wordpressService.getConnectedCount();

      // Load published count
      const totalPublished = await wordpressService.getPublishedCount();

      setStats({
        totalAudits: auditStats.totalAudits,
        totalPublished,
        connectedSites,
      });
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refresh stats when audits or integrations are updated
  const refreshStats = () => {
    loadDashboardStats();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.title')}</h1>
        <p className="text-gray-600">{t('dashboard.subtitle')}</p>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold mb-2">{t('dashboard.wpAudit.title')}</h2>
            <p className="text-blue-100 mb-4">{t('dashboard.wpAudit.description')}</p>
            <Link
              to="/wordpress-audit"
              className="inline-flex items-center px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition-colors"
            >
              <FileText className="w-4 h-4 mr-2" />
              {t('dashboard.wpAudit.button')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
          <div className="hidden md:block">
            <FileText className="w-16 h-16 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('stats.totalAudits')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.totalAudits}
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
              <p className="text-sm font-medium text-gray-600">{t('stats.totalPublished')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.totalPublished}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('stats.connectedSites')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.connectedSites}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Globe className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('schema')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'schema'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('tabs.schemaAudit')}
            </button>
            <button
              onClick={() => setActiveTab('content')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                activeTab === 'content'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t('tabs.contentAudit')}
              <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                {t('tabs.comingSoon')}
              </span>
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'schema' && (
            <div className="space-y-8">
              <SchemaAudit onStatsUpdate={refreshStats} />
              <WordPressIntegration onStatsUpdate={refreshStats} />
            </div>
          )}
          {activeTab === 'content' && <ContentAudit />}
        </div>
      </div>
    </div>
  );
};
