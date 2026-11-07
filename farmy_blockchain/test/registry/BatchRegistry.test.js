const BatchRegistry = artifacts.require("BatchRegistry");
const { expectRevert, ZERO_ADDRESS } = require("./helpers");

const ERC721_ID = "0x80ac58cd";
const ERC721_METADATA_ID = "0x5b5e139f";
const URI = "ipfs://batch-1-tomatoes";
const PRICE = web3.utils.toWei("100"); // 100 FRM (18 decimals)
const KIND = { Land: 0, Machine: 1, Lot: 2 };
const HASH = web3.utils.soliditySha3("weight=998kg;temp=4C;loc=Sfax");

contract("BatchRegistry", ([regulator, other, inspector, escrow, farmer, transporter]) => {
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

  describe("registerAsset", () => {
    it("registers land to the farmer with URI, kind and initial price", async () => {
      const tx = await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      assert.equal(await registry.ownerOf(1), farmer);
      assert.equal(await registry.tokenURI(1), URI);
      const info = await registry.assetInfo(1);
      assert.equal(info.kind.toString(), String(KIND.Land));
      assert.equal(info.landId.toString(), "0");
      assert.equal(info.parentId.toString(), "0");
      assert.equal(info.quantity.toString(), "0");
      assert.isFalse(info.closed);
      assert.isTrue(await registry.isActive(1));

      const reg = tx.logs.find((l) => l.event === "AssetRegistered");
      assert.equal(reg.args.batchId.toString(), "1");
      assert.equal(reg.args.kind.toString(), String(KIND.Land));
      assert.equal(reg.args.to, farmer);
      const price = tx.logs.find((l) => l.event === "PriceRecorded");
      assert.equal(price.args.price.toString(), PRICE);
    });

    it("registers machines and gives each asset the next id", async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      await registry.registerAsset(other, KIND.Machine, "farmy:machine", PRICE, { from: regulator });
      assert.equal((await registry.assetInfo(2)).kind.toString(), String(KIND.Machine));
      assert.equal(await registry.ownerOf(2), other);
    });

    it("refuses lots (they come from harvest)", async () => {
      await expectRevert(registry.registerAsset(farmer, KIND.Lot, URI, PRICE, { from: regulator }), "WrongKind()");
    });

    it("is regulator only", async () => {
      await expectRevert(registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: farmer }), "OwnableUnauthorizedAccount(address)");
    });

    it("reverts for a zero price, the zero address and a price above uint128", async () => {
      await expectRevert(registry.registerAsset(farmer, KIND.Land, URI, 0, { from: regulator }), "ZeroPrice()");
      await expectRevert(registry.registerAsset(ZERO_ADDRESS, KIND.Land, URI, PRICE, { from: regulator }), "ERC721InvalidReceiver(address)");
      const tooBig = web3.utils.toBN(2).pow(web3.utils.toBN(128)).toString();
      await expectRevert(registry.registerAsset(farmer, KIND.Land, URI, tooBig, { from: regulator }), "SafeCastOverflowedUintDowncast(uint8,uint256)");
    });

    it("reverts tokenURI and assetInfo for an unknown token", async () => {
      await expectRevert(registry.tokenURI(99), "ERC721NonexistentToken(uint256)");
      await expectRevert(registry.assetInfo(99), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("harvest", () => {
    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator }); // #1 land
      await registry.registerAsset(farmer, KIND.Machine, URI, PRICE, { from: regulator }); // #2 machine
    });

    it("lets the land holder create a lot linked to the land", async () => {
      const tx = await registry.harvest(1, "farmy:olives", 1000, PRICE, { from: farmer });
      assert.equal(await registry.ownerOf(3), farmer);
      const info = await registry.assetInfo(3);
      assert.equal(info.kind.toString(), String(KIND.Lot));
      assert.equal(info.landId.toString(), "1");
      assert.equal(info.quantity.toString(), "1000");
      assert.equal((await registry.getLastPrice(3)).toString(), PRICE);
      assert.isFalse(await registry.isValidated(3));

      assert.equal(tx.logs.find((l) => l.event === "AssetRegistered").args.kind.toString(), String(KIND.Lot));
      const ev = tx.logs.find((l) => l.event === "LotHarvested");
      assert.equal(ev.args.batchId.toString(), "3");
      assert.equal(ev.args.landId.toString(), "1");
      assert.equal(ev.args.quantity.toString(), "1000");
    });

    it("refuses anyone but the land holder", async () => {
      await expectRevert(registry.harvest(1, URI, 1000, PRICE, { from: other }), "NotCustodian()");
    });

    it("only harvests from land", async () => {
      await expectRevert(registry.harvest(2, URI, 1000, PRICE, { from: farmer }), "WrongKind()");
    });

    it("reverts for a zero quantity, a zero price or an unknown land", async () => {
      await expectRevert(registry.harvest(1, URI, 0, PRICE, { from: farmer }), "ZeroQuantity()");
      await expectRevert(registry.harvest(1, URI, 1000, 0, { from: farmer }), "ZeroPrice()");
      await expectRevert(registry.harvest(99, URI, 1000, PRICE, { from: farmer }), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("transferCustody", () => {
    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
    });

    it("starts with the farmer as custodian", async () => {
      assert.equal(await registry.custodianOf(1), farmer);
    });

    it("moves custody and the NFT, and emits CustodyTransferred", async () => {
      const tx = await registry.transferCustody(1, transporter, { from: farmer });
      assert.equal(await registry.custodianOf(1), transporter);
      assert.equal(await registry.ownerOf(1), transporter);
      const ev = tx.logs.find((l) => l.event === "CustodyTransferred");
      assert.equal(ev.args.batchId.toString(), "1");
      assert.equal(ev.args.from, farmer);
      assert.equal(ev.args.to, transporter);
    });

    it("does not emit CustodyTransferred on mint", async () => {
      const tx = await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      assert.isUndefined(tx.logs.find((l) => l.event === "CustodyTransferred"));
    });

    it("emits CustodyTransferred for a plain ERC-721 transfer too", async () => {
      const tx = await registry.transferFrom(farmer, transporter, 1, { from: farmer });
      assert.equal(tx.logs.find((l) => l.event === "CustodyTransferred").args.to, transporter);
    });

    it("reverts when the caller is not the custodian", async () => {
      await expectRevert(registry.transferCustody(1, transporter, { from: other }), "ERC721IncorrectOwner(address,uint256,address)");
    });

    it("reverts for the zero address", async () => {
      await expectRevert(registry.transferCustody(1, ZERO_ADDRESS, { from: farmer }), "ERC721InvalidReceiver(address)");
    });

    it("reverts for an unknown batch", async () => {
      await expectRevert(registry.transferCustody(99, transporter, { from: farmer }), "ERC721NonexistentToken(uint256)");
      await expectRevert(registry.custodianOf(99), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("addCheckpoint", () => {
    const DATA_HASH = web3.utils.soliditySha3("weight=120kg;temp=4C;loc=Tunis;t=2026-11-03");

    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      await registry.setInspector(inspector, true, { from: regulator });
    });

    it("emits CheckpointAdded with the inspector and data hash", async () => {
      const tx = await registry.addCheckpoint(1, DATA_HASH, { from: inspector });
      const ev = tx.logs.find((l) => l.event === "CheckpointAdded");
      assert.equal(ev.args.batchId.toString(), "1");
      assert.equal(ev.args.inspector, inspector);
      assert.equal(ev.args.dataHash, DATA_HASH);
    });

    it("reverts for a non-inspector (even the custodian or regulator)", async () => {
      await expectRevert(registry.addCheckpoint(1, DATA_HASH, { from: farmer }), "NotInspector()");
      await expectRevert(registry.addCheckpoint(1, DATA_HASH, { from: regulator }), "NotInspector()");
    });

    it("reverts for a revoked inspector", async () => {
      await registry.setInspector(inspector, false, { from: regulator });
      await expectRevert(registry.addCheckpoint(1, DATA_HASH, { from: inspector }), "NotInspector()");
    });

    it("reverts for an unknown batch", async () => {
      await expectRevert(registry.addCheckpoint(99, DATA_HASH, { from: inspector }), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("checkAndValidate", () => {
    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      await registry.setInspector(inspector, true, { from: regulator });
    });

    it("starts not validated", async () => {
      assert.isFalse(await registry.isValidated(1));
    });

    it("records the check, then validates, in one transaction", async () => {
      const tx = await registry.checkAndValidate(1, HASH, { from: inspector });
      assert.isTrue(await registry.isValidated(1));
      const names = tx.logs.map((l) => l.event);
      assert.deepEqual(names, ["CheckpointAdded", "BatchValidated"]);
      assert.equal(tx.logs[0].args.dataHash, HASH);
      assert.equal(tx.logs[0].args.inspector, inspector);
      assert.equal(tx.logs[1].args.inspector, inspector);
    });

    it("keeps validation after a custody transfer", async () => {
      await registry.checkAndValidate(1, HASH, { from: inspector });
      await registry.transferCustody(1, transporter, { from: farmer });
      assert.isTrue(await registry.isValidated(1));
    });

    it("reverts for a non-inspector", async () => {
      await expectRevert(registry.checkAndValidate(1, HASH, { from: farmer }), "NotInspector()");
      await expectRevert(registry.checkAndValidate(1, HASH, { from: regulator }), "NotInspector()");
    });

    it("reverts when already validated", async () => {
      await registry.checkAndValidate(1, HASH, { from: inspector });
      await expectRevert(registry.checkAndValidate(1, HASH, { from: inspector }), "AlreadyValidated()");
    });

    it("reverts for an unknown token", async () => {
      await expectRevert(registry.checkAndValidate(99, HASH, { from: inspector }), "ERC721NonexistentToken(uint256)");
      await expectRevert(registry.isValidated(99), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("recordSalePrice / getLastPrice", () => {
    const SALE = web3.utils.toWei("115");

    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      await registry.setEscrow(escrow, { from: regulator });
    });

    it("returns the initial price after mint", async () => {
      assert.equal((await registry.getLastPrice(1)).toString(), PRICE);
    });

    it("lets the escrow record a new last price and emits PriceRecorded", async () => {
      const tx = await registry.recordSalePrice(1, SALE, { from: escrow });
      assert.equal((await registry.getLastPrice(1)).toString(), SALE);
      const ev = tx.logs.find((l) => l.event === "PriceRecorded");
      assert.equal(ev.args.batchId.toString(), "1");
      assert.equal(ev.args.price.toString(), SALE);
    });

    it("does not touch the validation flag", async () => {
      await registry.setInspector(inspector, true, { from: regulator });
      await registry.checkAndValidate(1, HASH, { from: inspector });
      await registry.recordSalePrice(1, SALE, { from: escrow });
      assert.isTrue(await registry.isValidated(1));
    });

    it("reverts for any caller other than the escrow", async () => {
      for (const from of [regulator, farmer, inspector, other]) {
        await expectRevert(registry.recordSalePrice(1, SALE, { from }), "NotEscrow()");
      }
    });

    it("reverts for everyone while no escrow is set", async () => {
      const fresh = await BatchRegistry.new({ from: regulator });
      await fresh.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      await expectRevert(fresh.recordSalePrice(1, SALE, { from: regulator }), "NotEscrow()");
    });

    it("reverts for a zero price", async () => {
      await expectRevert(registry.recordSalePrice(1, 0, { from: escrow }), "ZeroPrice()");
    });

    it("reverts for an unknown batch", async () => {
      await expectRevert(registry.recordSalePrice(99, SALE, { from: escrow }), "ERC721NonexistentToken(uint256)");
      await expectRevert(registry.getLastPrice(99), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("IBatchRegistry", () => {
    it("serves the escrow's reads through the interface ABI", async () => {
      const IBatchRegistry = artifacts.require("IBatchRegistry");
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator });
      const asInterface = await IBatchRegistry.at(registry.address);
      assert.equal((await asInterface.getLastPrice(1)).toString(), PRICE);
      assert.isFalse(await asInterface.isValidated(1));
      assert.equal(await asInterface.custodianOf(1), farmer);
      assert.isTrue(await asInterface.isActive(1));
    });
  });

  describe("splitLot", () => {
    const LOT_PRICE = web3.utils.toWei("1000");

    beforeEach(async () => {
      await registry.registerAsset(farmer, KIND.Land, URI, PRICE, { from: regulator }); // #1
      await registry.harvest(1, "farmy:olives", 1000, LOT_PRICE, { from: farmer }); // #2
      await registry.setInspector(inspector, true, { from: regulator });
    });

    it("splits into child lots that keep the land, parent, validation and URI", async () => {
      await registry.checkAndValidate(2, HASH, { from: inspector });
      const tx = await registry.splitLot(2, [600, 400], { from: farmer });
      for (const [id, qty] of [[3, "600"], [4, "400"]]) {
        assert.equal(await registry.ownerOf(id), farmer);
        const info = await registry.assetInfo(id);
        assert.equal(info.kind.toString(), String(KIND.Lot));
        assert.equal(info.landId.toString(), "1");
        assert.equal(info.parentId.toString(), "2");
        assert.equal(info.quantity.toString(), qty);
        assert.isTrue(await registry.isValidated(id));
        assert.equal(await registry.tokenURI(id), "farmy:olives");
      }
      const splits = tx.logs.filter((l) => l.event === "LotSplit");
      assert.deepEqual(splits.map((l) => [l.args.batchId.toString(), l.args.childId.toString(), l.args.quantity.toString()]), [["2", "3", "600"], ["2", "4", "400"]]);
      assert.equal(tx.logs.filter((l) => l.event === "AssetRegistered").length, 2);
    });

    it("shares the price in proportion, the last part takes the rounding", async () => {
      await registry.harvest(1, URI, 3, "100", { from: farmer }); // #3: 3 units for 100 wei
      await registry.splitLot(3, [1, 1, 1], { from: farmer }); // 33, 33, 34
      assert.equal((await registry.getLastPrice(4)).toString(), "33");
      assert.equal((await registry.getLastPrice(5)).toString(), "33");
      assert.equal((await registry.getLastPrice(6)).toString(), "34");
      await registry.splitLot(2, [600, 400], { from: farmer });
      assert.equal((await registry.getLastPrice(7)).toString(), web3.utils.toWei("600"));
      assert.equal((await registry.getLastPrice(8)).toString(), web3.utils.toWei("400"));
    });

    it("keeps an unvalidated parent's children unvalidated", async () => {
      await registry.splitLot(2, [500, 500], { from: farmer });
      assert.isFalse(await registry.isValidated(3));
    });

    it("closes the parent: no transfer, split, check or validation, but its data stays readable", async () => {
      await registry.splitLot(2, [600, 400], { from: farmer });
      assert.isFalse(await registry.isActive(2));
      assert.isTrue((await registry.assetInfo(2)).closed);
      assert.equal(await registry.custodianOf(2), farmer);
      await expectRevert(registry.transferCustody(2, other, { from: farmer }), "LotClosed()");
      await expectRevert(registry.transferFrom(farmer, other, 2, { from: farmer }), "LotClosed()");
      await expectRevert(registry.splitLot(2, [500, 500], { from: farmer }), "LotClosed()");
      await expectRevert(registry.addCheckpoint(2, HASH, { from: inspector }), "LotClosed()");
      await expectRevert(registry.checkAndValidate(2, HASH, { from: inspector }), "LotClosed()");
    });

    it("allows 2 to 10 parts that add up to the quantity", async () => {
      await expectRevert(registry.splitLot(2, [1000], { from: farmer }), "BadSplit()");
      await expectRevert(registry.splitLot(2, Array(11).fill(1).concat([989]), { from: farmer }), "BadSplit()");
      await expectRevert(registry.splitLot(2, [600, 300], { from: farmer }), "BadSplit()");
      await expectRevert(registry.splitLot(2, [1000, 0], { from: farmer }), "BadSplit()");
      await registry.splitLot(2, Array(9).fill(100).concat([100]), { from: farmer }); // exactly 10 parts
      assert.equal((await registry.assetInfo(12)).quantity.toString(), "100");
    });

    it("is holder only and lots only", async () => {
      await expectRevert(registry.splitLot(2, [600, 400], { from: other }), "NotCustodian()");
      await expectRevert(registry.splitLot(1, [600, 400], { from: farmer }), "WrongKind()");
      await expectRevert(registry.splitLot(99, [600, 400], { from: farmer }), "ERC721NonexistentToken(uint256)");
    });

    it("lets each child move to a different place", async () => {
      await registry.splitLot(2, [600, 400], { from: farmer });
      await registry.transferCustody(3, transporter, { from: farmer });
      await registry.transferCustody(4, other, { from: farmer });
      assert.equal(await registry.custodianOf(3), transporter);
      assert.equal(await registry.custodianOf(4), other);
    });
  });
});
