const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Granny", function () {
  let Granny, granny, owner, grandchild1;

  beforeEach(async function () {
    [owner, grandchild1] = await ethers.getSigners();
    Granny = await ethers.getContractFactory("Granny");
    granny = await Granny.deploy();
    await granny.waitForDeployment();
  });

  it("should set the owner correctly", async function () {
    expect(await granny.owner()).to.equal(owner.address);
  });

  it("should add a grandchild and increment counter", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000; // past timestamp
    await expect(
      granny.addGrandChild(grandchild1.address, "Alice", birthday)
    )
      .to.emit(granny, "NewGrandChild")
      .withArgs(grandchild1.address, "Alice", birthday);

    expect(await granny.counter()).to.equal(1);

    const data = await granny.grandchilds(grandchild1.address);
    expect(data.name).to.equal("Alice");
    expect(data.birthday).to.equal(BigInt(birthday));
    expect(data.alreadyGotMoney).to.equal(false);
    expect(data.exist).to.equal(true);
  });
});