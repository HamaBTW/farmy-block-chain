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
});
