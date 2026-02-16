const js = require("@eslint/js");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ["**/*.ts", "**/*.tsx"],
  rules: {
    "@typescript-eslint/no-floating-promises": "off"
  }
});
