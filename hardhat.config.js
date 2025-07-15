require("@nomicfoundation/hardhat-toolbox");
require("solidity-coverage");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  mocha: {
    reporter: "mocha-allure-reporter",
    reporterOptions: {
      resultsDir: "allure-results"
    }
  },
  solidity: "0.8.15",
};
