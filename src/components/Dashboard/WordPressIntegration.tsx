import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";
import {
  Globe,
  Key,
  User,
  CheckCircle,
  AlertCircle,
  Upload,
  Trash2,
} from "lucide-react";
import {
  wordpressService,
  websiteService,
  WordPressIntegration as IWordPressIntegration,
} from "../../lib/database";

interface WordPressCredentials {
  domain: string;
  username: string;
  applicationPassword: string;
}

interface ConnectionStatus {
  connected: boolean;
  userInfo?: any;
  error?: string;
}

interface WordPressIntegrationProps {
  onStatsUpdate?: () => void;
}

const WordPressIntegration: React.FC<WordPressIntegrationProps> = ({
  onStatsUpdate,
}) => {
  const { t } = useLanguage();
  const { trackConnectWordPress, trackPublishSchema } = useTracking();
  const [credentials, setCredentials] = useState<WordPressCredentials>({
    domain: "",
    username: "",
    applicationPassword: "",
  });
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IWordPressIntegration[]>([]);
  const [selectedIntegration, setSelectedIntegration] =
    useState<IWordPressIntegration | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const data = await wordpressService.getAll();
      setIntegrations(data);
    } catch (error) {
      console.error("Error loading integrations:", error);
    }
  };

  const verifyCredentials = async () => {
    setLoading(true);
    setConnectionStatus({ connected: false });

    // Track the connection attempt
    trackConnectWordPress(credentials.domain);

    try {
      const { domain, username, applicationPassword } = credentials;

      // Ensure domain has protocol
      const fullDomain = domain.startsWith("http")
        ? domain
        : `https://${domain}`;

      // Create basic auth header
      const auth = btoa(`${username}:${applicationPassword}`);

      // Test API call to WordPress
      const response = await fetch(`${fullDomain}/wp-json/wp/v2/users/me`, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userInfo = await response.json();
        setConnectionStatus({
          connected: true,
          userInfo,
        });

        // Find or create website
        const website = await websiteService.findOrCreate(
          fullDomain,
          userInfo.name || "WordPress Site"
        );

        // Save WordPress integration
        const integration = await wordpressService.create({
          website_id: website.id,
          domain: fullDomain,
          username,
          application_password: applicationPassword,
          connection_status: "connected",
          last_verified_at: new Date().toISOString(),
          user_info: userInfo,
        });

        setSelectedIntegration(integration);
        await loadIntegrations();

        // Update dashboard stats
        if (onStatsUpdate) {
          onStatsUpdate();
        }

        // Clear form
        setCredentials({
          domain: "",
          username: "",
          applicationPassword: "",
        });
      } else {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${
            errorText || "Invalid credentials or API access denied"
          }`
        );
      }
    } catch (error: any) {
      console.error("Connection error:", error);
      setConnectionStatus({
        connected: false,
        error: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const publishSchema = async () => {
    if (!selectedIntegration) return;

    // Track the publish action
    trackPublishSchema(selectedIntegration.domain);

    setPublishLoading(true);
    try {
      const { domain, username, application_password } = selectedIntegration;
      const auth = btoa(`${username}:${application_password}`);

      // Example JSON-LD schema to publish
      const schemaMarkup = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Company",
  "url": "${domain}",
  "logo": "${domain}/wp-content/uploads/logo.png",
  "description": "Professional services and solutions",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-123-4567",
    "contactType": "customer service"
  },
  "sameAs": [
    "https://facebook.com/yourcompany",
    "https://twitter.com/yourcompany",
    "https://linkedin.com/company/yourcompany"
  ]
}
</script>`;

      // Create a new post with schema markup
      const response = await fetch(`${domain}/wp-json/wp/v2/posts`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `GEO Schema Update - ${new Date().toLocaleDateString()}`,
          content: `<p>This post contains updated JSON-LD schema markup for improved GEO.</p>${schemaMarkup}`,
          status: "publish",
          meta: {
            _schema_markup: schemaMarkup,
          },
        }),
      });

      if (response.ok) {
        const post = await response.json();
        alert(
          `Schema successfully published to WordPress! Post ID: ${post.id}`
        );

        // Update dashboard stats
        if (onStatsUpdate) {
          onStatsUpdate();
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Failed to publish schema: ${errorText}`);
      }
    } catch (error: any) {
      console.error("Publish error:", error);
      alert(`Error publishing schema: ${error.message}`);
    } finally {
      setPublishLoading(false);
    }
  };

  const deleteIntegration = async (integration: IWordPressIntegration) => {
    if (!confirm("Are you sure you want to delete this WordPress integration?"))
      return;

    try {
      // Soft delete by setting deleted_at
      await wordpressService.update(integration.id, {
        deleted_at: new Date().toISOString(),
      });

      await loadIntegrations();

      if (selectedIntegration?.id === integration.id) {
        setSelectedIntegration(null);
        setConnectionStatus({ connected: false });
      }
    } catch (error) {
      console.error("Error deleting integration:", error);
      alert("Failed to delete integration. Please try again.");
    }
  };

  const selectIntegration = (integration: IWordPressIntegration) => {
    setSelectedIntegration(integration);
    setConnectionStatus({
      connected: integration.connection_status === "connected",
      userInfo: integration.user_info,
    });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("wp.title")}
        </h2>
        <p className="text-gray-600">{t("wp.description")}</p>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="w-4 h-4 inline mr-1" />
            {t("wp.domain")}
          </label>
          <input
            type="url"
            value={credentials.domain}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, domain: e.target.value }))
            }
            placeholder="https://yoursite.com or yoursite.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <User className="w-4 h-4 inline mr-1" />
            {t("wp.username")}
          </label>
          <input
            type="text"
            value={credentials.username}
            onChange={(e) =>
              setCredentials((prev) => ({ ...prev, username: e.target.value }))
            }
            placeholder="WordPress username"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Key className="w-4 h-4 inline mr-1" />
            {t("wp.password")}
          </label>
          <input
            type="password"
            value={credentials.applicationPassword}
            onChange={(e) =>
              setCredentials((prev) => ({
                ...prev,
                applicationPassword: e.target.value,
              }))
            }
            placeholder="WordPress application password"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">{t("wp.passwordHelp")}</p>
        </div>
      </div>

      <div className="flex space-x-3 mb-6">
        <button
          onClick={verifyCredentials}
          disabled={
            loading ||
            !credentials.domain ||
            !credentials.username ||
            !credentials.applicationPassword
          }
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
        >
          {loading ? t("wp.verifying") : t("wp.connect")}
        </button>

        {selectedIntegration && connectionStatus.connected && (
          <button
            onClick={publishSchema}
            disabled={publishLoading}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all flex items-center space-x-2"
          >
            <Upload className="w-4 h-4" />
            <span>{publishLoading ? t("wp.publishing") : t("wp.publish")}</span>
          </button>
        )}
      </div>

      {connectionStatus.connected && connectionStatus.userInfo && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="font-medium text-green-800">
              {t("wp.connected")}
            </span>
          </div>
          <div className="text-sm text-green-700">
            <p>User: {connectionStatus.userInfo.name}</p>
            <p>Email: {connectionStatus.userInfo.email}</p>
            <p>Role: {connectionStatus.userInfo.roles?.join(", ")}</p>
          </div>
        </div>
      )}

      {connectionStatus.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="font-medium text-red-800">{t("wp.failed")}</span>
          </div>
          <p className="text-sm text-red-700">{connectionStatus.error}</p>
        </div>
      )}

      {integrations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("wp.connectedSites")}
          </h3>
          <div className="space-y-3">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedIntegration?.id === integration.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
                }`}
                onClick={() => selectIntegration(integration)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {integration.domain}
                  </div>
                  <div className="text-sm text-gray-600">
                    User: {integration.username} • Status:{" "}
                    <span
                      className={`font-medium ${
                        integration.connection_status === "connected"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {integration.connection_status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Connected:{" "}
                    {new Date(integration.created_at).toLocaleDateString()}
                    {integration.last_verified_at && (
                      <>
                        {" "}
                        • Last verified:{" "}
                        {new Date(
                          integration.last_verified_at
                        ).toLocaleDateString()}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      integration.connection_status === "connected"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteIntegration(integration);
                    }}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WordPressIntegration;
