import postcss from "postcss";
import { getStylesForProperty } from "css-to-react-native";
import { filter, reduce, map } from "lodash";
import hyphenateStyleName from "fbjs/lib/hyphenateStyleName";

import { validate } from "./style-validation/index";
import {
  RULE_KEY_RULE,
  RULE_KEY_ATRULE,
  RULE_KEY_PURESTYLE,
  RULE_KEY_STYLE_PROPS,
  RULE_KEY_CSS_SELECTOR,
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_RAW
} from "./const";

import {
  sanitizeValue,
  getStyleKey,
  getPathBreakdownFromRule,
  getPropertyName,
  getMangledSelector,
  setValueAtPath,
  splitStyleKey
} from "./utils";

/**
 * Process style properties and returns validated and processed output.
 * @param {String} selector - Style key selector which holds all declarations.
 * @param {Array<PostCSSDeclaration>} declarations - Array of declarations placed inside the given style selector.
 * @param {Boolean} allowShorthand - Flag to enable shorthands for style property definitions.
 * @returns {Object} - Object containing all validated style properties and final values.
 * @throws {PostCSSNodeError} - May throw error in case of invalid definitions passed.
 */
function processStyleProps(selector, declarations, allowShorthand) {
  const processedProps = reduce(
    declarations,
    (prevProps, declaration) => {
      const { prop, value } = declaration;

      // convert kebab-cased property names into camelCase
      // leave if prop contains custom prop name starting with --
      const propertyName = getPropertyName(prop);

      // sanitize value, trim whitespace, remove unnecessary quotes
      const sanitisedValue = sanitizeValue(value);

      try {
        // try extracting values based on propertyName using given value
        // note: one prop name can return multiple style names if shorthands enabled
        const newProps = getStylesForProperty(
          propertyName,
          sanitisedValue,
          allowShorthand
        );

        // combine new style properties into previous ones
        return {
          ...prevProps,
          ...newProps
        };
      } catch {
        throw declaration.error(`Error parsing style value "${value}"`, {
          word: value
        });
      }
    },
    {}
  );

  /*
    Style key validation process
  */
  try {
    // try validating style keys and passed values based on yoga layout props
    const { validated, invalidKeys } = validate(selector, processedProps);

    // if has any invalid style keys defined
    if (invalidKeys) {
      // then throw exception
      throw new Error(
        `Invalid style key(s) \`${invalidKeys.join(
          ", "
        )}\` supplied to \`${selector}\``
      );
    } else {
      // loop-thru to check if style keys has invalied values
      validated.forEach(({ violations }) => {
        // throw if exists, we will then catch them afterwards
        if (violations) throw violations;
      });
    }
  } catch (error) {
    // as we don't have mapping for shorthands,
    // we pick first decl parent which is rule,
    // then throw parser error related to that.
    if (error.typeSpecName)
      throw declarations[0].parent.error(
        "Parser validation error. " + error.message,
        { word: error.typeSpecName }
      );
    else
      throw declarations[0].error("Parser validation error. " + error.message);
  }

  // otherwise return validated props
  return processedProps;
}

/**
 * Process PostCSS rule definition to convert to bender rule definition and validate it.
 * @param {PostCSSRule} rule - Rule node definition.
 * @param {PluginOptions} opts - Plugin options.
 * @returns {ProcessedRule} Object containing path, value and token properties.
 */
function processRule(rule, opts) {
  const { allowShorthand, webpack } = opts;
  const isWebpack = !!webpack || false;

  // skip if
  // - rule is empty
  // - rule doesn't have any style defs
  if (rule == null || rule.nodes == null || rule.nodes.length == 0) return null;

  // extract style key and token values based on given rule
  const { styleKey, token } = getStyleKey(rule);

  // calculate path for target location on bender style tree
  const path = getPathBreakdownFromRule(rule);

  // process only style declaration typed child nodes
  const processedProps = processStyleProps(
    styleKey,
    filter(rule.nodes, { type: RULE_KEY_STYLE_PROPS }),
    allowShorthand
  );

  // if target is mobile then return processed props as is.
  if (!isWebpack)
    return {
      path,
      value: processedProps,
      token
    };

  // if target is webpack then remap style prop names to be kebab-cased
  return {
    path,
    value: reduce(
      processedProps,
      (props, value, key) => {
        return {
          ...props,
          [hyphenateStyleName(key)]: value
        };
      },
      {}
    ),
    token
  };
}

/**
 * Reviews AST and leave props as css if target is webpack and returns mangled unique class name instead.
 * @param {PostCSSRule} rule - Rule node definition.
 * @param {Array} path - Array containing list of string-based keys in accessory order.
 * @param {ProcessedRule} value - Object containing path, value and token properties.
 * @param {String} token - Token represents style definitions in bender rule syntax.
 */
