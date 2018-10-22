var { processFileAndMatchSnapshot } = require("./utils");

it.skip("process basic definitions with shorthanded props", () => {
  return processFileAndMatchSnapshot("./tests/shorthands.basic.scss");
});

it("process pure style definition with shorthanded props", () => {
  return processFileAndMatchSnapshot("./tests/shorthands.pure.scss");
});

