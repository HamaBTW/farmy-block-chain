const FarmCoin = artifacts.require("FarmCoin");
const ReentrantSeller = artifacts.require("ReentrantSeller");
const { expectRevert, frm, buyFrm } = require("./helpers");

const eth = (n) => web3.utils.toWei(String(n), "ether");
const CAP = frm(2000); // 2 ETH worth; Ganache accounts only hold 100 ETH

contract("FarmCoin", ([deployer, buyer, other]) => {
  let coin;

  beforeEach(async () => {
    coin = await FarmCoin.new(CAP, { from: deployer });
  });

  describe("deployment", () => {
    it("sets name, symbol, 18 decimals, rate and cap", async () => {
      assert.equal(await coin.name(), "FarmCoin");
      assert.equal(await coin.symbol(), "FRM");
      assert.equal((await coin.decimals()).toString(), "18");
      assert.equal((await coin.RATE()).toString(), "1000");
      assert.equal((await coin.cap()).toString(), CAP);
    });

    it("starts with no supply and no reserve", async () => {
      assert.equal((await coin.totalSupply()).toString(), "0");
      assert.equal((await coin.reserve()).toString(), "0");
    });

    it("has no free mint and no owner", async () => {
      assert.isUndefined(coin.mint);
      assert.isUndefined(coin.owner);
    });
  });

  describe("buy", () => {
    it("mints 1000 FRM per ETH and keeps the ETH as reserve", async () => {
      const tx = await coin.buy({ from: buyer, value: eth(1) });
      assert.equal((await coin.balanceOf(buyer)).toString(), frm(1000));
      assert.equal((await coin.reserve()).toString(), eth(1));
      const ev = tx.logs.find((l) => l.event === "Bought");
      assert.equal(ev.args.buyer, buyer);
      assert.equal(ev.args.ethIn.toString(), eth(1));
      assert.equal(ev.args.frmOut.toString(), frm(1000));
    });

    it("accepts a purchase exactly up to the cap", async () => {
      await coin.buy({ from: buyer, value: eth(2) });
      assert.equal((await coin.totalSupply()).toString(), CAP);
    });

    it("reverts above the cap", async () => {
      await coin.buy({ from: buyer, value: eth(2) });
      await expectRevert(coin.buy({ from: other, value: "1" }), "ERC20ExceededCap(uint256,uint256)");
    });

    it("reverts for 0 ETH", async () => {
      await expectRevert(coin.buy({ from: buyer, value: "0" }), "ZeroAmount()");
    });

    it("refuses plain ETH transfers (no receive)", async () => {
      try {
        await web3.eth.sendTransaction({ from: buyer, to: coin.address, value: eth(1) });
        assert.fail("plain ETH transfer should revert");
      } catch (e) {
        assert.notInclude(e.message, "plain ETH transfer should revert");
      }
    });
  });

  describe("sell", () => {
    beforeEach(async () => {
      await coin.buy({ from: buyer, value: eth(1) });
    });

    it("burns FRM and returns the ETH", async () => {
      const before = BigInt(await web3.eth.getBalance(buyer));
      const tx = await coin.sell(frm(400), { from: buyer });
      const gas = BigInt(tx.receipt.gasUsed) * BigInt(tx.receipt.effectiveGasPrice);
      const after = BigInt(await web3.eth.getBalance(buyer));
      assert.equal((after - before + gas).toString(), eth(0.4));
      assert.equal((await coin.balanceOf(buyer)).toString(), frm(600));
      assert.equal((await coin.reserve()).toString(), eth(0.6));
      const ev = tx.logs.find((l) => l.event === "Sold");
      assert.equal(ev.args.seller, buyer);
      assert.equal(ev.args.frmIn.toString(), frm(400));
      assert.equal(ev.args.ethOut.toString(), eth(0.4));
    });

    it("only burns whole wei worth of FRM (rounds down)", async () => {
      await coin.sell("2500", { from: buyer }); // 2500 base units → 2 wei, burns 2000
      assert.equal((await coin.balanceOf(buyer)).toString(), (BigInt(frm(1000)) - BigInt(2000)).toString());
    });

    it("reverts when the amount is worth less than 1 wei", async () => {
      await expectRevert(coin.sell("999", { from: buyer }), "ZeroAmount()");
    });

    it("reverts when selling more than the balance", async () => {
      await expectRevert(coin.sell(frm(1001), { from: buyer }), "ERC20InsufficientBalance(address,uint256,uint256)");
    });

    it("keeps reserve == totalSupply / RATE after mixed buys and sells", async () => {
      await buyFrm(coin, other, frm(500));
      await coin.sell(frm(250), { from: buyer });
      await coin.sell(frm(123), { from: other });
      const supply = BigInt(await coin.totalSupply());
      assert.equal((await coin.reserve()).toString(), (supply / BigInt(1000)).toString());
    });

    it("blocks re-entering sell during the ETH payout", async () => {
      const attacker = await ReentrantSeller.new(coin.address);
      await expectRevert(attacker.buyAndSell({ from: other, value: eth(0.5) }), "EthTransferFailed()");
    });
  });
});
