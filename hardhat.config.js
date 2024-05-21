require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();

// const NEXT_PUBLIC_SEPOLIA_RPC = process.env.ALCHEMY_URL;

// const NEXT_PUBLIC_PRIVATE_KEY = process.env.PRIVATE_KEY;
/** @type import('hardhat/config').HardhatUserConfig */

module.exports = {
  solidity: "0.8.19",
  defaultNetwork: "sepolia",
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.ALCHEMY_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
};
