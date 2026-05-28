import React, { memo } from 'react';
import { cloudinarySrcSet, optimizeCloudinaryResponsiveUrl, optimizeCloudinaryUrl } from '../utils/cloudinary';

function ResponsiveCloudinaryImage({
  src,
  alt = '',
  className = '',
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority,
  widths,
  ...rest
}) {
  const isCloudinary = typeof src === 'string' && src.includes('res.cloudinary.com');
  if (!isCloudinary) {
    return <img src={src} alt={alt} className={className} sizes={sizes} loading={loading} {...rest} />;
  }

  const fallback = optimizeCloudinaryResponsiveUrl(src, { format: 'webp', width: 960 });
  return (
    <picture>
      <source type="image/avif" srcSet={cloudinarySrcSet(src, { format: 'avif', quality: 'auto:eco', widths })} sizes={sizes} />
      <source type="image/webp" srcSet={cloudinarySrcSet(src, { format: 'webp', quality: 'auto', widths })} sizes={sizes} />
      <img
        src={fallback || optimizeCloudinaryUrl(src)}
        alt={alt}
        className={className}
        loading={loading}
        fetchPriority={fetchPriority}
        {...rest}
      />
    </picture>
  );
}

export default memo(ResponsiveCloudinaryImage);

