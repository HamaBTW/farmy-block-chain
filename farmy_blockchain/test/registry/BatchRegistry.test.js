const BatchRegistry = artifacts.require("BatchRegistry");
const { expectRevert, ZERO_ADDRESS } = require("./helpers");

const ERC721_ID = "0x80ac58cd";
const ERC721_METADATA_ID = "0x5b5e139f";
const URI = "ipfs://batch-1-tomatoes";
const PRICE = web3.utils.toWei("100"); // 100 FRM (18 decimals)

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

  describe("mintBatch", () => {
    it("mints to the farmer with URI and initial price", async () => {
      const tx = await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
      assert.equal(await registry.ownerOf(1), farmer);
      assert.equal(await registry.tokenURI(1), URI);
      assert.equal((await registry.balanceOf(farmer)).toString(), "1");

      const minted = tx.logs.find((l) => l.event === "BatchMinted");
      assert.equal(minted.args.batchId.toString(), "1");
      assert.equal(minted.args.farmer, farmer);
      const price = tx.logs.find((l) => l.event === "PriceRecorded");
      assert.equal(price.args.batchId.toString(), "1");
      assert.equal(price.args.price.toString(), PRICE);
    });

    it("gives each batch the next id", async () => {
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
      const tx = await registry.mintBatch(other, "ipfs://batch-2", PRICE, { from: other });
      assert.equal(tx.logs.find((l) => l.event === "BatchMinted").args.batchId.toString(), "2");
      assert.equal(await registry.ownerOf(2), other);
    });

    it("reverts for a zero price", async () => {
      await expectRevert(registry.mintBatch(farmer, URI, 0, { from: farmer }), "ZeroPrice()");
    });

    it("reverts for the zero address", async () => {
      await expectRevert(registry.mintBatch(ZERO_ADDRESS, URI, PRICE, { from: farmer }), "ERC721InvalidReceiver(address)");
    });

    it("reverts tokenURI for an unknown batch", async () => {
      await expectRevert(registry.tokenURI(99), "ERC721NonexistentToken(uint256)");
    });

    it("reverts for a price above uint128", async () => {
      const tooBig = web3.utils.toBN(2).pow(web3.utils.toBN(128)).toString();
      await expectRevert(registry.mintBatch(farmer, URI, tooBig, { from: farmer }), "SafeCastOverflowedUintDowncast(uint8,uint256)");
    });
  });

  describe("transferCustody", () => {
    beforeEach(async () => {
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
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
      const tx = await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
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
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
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

  describe("validateBatch", () => {
    beforeEach(async () => {
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
      await registry.setInspector(inspector, true, { from: regulator });
    });

    it("starts not validated", async () => {
      assert.isFalse(await registry.isValidated(1));
    });

    it("validates and emits BatchValidated", async () => {
      const tx = await registry.validateBatch(1, { from: inspector });
      assert.isTrue(await registry.isValidated(1));
      const ev = tx.logs.find((l) => l.event === "BatchValidated");
      assert.equal(ev.args.batchId.toString(), "1");
      assert.equal(ev.args.inspector, inspector);
    });

    it("keeps validation after a custody transfer", async () => {
      await registry.validateBatch(1, { from: inspector });
      await registry.transferCustody(1, transporter, { from: farmer });
      assert.isTrue(await registry.isValidated(1));
    });

    it("reverts for a non-inspector", async () => {
      await expectRevert(registry.validateBatch(1, { from: farmer }), "NotInspector()");
      await expectRevert(registry.validateBatch(1, { from: regulator }), "NotInspector()");
    });

    it("reverts when already validated", async () => {
      await registry.validateBatch(1, { from: inspector });
      await expectRevert(registry.validateBatch(1, { from: inspector }), "AlreadyValidated()");
    });

    it("reverts for an unknown batch", async () => {
      await expectRevert(registry.validateBatch(99, { from: inspector }), "ERC721NonexistentToken(uint256)");
      await expectRevert(registry.isValidated(99), "ERC721NonexistentToken(uint256)");
    });
  });

  describe("recordSalePrice / getLastPrice", () => {
    const SALE = web3.utils.toWei("115");

    beforeEach(async () => {
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
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
      await registry.validateBatch(1, { from: inspector });
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
      await fresh.mintBatch(farmer, URI, PRICE, { from: farmer });
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
      await registry.mintBatch(farmer, URI, PRICE, { from: farmer });
      const asInterface = await IBatchRegistry.at(registry.address);
      assert.equal((await asInterface.getLastPrice(1)).toString(), PRICE);
      assert.isFalse(await asInterface.isValidated(1));
      assert.equal(await asInterface.custodianOf(1), farmer);
    });
  });
});
