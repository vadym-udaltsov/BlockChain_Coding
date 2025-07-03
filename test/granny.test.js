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

  it("should revert when birthday is 0", async function () {
    await expect(
      granny.addGrandChild(grandchild1.address, "Bob", 0)
    ).to.be.revertedWith("Something is wrong with the date of birth!");
  });

  it("should revert when adding the same grandchild twice", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;
    await granny.addGrandChild(grandchild1.address, "Bob", birthday);
    await expect(
      granny.addGrandChild(grandchild1.address, "Bob", birthday)
    ).to.be.revertedWith("There is already such a grandchild!");
  });

  it("should revert when non-owner tries to add grandchild", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;
    await expect(
      granny.connect(grandchild1).addGrandChild(grandchild1.address, "Bob", birthday)
    ).to.be.revertedWith("Only owner can do this action.");
  });

  it("should accept ETH and return correct balance", async function () {
    const value = ethers.parseEther("1");
    await owner.sendTransaction({ to: await granny.getAddress(), value });

    const balance = await granny.balanceOf();
    expect(balance).to.equal(value);
  });

  it("should allow grandchild to withdraw money", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;

    await owner.sendTransaction({
      to: await granny.getAddress(),
      value: ethers.parseEther("1"),
    });

    await granny.addGrandChild(grandchild1.address, "Alice", birthday);

    await expect(granny.connect(grandchild1).withdraw())
      .to.emit(granny, "GotMoney")
      .withArgs(grandchild1.address);
  });

  it("should revert if caller is not a grandchild", async function () {
    await expect(granny.connect(grandchild1).withdraw()).to.be.revertedWith(
      "There is not such grandchild!"
    );
  });

  it("should revert if birthday hasn't arrived", async function () {
    const future = Math.floor(Date.now() / 1000) + 5000;
    await granny.addGrandChild(grandchild1.address, "Tim", future);
    await expect(granny.connect(grandchild1).withdraw()).to.be.revertedWith(
      "Birthday hasn't arrived yet!"
    );
  });

  it("should revert if grandchild already withdrew", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;
    await owner.sendTransaction({
      to: await granny.getAddress(),
      value: ethers.parseEther("1"),
    });
    await granny.addGrandChild(grandchild1.address, "Tim", birthday);
    await granny.connect(grandchild1).withdraw();
    await expect(granny.connect(grandchild1).withdraw()).to.be.revertedWith(
      "You have already received money!"
    );
  });

  it("should return paginated grandchild list", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;

    for (let i = 0; i < 3; i++) {
      const newWallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({
        to: newWallet.address,
        value: ethers.parseEther("1"),
      });
      await granny.addGrandChild(newWallet.address, `Child${i}`, birthday);
    }

    const page = await granny.readGrandChildsArray(0, 2);
    expect(page.length).to.equal(2);
  });
});