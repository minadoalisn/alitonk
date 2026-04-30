// Simple SEO optimizer
(function() {
    'use strict';

    // Ensure canonical URL
    const canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = window.location.href;
        document.head.appendChild(link);
    }

    // Add structured data for search engines
    const addSchema = (data) => {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        document.head.appendChild(script);
    };

    // Organization schema
    addSchema({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "ALI Charity",
        "url": "https://minadoai.com",
        "logo": "https://minadoai.com",
        "description": "100% Transparent Blockchain Charity Platform",
        "sameAs": []
    });

    console.log('SEO Optimizer loaded');
})();