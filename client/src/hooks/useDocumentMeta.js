import { useEffect } from 'react';

const SITE_NAME = 'Involuntary Response';

export default function useDocumentMeta(title, description) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    document.title = fullTitle;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && description) {
      metaDesc.setAttribute('content', description);
    }

    const pageUrl = window.location.origin + window.location.pathname;

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', pageUrl);
    }

    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', pageUrl);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', fullTitle);
    }

    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && description) {
      ogDesc.setAttribute('content', description);
    }

    const twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) {
      twTitle.setAttribute('content', fullTitle);
    }

    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc && description) {
      twDesc.setAttribute('content', description);
    }

    return () => {
      document.title = SITE_NAME;
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Short-form music takes from people who care about music.');
      }
    };
  }, [title, description]);
}
