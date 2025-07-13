import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  Search, 
  ExternalLink, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Globe, 
  Calendar, 
  User, 
  Tag,
  ArrowLeft,
  Loader2
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";

interface AuditResult {
  url: string;
  title: string;
  description: string;
  author: string;
  publishDate: string;
  categories: string[];
  tags: string[];
  schemas: Array<{
    type: string;
    status: 'valid' | 'invalid' | 'warning';
    properties: Record<string, any>;
  }>;
  issues: string[];
  seoScore: number;
  recommendations: string[];
}

export const WordPressPostAudit: React.FC = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const { track } = useTracking();

  const handleAudit = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setAuditResult(null);

    try {
      // Track the audit action
      track('post_audit_clicked', {
        url: url.trim(),
        domain: new URL(url.trim()).hostname
      });

      // Simulate API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock result - replace with actual API response
      const mockResult: AuditResult = {
        url: url.trim(),
        title: "Sample WordPress Post Title",
        description: "This is a sample description of the WordPress post being audited.",
        author: "John Doe",
        publishDate: "2024-01-15",
        categories: ["Technology", "Web Development"],
        tags: ["SEO", "WordPress", "Schema"],
        schemas: [
          {
            type: "Article",
            status: 'valid',
            properties: {
              headline: "Sample WordPress Post Title",
              author: "John Doe",
              datePublished: "2024-01-15",
              description: "This is a sample description"
            }
          },
          {
            type: "BreadcrumbList",
            status: 'warning',
            properties: {
              itemListElement: []
            }
          }
        ],
        issues: [
          "Missing required property: mainEntityOfPage",
          "Missing required property: image"
        ],
        seoScore: 75,
        recommendations: [
          "Add featured image to improve schema markup",
          "Include mainEntityOfPage property in Article schema",
          "Consider adding FAQ schema if applicable"
        ]
      };

      setAuditResult(mockResult);
    } catch (err) {
      setError("Failed to audit the post. Please check the URL and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAudit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/dashboard" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('backToDashboard')}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('wordpressPostAudit')}
          </h1>
          <p className="text-gray-600">
            {t('analyzeWordPressPost')}
          </p>
        </div>

        <div className="p-6">
          {/* URL Input */}
          <div className="mb-6">
            <label htmlFor="post-url" className="block text-sm font-medium text-gray-700 mb-2">
              {t('postUrl')}
            </label>
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="post-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="https://example.com/sample-post"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              </div>
              <button
                onClick={handleAudit}
                disabled={!url.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                <span>{isLoading ? t('analyzing') : t('analyze')}</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <XCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('analyzingPost')}</p>
            </div>
          )}

          {/* Audit Results */}
          {auditResult && (
            <div className="space-y-6">
              {/* Post Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {t('postInformation')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('title')}</h4>
                    <p className="text-gray-700">{auditResult.title}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('author')}</h4>
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-gray-700">{auditResult.author}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('publishDate')}</h4>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-gray-700">{auditResult.publishDate}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('url')}</h4>
                    <div className="flex items-center">
                      <ExternalLink className="w-4 h-4 text-gray-500 mr-2" />
                      <a 
                        href={auditResult.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 truncate"
                      >
                        {auditResult.url}
                      </a>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium text-gray-900 mb-2">{t('description')}</h4>
                  <p className="text-gray-700">{auditResult.description}</p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('categories')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {auditResult.categories.map((category, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">{t('tags')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {auditResult.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-md flex items-center"
                        >
                          <Tag className="w-3 h-3 mr-1" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schema Analysis Results */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('schemaAnalysisResults')}
                  </h3>
                </div>

                {/* Summary Stats */}
                <div className="p-6 border-b border-gray-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {auditResult.schemas.length}
                      </div>
                      <div className="text-sm text-gray-600">{t('itemsDetected')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {auditResult.issues.length}
                      </div>
                      <div className="text-sm text-gray-600">{t('errors')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {auditResult.schemas.filter(s => s.status === 'warning').length}
                      </div>
                      <div className="text-sm text-gray-600">{t('warnings')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {auditResult.seoScore}%
                      </div>
                      <div className="text-sm text-gray-600">{t('seoScore')}</div>
                    </div>
                  </div>
                </div>

                {/* Schema Items */}
                {auditResult.schemas.length > 0 && (
                  <div className="border border-gray-200 rounded-lg">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                        {t('detectedSchemas')} ({auditResult.schemas.length})
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="space-y-4">
                        {auditResult.schemas.map((schema, index) => (
                          <div
                            key={index}
                            className={`border rounded-lg p-4 ${
                              schema.status === 'valid' 
                                ? 'border-green-200 bg-green-50' 
                                : schema.status === 'warning'
                                ? 'border-yellow-200 bg-yellow-50'
                                : 'border-red-200 bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900">
                                  {schema.type}
                                </span>
                                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                                  schema.status === 'valid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : schema.status === 'warning'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {schema.status === 'valid' ? t('valid') : 
                                   schema.status === 'warning' ? t('warning') : t('invalid')}
                                </span>
                              </div>
                              {schema.status === 'valid' ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : schema.status === 'warning' ? (
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-500" />
                              )}
                            </div>
                            
                            <div className="space-y-2">
                              {Object.entries(schema.properties).map(([key, value]) => (
                                <div key={key} className="flex">
                                  <span className="font-medium text-gray-700 w-32 flex-shrink-0">
                                    {key}:
                                  </span>
                                  <span className="text-gray-600 break-all">
                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Errors */}
                {auditResult.issues.length > 0 && (
                  <div className="border border-red-200 rounded-lg">
                    <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                        {t('errors')} ({auditResult.issues.length})
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {auditResult.issues.map((issue, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg"
                          >
                            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">
                                !
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-red-800">
                                {t('missingRequiredProperty')}
                              </p>
                              <p className="text-sm text-red-700 mt-1">
                                {issue}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {auditResult.recommendations.length > 0 && (
                  <div className="border border-blue-200 rounded-lg">
                    <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                        {t('recommendations')} ({auditResult.recommendations.length})
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="space-y-3">
                        {auditResult.recommendations.map((recommendation, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                          >
                            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-white text-xs font-bold">
                                i
                              </span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-blue-800">
                                {recommendation}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};