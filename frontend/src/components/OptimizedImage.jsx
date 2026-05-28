import React, { memo } from 'react';

/**
 * WebP with PNG fallback via <picture>. Use loading="lazy" for below-the-fold images.
 */
function OptimizedImage({
  webp,
  png,
  src,
  alt = '',
  loading = 'lazy',
  className = '',
  ...rest
}) {
  const webpSrc = webp || (src?.endsWith('.webp') ? src : null);
  const pngSrc = png || (src && !src.endsWith('.webp') ? src : null);

  if (webpSrc && pngSrc) {
    return (
      <picture>
        <source srcSet={webpSrc} type="image/webp" />
        <img src={pngSrc} alt={alt} loading={loading} className={className} {...rest} />
      </picture>
    );
  }

  return (
    <img
      src={webpSrc || pngSrc || src}
      alt={alt}
      loading={loading}
      className={className}
      {...rest}
    />
  );
}

export default memo(OptimizedImage);
