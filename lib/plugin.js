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
  RULE_TOKEN_PSEUDO,
  RULE_TOKEN_RAW
} from "./const";

import {
  sanitizeValue,
  getStyleKey,
  getPathBreakdownFromRule,
  getPropertyName,
  getMangledSelector,
  setValueAtPath
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

export function atRules(entryPoint, opts) {
  process(
    entryPoint,
    rule => rule.type === RULE_KEY_ATRULE && rule.name === RULE_KEY_PURESTYLE,
    opts
  );
}

export function rules(entryPoint, opts) {
  process(entryPoint, rule => rule.type === RULE_KEY_RULE, opts);
}

export function cleanup(rule, opts) {
  const { webpack } = opts;
  const isWebpack = !!webpack || false;

  if (isWebpack && !rule.internal) rule.remove();
}
