// Shared file. Deploys Person B's FarmCoin + PriceCapEscrow (20% max markup) and
// authorizes the escrow on Person A's registry. The deployer is regulator and market authority.
const BatchRegistry = artifacts.require("BatchRegistry");
const FarmCoin = artifacts.require("FarmCoin");
const PriceCapEscrow = artifacts.require("PriceCapEscrow");

const MAX_MARKUP_PERCENT = 20;

module.exports = async function (deployer) {
  const registry = await BatchRegistry.deployed();
  await deployer.deploy(FarmCoin);
  const coin = await FarmCoin.deployed();
  await deployer.deploy(PriceCapEscrow, registry.address, coin.address, MAX_MARKUP_PERCENT);
  const escrow = await PriceCapEscrow.deployed();
  await registry.setEscrow(escrow.address);
};
