const FarmCoin = artifacts.require("FarmCoin");
const { expectRevert, ZERO_ADDRESS, frm } = require("./helpers");

contract("FarmCoin", ([authority, other, buyer]) => {
  let coin;

  beforeEach(async () => {
    coin = await FarmCoin.new({ from: authority });
  });

  describe("deployment", () => {
    it("sets name, symbol and 18 decimals", async () => {
      assert.equal(await coin.name(), "FarmCoin");
      assert.equal(await coin.symbol(), "FRM");
      assert.equal((await coin.decimals()).toString(), "18");
    });

    it("makes the deployer the market authority (owner)", async () => {
      assert.equal(await coin.owner(), authority);
    });

    it("starts with zero supply", async () => {
      assert.equal((await coin.totalSupply()).toString(), "0");
    });
  });

  describe("mint", () => {
    it("lets the authority mint to any address", async () => {
      const tx = await coin.mint(buyer, frm(115), { from: authority });
      assert.equal((await coin.balanceOf(buyer)).toString(), frm(115));
      assert.equal((await coin.totalSupply()).toString(), frm(115));

      const log = tx.logs.find((l) => l.event === "Transfer");
      assert.equal(log.args.from, ZERO_ADDRESS);
      assert.equal(log.args.to, buyer);
      assert.equal(log.args.value.toString(), frm(115));
    });

    it("reverts for a non-owner", async () => {
      await expectRevert(coin.mint(other, frm(1), { from: other }), "OwnableUnauthorizedAccount(address)");
    });

    it("reverts for the zero address", async () => {
      await expectRevert(coin.mint(ZERO_ADDRESS, frm(1), { from: authority }), "ERC20InvalidReceiver(address)");
    });
  });
});