function reviewAST(rule, path, value, token) {
  let selector;

  // if rule is defined to express CSS Selectors
  if (RULE_TOKEN_RAW === token) {
    // copy path array
    const cropped = [...path];

    // extract cssSelector
    const cssSelector = cropped.pop();

    // mangle cropped selector to create css class name
    const mangledSelector = getMangledSelector(rule, cropped);

    // combine mangled css class name with given css selector
    selector = `.${mangledSelector} ${cssSelector}`;
  } else {
    // mangle whole path to create unique class name
    const mangledSelector = getMangledSelector(rule, path);
    selector = `.${mangledSelector}`;
  }

  // copy bender styles into AST tree as child declarations
  const nodes = map(value, (propValue, prop) =>
    postcss.decl({ prop, value: propValue })
  );

  // append a new post css rule to root element by copying source references
  rule.root().append({
    internal: true,
    selector,
    nodes,
    source: rule.source
  });

  return {
    __class: selector
  };
}

/**
 * Process nodes to extract Bender styles to style tree or modify original rule definition to create css values.
 * @param {PluginContext} pluginContext - Context object containing current rule and output tree values.
 * @param {ProcessedRule} processedRule - Object containing path, value and token properties.
 * @param {PluginOptions} opts - Plugin options.
 */
function processValue({ rule, tree }, { path, value, token }, opts) {
  const { webpack } = opts;
  const isWebpack = !!webpack || false;

  // review AST and leave props as css if target is webpack and return class name instead
  const modified = !isWebpack ? value : reviewAST(rule, path, value, token);

  // set values at given path on bender style tree
  setValueAtPath(
    // setter function
    original => {
      return {
        ...original,
        ...modified
      };
    },
    path,
    tree
  );
}

/**
 * Process nodes to extract Bender styles to style tree or modify original rule definition to create css values.
 * @param {PluginContext} pluginContext - Context object containing current rule and output tree values.
 * @param {TestFunction} condition - Iterator function to test rule object to identify whether process it or not.
 * @param {PluginOptions} opts - Plugin options object.
 */
function process({ rule, tree }, condition, opts) {
  if (rule.internal || !condition(rule)) return false;

  const processed = processRule(rule, opts);

  if (!processed) return false;

  processValue({ rule, tree }, processed, opts);
  return true;
}

/**
 * Preprocesses combined/multiple component level rule definitions and re-aling them as one unique rule.
 * eg. #Screen:active or #Screen to combine in to one component rule like #Screen
 * @param {PluginContext} pluginContext - Context object containing current rule and output tree values.
 * @param {TestFunction} condition - Iterator function to test rule object to identify whether process it or not.
 */
function preprocess({ rule: current /*tree*/ }, condition /*opts*/) {
  let rule = current;
  const root = rule.root();
  // check if
  // - condition is falsy
  // - rule is not placed in root
  // then skip preprocessing
  if (rule.internal || rule === root || !condition(rule)) return;

  // extract style key from rule selector
  // output { styleKey = Screen, token = # }
  const { styleKey, token } = getStyleKey(rule);

  // skip if rule is not component style
  if (RULE_TOKEN_COMPONENT !== token) return;

  // extract component name and selector if exists
  // eg. input styleKey = View::after
  // output { component = View, selector = ::after }
  const { component, selector } = splitStyleKey(styleKey);

  const preprocessing = {
    // re-align parent selector as #View
    parentSelector: `${token}${component}`,
    // AST rule
    rule,
    // ::after, .bold etc
    selector
  };

  // loop through all first-level rule definitions
  root.each(firstLevelRule => {
    // skip if firstLevelRule.type is not RULE
    // or iterating rule is same as preprocessing one
    if (
      firstLevelRule === preprocessing.rule ||
      RULE_KEY_RULE !== firstLevelRule.type ||
      preprocessing.parentSelector !== firstLevelRule.selector
    )
      return true;

    // remove the processing rule from AST tree
    preprocessing.rule.remove();

    if (preprocessing.selector) {
      preprocessing.rule.selector = preprocessing.selector;
      // move rule into first level rule
      firstLevelRule.prepend(preprocessing.rule);
    } else {
      // prepend all child items of processing rule into first level rule
      firstLevelRule.prepend(preprocessing.rule.nodes);
    }

    return false;
  });
}

export function atRules(context, opts) {
  // preprocess @rules
  process(
    context,
    rule =>
      rule.type === RULE_KEY_ATRULE && rule.name === RULE_KEY_CSS_SELECTOR,
    opts
  );

  process(
    context,
    rule => rule.type === RULE_KEY_ATRULE && rule.name === RULE_KEY_PURESTYLE,
    opts
  );
}

export function rulesPreprocess(context, opts) {
  preprocess(
    context,
    rule => rule.type === RULE_KEY_RULE || rule.type === RULE_KEY_STYLE_PROPS,
    opts
  );
}
export function rules(context, opts) {
  process(context, rule => rule.type === RULE_KEY_RULE, opts);
}

/**
 * Final cleanup process to remove unnecessary empty nodes and non-processed leftovers.
 * @param {PostCSSRule} rule - Rule node definition.
 * @param {PluginOptions} opts - Plugin options.
 */
export function cleanup(rule, opts) {
  const { webpack } = opts;
  const isWebpack = !!webpack || false;

  if (rule.nodes.length === 0 || (isWebpack && !rule.internal)) rule.remove();
}
