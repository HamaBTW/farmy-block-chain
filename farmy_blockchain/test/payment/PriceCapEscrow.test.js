const PriceCapEscrow = artifacts.require("PriceCapEscrow");
const FarmCoin = artifacts.require("FarmCoin");
const MockBatchRegistry = artifacts.require("MockBatchRegistry");
const { expectRevert, ZERO_ADDRESS, frm } = require("./helpers");

const State = { None: "0", Created: "1", Deposited: "2", Released: "3", Refunded: "4" };
const BATCH = 1;

contract("PriceCapEscrow", ([authority, seller, buyer, other]) => {
  let registry, coin, escrow;

  beforeEach(async () => {
    registry = await MockBatchRegistry.new();
    coin = await FarmCoin.new({ from: authority });
    escrow = await PriceCapEscrow.new(registry.address, coin.address, 20, { from: authority });
    await registry.setBatch(BATCH, frm(100), false, seller);
    await registry.setEscrow(escrow.address);
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

  describe("createSale", () => {
    it("lists a sale within the cap", async () => {
      const tx = await escrow.createSale(BATCH, frm(115), { from: seller });
      const sale = await escrow.getSale(1);
      assert.equal(sale.seller, seller);
      assert.equal(sale.state, State.Created);
      assert.equal(sale.batchId, String(BATCH));
      assert.equal(sale.buyer, ZERO_ADDRESS);
      assert.equal(sale.price, frm(115));

      const log = tx.logs[0];
      assert.equal(log.event, "SaleCreated");
      assert.equal(log.args.saleId.toString(), "1");
      assert.equal(log.args.batchId.toString(), String(BATCH));
      assert.equal(log.args.seller, seller);
      assert.equal(log.args.price.toString(), frm(115));
    });

    it("accepts a price exactly at the cap", async () => {
      await escrow.createSale(BATCH, frm(120), { from: seller });
      assert.equal((await escrow.getSale(1)).price, frm(120));
    });

    it("rejects an overpriced sale (150 > cap 120)", async () => {
      await expectRevert(escrow.createSale(BATCH, frm(150), { from: seller }), "PriceAboveCap(uint256,uint256)");
    });

    it("uses the current markup", async () => {
      await escrow.setMaxMarkup(10, { from: authority });
      await expectRevert(escrow.createSale(BATCH, frm(115), { from: seller }), "PriceAboveCap(uint256,uint256)");
      await escrow.createSale(BATCH, frm(110), { from: seller });
    });

    it("numbers sales from 1 and tracks the open sale per batch", async () => {
      await registry.setBatch(2, frm(100), false, seller);
      assert.equal((await escrow.openSaleOf(BATCH)).toString(), "0");
      await escrow.createSale(BATCH, frm(100), { from: seller });
      await escrow.createSale(2, frm(101), { from: seller });
      assert.equal((await escrow.getSale(2)).price, frm(101));
      assert.equal((await escrow.getSale(3)).state, State.None);
      assert.equal((await escrow.openSaleOf(BATCH)).toString(), "1");
      assert.equal((await escrow.openSaleOf(2)).toString(), "2");
    });

    it("reverts when the batch already has an open sale", async () => {
      await escrow.createSale(BATCH, frm(100), { from: seller });
      await expectRevert(escrow.createSale(BATCH, frm(110), { from: seller }), "BatchAlreadyListed(uint256)");
    });

    it("reverts when the caller is not the custodian", async () => {
      await expectRevert(escrow.createSale(BATCH, frm(100), { from: other }), "NotCustodian()");
    });

    it("reverts for a zero price", async () => {
      await expectRevert(escrow.createSale(BATCH, 0, { from: seller }), "ZeroPrice()");
    });

    it("reverts for an unknown batch (registry check)", async () => {
      await expectRevert(escrow.createSale(99, frm(100), { from: seller }), "UnknownBatch(uint256)");
    });
  });
});
