const PriceCapEscrow = artifacts.require("PriceCapEscrow");
const FarmCoin = artifacts.require("FarmCoin");
const MockBatchRegistry = artifacts.require("MockBatchRegistry");
const { expectRevert, ZERO_ADDRESS } = require("./helpers");

contract("PriceCapEscrow", ([authority, other]) => {
  let registry, coin, escrow;

  beforeEach(async () => {
    registry = await MockBatchRegistry.new();
    coin = await FarmCoin.new({ from: authority });
    escrow = await PriceCapEscrow.new(registry.address, coin.address, 20, { from: authority });
  });

  describe("deployment", () => {
    it("stores registry, coin, markup and authority", async () => {
      assert.equal(await escrow.registry(), registry.address);
      assert.equal(await escrow.coin(), coin.address);
      assert.equal((await escrow.maxMarkupPercent()).toString(), "20");
      assert.equal(await escrow.owner(), authority);
    });

    it("emits MarkupChanged for the initial markup", async () => {
      const events = await escrow.getPastEvents("MarkupChanged", { fromBlock: 0 });
      assert.equal(events.length, 1);
      assert.equal(events[0].args.percent.toString(), "20");
    });

    it("reverts for a zero registry or coin", async () => {
      await expectRevert(PriceCapEscrow.new(ZERO_ADDRESS, coin.address, 20), "ZeroAddress()");
      await expectRevert(PriceCapEscrow.new(registry.address, ZERO_ADDRESS, 20), "ZeroAddress()");
    });
  });

  describe("setMaxMarkup", () => {
    it("lets the authority change the markup", async () => {
      const tx = await escrow.setMaxMarkup(10, { from: authority });
      assert.equal((await escrow.maxMarkupPercent()).toString(), "10");
      assert.equal(tx.logs[0].event, "MarkupChanged");
      assert.equal(tx.logs[0].args.percent.toString(), "10");
    });

    it("reverts for a non-owner", async () => {
      await expectRevert(escrow.setMaxMarkup(50, { from: other }), "OwnableUnauthorizedAccount(address)");
    });
  });
});
