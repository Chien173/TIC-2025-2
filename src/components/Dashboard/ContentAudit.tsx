import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Zap, Clock } from 'lucide-react';

const ContentAudit: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap className="w-8 h-8 text-yellow-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {t('tabs.contentAudit')}
      </h3>
      <p className="text-gray-600 mb-4">
        Tính năng kiểm tra và tối ưu hóa nội dung website đang được phát triển
      </p>
      <div className="flex items-center justify-center space-x-2 text-sm text-yellow-600">
        <Clock className="w-4 h-4" />
        <span>{t('tabs.comingSoon')}</span>
      </div>
    </div>
  );
};

export default ContentAudit;