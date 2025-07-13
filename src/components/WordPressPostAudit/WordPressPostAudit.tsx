import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";
import {
  ArrowLeft,
  FileText,
  Search,
  CheckCircle,
  AlertTriangle,
  Zap,
  Upload,
  ExternalLink,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  wordpressService,
  postAuditService,
  WordPressIntegration as IWordPressIntegration,
  PostAudit as IPostAudit,
  websiteService,
} from "../../lib/database";
import wordpressApi, { WordPressPost } from "../../lib/wordpress";

interface PostAuditResult {
  post: WordPressPost;
  schemas: any[];
  issues: string[];
  suggestions: string[];
  score: number;
}

export const WordPressPostAudit: React.FC = () => {
  const { t } = useLanguage();
  const { trackPostAudit, trackPublishSchema } = useTracking();
  const [integrations, setIntegrations] = useState<IWordPressIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IWordPressIntegration | null>(null);
  const [selectedWebsiteId, setSelectedWebsiteId] = useState<string>("");
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null);
  const [auditResult, setAuditResult] = useState<PostAuditResult | null>(null);
  const [auditHistory, setAuditHistory] = useState<IPostAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [savingAudit, setSavingAudit] = useState(false);
  const [error, setError] = useState<string>("");

  console.log(posts);

  useEffect(() => {
    loadIntegrations();

    // Auto refresh every 30 seconds when page is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && selectedWebsiteId) {
        refreshPosts();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto refresh when selectedWebsiteId changes
    if (selectedWebsiteId) {
      refreshPosts();
    }
  }, [selectedWebsiteId]);

  const loadIntegrations = async () => {
    try {
      setError("");
      const connectedIntegrations = await wordpressApi.getAllIntegrations();

      setIntegrations(connectedIntegrations);

      if (connectedIntegrations.length === 1) {
        const integration = connectedIntegrations[0];
        setSelectedIntegration(integration);
        const websiteId = integration.website_id || integration.website?.id;
        if (websiteId) {
          setSelectedWebsiteId(websiteId);
          loadPosts(websiteId);
        }
      }
    } catch (error) {
      console.error("Error loading integrations:", error);
      setError("Failed to load WordPress integrations");
    }
  };

  const loadPosts = async (websiteId: string) => {
    setPostsLoading(true);
    setError("");
    try {
      const postsData = await wordpressApi.getPosts(websiteId);
      setPosts(postsData);

      // Load audit history for this website
      if (selectedIntegration) {
        await loadAuditHistory(selectedIntegration.id);
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setError(
        `Failed to load WordPress posts: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setPostsLoading(false);
    }
  };

  const loadAuditHistory = async (integrationId: string) => {
    try {
      const audits = await postAuditService.getByIntegrationId(integrationId);
      setAuditHistory(audits);
    } catch (error) {
      console.error("Error loading audit history:", error);
    }
  };

  const auditPost = async (post: WordPressPost) => {
    setLoading(true);
    setSelectedPost(post);
    
    // Track the post audit action
    trackPostAudit(post.id.toString(), post.title.rendered);

    try {
      // Simulate schema analysis of the post content
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Parse content for existing schemas
      const content = post.content.rendered;
      const hasJsonLd = content.includes("application/ld+json");
      const hasArticleSchema =
        content.includes('"@type":"Article"') ||
        content.includes('"@type": "Article"');
      const hasBreadcrumbSchema = content.includes('"@type":"BreadcrumbList"');
      const hasAuthorSchema = content.includes('"@type":"Person"');

      const schemas = [];
      const issues = [];
      const suggestions = [];

      if (hasJsonLd) {
        if (hasArticleSchema) {
          schemas.push({ "@type": "Article", title: post.title.rendered });
        }
        if (hasAuthorSchema) {
          schemas.push({ "@type": "Person", name: "Author" });
        }
        if (hasBreadcrumbSchema) {
          schemas.push({ "@type": "BreadcrumbList" });
        }
      }

      // Generate issues based on missing schemas
      if (!hasArticleSchema) {
        issues.push("Missing Article schema for better content understanding");
      }
      if (!hasAuthorSchema) {
        issues.push("Missing Person schema for author information and E-A-T");
      }
      if (!hasBreadcrumbSchema) {
        issues.push("Missing BreadcrumbList schema for navigation context");
      }
      if (!content.includes("datePublished")) {
        issues.push("Missing datePublished property in Article schema");
      }
      if (!content.includes("dateModified")) {
        issues.push("Missing dateModified property for content freshness");
      }

      // Generate AI suggestions
      suggestions.push(
        `Add comprehensive Article schema with headline: "${post.title.rendered}"`,
        "Include Person schema for author with name and social profiles",
        "Add Organization schema for publisher information",
        "Implement BreadcrumbList schema for better navigation understanding",
        "Include WebPage schema with main entity reference",
        "Add FAQ schema if the post contains questions and answers"
      );

      const score = Math.max(
        20,
        100 - issues.length * 15 + schemas.length * 10
      );

      setAuditResult({
        post,
        schemas,
        issues,
        suggestions,
        score,
      });

      // Auto-save audit result
      await saveAuditResult(post, schemas, issues, suggestions, score);
    } catch (error) {
      console.error("Error auditing post:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log(integrations);

  const saveAuditResult = async (
    post: WordPressPost,
    schemas: any[],
    issues: string[],
    suggestions: string[],
    score: number
  ) => {
    if (!selectedIntegration) return;

    setSavingAudit(true);
    try {
      // Check if audit already exists for this post
      const existingAudit = await postAuditService.getByPostId(
        selectedIntegration.id,
        post.id.toString()
      );

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
            post_excerpt: post.excerpt.rendered,
          },
        });
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
            post_excerpt: post.excerpt.rendered,
          },
        });
      }

      // Refresh audit history
      await loadAuditHistory(selectedIntegration.id);
    } catch (error) {
      console.error("Error saving audit result:", error);
    } finally {
      setSavingAudit(false);
    }
  };

  const publishSchema = async () => {
    if (!auditResult || !selectedIntegration || !selectedPost) return;

    // Track the publish action
    trackPublishSchema(selectedIntegration.domain, selectedPost.id.toString());

    setPublishLoading(true);
    try {
      // Generate optimized schema based on audit results
      const optimizedSchema = {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: selectedPost.title.rendered,
        author: {
          "@type": "Person",
          name: "Author Name",
        },
        publisher: {
          "@type": "Organization",
          name: "Your Organization",
          logo: {
            "@type": "ImageObject",
            url: `${selectedIntegration.domain}/wp-content/uploads/logo.png`,
          },
        },
        datePublished: selectedPost.date,
        dateModified: selectedPost.date,
        url: selectedPost.link,
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": selectedPost.link,
        },
      };

      // Extract domain from selectedIntegration and use selectedPost.id
      const domain = selectedIntegration.domain;
      const postId = selectedPost.id;

      // Ensure domain has protocol
      const apiDomain = domain.startsWith("http")
        ? domain
        : `https://${domain}`;

      console.log(
        "Publishing schema to:",
        `${apiDomain}/wp-json/custom-schema-connector/v1/schema/${postId}`
      );
      console.log("Schema data:", optimizedSchema);

      // Try different approaches to handle CORS
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
      } catch (corsError) {
        console.error("CORS error with direct fetch:", corsError);

        // Second try: Use WordPress credentials for authentication
        const { username, application_password } = selectedIntegration;
        const auth = btoa(`${username}:${application_password}`);

        const authRequestOptions = {
          ...requestOptions,
          headers: {
            ...requestOptions.headers,
            Authorization: `Basic ${auth}`,
          },
        };

        try {
          response = await fetch(
            `/wp-json/custom-schema-connector/v1/schema/${postId}`,
            authRequestOptions
          );
        } catch (authError) {
          console.error("Auth error:", authError);

          // Third try: Use proxy or alternative method
          throw new Error(
            `CORS error: Cannot connect to ${apiDomain}. Please check if the API endpoint supports CORS or if the domain is accessible.`
          );
        }
      }

      if (response.ok) {
        const result = await response.json();
        console.log("Publish result:", result);
        alert(
          `Schema successfully published to post "${selectedPost.title.rendered}"!`
        );
      } else {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to publish schema: ${response.status} - ${errorText}`
        );
      }
    } catch (error: any) {
      console.error("Publish error:", error);

      // Provide more detailed error information
      if (error.message.includes("CORS")) {
        alert(
          `CORS Error: ${error.message}\n\nSuggestions:\n1. Check if the WordPress site allows cross-origin requests\n2. Verify the API endpoint is accessible\n3. Contact the site administrator to enable CORS for this domain`
        );
      } else {
        alert(`Error publishing schema: ${error.message}`);
      }
    } finally {
      setPublishLoading(false);
    }
  };

  const handleIntegrationChange = (integration: IWordPressIntegration) => {
    setSelectedIntegration(integration);
    const websiteId = integration.website_id || integration.website?.id;
    setSelectedWebsiteId(websiteId || "");
    setSelectedPost(null);
    setAuditResult(null);
    setPosts([]);
    setAuditHistory([]);
    setError("");

    if (websiteId) {
      loadPosts(websiteId);
    } else {
      setError("Website ID not found for this integration");
    }
  };

  const getPostAuditStatus = (postId: number) => {
    return auditHistory.find((audit) => audit.post_id === postId.toString());
  };

  const refreshPosts = () => {
    if (selectedWebsiteId) {
      loadPosts(selectedWebsiteId);
    } else {
      setError("No website selected");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/"
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('common.back')} to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.wpAudit.title')}</h1>
        <p className="text-gray-600">{t('dashboard.wpAudit.description')}</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
            <span className="font-medium text-red-800">{t('common.error')}</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No WordPress Sites Connected
          </h3>
          <p className="text-gray-600 mb-4">
            You need to connect a WordPress site first to audit posts.
          </p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select WordPress Site
              </h3>
              <div className="grid gap-3">
                {integrations.map((integration) => (
                  <button
                    key={integration.id}
                    onClick={() => handleIntegrationChange(integration)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedIntegration?.id === integration.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-medium text-gray-900">
                      {integration.domain}
                    </div>
                    <div className="text-sm text-gray-600">
                      User: {integration.username}
                    </div>
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
                  <RefreshCw
                    className={`w-4 h-4 ${postsLoading ? "animate-spin" : ""}`}
                  />
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
                    const auditStatus = getPostAuditStatus(post.id);
                    return (
                      <div
                        key={post.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedPost?.id === post.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              {auditStatus && (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              )}
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded-full ${
                                  auditStatus
                                    ? auditStatus.score >= 80
                                      ? "bg-green-100 text-green-800"
                                      : auditStatus.score >= 60
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {auditStatus
                                  ? `Score: ${auditStatus.score}`
                                  : "Not audited"}
                              </span>
                            </div>
                            <h4
                              className="font-medium text-gray-900"
                              dangerouslySetInnerHTML={{
                                __html: post.title.rendered,
                              }}
                            />
                            <div className="text-sm text-gray-600">
                              Published:{" "}
                              {new Date(post.date).toLocaleDateString()}
                              {auditStatus && (
                                <>
                                  {" "}
                                  • Last audited:{" "}
                                  {new Date(
                                    auditStatus.created_at
                                  ).toLocaleDateString()}
                                </>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              <a
                                href={post.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-600 flex items-center"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Post
                              </a>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {savingAudit && selectedPost?.id === post.id && (
                              <div className="flex items-center space-x-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3 animate-spin" />
                                <span>{t('schemaAudit.saving')}</span>
                              </div>
                            )}
                            <button
                              onClick={() => auditPost(post)}
                              disabled={loading}
                              className={`px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all ${
                                auditStatus
                                  ? "bg-green-600 text-white"
                                  : "bg-blue-600 text-white"
                              } ${
                                auditStatus
                                  ? "hover:bg-green-700"
                                  : "hover:bg-blue-700"
                              }`}
                            >
                              <Search className="w-4 h-4" />
                              <span>
                                {loading && selectedPost?.id === post.id
                                  ? t('schemaAudit.analyzing')
                                  : auditStatus
                                  ? "Re-audit"
                                  : t('schemaAudit.button')}
                              </span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {auditHistory.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Audits
              </h3>
              <div className="space-y-3">
                {auditHistory.slice(0, 10).map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div
                        className="font-medium text-gray-900"
                        dangerouslySetInnerHTML={{ __html: audit.post_title }}
                      />
                      <div className="text-sm text-gray-600">
                        Audited:{" "}
                        {new Date(audit.created_at).toLocaleDateString()} •
                        {audit.schemas_found.length} schemas •
                        {audit.issues.length} issues
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div
                        className={`text-lg font-bold ${
                          audit.score >= 80
                            ? "text-green-600"
                            : audit.score >= 60
                            ? "text-yellow-600"
                            : "text-red-600"
                        }`}
                      >
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
              {/* Schema.org Validator Style Header */}
              <div className="border-b border-gray-200 pb-4 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <Search className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        Structured Data Testing Tool
                      </h3>
                      <p className="text-sm text-gray-600">
                        Results for:{" "}
                        <span
                          className="font-medium"
                          dangerouslySetInnerHTML={{
                            __html: auditResult.post.title.rendered,
                          }}
                        />
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={publishSchema}
                    disabled={publishLoading || !selectedPost}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {publishLoading ? t('wp.publishing') : t('wp.publish')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Schema.org Validator Style Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {auditResult.schemas.length}
                  </div>
                  <div className="text-sm text-blue-800">Items Detected</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {auditResult.issues.length}
                  </div>
                  <div className="text-sm text-red-800">Errors</div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">0</div>
                  <div className="text-sm text-yellow-800">Warnings</div>
                </div>
                <div
                  className={`border rounded-lg p-4 text-center ${
                    auditResult.score >= 80
                      ? "bg-green-50 border-green-200"
                      : auditResult.score >= 60
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div
                    className={`text-2xl font-bold ${
                      auditResult.score >= 80
                        ? "text-green-600"
                        : auditResult.score >= 60
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {auditResult.score}
                  </div>
                  <div
                    className={`text-sm ${
                      auditResult.score >= 80
                        ? "text-green-800"
                        : auditResult.score >= 60
                        ? "text-yellow-800"
                        : "text-red-800"
                    }`}
                  >
                    SEO Score
                  </div>
                </div>
              </div>

              {/* Schema.org Validator Style Results */}
              <div className="space-y-6">
                {/* Detected Items */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                      Detected Structured Data ({
                        auditResult.schemas.length
                      }{" "}
                      items)
                    </h4>
                  </div>
                  <div className="p-4">
                    {auditResult.schemas.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium">
                          No structured data detected
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          This page does not contain structured data
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {auditResult.schemas.map((schema, index) => (
                          <div
                            key={index}
                            className="border border-green-200 rounded-lg bg-green-50"
                          >
                            <div className="bg-green-100 px-4 py-2 border-b border-green-200 rounded-t-lg">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-green-800">
                                  {schema["@type"]}
                                </span>
                                <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                  VALID
                                </span>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="space-y-2">
                                {schema.title && (
                                  <div className="flex">
                                    <span className="text-sm font-medium text-gray-600 w-20">
                                      title:
                                    </span>
                                    <span className="text-sm text-gray-900">
                                      {schema.title}
                                    </span>
                                  </div>
                                )}
                                {schema.name && (
                                  <div className="flex">
                                    <span className="text-sm font-medium text-gray-600 w-20">
                                      name:
                                    </span>
                                    <span className="text-sm text-gray-900">
                                      {schema.name}
                                    </span>
                                  </div>
                                )}
                                {schema.url && (
                                  <div className="flex">
                                    <span className="text-sm font-medium text-gray-600 w-20">
                                      url:
                                    </span>
                                    <span className="text-sm text-blue-600 truncate">
                                      {schema.url}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Errors */}
                {auditResult.issues.length > 0 && (
                  <div className="border border-red-200 rounded-lg">
                    <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                        Errors ({auditResult.issues.length})
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
                                Missing required property
                              </p>
                              <p className="text-sm text-red-700 mt-1">
                                {issue}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    <p className="text-gray-600">{t('common.loading')} posts...</p>
                  </div>
                )}

                {/* AI Suggestions */}
                <div className="border border-blue-200 rounded-lg">
                  <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Zap className="w-5 h-5 text-blue-500 mr-2" />
                      AI Optimization Suggestions (
                      {auditResult.suggestions.length})
                    </h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {auditResult.suggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Zap className="w-3 h-3 text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800">
                              Optimization Opportunity
                            </p>
                            <p className="text-sm text-blue-700 mt-1">
                              {suggestion}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Schema Preview */}
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">
                      Optimized Schema Preview
                    </h4>
                  </div>
                  <div className="p-4">
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(
                        {
                          "@context": "https://schema.org",
                          "@type": "Article",
                          headline: auditResult.post.title.rendered.replace(
                            /<[^>]*>/g,
                            ""
                          ),
                          author: {
                            "@type": "Person",
                            name: "Author Name",
                          },
                          publisher: {
                            "@type": "Organization",
                            name: "Your Organization",
                          },
                          datePublished: auditResult.post.date,
                          dateModified: auditResult.post.date,
                          url: auditResult.post.link,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
