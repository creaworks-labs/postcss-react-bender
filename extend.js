import postcss from "postcss";
import { find, each, reduce } from "lodash";
import {
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_STYLE,
  RULE_KEY_EXTEND,
  RULE_KEY_RULE,
  RULE_KEY_ATRULE
} from "./const";

import { isStringValue, sanitizeValue } from "./utils";

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

function findClosestUpwards(root, node, styleKey) {
  const matched = walkForStyleKey(node, styleKey);

  if (!matched && node !== root) {
    // console.log('no matches at', node.params || node.selector)
    return findClosestUpwards(root, node.parent, styleKey);
  }

  return matched;
}

function walkForStyleKey(node, styleKey) {
  const matcher = getRuleMatcherByStyleKey(styleKey);
  // console.log('looking', matcher, 'at', node.params || node.selector, 'for', styleKey);

  return find(node.nodes, matcher);
}

function findMatchingBySelector(origin, selector) {
  // console.log('findMatchingBySelector', selector);
  if (isStringValue(selector)) {
    const selectors = sanitizeValue(selector).split(" ");

    return reduce(
      selectors,
      (node, selector) => walkForStyleKey(node, selector),
      origin.root()
    );
  } else {
    return findClosestUpwards(origin.root(), origin.parent.parent, selector);
  }
}

function atRules(root, rule) {
  //TODO: check if rule defined in right styleKey
  const isAllowedContainer = rule.parent.type == "rule";

  if (!isAllowedContainer)
    throw rule.error("@extend defined in wrong place.", {
      word: rule.name || rule.params
    });

  const match = findMatchingBySelector(rule, rule.params);

  if (!match)
    throw rule.error(
      `Could not found any matches for ${rule.params} to @extend style ${rule
        .parent.selector || rule.parent.params}.`,
      { word: rule.name || rule.params }
    );

  each(match.nodes, decl => {
    rule.parent.append(decl.clone());
  });

  rule.remove();
}

module.exports = postcss.plugin("postcss-react-bender-extend", () => root => {
  root.walkAtRules(RULE_KEY_EXTEND, rule => atRules(root, rule));
});
