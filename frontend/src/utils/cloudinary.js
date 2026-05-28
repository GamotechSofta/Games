function withCloudinaryTransform(url, transform) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  return url.replace(/\/upload\/(?:[^/]+\/)?/, `/upload/${transform}/`);
}

export function optimizeCloudinaryUrl(url, { format = 'auto', quality = 'auto' } = {}) {
  return withCloudinaryTransform(url, `f_${format},q_${quality}`);
}

export function optimizeCloudinaryResponsiveUrl(
  url,
  { format = 'auto', quality = 'auto', width = 1080 } = {}
) {
  return withCloudinaryTransform(url, `f_${format},q_${quality},w_${width},c_limit,dpr_auto`);
}

export function cloudinarySrcSet(
  url,
  {
    format = 'avif',
    quality = 'auto',
    widths = [360, 480, 640, 768, 960, 1200, 1440],
  } = {}
) {
  if (!url || typeof url !== 'string') return '';
  return widths
    .map((width) => `${optimizeCloudinaryResponsiveUrl(url, { format, quality, width })} ${width}w`)
    .join(', ');
}

