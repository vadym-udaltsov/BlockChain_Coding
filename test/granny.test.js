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
    const birthday = Math.floor(Date.now() / 1000) - 1000;
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

  it("should accept ETH and update bank and balance correctly", async function () {
    const value = ethers.parseEther("1");
    await owner.sendTransaction({ to: await granny.getAddress(), value });

    expect(await granny.balanceOf()).to.equal(value);
    expect(await granny.bank()).to.equal(value);
  });

  it("should allow grandchild to withdraw money and emit event", async function () {
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
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      await owner.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1"),
      });
      await granny.addGrandChild(wallet.address, `Child${i}`, birthday);
    }

    const page = await granny.readGrandChildsArray(0, 2);
    expect(page.length).to.equal(2);

    const page2 = await granny.readGrandChildsArray(2, 5);
    expect(page2.length).to.equal(1);

  });

  it("should increment counter correctly when adding multiple grandchildren", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;
    await granny.addGrandChild(grandchild1.address, "Grandchild1", birthday);

    const grandchild2 = ethers.Wallet.createRandom().connect(ethers.provider);
    await owner.sendTransaction({
      to: grandchild2.address,
      value: ethers.parseEther("1"),
    });
    await granny.addGrandChild(grandchild2.address, "Grandchild2", birthday);

    expect(await granny.counter()).to.equal(2);
  });

  it("should return empty array when cursor is beyond array length", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;
    await granny.addGrandChild(grandchild1.address, "ExtraChild", birthday);

    const result = await granny.readGrandChildsArray(10, 5);
    expect(result.length).to.equal(0);
  });

  it("should revert if ether transfer fails", async function () {
    const birthday = Math.floor(Date.now() / 1000) - 1000;


    const RejectEther = await ethers.getContractFactory("RejectEther");
    const rejectEther = await RejectEther.deploy();
    await rejectEther.waitForDeployment();


    await granny.addGrandChild(await rejectEther.getAddress(), "Rejected", birthday);


    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(await granny.getAddress());
    await attacker.waitForDeployment();


    await granny.addGrandChild(await attacker.getAddress(), "Attacker", birthday);


    await owner.sendTransaction({
      to: await granny.getAddress(),
      value: ethers.parseEther("1"),
    });

    await expect(attacker.attack()).to.be.revertedWith("Transfer failed");
  });

});
