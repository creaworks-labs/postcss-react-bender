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
  RULE_KEY_PURESTYLE,
  RULE_KEY_CSS_SELECTOR
} from "./const";

const REGEX_SANITIZE_VALUE = /^['"](.*)['"]$/;
/*
Expected Inputs
---------------
Text
*
*.line-through
*.line-through.gghhg_77
View.flexible
View::after
View:active
Label.Capital-fffad
Slider-Container
Carousel_Container
*/
const REGEX_IS_COMPONENT_STYLE = /((^[A-Z][^\s.:]*)|^\*)((\.|:{1,2})[a-z-A-Z_0-9]+)*$/;
const REGEX_IS_PSEUDO_STYLE = new RegExp(
  "^(:{1,2}[a-z\\-]+(\\([\\-,\\s*:.a-zA-Z0-9]*\\))*\\s*)+$"
);

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

const supportedPseudo = [];
function isPseudoStyle(selector) {
  if (!REGEX_IS_PSEUDO_STYLE.test(selector)) return false;

  if (supportedPseudo.indexOf(selector) == -1) return false;

  return true;
}

/**
 * Split given style key into component and selector parts if available.
 * @param {String} styleKey - Style key identifier of the style rule definition
 * @returns {SplitStyle} - An object containing component and selector parts.
 */
export function splitStyleKey(styleKey) {
  const component = styleKey.replace(REGEX_IS_COMPONENT_STYLE, "$1");
  const selector =
    styleKey.length > component.length
      ? styleKey.substr(component.length)
      : undefined;

  return {
    component,
    selector
  };
}

/**
 * Extract key and token type values based on supported Bender Style definitions.
 * @param {PostCSSNode} node - Current processing node
 * @returns {StyleKey} - An object containing key and tokenType values based on Bender Style rules.
 * @throws {PostCSSNodeError} - May throw error in case of invalid definitions passed.
 */
export function getStyleKey(node) {
  let styleKey;
  let token;
  let selector = node.selector;

  const { type, name, params } = node;

  // Check if node defined as style rule
  if (type === RULE_KEY_RULE || (type === "decl" && selector === undefined)) {
    // parse first character to identify rule-based token type
    if (!selector) selector = `${node.prop}:${node.value}`;

    token = selector.substr(0, 1);

    // swicth over current token types
    switch (token) {
      /**
       * Bender Supported Pseudo
       * Note: This case is not to detect css pseudos but bender pseudos
       * which is not enabled in this version.
       * Bender pseudos designed to enable React based pseudos, reserved for future use.
       */
      case RULE_TOKEN_PSEUDO:
        styleKey = selector;
        // check if processing pseudo supported by Bender?
        if (!isPseudoStyle(styleKey)) {
          // throw exception if not supported
          throw node.error(
            `Parser validation error. Unsupported bender pseudo \`${selector}\`. If you want to define pure css pseudos, try \`@css-selector\` prefix for your selectors.`,
            { word: selector }
          );
        }

        break;
      /**
       * Bender Component Style
       * Extract key if selector satisfy Bender Component style selectors.
       */
      case RULE_TOKEN_COMPONENT:
        // get rid of token key, #
        styleKey = selector.substring(1);
        // return undefined if selector is not written in Bender Component styles.
        if (!isComponentStyle(styleKey)) styleKey = undefined;
        break;
      /**
       * Bender Component Variant Styles
       * Return selector as style key if starting with * or .
       */
      case RULE_TOKEN_ASTERISK:
      case RULE_TOKEN_STYLE:
        // TODO: apply regex/checks to look for specific selector combinations that we can process on Bender.
        styleKey = selector;
        break;
      default:
        break;
    }
  } else if (type === RULE_KEY_ATRULE && name === RULE_KEY_PURESTYLE) {
    styleKey = params;
  } else if (type === RULE_KEY_ATRULE && name === RULE_KEY_CSS_SELECTOR) {
    styleKey = params;
    token = RULE_TOKEN_RAW;
  }

  if (!styleKey) {
    throw node.error(
      `Parser validation error. Invalid style key \`${selector}\`.`,
      { word: selector }
    );
  }

  return {
    styleKey,
    token
  };
}

/**
 * Extracts path breakdown pointing target location on Bender Style Tree to keep processed definitions.
 * @param {PostCSSRule} rule - Rule node definition.
 * @returns {Array} - Array containing list of string-based keys in accessory order.
 */
export function getPathBreakdownFromRule(rule) {
  /**
   *
   * @param {PostCSSRule} node - Current processing node
   * @param {Array} - Previosly processed array containing list of string-based keys in accessory order.
   * @returns {Array} - Array containing list of string-based keys in accessory order.
   */
  function _resolve(node, path) {
    // extract Bender Style key to use in tree
    const { styleKey } = getStyleKey(node);

    // check if current node has other parents other than root node?
    const hasParent = node.parent && node.parent != rule.root();
    // spread new key by prepending on previously processed paths
    const paths = [styleKey, ...path];

    // get path breakdowns for any possible parent nodes
    if (hasParent) return _resolve(node.parent, paths);

    return paths;
  }

  // walktru all parents and collate them before returning back
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
    .replace("*", "-asterisk-")
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
