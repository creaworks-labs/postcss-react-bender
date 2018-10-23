import {
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_STYLE,
  RULE_KEY_RULE,
  RULE_KEY_ATRULE,
  RULE_KEY_PURESTYLE
} from "./const";

const valueSanitizeRe = /^['"](.*)['"]$/;

export function isStringValue(value) {
  return valueSanitizeRe.test(value);
}

export function sanitizeValue(value) {
  if (!value) return "";

  return value.trim().replace(valueSanitizeRe, "$1");
}

export function getStyleKey(node) {
  let styleKey;
  const { type, selector, name, params } = node;

  if (type === RULE_KEY_RULE) {
    const typeToken = selector.substr(0, 1);

    switch (typeToken) {
      case RULE_TOKEN_COMPONENT:
        styleKey = selector.substring(1);
        break;
      case RULE_TOKEN_STYLE:
        styleKey = selector;
        break;
    }
  } else if (type === RULE_KEY_ATRULE && name === RULE_KEY_PURESTYLE) {
    styleKey = params;
  }

  return styleKey;
}

export function getPathBreakdown(rule, root) {
  function _resolve(node, path) {
    const styleKey = getStyleKey(node);
    const hasParent = node.parent && node.parent != root;
    const paths = [styleKey, ...path];

    if (hasParent) return _resolve(node.parent, paths);

    return paths;
  }

  return _resolve(rule, []);
}