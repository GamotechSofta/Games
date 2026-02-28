import { API_BASE_URL } from '../config/api';

const APK_FILENAME = 'myapp.apk';

export function getApkDownloadUrl() {
  const base = API_BASE_URL || '';
  const downloadBase = base.replace(/\/api\/v1\/?$/, '') || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${downloadBase}/downloads/${APK_FILENAME}`;
}

/** Trigger direct APK download without opening the download page */
export function triggerApkDownload() {
  const url = getApkDownloadUrl();
  const link = document.createElement('a');
  link.href = url;
  link.download = APK_FILENAME;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
