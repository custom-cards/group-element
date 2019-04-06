import resolve from "rollup-plugin-node-resolve";

export default {
  input: "src/main.js",
  output: {
    file: "dist/group-element-bundle.js",
    format: "umd",
    name: "GroupElement",
  },
  plugins: [resolve()],
};
