const { expect } = require("chai");
const { ethers } = require("hardhat");
let accounts;
let myMagicBeansContract;
const provider = ethers.provider;

describe("MagicBeans", function () {
  it("Contract should be successfully deployed, account0 is owner", async function () {
    accounts = await ethers.getSigners();
    MagicBeansContract = await ethers.getContractFactory("MagicBeans");
    myMagicBeansContract = await MagicBeansContract.deploy();
    expect(await myMagicBeansContract.owner()).to.equal(accounts[0].address);
  });

  it("Hamster has no beans for sale yet", async function () {
    await expect(
      myMagicBeansContract.connect(accounts[1]).sellHarvest()
    ).to.be.revertedWith("You have not Beans for sale!");
  });

});