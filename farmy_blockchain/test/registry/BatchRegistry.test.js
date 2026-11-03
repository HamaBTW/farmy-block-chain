const BatchRegistry = artifacts.require("BatchRegistry");
const { expectRevert, ZERO_ADDRESS } = require("./helpers");

const ERC721_ID = "0x80ac58cd";
const ERC721_METADATA_ID = "0x5b5e139f";

contract("BatchRegistry", ([regulator, other, inspector, escrow]) => {
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

  describe("setInspector", () => {
    it("grants and revokes the inspector role", async () => {
      assert.isFalse(await registry.isInspector(inspector));
      await registry.setInspector(inspector, true, { from: regulator });
      assert.isTrue(await registry.isInspector(inspector));
      await registry.setInspector(inspector, false, { from: regulator });
      assert.isFalse(await registry.isInspector(inspector));
    });

    it("reverts for a non-owner", async () => {
      await expectRevert(registry.setInspector(inspector, true, { from: other }), "OwnableUnauthorizedAccount(address)");
    });

    it("reverts for the zero address", async () => {
      await expectRevert(registry.setInspector(ZERO_ADDRESS, true, { from: regulator }), "ZeroAddress()");
    });
  });

  describe("setEscrow", () => {
    it("sets and replaces the escrow address", async () => {
      assert.equal(await registry.escrow(), ZERO_ADDRESS);
      await registry.setEscrow(escrow, { from: regulator });
      assert.equal(await registry.escrow(), escrow);
      await registry.setEscrow(other, { from: regulator });
      assert.equal(await registry.escrow(), other);
    });

    it("reverts for a non-owner", async () => {
      await expectRevert(registry.setEscrow(escrow, { from: other }), "OwnableUnauthorizedAccount(address)");
    });

    it("reverts for the zero address", async () => {
      await expectRevert(registry.setEscrow(ZERO_ADDRESS, { from: regulator }), "ZeroAddress()");
    });
  });
});
