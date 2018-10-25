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

const ReactPropTypes = require("prop-types");

import ColorPropType from "./ColorPropType";

const ShadowPropTypesIOS = {
  shadowColor: ColorPropType,
  shadowOffset: ReactPropTypes.shape({
    width: ReactPropTypes.number,
    height: ReactPropTypes.number
  }),
  shadowOpacity: ReactPropTypes.number,
  shadowRadius: ReactPropTypes.number
};

export default ShadowPropTypesIOS;
