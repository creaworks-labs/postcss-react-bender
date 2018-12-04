var { processFileAndMatchSnapshot } = require("../utils");

it("process basic component styles", () => {
  return processFileAndMatchSnapshot("./tests/component/fixtures/basic.scss");
});

it("process nested component based styles", () => {
  return processFileAndMatchSnapshot("./tests/component/fixtures/nested.scss");
});

it("process asterisk-ed component alternate styles", () => {
  return processFileAndMatchSnapshot("./tests/component/fixtures/asterisk.scss");
});
