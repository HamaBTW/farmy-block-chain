/**
 * Truffle config for Farmy Mini (shared file: log changes in your roadmap's Decisions Log).
 * See configuration.md for the Ganache / MetaMask setup.
 */
module.exports = {
  networks: {
    // Ganache GUI: RPC 127.0.0.1:7545, network ID 5777, chain ID 1337
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777",
    },
  },

  mocha: {},

  compilers: {
    solc: {
      // Pinned for the whole project. OpenZeppelin 5.0.2 + evmVersion "paris" because
      // Ganache 7 has no Cancun/Shanghai opcodes (mcopy, push0).
      version: "0.8.24",
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "paris",
      },
    },
  },
};
