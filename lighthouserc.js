module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["warn", {"minScore": 0}],
        "categories:accessibility": ["warn", {"minScore": 0}],
        "categories:best-practices": ["warn", {"minScore": 0}],
        "categories:seo": ["warn", {"minScore": 0}],
        "categories:pwa": "off"
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};