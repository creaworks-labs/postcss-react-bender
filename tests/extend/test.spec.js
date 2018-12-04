var { processFileAndMatchSnapshot } = require("../utils");

it("process @extend definition in styles", () => {
  return processFileAndMatchSnapshot("./tests/extend/fixtures/test.scss");
});
