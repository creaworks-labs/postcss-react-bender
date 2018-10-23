import postcss from "postcss";
import pluginImports from "postcss-import";
import pluginDefineProps from "postcss-define-property";
import pluginNestedVars from "postcss-nested-vars";
import pluginAtFor from "postcss-for";
import pluginAtIf from "postcss-conditionals";

import extendInternal from "./extend";
import { atRules, rules } from "./plugin";

module.exports = postcss.plugin("postcss-react-bender", function(opts) {
  opts = opts || {};

  let tree = {};

  return postcss([
    pluginImports,
    pluginDefineProps,
    pluginNestedVars,
    pluginAtFor,
    pluginAtIf,
    extendInternal
  ]).use((root, result) => {
    root.walkAtRules(rule => atRules(opts, { root, rule, tree }));
    root.walkRules(rule => rules(opts, { root, rule, tree }));

    result.json = tree;
  });
});
