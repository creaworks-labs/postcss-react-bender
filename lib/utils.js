import { forEach } from "lodash";
import { interpolateName } from "loader-utils";
import path from "path";
import camelizeStyleName from "fbjs/lib/camelizeStyleName";

import {
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_STYLE,
  RULE_TOKEN_ASTERISK,
  RULE_TOKEN_PSEUDO,
  RULE_TOKEN_RAW,
  RULE_KEY_RULE,
  RULE_KEY_ATRULE,
  RULE_KEY_PURESTYLE
} from "./const";

const REGEX_SANITIZE_VALUE = /^['"](.*)['"]$/;
/*

Text
*
*.line-through
View.flexible
Label.Capital-fffad
Slider-Container

*/
const REGEX_IS_COMPONENT_STYLE = /((^[A-Z][^\s.]*)|^\*)(\.[a-z-A-Z]*)*$/;
const REGEX_IS_PSEUDO_STYLE = new RegExp(
  "^(:{1,2}[a-z\\-]+(\\([\\-,\\s*:.a-zA-Z0-9]*\\))*\\s*)+$"
);
const REGEX_IS_RAW_STYLE = /^[^:*#.\s].*$/i;

const CSS_MANGLER_ESCAPE_REGEX1 = new RegExp(
  "[^a-zA-Z0-9\\-_\u00A0-\uFFFF]",
  "g"
);
const CSS_MANGLER_ESCAPE_REGEX2 = /^((-?[0-9])|--)/;
const CSS_MANGLER_PATTERN = "[name]__[local]__[hash:base64:6]";

export function isStringValue(value) {
  return REGEX_SANITIZE_VALUE.test(value);
}

export function sanitizeValue(value) {
  if (!value) return "";

  return value.trim().replace(REGEX_SANITIZE_VALUE, "$1");
}

function isComponentStyle(selector) {
  return REGEX_IS_COMPONENT_STYLE.test(selector);
}

function isPseudoStyle(selector) {
  return REGEX_IS_PSEUDO_STYLE.test(selector);
}

function isRawStyle(selector) {
  return REGEX_IS_RAW_STYLE.test(selector);
}

export function getStyleKey(node) {
  let key;
  let tokenType;

  const { type, selector, name, params } = node;

  if (type === RULE_KEY_RULE) {
    tokenType = selector.substr(0, 1);

    switch (tokenType) {
      case RULE_TOKEN_PSEUDO:
        key = selector;
        if (!isPseudoStyle(key)) key = undefined;

        break;
      case RULE_TOKEN_COMPONENT:
        key = selector.substring(1);
        if (!isComponentStyle(key)) key = undefined;
        break;
      case RULE_TOKEN_ASTERISK:
      case RULE_TOKEN_STYLE:
        key = selector;
        break;
      default:
        key = !isRawStyle(selector) ? undefined : selector;
        tokenType = RULE_TOKEN_RAW;
        break;
    }
  } else if (type === RULE_KEY_ATRULE && name === RULE_KEY_PURESTYLE) {
    key = params;
  }

  if (!key) {
    throw new node.error(
      `Parser validation error. Invalid component style key \`${selector}\`.`,
      { word: selector }
    );
  }

  return {
    key,
    tokenType
  };
}

export function getPathBreakdownFromRule(rule) {
  function _resolve(node, path) {
    const { key } = getStyleKey(node);
    const hasParent = node.parent && node.parent != rule.root();
    const paths = [key, ...path];

    if (hasParent) return _resolve(node.parent, paths);

    return paths;
  }

  return _resolve(rule, []);
}

export function getMangledSelector(rule, pathBreakdown) {
  const filePath = rule.source.input.from;
  const localName = [...pathBreakdown].join("_");
  const name = CSS_MANGLER_PATTERN.replace(/\[local\]/gi, localName);
  const loaderContext = {
    resourcePath: filePath
  };
  const context = process.cwd();
  const loaderOptions = {
    content:
      path.relative(context, filePath).replace(/\\/g, "/") + "+" + localName,
    context
  };
  const genericName = interpolateName(loaderContext, name, loaderOptions);
  return genericName
    .replace(CSS_MANGLER_ESCAPE_REGEX1, "-")
    .replace(CSS_MANGLER_ESCAPE_REGEX2, "_$1");
}

export function getPropertyName(propName) {
  var isCustomProp = /^--\w+/.test(propName);
  if (isCustomProp) {
    return propName;
  }

  return camelizeStyleName(propName);
}

export function setValueAtPath(setter, path, tree) {
  let leaf = tree;
  forEach(path, (key, id) => {
    const original = leaf[key] || {};

    if (id == path.length - 1) leaf[key] = setter(original);
    else leaf[key] = original;

    leaf = original;
  });
}
