var { processFile } = require("../utils");

describe('at-rule @import directives', () => {
  it("process complex definitions with @import directive", async () => {
    const fixture = require.resolve('./fixtures/test.scss')

    const result = await processFile(fixture);

    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
})