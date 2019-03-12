import postcss from "postcss";
import pluginImports from "postcss-import";
import pluginDefineProps from "postcss-define-property";
import pluginNestedVars from "postcss-nested-vars";
import pluginAtFor from "postcss-for";
import pluginAtIf from "postcss-conditionals";

import extendInternal from "./lib/extend";
import { atRules, rules, cleanup, rulesPreprocess } from "./lib/plugin";

/**
 * opts: { allowShorthands: ?boolean, webpack: ?boolean }
 */
module.exports = postcss.plugin("postcss-react-bender", function(opts) {
  const pluginOptions = { allowShorthand:true, webpack:false, ...opts };

  return postcss([
    pluginImports,
    pluginDefineProps,
    pluginNestedVars,
    pluginAtFor({
      resolve: pluginOptions.webpack ? require('./resolve-id'): undefined
    }),
    pluginAtIf,
    extendInternal
  ]).use((root, result) => {
    // Bender style tree
    let tree = {};

    // process all atrule typed nodes in order to resolve all 
    // @extend or @css-selector definitions first.
    root.walkAtRules(rule => atRules({ rule, tree }, pluginOptions));

    // Preprocess combined/multiple component level rule definitions 
    // and re-aling them as one unique rule.
    root.each(rule => rulesPreprocess({ rule, tree }, pluginOptions));

    // Process nodes to extract Bender styles to style tree 
    // or modify original rule definition to create css values.
    root.walkRules(rule => rules({ rule, tree }, pluginOptions));

    // Final cleanup process to remove unnecessary empty nodes 
    // and non-processed leftovers.
    root.walkRules(rule => cleanup(rule, pluginOptions));

    // expose generated tree to plugin consumers.
    result.bender = tree;
  });
});
