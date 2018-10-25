/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 * @format
 */

"use strict";
const PropTypes = require("prop-types");

import ColorPropType from "./ColorPropType";
import EdgeInsetsPropType from "./EdgeInsetsPropType";
import StyleSheetPropType from "./StyleSheetPropType";
import TextStylePropTypes from "./TextStylePropTypes";

const stylePropType = StyleSheetPropType(TextStylePropTypes);

export default {
  ellipsizeMode: PropTypes.oneOf(["head", "middle", "tail", "clip"]),
  numberOfLines: PropTypes.number,
  textBreakStrategy: PropTypes.oneOf(["simple", "highQuality", "balanced"]),
  onLayout: PropTypes.func,
  onPress: PropTypes.func,
  onLongPress: PropTypes.func,
  pressRetentionOffset: EdgeInsetsPropType,
  selectable: PropTypes.bool,
  selectionColor: ColorPropType,
  suppressHighlighting: PropTypes.bool,
  style: stylePropType,
  testID: PropTypes.string,
  nativeID: PropTypes.string,
  allowFontScaling: PropTypes.bool,
  maxFontSizeMultiplier: PropTypes.number,
  accessible: PropTypes.bool,
  adjustsFontSizeToFit: PropTypes.bool,
  minimumFontScale: PropTypes.number,
  disabled: PropTypes.bool
};
