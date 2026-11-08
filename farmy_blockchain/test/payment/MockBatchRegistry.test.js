const MockBatchRegistry = artifacts.require("MockBatchRegistry");
const { expectRevert, frm } = require("./helpers");

contract("MockBatchRegistry", ([seller, buyer, escrow, other]) => {
  let registry;

  beforeEach(async () => {
    registry = await MockBatchRegistry.new();
    await registry.setBatch(1, frm(100), false, seller);
    await registry.setEscrow(escrow);
  });

  it("returns the state set by the test", async () => {
    assert.equal((await registry.getLastPrice(1)).toString(), frm(100));
    assert.isFalse(await registry.isValidated(1));
    assert.equal(await registry.custodianOf(1), seller);
  });

  it("updates validation and custody", async () => {
    await registry.setValidated(1, true);
    await registry.setCustodian(1, buyer);
    assert.isTrue(await registry.isValidated(1));
    assert.equal(await registry.custodianOf(1), buyer);
  });

  it("lets only the escrow record a sale price", async () => {
    await registry.recordSalePrice(1, frm(115), { from: escrow });
    assert.equal((await registry.getLastPrice(1)).toString(), frm(115));
    await expectRevert(registry.recordSalePrice(1, frm(115), { from: other }), "NotEscrow()");
  });

  it("reverts for an unknown batch, like the real registry", async () => {
    await expectRevert(registry.getLastPrice(2), "UnknownBatch(uint256)");
    await expectRevert(registry.isValidated(2), "UnknownBatch(uint256)");
    await expectRevert(registry.custodianOf(2), "UnknownBatch(uint256)");
    await expectRevert(registry.recordSalePrice(2, frm(1), { from: escrow }), "UnknownBatch(uint256)");
  });

  it("reports active until setActive(false)", async () => {
    assert.isTrue(await registry.isActive(1)); // batch 1 is set up in the file's beforeEach
    await registry.setActive(1, false);
    assert.isFalse(await registry.isActive(1));
  });
});
