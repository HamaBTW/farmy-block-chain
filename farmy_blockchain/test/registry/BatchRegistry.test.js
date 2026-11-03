const BatchRegistry = artifacts.require("BatchRegistry");

const ERC721_ID = "0x80ac58cd";
const ERC721_METADATA_ID = "0x5b5e139f";

contract("BatchRegistry", ([regulator, other]) => {
  let registry;

  beforeEach(async () => {
    registry = await BatchRegistry.new({ from: regulator });
  });

  describe("deployment", () => {
    it("sets name and symbol", async () => {
      assert.equal(await registry.name(), "Farmy Batch");
      assert.equal(await registry.symbol(), "FBATCH");
    });

    it("makes the deployer the regulator (owner)", async () => {
      assert.equal(await registry.owner(), regulator);
      assert.notEqual(await registry.owner(), other);
    });

    it("supports ERC-721 and ERC-721 metadata", async () => {
      assert.isTrue(await registry.supportsInterface(ERC721_ID));
      assert.isTrue(await registry.supportsInterface(ERC721_METADATA_ID));
    });

    it("starts with no batches", async () => {
      assert.equal((await registry.balanceOf(regulator)).toString(), "0");
    });
  });
});
