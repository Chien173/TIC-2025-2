import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "vi";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Header
    "header.title": "Website GEO Audit Tool",
    "header.subtitle": "Professional website schema analysis",
    "header.welcome": "Welcome",
    "header.signOut": "Sign Out",

    // Dashboard
    "dashboard.title": "Website GEO Audit Tool",
    "dashboard.subtitle":
      "Analyze and optimize your website's structured data for better search engine visibility",
    "dashboard.wpAudit.title": "WordPress Post Schema Audit",
    "dashboard.wpAudit.description":
      "Analyze individual WordPress posts for schema optimization opportunities",
    "dashboard.wpAudit.button": "Audit WordPress Posts",

    // Stats
    "stats.totalAudits": "Total Audits",
    "stats.totalPublished": "Total Published",
    "stats.connectedSites": "Connected Sites",

    // Tabs
    "tabs.schemaAudit": "Schema Audit",
    "tabs.contentAudit": "Content Audit",
    "tabs.comingSoon": "Coming Soon",

    // Schema Audit
    "schemaAudit.title": "JSON-LD Schema Audit",
    "schemaAudit.description":
      "Analyze and optimize structured data for better GEO performance",
    "schemaAudit.placeholder":
      "Enter website URL to audit (e.g., https://example.com)",
    "schemaAudit.button": "Audit",
    "schemaAudit.analyzing": "Analyzing...",
    "schemaAudit.results": "Audit Results",
    "schemaAudit.save": "Save",
    "schemaAudit.saving": "Saving...",
    "schemaAudit.refresh": "Refresh AI Suggestions",
    "schemaAudit.generating": "Generating...",
    "schemaAudit.recentAudits": "Recent Audits",
    "schemaAudit.view": "View",
    "schemaAudit.schemasFound": "Schemas Found",
    "schemaAudit.issuesFound": "Issues Found",
    "schemaAudit.suggestions": "AI Suggestions",
    "schemaAudit.score": "GEO Score",

    // WordPress Integration
    "wp.title": "WordPress Integration",
    "wp.description": "Connect to your WordPress site to publish schema markup",
    "wp.domain": "WordPress Domain",
    "wp.username": "Username",
    "wp.password": "Application Password",
    "wp.passwordHelp":
      "Generate an application password in your WordPress admin under Users → Profile",
    "wp.connect": "Connect & Save",
    "wp.verifying": "Verifying...",
    "wp.publish": "Publish Schema",
    "wp.publishing": "Publishing...",
    "wp.connected": "Connected Successfully",
    "wp.failed": "Connection Failed",
    "wp.connectedSites": "Connected WordPress Sites",

    // Common
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.view": "View",
    "common.back": "Back",
  },
  vi: {
    // Header
    "header.title": "Công Cụ Kiểm Tra GEO Website",
    "header.subtitle": "Phân tích schema website chuyên nghiệp",
    "header.welcome": "Chào mừng",
    "header.signOut": "Đăng Xuất",

    // Dashboard
    "dashboard.title": "Công Cụ Kiểm Tra GEO Website",
    "dashboard.subtitle":
      "Phân tích và tối ưu hóa dữ liệu có cấu trúc của website để có khả năng hiển thị tốt hơn trên công cụ tìm kiếm",
    "dashboard.wpAudit.title": "Kiểm Tra Schema Bài Viết WordPress",
    "dashboard.wpAudit.description":
      "Phân tích từng bài viết WordPress để tìm cơ hội tối ưu hóa schema",
    "dashboard.wpAudit.button": "Kiểm Tra Bài Viết WordPress",

    // Stats
    "stats.totalAudits": "Tổng Số Kiểm Tra",
    "stats.totalPublished": "Tổng Số Đã Xuất Bản",
    "stats.connectedSites": "Website Đã Kết Nối",

    // Tabs
    "tabs.schemaAudit": "Kiểm Tra Schema",
    "tabs.contentAudit": "Kiểm Tra Nội Dung",
    "tabs.comingSoon": "Sắp Ra Mắt",

    // Schema Audit
    "schemaAudit.title": "Kiểm Tra JSON-LD Schema",
    "schemaAudit.description":
      "Phân tích và tối ưu hóa dữ liệu có cấu trúc để cải thiện hiệu suất GEO",
    "schemaAudit.placeholder":
      "Nhập URL website để kiểm tra (ví dụ: https://example.com)",
    "schemaAudit.button": "Kiểm Tra",
    "schemaAudit.analyzing": "Đang phân tích...",
    "schemaAudit.results": "Kết Quả Kiểm Tra",
    "schemaAudit.save": "Lưu",
    "schemaAudit.saving": "Đang lưu...",
    "schemaAudit.refresh": "Làm Mới Gợi Ý AI",
    "schemaAudit.generating": "Đang tạo...",
    "schemaAudit.recentAudits": "Kiểm Tra Gần Đây",
    "schemaAudit.view": "Xem",
    "schemaAudit.schemasFound": "Schema Tìm Thấy",
    "schemaAudit.issuesFound": "Vấn Đề Tìm Thấy",
    "schemaAudit.suggestions": "Gợi Ý AI",
    "schemaAudit.score": "Điểm GEO",

    // WordPress Integration
    "wp.title": "Tích Hợp WordPress",
    "wp.description": "Kết nối với website WordPress để xuất bản schema markup",
    "wp.domain": "Tên Miền WordPress",
    "wp.username": "Tên Đăng Nhập",
    "wp.password": "Mật Khẩu Ứng Dụng",
    "wp.passwordHelp":
      "Tạo mật khẩu ứng dụng trong WordPress admin tại Users → Profile",
    "wp.connect": "Kết Nối & Lưu",
    "wp.verifying": "Đang xác minh...",
    "wp.publish": "Xuất Bản Schema",
    "wp.publishing": "Đang xuất bản...",
    "wp.connected": "Kết Nối Thành Công",
    "wp.failed": "Kết Nối Thất Bại",
    "wp.connectedSites": "Website WordPress Đã Kết Nối",

    // Common
    "common.loading": "Đang tải...",
    "common.error": "Lỗi",
    "common.success": "Thành công",
    "common.cancel": "Hủy",
    "common.save": "Lưu",
    "common.delete": "Xóa",
    "common.edit": "Sửa",
    "common.view": "Xem",
    "common.back": "Quay lại",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "vi")) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return (
      translations[language][
        key as keyof (typeof translations)[typeof language]
      ] || key
    );
  };

  const value = {
    language,
    setLanguage: handleSetLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
