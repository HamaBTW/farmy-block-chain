// Shared file. Deploys Person A's BatchRegistry; the deployer becomes the regulator.
// Person B's 2_deploy_payment.js reads it with BatchRegistry.deployed() and calls setEscrow.
const BatchRegistry = artifacts.require("BatchRegistry");

module.exports = async function (deployer) {
  await deployer.deploy(BatchRegistry);
};
