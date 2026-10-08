import React from 'react';
import { SEO_CONFIG } from './seo.config';

export interface SeoProps {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
  type?: 'website' | 'article';
}

export function Seo({
  title,
  description,
  path,
  image,
  noindex = false,
  type = 'website',
}: SeoProps): React.ReactElement {
  const {
    siteName,
    baseUrl,
    defaultTitle,
    titleTemplate,
    defaultDescription,
    defaultImage,
    locale,
    themeColor,
  } = SEO_CONFIG;

  const fullTitle = title ? titleTemplate(title) : defaultTitle;
  const metaDescription = description ?? defaultDescription;
  const canonical = new URL(path, baseUrl).toString();
  const ogImage = new URL(image ?? defaultImage, baseUrl).toString();
  const robots = noindex
    ? 'noindex,nofollow'
    : 'index, follow, max-image-preview:large';

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      <link rel="canonical" href={canonical} />
      <meta name="theme-color" content={themeColor} />
      <meta name="robots" content={robots} />

      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content={locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={ogImage} />
    </>
  );
}
