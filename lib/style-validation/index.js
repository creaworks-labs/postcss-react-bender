"use strict";

const { map } = require("lodash");
const ReactPropTypesSecret = require("prop-types/lib/ReactPropTypesSecret");

import ImageStylePropTypes from "./ImageStylePropTypes";
import TextStylePropTypes from "./TextStylePropTypes";
import ViewStylePropTypes from "./ViewStylePropTypes";

const StyleTypes = {
  STYLE_IMAGE: ":image",
  STYLE_TEXT: ":text",
  STYLE_VIEW: ":view"
};

const typesMap = {
  [StyleTypes.STYLE_IMAGE]: ImageStylePropTypes,
  [StyleTypes.STYLE_TEXT]: TextStylePropTypes,
  [StyleTypes.STYLE_VIEW]: ViewStylePropTypes
};

/**
 * Assert that the values match with the type specs.
 * Error messages are memorized and will only be shown once.
 *
 * @param {object} typeSpecs Map of name to a ReactPropType
 * @param {object} values Runtime values that need to be type-checked
 * @param {string} location e.g. "prop", "context", "child context"
 * @param {string} componentName Name of the component for error messages.
 * @private
 */
function checkPropTypes(typeSpecs, values, location, componentName) {
  for (var typeSpecName in typeSpecs) {
    if (typeSpecs.hasOwnProperty(typeSpecName)) {
      var error;
      // Prop type validation may throw. In case they do, we don't want to
      // fail the render phase where it didn't fail before. So we log it.
      // After these have been cleaned up, we'll let them throw.
      try {
        // This is intentionally an invariant that gets caught. It's the same
        // behavior as without this statement except with a better message.
        if (typeof typeSpecs[typeSpecName] !== "function") {
          var err = Error(
            (componentName || "React class") +
              ": " +
              location +
              " type `" +
              typeSpecName +
              "` is invalid; " +
              "it must be a function, usually from the `prop-types` package, but received `" +
              typeof typeSpecs[typeSpecName] +
              "`."
          );
          err.name = "Invariant Violation";
          throw err;
        }
        error = typeSpecs[typeSpecName](
          values,
          typeSpecName,
          componentName,
          location,
          null,
          ReactPropTypesSecret
        );
      } catch (ex) {
        error = ex;
      }
      if (error && !(error instanceof Error)) {
        throw new Error(
          (componentName || "React class") +
            ": type specification of " +
            location +
            " `" +
            typeSpecName +
            "` is invalid; the type checker " +
            "function must return `null` or an `Error` but returned a " +
            typeof error +
            ". " +
            "You may have forgotten to pass an argument to the type checker " +
            "creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and " +
            "shape all require an argument)."
        );
      }
      if (error instanceof Error) {
        // Only monitor this failure once because there tends to be a lot of the
        // same error.
        // loggedTypeFailures[error.message] = true;

        error.typeSpecName = typeSpecName;
        error.componentName = componentName;
        error.location = location;
        error.values = values;

        throw error;
        // printWarning(
        //   'Failed ' + location + ' type: ' + error.message
        // );
      }
    }
  }
}

function validate(hash, definitions, optionalStrictType) {
  const checkAll = optionalStrictType == null;

  const checkTypes = checkAll
    ? [StyleTypes.STYLE_IMAGE, StyleTypes.STYLE_TEXT, StyleTypes.STYLE_VIEW]
    : [optionalStrictType];

  const validated = map(checkTypes, type => {
    const types = typesMap[type];

    checkPropTypes(types, definitions, "attributes", hash);
  });

  return validated;
}

export { validate, StyleTypes };