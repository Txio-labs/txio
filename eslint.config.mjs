import nextConfig from "eslint-config-next";

export default [
  ...nextConfig,
  {
    // Generated at build time by scripts/copy-solc.mjs (and git-ignored).
    ignores: ["public/vendor/**", "out/**", "coverage/**", "playwright-report/**", "test-results/**"],
  },
];
