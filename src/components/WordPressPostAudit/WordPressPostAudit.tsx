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
  Upload,
  Copy,
  Check
} from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";
import { chatGPTService } from "../../lib/chatgpt";
import { wordpressService, postAuditService, WordPressIntegration, PostAudit } from "../../lib/database";
import wordpressApi, { WordPressPost } from "../../lib/wordpress";
import { AuditResultModal } from "./AuditResultModal";

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
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const { t } = useLanguage();
  const { trackPostAudit, trackPublishSchema, track } = useTracking();

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

  const generateOptimizedSchema = (post: WordPressPost, auditResult: AuditResult) => {
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": auditResult.title,
      "description": auditResult.description,
      "author": {
        "@type": "Person",
        "name": auditResult.author
      },
      "datePublished": post.date,
      "dateModified": post.date,
      "url": auditResult.url,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": auditResult.url
      },
      "publisher": {
        "@type": "Organization",
        "name": selectedIntegration?.domain || "Website",
        "url": selectedIntegration?.domain || auditResult.url
      },
      "image": {
        "@type": "ImageObject",
        "url": `${selectedIntegration?.domain}/wp-content/uploads/default-image.jpg`,
        "width": 1200,
        "height": 630
      }
    };
  };

  const copySchemaToClipboard = async () => {
    if (!auditResult?.generatedSchema) return;
    
    try {
      const schemaText = JSON.stringify(auditResult.generatedSchema, null, 2);
      await navigator.clipboard.writeText(schemaText);
      setCopiedSchema(true);
      
      // Track copy event
      track('schema_copied', {
        postId: selectedPost?.id,
        postTitle: selectedPost?.title.rendered,
        domain: selectedIntegration?.domain,
        timestamp: new Date().toISOString(),
        action: 'copy_schema'
      });
      
      setTimeout(() => setCopiedSchema(false), 2000);
    } catch (error) {
      console.error('Failed to copy schema:', error);
      alert('Failed to copy schema to clipboard');
    }
  };
  const publishSchemaToWordPress = async () => {
    if (!selectedIntegration || !selectedPost || !auditResult) return;

    trackPublishSchema(selectedIntegration.domain, selectedPost.id.toString());

    setPublishLoading(true);
    try {
      // Use the generated schema from audit result
      const optimizedSchema = auditResult.generatedSchema || generateOptimizedSchema(selectedPost, auditResult);

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
          `/wp-json/custom-schema-connector/v1/schema/${postId}`,
          requestOptions
        );
      } catch (fetchError) {
        console.error('Direct fetch failed:', fetchError);
        throw new Error('Failed to connect to WordPress API');
      }

      if (response.ok) {
        const result = await response.json();
        
        // Save publication record to track published schemas
        try {
          const { publicationService } = await import("../../lib/database");
          await publicationService.create({
            audit_id: null, // Could link to post audit if needed
            wordpress_integration_id: selectedIntegration.id,
            schema_content: JSON.stringify(optimizedSchema),
            post_id: selectedPost.id.toString(),
            publication_status: 'published',
            published_at: new Date().toISOString()
          });
        } catch (pubError) {
          console.error('Failed to save publication record:', pubError);
          // Don't fail the main operation if publication record fails
        }

        alert(`Schema successfully published to WordPress post! Response: ${JSON.stringify(result)}`);
        
        // Update dashboard stats after successful publication
        // This will be handled by the parent component's onStatsUpdate if available
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

      // Always use ChatGPT to analyze the WordPress post (fresh analysis)
      console.log('🤖 Starting ChatGPT analysis for post:', post.title.rendered);
      
      const analysis = await chatGPTService.analyzeWordPressPost(
        post.link,
        post.title.rendered,
        post.content.rendered
      );
      
      console.log('✅ ChatGPT analysis completed:', analysis);
      
      // Create base audit result data
      const baseAuditData = {
        url: post.link,
        title: post.title.rendered,
        description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
        author: `Author ${post.author}`,
        publishDate: new Date(post.date).toLocaleDateString(),
        categories: ['Technology', 'Web Development'],
        tags: ['GEO', 'WordPress', 'Schema'],
        schemas: analysis.geoSchemas || [],
        issues: analysis.issues || [],
        seoScore: analysis.score || 50,
        recommendations: analysis.improvements || []
      };
      
      // Generate optimized schema
      const generatedSchema = generateOptimizedSchema(post, baseAuditData);
      
      // Create final result with generated schema
      const auditResult: AuditResult = {
        ...baseAuditData,
        generatedSchema
      };

      setAuditResult(auditResult);

      // Save or update audit result in database
      const existingAudit = await postAuditService.getByPostId(
        selectedIntegration.id, 
        post.id.toString()
      );

      if (existingAudit) {
        // Update existing audit
        await postAuditService.update(existingAudit.id, {
          schemas_found: analysis.geoSchemas || [],
          issues: analysis.issues || [],
          suggestions: analysis.improvements || [],
          score: analysis.score || 50,
          audit_data: {
            analyzed_at: new Date().toISOString(),
            chatgpt_analysis: true,
            re_audit: true,
            post_data: {
              excerpt: post.excerpt.rendered,
              content_length: post.content.rendered.length,
              status: post.status
            }
          }
        });
      } else {
        // Create new audit
        await postAuditService.create({
          website_id: selectedIntegration.website_id,
          wordpress_integration_id: selectedIntegration.id,
          post_id: post.id.toString(),
          post_title: post.title.rendered,
          post_url: post.link,
          schemas_found: analysis.geoSchemas || [],
          issues: analysis.issues || [],
          suggestions: analysis.improvements || [],
          score: analysis.score || 50,
          audit_data: {
            analyzed_at: new Date().toISOString(),
            chatgpt_analysis: true,
            post_data: {
              excerpt: post.excerpt.rendered,
              content_length: post.content.rendered.length,
              status: post.status
            }
          }
        });
      }

      await loadPostAudits();

      // Show modal after audit is complete
      setShowAuditModal(true);
    } catch (err: any) {
      console.error('Audit error:', err);
      setError(err.message || "Không thể phân tích bài viết với ChatGPT. Vui lòng thử lại.");
      
      // Show fallback result even if ChatGPT fails
      const fallbackResult: AuditResult = {
        url: post.link,
        title: post.title.rendered,
        description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
        author: `Author ${post.author}`,
        publishDate: new Date(post.date).toLocaleDateString(),
        categories: ['Technology', 'Web Development'],
        tags: ['GEO', 'WordPress', 'Schema'],
        schemas: [
          {
            type: "Article",
            status: 'warning' as const,
            properties: {
              headline: post.title.rendered,
              author: `Author ${post.author}`,
              datePublished: post.date
            }
          }
        ],
        issues: [
          "Không thể kết nối với ChatGPT API để phân tích chi tiết",
          "Thiếu thông tin schema cơ bản cho bài viết",
          "Cần bổ sung structured data"
        ],
        seoScore: 45,
        recommendations: [
          "Thêm schema Article đầy đủ cho bài viết",
          "Bổ sung thông tin tác giả (Person schema)",
          "Thêm hình ảnh đại diện cho bài viết",
          "Cập nhật thông tin publisher (Organization)"
        ],
        generatedSchema: generateOptimizedSchema(post, {
          url: post.link,
          title: post.title.rendered,
          description: post.excerpt.rendered.replace(/<[^>]*>/g, '').substring(0, 200),
          author: `Author ${post.author}`,
          publishDate: new Date(post.date).toLocaleDateString(),
          categories: ['Technology', 'Web Development'],
          tags: ['GEO', 'WordPress', 'Schema'],
          schemas: [],
          issues: [],
          seoScore: 45,
          recommendations: []
        })
      };
      
      setAuditResult(fallbackResult);
      setShowAuditModal(true);
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

            </>
          )}
        </div>

        {/* Audit Result Modal */}
        <AuditResultModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          auditResult={auditResult}
          selectedPost={selectedPost}
          publishLoading={publishLoading}
          copiedSchema={copiedSchema}
          onPublishSchema={publishSchemaToWordPress}
          onCopySchema={copySchemaToClipboard}
        />
      </div>
    </div>
  );
};