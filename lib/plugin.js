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
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_PSEUDO,
  RULE_TOKEN_RAW
} from "./const";

import {
  sanitizeValue,
  getStyleKey,
  getPathBreakdownFromRule,
  getPropertyName,
  getMangledSelector,
  setValueAtPath,
  splitComponentSelector
} from "./utils";

function processStyleProps(styleKey, declarations, opts) {
  const { allowShorthand, webpack } = opts;
  const isWebpack = !!webpack || false;

  const processedProps = reduce(
    declarations,
    (props, { prop, value }) => {
      const propertyName = getPropertyName(prop);

      const sanitised = sanitizeValue(value);

      const styles = getStylesForProperty(
        propertyName,
        sanitised,
        allowShorthand
      );

      return {
        ...props,
        ...styles
      };
    },
    {}
  );

  try {
    const { validated, invalidKeys } = validate(styleKey, processedProps);

    if (invalidKeys) {
      throw new Error(
        `Invalid style key(s) \`${invalidKeys.join(
          ", "
        )}\` supplied to \`${styleKey}\``
      );
    } else {
      validated.forEach(({ violations }) => {
        if (violations) throw violations;
      });
    }
  } catch (error) {
    if (error.typeSpecName)
      throw declarations[0].parent.error(
        "Parser validation error. " + error.message,
        { word: error.typeSpecName }
      );
    else
      throw declarations[0].error("Parser validation error. " + error.message, {
        word: error.typeSpecName
      });
  }

  if (isWebpack)
    return reduce(
      processedProps,
      (props, value, key) => {
        return {
          ...props,
          [hyphenateStyleName(key)]: value
        };
      },
      {}
    );

  return processedProps;
}

function processRule(rule, opts) {
  if (rule == null || rule.nodes == null || rule.nodes.length == 0) return null;

  const { key, tokenType } = getStyleKey(rule);
  if (!key) return null;

  const path = getPathBreakdownFromRule(rule);
  const value = processStyleProps(
    key,
    filter(rule.nodes, { type: RULE_KEY_STYLE_PROPS }),
    opts
  );

  return {
    path,
    value,
    token: tokenType
  };
}

function reviewAST(rule, path, value, token, opts) {
  const { webpack } = opts;
  const isWebpack = !!webpack || false;

  if (!isWebpack) return value;

  const selector = [];
  if (RULE_TOKEN_PSEUDO === token) {
    const cropped = [...path];
    const pseudo = cropped.pop();

    const mangledSelector = getMangledSelector(rule, cropped);
    selector.push(`.${mangledSelector}${pseudo}`);
  } else if (RULE_TOKEN_RAW === token) {
    const cropped = [...path];
    const raw = cropped.pop();

    const mangledSelector = getMangledSelector(rule, cropped);
    selector.push(`.${mangledSelector} ${raw}`);
  } else {
    const mangledSelector = getMangledSelector(rule, path);
    selector.push(`.${mangledSelector}`);
  }
  const nodes = map(value, (value, prop) => postcss.decl({ prop, value }));
  const __class = selector.join(" ");
  rule.root().append({
    internal: true,
    selector: __class,
    nodes,
    source: rule.source
  });

  return {
    __class
  };
}

function processValue({ rule, tree }, { path, value, token }, opts) {

  setValueAtPath(
    original => {
      return {
        ...original,
        ...reviewAST(rule, path, value, token, opts)
      };
    },
    path,
    tree
  );
}

function process({ rule, tree }, condition, opts) {
  if (rule.internal || !condition(rule)) return;

  const processed = processRule(rule, opts);

  if (processed) processValue({ rule, tree }, processed, opts);
}

//
// preprocess combined/multipe component level rule definitions
// eg. #Screen:active or #Screen to combine in to one component rule like #Screen
//
export function preprocess({ rule /*tree*/ }, condition /*opts*/) {
  const root = rule.root();
  // check if
  // - condition is falsy
  // - rule is not placed in root
  // then skip preprocessing
  if (rule === root || !condition(rule)) return;

  // extract style key from rule selector
  // output { key = Screen, tokenType = # }
  const { key, tokenType } = getStyleKey(rule);

  // skip if rule is not component style
  if (RULE_TOKEN_COMPONENT !== tokenType) return;

  // extract component name and selector if exists
  // eg. input key = View::after
  // output { component = View, selector = ::after }
  const { component, selector } = splitComponentSelector(key);

  const preprocessing = {
    // re-align parent selector as #View
    parentSelector: `${tokenType}${component}`,
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

export function atRules(entryPoint, opts) {
  process(
    entryPoint,
    rule => rule.type === RULE_KEY_ATRULE && rule.name === RULE_KEY_PURESTYLE,
    opts
  );
}

export function rulesPreprocess(entryPoint, opts) {
  preprocess(entryPoint, rule => rule.type === RULE_KEY_RULE, opts);
}
export function rules(entryPoint, opts) {
  process(entryPoint, rule => rule.type === RULE_KEY_RULE, opts);
}

export function cleanup(rule, opts) {
  const { webpack } = opts;
  const isWebpack = !!webpack || false;

  if (isWebpack && !rule.internal) rule.remove();
}
