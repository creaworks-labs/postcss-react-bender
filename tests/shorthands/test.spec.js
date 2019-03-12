var { processFile } = require("../utils");

describe('shorthand styles', () => {
  it("process basic definitions with shorthanded props", async () => {
    const fixture = require.resolve('./fixtures/basic.scss')

    const result = await processFile(fixture);

    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });

  it("process pure style definition with shorthanded props", async () => {
    const fixture = require.resolve('./fixtures/pure.scss')

    const result = await processFile(fixture);

    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
})