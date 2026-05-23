import React from 'react';
import { useTranslation } from 'react-i18next';
import { getApkDownloadUrl, triggerApkDownload } from '../utils/downloads';

const Download = () => {
  const { t } = useTranslation();
  const downloadUrl = getApkDownloadUrl();

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-gray-900 dark:bg-black dark:text-white flex flex-col items-center justify-center px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#d4af37]">{t('header.downloadApp')}</h1>
      <p className="mt-4 text-center text-gray-600 dark:text-white/90 max-w-md">
        {t('download.description', { defaultValue: 'Get the Android app and play on the go.' })}
      </p>
      <a
        href={downloadUrl}
        download="myapp.apk"
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => { e.preventDefault(); triggerApkDownload(); }}
        className="mt-8 px-8 py-4 bg-[#d4af37] hover:bg-[#c4a030] text-black font-bold rounded-xl transition-colors shadow-lg"
      >
        {t('common.download')} APK
      </a>
    </div>
  );
};

export default Download;
