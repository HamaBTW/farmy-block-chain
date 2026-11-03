// Truffle can't decode custom errors, so match the 4-byte selector of the revert data.
async function expectRevert(promise, errorSignature) {
  try {
    await promise;
  } catch (e) {
    const data = e.data?.result ?? e.data;
    const expected = web3.eth.abi.encodeFunctionSignature(errorSignature);
    assert.equal(typeof data === "string" && data.slice(0, 10), expected, `expected revert ${errorSignature}, got ${e.message}`);
    return;
  }
  assert.fail(`expected revert ${errorSignature}, but the call succeeded`);
}

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

module.exports = { expectRevert, ZERO_ADDRESS };
