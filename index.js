import postcss from "postcss";
import pluginImports from "postcss-import";
import pluginDefineProps from "postcss-define-property";
import pluginNestedVars from "postcss-nested-vars";
import pluginAtFor from "postcss-for";
import pluginAtIf from "postcss-conditionals";

import extendInternal from "./lib/extend";
import { atRules, rules } from "./lib/plugin";

/**
 * opts: { allowShorthands: ?boolean }
 */
module.exports = postcss.plugin("postcss-react-bender", function(opts) {
  const pluginOptions = { allowShorthand:true, ...opts };

  return postcss([
    pluginImports,
    pluginDefineProps,
    pluginNestedVars,
    pluginAtFor,
    pluginAtIf,
    extendInternal
  ]).use((root, result) => {
    let tree = {};

    root.walkAtRules(rule => atRules(pluginOptions, { root, rule, tree }));
    root.walkRules(rule => rules(pluginOptions, { root, rule, tree }));

    result.bender = tree;
  });
});
