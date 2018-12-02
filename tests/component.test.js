var { processFileAndMatchSnapshot } = require("./utils");

it("process basic component styles", () => {
  return processFileAndMatchSnapshot("./tests/component.basic.scss");
});

it("process nested component based styles", () => {
  return processFileAndMatchSnapshot("./tests/component.nested.scss");
});
