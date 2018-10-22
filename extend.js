const { find, isMatch, each } = require("lodash");

import {
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_STYLE,
  RULE_KEY_EXTEND,
  RULE_KEY_RULE,
  RULE_KEY_ATRULE
} from "./const";

function getRuleMatcherByStyleKey(styleKey) {
  const typeToken = styleKey.substr(0, 1);

  switch (typeToken) {
    case RULE_TOKEN_STYLE:
    case RULE_TOKEN_COMPONENT:
      return {
        type: RULE_KEY_RULE,
        selector: styleKey
      };
    default:
      return {
        type: RULE_KEY_ATRULE,
        params: styleKey
      };
  }
}

module.exports = function(root) {
  function findClosestUpwards(node, styleKey) {
    // console.log('closest', styleKey);
    const matched = find(node.nodes, styleRule => {
      const matcher = getRuleMatcherByStyleKey(styleKey);
      // console.log('m', matcher)
      return isMatch(styleRule, matcher);
    });

    if (!matched && node !== root) {
      // console.log('no matches at', node.params || node.selector)
      return findClosestUpwards(node.parent, styleKey);
    }

    return matched;
  }

  root.walkAtRules(RULE_KEY_EXTEND, rule => {

    //TODO: check if rule defined in right styleKey
    const isAllowedContainer = rule.parent.type == "rule";

    if (!isAllowedContainer)
      throw rule.error("@extend defined in wrong place.", {
        word: rule.name || rule.params
      });

    // try lookin upwards closest match
    const upwardsMatch = findClosestUpwards(rule.parent.parent, rule.params);

    if (!upwardsMatch)
      throw rule.error(
        `Could not found any matches for ${rule.params} to @extend style ${rule
          .parent.selector || rule.parent.params}.`,
        { word: rule.name || rule.params }
      );

		each(upwardsMatch.nodes, decl => {
			rule.parent.append(decl.clone());	
		});

		rule.remove();
  });
};
