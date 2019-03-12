var { processFile } = require("../utils");

describe('component styles', () => {
  it("process basic component styles", async () => {
    const fixture = require.resolve('./fixtures/basic.scss')
  
    const result = await processFile(fixture);
  
    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
  
  it("process nested component based styles", async () => {
    const fixture = require.resolve('./fixtures/nested.scss')
  
    const result = await processFile(fixture);
  
    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
  
  it("process asterisk-ed component alternate styles", async () => {
    const fixture = require.resolve('./fixtures/asterisk.scss')
  
    const result = await processFile(fixture);
  
    expect(result.bender).toMatchSnapshot();
    expect(result.warnings().length).toBe(0);
  });
  
})
