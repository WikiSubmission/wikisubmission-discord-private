/** @type {import("prettier").Config} */
module.exports = {
  semi: false, // no semicolons
  singleQuote: true, // use single quotes
  trailingComma: "es5", // trailing commas where valid in ES5 (objects, arrays, etc.)
  printWidth: 100, // wrap lines at 100 chars
  tabWidth: 2, // 2 spaces per tab
  useTabs: false, // use spaces, not tabs
  bracketSpacing: true, // { foo: bar }
  arrowParens: "always", // (x) => y
  endOfLine: "lf", // enforce LF line endings
};
