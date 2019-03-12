const postcss = require("postcss");
const postscss = require("postcss-scss");
const { readFileSync } = require("fs");
const { resolve, dirname } = require("path");

const plugin = require("..");
const defaultPluginOpts = { webpack: false };
const postcssOpts = { syntax: postscss };

export function readFile(filePath) {
  const filename = /[^\\/?%*:|"<>.]/i.test(filePath[0])
    ? require.resolve(filePath)
    : resolve(dirname(__dirname), filePath);

  return readFileSync(filename, "utf-8");
}

export function processContents(contents, pluginOptions, additionalOptions) {
  return postcss([plugin({ ...defaultPluginOpts, ...pluginOptions })]).process(
    contents,
    { ...postcssOpts, ...additionalOptions }
  );
}

export function processFile(inputPath, pluginOptions, additionalOptions) {
  const contents = readFile(inputPath);

  return processContents(contents, pluginOptions, {
    ...additionalOptions,
    from: inputPath
  });
}

export function processFileAndExpect(inputPath, expectedOutput) {
  const contents = readFile(inputPath);

  return postcss([plugin(defaultPluginOpts)])
    .process(contents, { ...postcssOpts, from: inputPath })
    .then(result => {
      expect(result.bender).toEqual(expectedOutput);
      expect(result.warnings().length).toBe(0);
    });
}

export function processFileAndMatchSnapshot(inputPath) {
  const contents = readFile(inputPath);

  return postcss([plugin(defaultPluginOpts)])
    .process(contents, { ...postcssOpts, from: inputPath })
    .then(result => {
      expect(result.bender).toMatchSnapshot();
      expect(result.warnings().length).toBe(0);
    });
}
