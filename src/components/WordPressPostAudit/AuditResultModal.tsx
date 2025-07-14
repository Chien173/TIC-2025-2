import React from "react";
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  Tag,
  ExternalLink,
  Copy,
  Check,
  Upload,
  Loader2,
} from "lucide-react";

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
  generatedSchema?: any;
}

interface WordPressPost {
  id: number;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
  date: string;
  author: number;
  status: string;
  excerpt: { rendered: string };
}

interface AuditResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditResult: AuditResult | null;
  selectedPost: WordPressPost | null;
  publishLoading: boolean;
  copiedSchema: boolean;
  onPublishSchema: () => void;
  onCopySchema: () => void;
}

export const AuditResultModal: React.FC<AuditResultModalProps> = ({
  isOpen,
  onClose,
  auditResult,
  selectedPost,
  publishLoading,
  copiedSchema,
  onPublishSchema,
  onCopySchema,
}) => {
  if (!isOpen || !auditResult || !selectedPost) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 truncate">
              Audit Results for: {selectedPost.title.rendered}
            </h3>
            <p className="text-sm text-gray-600 mt-1 truncate">
              {auditResult.url}
            </p>
          </div>
          <div className="flex items-center space-x-3 ml-4">
            <button
              onClick={onPublishSchema}
              disabled={publishLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {publishLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span>
                {publishLoading ? 'Publishing...' : 'Publish Schema'}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6">
            {/* Post Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Post Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Title</h5>
                  <p className="text-gray-700">{auditResult.title}</p>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Author</h5>
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-700">{auditResult.author}</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Publish Date</h5>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                    <span className="text-gray-700">{auditResult.publishDate}</span>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">URL</h5>
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
                <h5 className="font-medium text-gray-900 mb-2">Description</h5>
                <p className="text-gray-700">{auditResult.description}</p>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Categories</h5>
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
                  <h5 className="font-medium text-gray-900 mb-2">Tags</h5>
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

            {/* Generated Schema Display */}
            {auditResult.generatedSchema && (
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="bg-green-50 px-6 py-4 border-b border-green-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      Generated Optimized Schema
                    </h4>
                    <button
                      onClick={onCopySchema}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      {copiedSchema ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      <span>{copiedSchema ? 'Copied!' : 'Copy Schema'}</span>
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">
                      {JSON.stringify(auditResult.generatedSchema, null, 2)}
                    </pre>
                  </div>
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">Schema Benefits:</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Includes all required Article schema properties</li>
                      <li>• Adds mainEntityOfPage for better page understanding</li>
                      <li>• Includes structured author and publisher information</li>
                      <li>• Provides image metadata for rich snippets</li>
                      <li>• Optimized for search engine visibility</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Schema Analysis Results */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">
                  Schema Analysis Results
                </h4>
              </div>

              {/* Summary Stats */}
              <div className="p-6 border-b border-gray-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {auditResult.schemas?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Items Detected</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {auditResult.issues?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Errors</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {auditResult.schemas?.filter(s => s.status === 'warning').length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Warnings</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {auditResult.seoScore || 0}%
                    </div>
                    <div className="text-sm text-gray-600">GEO Score</div>
                  </div>
                </div>
              </div>

              {/* Schema Items */}
              {auditResult.schemas && auditResult.schemas.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    Detected Schemas ({auditResult.schemas?.length || 0})
                  </h5>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
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
                              {schema.status === 'valid' ? 'VALID' : 
                               schema.status === 'warning' ? 'WARNING' : 'INVALID'}
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
              )}

              {/* Errors */}
              {auditResult.issues && auditResult.issues.length > 0 && (
                <div className="p-6 border-b border-gray-200">
                  <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    Errors ({auditResult.issues?.length || 0})
                  </h5>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
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
                            Missing Required Property
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            {issue}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {auditResult.recommendations && auditResult.recommendations.length > 0 && (
                <div className="p-6">
                  <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                    <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                    Recommendations ({auditResult.recommendations?.length || 0})
                  </h5>
                  <div className="space-y-3 max-h-40 overflow-y-auto">
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};