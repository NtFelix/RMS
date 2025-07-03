module.exports = {
  ci: {
    collect: {
      staticDistDir: './.next',
    },
    assert: {
      "preset": "lighthouse:no-pwa",
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};