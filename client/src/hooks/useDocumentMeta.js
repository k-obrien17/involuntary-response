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

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) {
      canonical.setAttribute('href', window.location.origin + window.location.pathname);
    }

    return () => {
      document.title = SITE_NAME;
      if (metaDesc) {
        metaDesc.setAttribute('content', 'Short-form music takes from people who care about music.');
      }
    };
  }, [title, description]);
}
