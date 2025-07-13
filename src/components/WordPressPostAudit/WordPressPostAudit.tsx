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
  Loader2,
  FileText,
  BarChart3,
  Upload
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";
import { wordpressService, postAuditService, WordPressIntegration, PostAudit } from "../../lib/database";
import wordpressApi, { WordPressPost } from "../../lib/wordpress";

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
  const [selectedIntegration, setSelectedIntegration] = useState<WordPressIntegration | null>(null);
  const [integrations, setIntegrations] = useState<WordPressIntegration[]>([]);
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [postAudits, setPostAudits] = useState<PostAudit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();
  const { trackPostAudit, trackPublishSchema } = useTracking();

  useEffect(() => {
    loadIntegrations();
  }, []);

  useEffect(() => {
    if (selectedIntegration) {
      loadPosts();
      loadPostAudits();
    }
  }, [selectedIntegration]);

  const loadIntegrations = async () => {
    try {
      const data = await wordpressService.getAll();
      const connectedIntegrations = data.filter(integration => 
        integration.connection_status === 'connected'
      );
      setIntegrations(connectedIntegrations);
      
      if (connectedIntegrations.length > 0) {
        setSelectedIntegration(connectedIntegrations[0]);
      }
    } catch (error) {
      console.error('Error loading integrations:', error);
      setError('Failed to load WordPress integrations');
    }
  };

  const loadPosts = async () => {
    if (!selectedIntegration) return;
    
    setLoadingPosts(true);
    setError(null);
    
    try {
      const websiteId = selectedIntegration.website_id || '';
      const postsData = await wordpressApi.getPosts(websiteId);
      setPosts(postsData);
    } catch (error: any) {
      console.error('Error loading posts:', error);
      setError(error.message || 'Failed to load WordPress posts');
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const loadPostAudits = async () => {
    if (!selectedIntegration) return;
    
    try {
      const audits = await postAuditService.getByIntegrationId(selectedIntegration.id);
      setPostAudits(audits);
    } catch (error) {
      console.error('Error loading post audits:', error);
    }
  };

  const publishSchemaToWordPress = async () => {
    if (!selectedIntegration || !selectedPost || !auditResult) return;

    setPublishLoading(true);
    try {
      // Generate optimized schema based on audit results
      const optimizedSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": auditResult.title,
        "description": auditResult.description,
        "author": {
          "@type": "Person",
          "name": auditResult.author
        },
        "datePublished": selectedPost.date,
        "dateModified": selectedPost.date,
        "url": auditResult.url,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": auditResult.url
        },
        "publisher": {
          "@type": "Organization",
          "name": selectedIntegration.domain,
          "url": selectedIntegration.domain
        },
        // Add image if available
        "image": {
          "@type": "ImageObject",
          "url": `${selectedIntegration.domain}/wp-content/uploads/default-image.jpg`,
          "width": 1200,
          "height": 630
        }
      };

      // Prepare API request
      const apiDomain = selectedIntegration.domain;
      const postId = selectedPost.id;
      
      const requestOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": "MySecretKey_2025!@#$ForSchema",
        },
        body: JSON.stringify({
          schema: JSON.stringify(optimizedSchema),
        }),
      };

      // First try: Direct fetch
      let response;
      try {
        response = await fetch(
          `${apiDomain}/wp-json/custom-schema-connector/v1/schema/${postId}`,
          requestOptions
        );
      } catch (fetchError) {
        console.error('Direct fetch failed:', fetchError);
        throw new Error('Failed to connect to WordPress API');
      }

      if (response.ok) {
        const result = await response.json();
        
        // Track successful publish
        trackPublishSchema(selectedIntegration.domain, selectedPost.id.toString());
        
        alert(`Schema successfully published to WordPress post! Response: ${JSON.stringify(result)}`);
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to publish schema: HTTP ${response.status} - ${errorText}`);
      }
    } catch (error: any) {
      console.error('Publish schema error:', error);
      alert(`Error publishing schema: ${error.message}`);
    } finally {
      setPublishLoading(false);
    }
  };
  const handlePostAudit = async (post: WordPressPost) => {
    if (!selectedIntegration) return;

    setSelectedPost(post);
    setIsLoading(true);
    setError(null);
    setAuditResult(null);

    try {
      // Track the audit action
      trackPostAudit(post.id.toString(), post.title.rendered);

      // Check if audit already exists
      const existingAudit = await postAuditService.getByPostId(
        selectedIntegration.id, 
        post.id.toString()
      );

      if (existingAudit) {
        // Use existing audit result
        const mockResult: AuditResult = {
          url: post.link,
          title: post.title.rendered,
          description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
          author: `Author ${post.author}`,
          publishDate: new Date(post.date).toLocaleDateString(),
          categories: ['Technology', 'Web Development'],
          tags: ['SEO', 'WordPress', 'Schema'],
          schemas: existingAudit.schemas_found,
          issues: existingAudit.issues,
          seoScore: existingAudit.score,
          recommendations: existingAudit.suggestions
        };
        setAuditResult(mockResult);
      } else {
        // Simulate API call for new audit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Mock result
        const mockResult: AuditResult = {
          url: post.link,
          title: post.title.rendered,
          description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
          author: `Author ${post.author}`,
          publishDate: new Date(post.date).toLocaleDateString(),
          categories: ['Technology', 'Web Development'],
          tags: ['SEO', 'WordPress', 'Schema'],
          schemas: [
            {
              type: "Article",
              status: 'valid',
              properties: {
                headline: post.title.rendered,
                author: `Author ${post.author}`,
                datePublished: post.date,
                description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 100)
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
            "Missing required property: image",
            "Missing author schema information"
          ],
          seoScore: Math.floor(Math.random() * 40) + 60,
          recommendations: [
            "Add featured image to improve schema markup",
            "Include mainEntityOfPage property in Article schema",
            "Consider adding FAQ schema if applicable",
            "Add Person schema for author information"
          ]
        };

        setAuditResult(mockResult);

        // Save audit result
        await postAuditService.create({
          website_id: selectedIntegration.website_id,
          wordpress_integration_id: selectedIntegration.id,
          post_id: post.id.toString(),
          post_title: post.title.rendered,
          post_url: post.link,
          schemas_found: mockResult.schemas,
          issues: mockResult.issues,
          suggestions: mockResult.recommendations,
          score: mockResult.seoScore,
          audit_data: {
            analyzed_at: new Date().toISOString(),
            post_data: {
              excerpt: post.excerpt.rendered,
              content_length: post.content.rendered.length,
              status: post.status
            }
          }
        });

        await loadPostAudits();
      }
    } catch (err: any) {
      setError(err.message || "Failed to audit the post. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getPostAuditStatus = (postId: number) => {
    const audit = postAudits.find(a => a.post_id === postId.toString());
    return audit ? {
      score: audit.score,
      auditedAt: audit.created_at,
      issuesCount: audit.issues.length
    } : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            to="/" 
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t('common.back')}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('dashboard.wpAudit.title')}
          </h1>
          <p className="text-gray-600">
            {t('dashboard.wpAudit.description')}
          </p>
        </div>

        <div className="p-6">
          {/* Integration Selection */}
          {integrations.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No WordPress Sites Connected
              </h3>
              <p className="text-gray-600 mb-4">
                Connect your WordPress site first to audit posts
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Globe className="w-4 h-4 mr-2" />
                Connect WordPress Site
              </Link>
            </div>
          ) : (
            <>
              {/* Site Selector */}
              {integrations.length > 1 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select WordPress Site
                  </label>
                  <select
                    value={selectedIntegration?.id || ''}
                    onChange={(e) => {
                      const integration = integrations.find(i => i.id === e.target.value);
                      setSelectedIntegration(integration || null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {integrations.map((integration) => (
                      <option key={integration.id} value={integration.id}>
                        {integration.domain} ({integration.username})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Site Info */}
              {selectedIntegration && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 text-blue-600 mr-2" />
                    <div>
                      <h3 className="font-medium text-blue-900">
                        {selectedIntegration.domain}
                      </h3>
                      <p className="text-sm text-blue-700">
                        Connected as: {selectedIntegration.username}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Posts List */}
              {loadingPosts ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading WordPress posts...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Posts Found
                  </h3>
                  <p className="text-gray-600">
                    No published posts found in this WordPress site
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      WordPress Posts ({posts.length})
                    </h3>
                    <div className="text-sm text-gray-600">
                      {postAudits.length} posts audited
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {posts.map((post) => {
                      const auditStatus = getPostAuditStatus(post.id);
                      return (
                        <div
                          key={post.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-medium text-gray-900 mb-2">
                                {post.title.rendered}
                              </h4>
                              <div className="text-sm text-gray-600 mb-3">
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center">
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(post.date).toLocaleDateString()}
                                  </div>
                                  <div className="flex items-center">
                                    <User className="w-4 h-4 mr-1" />
                                    Author {post.author}
                                  </div>
                                  <div className="flex items-center">
                                    <ExternalLink className="w-4 h-4 mr-1" />
                                    <a 
                                      href={post.link} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 truncate max-w-xs"
                                    >
                                      View Post
                                    </a>
                                  </div>
                                </div>
                              </div>
                              
                              {post.excerpt.rendered && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                  {post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 150)}...
                                </p>
                              )}

                              {auditStatus && (
                                <div className="flex items-center space-x-4 text-sm">
                                  <div className="flex items-center">
                                    <BarChart3 className="w-4 h-4 mr-1 text-green-600" />
                                    <span className="text-green-600 font-medium">
                                      Score: {auditStatus.score}%
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <AlertTriangle className="w-4 h-4 mr-1 text-yellow-600" />
                                    <span className="text-yellow-600">
                                      {auditStatus.issuesCount} issues
                                    </span>
                                  </div>
                                  <div className="text-gray-500">
                                    Audited: {new Date(auditStatus.auditedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            <div className="ml-4 flex-shrink-0">
                              <button
                                onClick={() => handlePostAudit(post)}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                              >
                                {isLoading && selectedPost?.id === post.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Search className="w-4 h-4" />
                                )}
                                <span>
                                  {auditStatus ? 'Re-audit' : 'Audit'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Audit Results */}
              {auditResult && selectedPost && (
                <div className="mt-8 space-y-6">
                  <div className="border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">
                        Audit Results for: {selectedPost.title.rendered}
                      </h3>
                      <button
                        onClick={publishSchemaToWordPress}
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
                    </div>
                  </div>

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
                            {auditResult.schemas.length}
                          </div>
                          <div className="text-sm text-gray-600">Items Detected</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-red-600">
                            {auditResult.issues.length}
                          </div>
                          <div className="text-sm text-gray-600">Errors</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-600">
                            {auditResult.schemas.filter(s => s.status === 'warning').length}
                          </div>
                          <div className="text-sm text-gray-600">Warnings</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {auditResult.seoScore}%
                          </div>
                          <div className="text-sm text-gray-600">SEO Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Schema Items */}
                    {auditResult.schemas.length > 0 && (
                      <div className="p-6 border-b border-gray-200">
                        <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                          Detected Schemas ({auditResult.schemas.length})
                        </h5>
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
                    {auditResult.issues.length > 0 && (
                      <div className="p-6 border-b border-gray-200">
                        <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                          <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                          Errors ({auditResult.issues.length})
                        </h5>
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
                    {auditResult.recommendations.length > 0 && (
                      <div className="p-6">
                        <h5 className="font-semibold text-gray-900 flex items-center mb-4">
                          <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
                          Recommendations ({auditResult.recommendations.length})
                        </h5>
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
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};