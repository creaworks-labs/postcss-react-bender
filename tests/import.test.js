var { processFileAndMatchSnapshot } = require("./utils");

it("process complex definitions with @import directive", () => {
  return processFileAndMatchSnapshot("./tests/import.test.scss");
});