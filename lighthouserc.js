module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["warn", {"minScore": 0.6}],
        "categories:accessibility": ["warn", {"minScore": 0.8}],
        "categories:best-practices": ["warn", {"minScore": 0.8}],
        "categories:seo": ["warn", {"minScore": 0.8}],
        "categories:pwa": "off"
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};