import { getPropertyName, getStylesForProperty } from "css-to-react-native";
import { forEach, filter, reduce } from "lodash";

import { validate } from "./style-validation";
import {
  RULE_TOKEN_COMPONENT,
  RULE_TOKEN_STYLE,
  RULE_KEY_RULE,
  RULE_KEY_ATRULE,
  RULE_KEY_PURESTYLE,
  RULE_KEY_STYLE_PROPS
} from "./const";

const valueSanitizeRe = /^['"](.*)['"]$/;

function sanitizeValue(value) {
  if (!value) return "";

  return value.trim().replace(valueSanitizeRe, "$1");
}

function getStyleKey(node) {
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

function getPathBreakdown(rule, root) {
  function _resolve(node, path) {
    const styleKey = getStyleKey(node);
    const hasParent = node.parent && node.parent != root;
    const paths = [styleKey, ...path];

    if (hasParent) return _resolve(node.parent, paths);

    return paths;
  }

  return _resolve(rule, []);
}

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
    // console.log('styles', styleKey, processedProps);
    validate(styleKey, processedProps);
  } catch (error) {

    throw declarations[0].parent.error("Parser validation error. " + error.message, { word: error.typeSpecName });
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

  // const pureStyles = processStyleDefs(filter(rule.nodes, { type: RULE_KEY_ATRULE, name: RULE_KEY_PURESTYLE }));

  return {
    path,
    value
    // pureStyles
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
