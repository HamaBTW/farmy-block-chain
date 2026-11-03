// Shared integration tests: the real BatchRegistry (A) + FarmCoin + PriceCapEscrow (B) together.
// Covers farmy_idea1.md §7 (sale lifecycle) and every §8 demo scenario.
const BatchRegistry = artifacts.require("BatchRegistry");
const FarmCoin = artifacts.require("FarmCoin");
const PriceCapEscrow = artifacts.require("PriceCapEscrow");
const { expectRevert } = require("../registry/helpers");

const FRM = (n) => web3.utils.toWei(String(n));
const STATE = { Created: "1", Deposited: "2", Released: "3", Refunded: "4" };
const CHECKPOINT = web3.utils.soliditySha3("weight=120kg;temp=4C;loc=Sfax");

contract("Integration: BatchRegistry + PriceCapEscrow", (accounts) => {
  const [regulator, inspector, farmer, transporter, warehouse, buyer, other] = accounts;
  let registry, coin, escrow;

  beforeEach(async () => {
    registry = await BatchRegistry.new({ from: regulator });
    coin = await FarmCoin.new({ from: regulator });
    escrow = await PriceCapEscrow.new(registry.address, coin.address, 20, { from: regulator });
    await registry.setEscrow(escrow.address, { from: regulator });
    await registry.setInspector(inspector, true, { from: regulator });
    await coin.mint(buyer, FRM(1000), { from: regulator });
  });

  /** §7 steps 1–2: farmer mints at 100 FRM, transporter carries it, inspector checks it, warehouse holds it. */
  async function batchAtWarehouse({ validate }) {
    await registry.mintBatch(farmer, "ipfs://demo/tomatoes", FRM(100), { from: farmer });
    await registry.transferCustody(1, transporter, { from: farmer });
    await registry.addCheckpoint(1, CHECKPOINT, { from: inspector });
    if (validate) await registry.validateBatch(1, { from: inspector });
    await registry.transferCustody(1, warehouse, { from: transporter });
  }

  async function listAndDeposit(price) {
    await escrow.createSale(1, FRM(price), { from: warehouse });
    await coin.approve(escrow.address, FRM(price), { from: buyer });
    await escrow.deposit(1, { from: buyer });
  }

  it("§7 happy path: mint → validate → sale within cap → payment released → new last price", async () => {
    await batchAtWarehouse({ validate: true });

    // Step 4: 150 is above the cap (100 * 120% = 120)
    await expectRevert(escrow.createSale(1, FRM(150), { from: warehouse }), "PriceAboveCap(uint256,uint256)");
    // Step 5–6: 115 is accepted, buyer locks 115 FRM
    await listAndDeposit(115);
    assert.equal((await coin.balanceOf(escrow.address)).toString(), FRM(115));
    assert.equal((await coin.balanceOf(buyer)).toString(), FRM(885));

    // Step 7: custody moves to the buyer, then anyone can release
    await registry.transferCustody(1, buyer, { from: warehouse });
    const tx = await escrow.releasePayment(1, { from: other });

    assert.equal((await coin.balanceOf(warehouse)).toString(), FRM(115));
    assert.equal((await coin.balanceOf(escrow.address)).toString(), "0");
    assert.equal((await escrow.getSale(1)).state, STATE.Released);
    assert.equal(tx.logs.find((l) => l.event === "PaymentReleased").args.price.toString(), FRM(115));
    // Step 8: the registry records 115 as the new last price (PriceRecorded emitted by the registry)
    assert.equal((await registry.getLastPrice(1)).toString(), FRM(115));
    const recorded = await registry.getPastEvents("PriceRecorded", { fromBlock: tx.receipt.blockNumber, toBlock: tx.receipt.blockNumber });
    assert.equal(recorded[0].returnValues.price, FRM(115));
    console.log(`      gas: releasePayment with the real registry = ${tx.receipt.gasUsed}`);
  });

  it("price cannot keep rising: the next sale is capped from the new last price (115 → 138)", async () => {
    await batchAtWarehouse({ validate: true });
    await listAndDeposit(115);
    await registry.transferCustody(1, buyer, { from: warehouse });
    await escrow.releasePayment(1, { from: buyer });

    // The buyer (now custodian) resells: cap = 115 * 120% = 138
    await expectRevert(escrow.createSale(1, FRM(139), { from: buyer }), "PriceAboveCap(uint256,uint256)");
    await escrow.createSale(1, FRM(138), { from: buyer });
    assert.equal((await escrow.getSale(2)).price, FRM(138));
  });

  it("overpriced sale is rejected, a sale exactly at the cap is accepted", async () => {
    await batchAtWarehouse({ validate: true });
    await expectRevert(escrow.createSale(1, FRM(150), { from: warehouse }), "PriceAboveCap(uint256,uint256)");
    await expectRevert(escrow.createSale(1, FRM("120.000000000000000001"), { from: warehouse }), "PriceAboveCap(uint256,uint256)");
    await escrow.createSale(1, FRM(120), { from: warehouse });
    assert.equal((await escrow.getSale(1)).state, STATE.Created);
  });

  it("release blocked because the batch is not validated", async () => {
    await batchAtWarehouse({ validate: false });
    await listAndDeposit(115);
    await registry.transferCustody(1, buyer, { from: warehouse });
    await expectRevert(escrow.releasePayment(1, { from: buyer }), "NotValidated()");
    assert.equal((await escrow.getSale(1)).state, STATE.Deposited);
  });

  it("release blocked because custody has not moved to the buyer", async () => {
    await batchAtWarehouse({ validate: true });
    await listAndDeposit(115);
    await expectRevert(escrow.releasePayment(1, { from: buyer }), "CustodyNotMoved()");
    assert.equal((await coin.balanceOf(escrow.address)).toString(), FRM(115));
  });

  it("refund after a cancelled sale returns the FRM to the buyer", async () => {
    await batchAtWarehouse({ validate: true });
    await listAndDeposit(115);
    const tx = await escrow.refund(1, { from: warehouse });

    assert.equal((await coin.balanceOf(buyer)).toString(), FRM(1000));
    assert.equal((await coin.balanceOf(escrow.address)).toString(), "0");
    assert.equal((await escrow.getSale(1)).state, STATE.Refunded);
    assert.equal(tx.logs.find((l) => l.event === "Refunded").args.amount.toString(), FRM(115));
    // Price history is untouched and the batch can be listed again
    assert.equal((await registry.getLastPrice(1)).toString(), FRM(100));
    await escrow.createSale(1, FRM(110), { from: warehouse });
    // A refunded sale can't be released
    await expectRevert(escrow.releasePayment(1, { from: buyer }), "WrongState(uint8)");
  });

  it("buyer cannot take the money back once the goods are validated and delivered", async () => {
    await batchAtWarehouse({ validate: true });
    await listAndDeposit(115);
    await registry.transferCustody(1, buyer, { from: warehouse });
    await expectRevert(escrow.refund(1, { from: buyer }), "ReleaseConditionsMet()");
  });

  it("unauthorized addresses cannot validate, add a checkpoint, or record a sale price", async () => {
    await registry.mintBatch(farmer, "ipfs://demo/tomatoes", FRM(100), { from: farmer });
    for (const from of [farmer, other, regulator]) {
      await expectRevert(registry.validateBatch(1, { from }), "NotInspector()");
      await expectRevert(registry.addCheckpoint(1, CHECKPOINT, { from }), "NotInspector()");
    }
    // Only the escrow contract may write prices, not even the regulator or the custodian
    for (const from of [regulator, farmer, inspector, other]) {
      await expectRevert(registry.recordSalePrice(1, FRM(999), { from }), "NotEscrow()");
    }
    assert.equal((await registry.getLastPrice(1)).toString(), FRM(100));
  });

  it("a seller who is not the custodian cannot list the batch", async () => {
    await batchAtWarehouse({ validate: true });
    await expectRevert(escrow.createSale(1, FRM(110), { from: farmer }), "NotCustodian()");
  });
});
