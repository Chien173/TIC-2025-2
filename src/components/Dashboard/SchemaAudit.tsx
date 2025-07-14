import React, { useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTracking } from "../../hooks/useTracking";
import { chatGPTService } from "../../lib/chatgpt";
import {
  Search,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Zap,
  Save,
} from "lucide-react";
import {
  schemaAuditService,
  websiteService,
  ISchemaAudit,
} from "../../lib/database";

interface SchemaResult {
  url: string;
  schemas: any[];
  issues: string[];
  suggestions: string[];
  score: number;
}

interface SchemaAuditProps {
  onStatsUpdate?: () => void;
}

const SchemaAudit: React.FC<SchemaAuditProps> = ({ onStatsUpdate }) => {
  const { t } = useLanguage();
  const { trackSchemaAudit } = useTracking();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SchemaResult | null>(null);
  const [recentAudits, setRecentAudits] = useState<ISchemaAudit[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRecentAudits();
  }, []);

  const loadRecentAudits = async () => {
    try {
      const audits = await schemaAuditService.getAll();
      setRecentAudits(audits.slice(0, 5)); // Show last 5 audits
    } catch (error) {
      console.error("Error loading recent audits:", error);
    }
  };

  const analyzeSchema = async () => {
    if (!url) return;

    // Track the audit action
    trackSchemaAudit(url);

    setLoading(true);
    try {
      // Use ChatGPT to analyze the website
      const analysis = await chatGPTService.analyzeWebsiteForGEO(url);

      const mockResult: SchemaResult = {
        url,
        schemas: analysis.geoSchemas.map(schema => ({
          "@type": schema.type,
          ...schema.properties
        })),
        issues: analysis.issues,
        suggestions: analysis.improvements,
        score: analysis.score,
      };

      setResult(mockResult);
    } catch (error) {
      console.error("Error analyzing schema:", error);
      
      // Fallback to basic analysis if ChatGPT fails
      const fallbackResult: SchemaResult = {
        url,
        schemas: [
          { "@type": "Organization", name: "Website Organization", url: url },
        ],
        issues: [
          "Không thể kết nối với ChatGPT API để phân tích chi tiết",
          "Vui lòng kiểm tra lại kết nối mạng",
        ],
        suggestions: [
          "Thêm schema LocalBusiness cho SEO địa phương",
          "Bổ sung thông tin địa chỉ và liên hệ",
          "Tối ưu hóa structured data theo chuẩn schema.org",
        ],
        score: 50,
      };
      setResult(fallbackResult);
    } finally {
      setLoading(false);
    }
  };

  const generateAISuggestions = async () => {
    if (!result) return;

    setLoading(true);
    try {
      // Use ChatGPT to generate new suggestions
      const analysis = await chatGPTService.analyzeWebsiteForGEO(result.url);

      const aiSuggestions = analysis.improvements;

      console.log(aiSuggestions);

      setResult((prev) =>
        prev ? { ...prev, suggestions: aiSuggestions } : null
      );
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      
      // Fallback suggestions if ChatGPT fails
      const fallbackSuggestions = [
        "Thêm schema LocalBusiness với thông tin đầy đủ về doanh nghiệp",
        "Bổ sung PostalAddress với địa chỉ cụ thể và mã bưu điện",
        "Thêm GeoCoordinates để xác định vị trí chính xác",
        "Cập nhật openingHours cho giờ hoạt động của doanh nghiệp",
        "Thêm thông tin liên hệ: telephone, email, website",
        "Tối ưu hóa schema Organization với thông tin đầy đủ"
      ];
      
      setResult((prev) =>
        prev ? { ...prev, suggestions: fallbackSuggestions } : null
      );
    } finally {
      setLoading(false);
    }
  };

  const saveAuditResult = async () => {
    if (!result) return;

    setSaving(true);
    try {
      // Find or create website
      const website = await websiteService.findOrCreate(result.url);

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
          user_agent: navigator.userAgent,
        },
      });

      // Reload recent audits
      await loadRecentAudits();

      // Update dashboard stats
      if (onStatsUpdate) {
        onStatsUpdate();
      }

      alert("Audit result saved successfully!");
    } catch (error) {
      console.error("Error saving audit result:", error);
      alert("Failed to save audit result. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {t("schemaAudit.title")}
        </h2>
        <p className="text-gray-600">{t("schemaAudit.description")}</p>
      </div>

      <div className="mb-6">
        <div className="flex space-x-3">
          <div className="flex-1">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t("schemaAudit.placeholder")}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={analyzeSchema}
            disabled={loading || !url}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-medium transition-all"
          >
            <Search className="w-4 h-4" />
            <span>
              {loading ? t("schemaAudit.analyzing") : t("schemaAudit.button")}
            </span>
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Schema.org Validator Style Header */}
          <div className="border-b border-gray-200 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {t("schemaAudit.results")}
                  </h3>
                  <p className="text-sm text-gray-600">{result.url}</p>
                </div>
              </div>
              <button
                onClick={saveAuditResult}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm font-medium transition-all"
              >
                <Save className="w-4 h-4" />
                <span>
                  {saving ? t("schemaAudit.saving") : t("schemaAudit.save")}
                </span>
              </button>
            </div>
          </div>

          {/* Schema.org Validator Style Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {result.schemas.length}
              </div>
              <div className="text-sm text-blue-800">
                {t("schemaAudit.schemasFound")}
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {result.issues.length}
              </div>
              <div className="text-sm text-red-800">
                {t("schemaAudit.issuesFound")}
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-yellow-800">Warnings</div>
            </div>
            <div
              className={`border rounded-lg p-4 text-center ${
                result.score >= 80
                  ? "bg-green-50 border-green-200"
                  : result.score >= 60
                  ? "bg-yellow-50 border-yellow-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div
                className={`text-2xl font-bold ${
                  result.score >= 80
                    ? "text-green-600"
                    : result.score >= 60
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {result.score}
              </div>
              <div
                className={`text-sm ${
                  result.score >= 80
                    ? "text-green-800"
                    : result.score >= 60
                    ? "text-yellow-800"
                    : "text-red-800"
                }`}
              >
                {t("schemaAudit.score")}
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
                  {t("schemaAudit.schemasFound")} ({result.schemas.length}{" "}
                  items)
                </h4>
              </div>
              <div className="p-4">
                {result.schemas.length === 0 ? (
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
                    {result.schemas.map((schema, index) => (
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
            {result.issues.length > 0 && (
              <div className="border border-red-200 rounded-lg">
                <div className="bg-red-50 px-4 py-3 border-b border-red-200">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    Errors ({result.issues.length})
                  </h4>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {result.issues.map((issue, index) => (
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
                          <p className="text-sm text-red-700 mt-1">{issue}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* AI Suggestions */}
            <div className="border border-blue-200 rounded-lg">
              <div className="bg-blue-50 px-4 py-3 border-b border-blue-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 flex items-center">
                    <Zap className="w-5 h-5 text-blue-500 mr-2" />
                    {t("schemaAudit.suggestions")} ({result.suggestions.length})
                  </h4>
                  <button
                    onClick={generateAISuggestions}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
                  >
                    {loading
                      ? t("schemaAudit.generating")
                      : t("schemaAudit.refresh")}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {result.suggestions.map((suggestion, index) => (
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
          </div>
        </div>
      )}

      {recentAudits.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("schemaAudit.recentAudits")}
          </h3>
          <div className="space-y-3">
            {recentAudits.map((audit) => (
              <div
                key={audit.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{audit.url}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(audit.created_at).toLocaleDateString()} •
                    {audit.schemas_found.length} schemas found •
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
                  <button
                    onClick={() => {
                      setUrl(audit.url);
                      setResult({
                        url: audit.url,
                        schemas: audit.schemas_found,
                        issues: audit.issues,
                        suggestions: audit.suggestions,
                        score: audit.score,
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {t("schemaAudit.view")}
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

export default SchemaAudit;
