import { getPropertyName, getStylesForProperty } from "css-to-react-native";
import { forEach, filter, reduce } from "lodash";

import { validate } from "./style-validation/index";
import {
  RULE_KEY_RULE,
  RULE_KEY_ATRULE,
  RULE_KEY_PURESTYLE,
  RULE_KEY_STYLE_PROPS
} from "./const";

import { sanitizeValue, getStyleKey, getPathBreakdown } from "./utils";

function processStyleProps(opts, styleKey, declarations) {
  // if (declarations == null || declarations.length == 0)
  //   return undefined;

  const processedProps = reduce(
    declarations,
    (props, { prop, value }) => {
      const propertyName = getPropertyName(prop);
      const { allowShorthand } = opts;
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

  return processedProps;
}

function setValueAtPath(setter, path, tree) {
  let leaf = tree;
  forEach(path, (key, id) => {
    const original = leaf[key] || {};

    if (id == path.length - 1) leaf[key] = setter(original);
    else leaf[key] = original;

    leaf = original;
  });
}

function processStyleRule(opts, styleRule, root) {
  if (
    styleRule == null ||
    root == null ||
    styleRule.nodes == null ||
    styleRule.nodes.length == 0
  )
    return null;

  const styleKey = getStyleKey(styleRule);
  if (!styleKey) return null;

  const path = getPathBreakdown(styleRule, root);
  const value = processStyleProps(
    opts,
    styleKey,
    filter(styleRule.nodes, { type: RULE_KEY_STYLE_PROPS })
  );

  return {
    path,
    value
  };
}

export function atRules(opts, { root, rule, tree }) {
  if (rule.type === RULE_KEY_ATRULE) {
    if (rule.name === RULE_KEY_PURESTYLE) {
      const styleKey = getStyleKey(rule);
      if (styleKey) {
        const path = getPathBreakdown(rule, root);
        const styleValues = processStyleProps(
          opts,
          styleKey,
          filter(rule.nodes, { type: RULE_KEY_STYLE_PROPS })
        );

        // console.log('pure @ ', path, styleValues)

        setValueAtPath(
          original => {
            return {
              ...original,
              ...styleValues
            };
          },
          path,
          tree
        );
      }
    }
  }
}

export function rules(opts, { root, rule, tree }) {
  // console.log('GG', rule.type, rule.selector)

  if (rule.type === RULE_KEY_RULE) {
    const processed = processStyleRule(opts, rule, root);

    if (processed) {
      const { path, value /*pureStyles*/ } = processed;
      // const paths = processed.path;
      // getPathBreakdown(rule, root);
      // todo: fix
      // const paths = rule.selector.split(' ');

      // console.log('GG', rule.type, paths)

      setValueAtPath(
        original => {
          return {
            ...original,
            ...value
            // ...pureStyles
          };
        },
        path,
        tree
      );
    }
  }
}
