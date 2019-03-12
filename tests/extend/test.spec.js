var { processFile } = require("../utils");

describe('at-rule @extend', () => {
  it("process @extend definition in styles", async () => {
    const fixture = require.resolve('./fixtures/test.scss')
  
    const result = await processFile(fixture);
  
    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
  
  it("process @extend definition in styles - css", async () => {
    const fixture = require.resolve('./fixtures/test.scss')
  
    const result = await processFile(fixture, { webpack:true });
  
    expect(result.bender).toMatchSnapshot();
    expect(result.css).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
  
})
