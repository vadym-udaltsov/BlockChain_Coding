const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AccountSale", function () {
    let accountSale;
    let owner, other, another;

    beforeEach(async function () {
        [owner, other, another] = await ethers.getSigners();
        const AccountSale = await ethers.getContractFactory("AccountSale");
        accountSale = await AccountSale.deploy();
        await accountSale.waitForDeployment();
    });

    it("Should create a new account with payment >= 0.01 ETH", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });
        const account = await accountSale.accounts(owner.address);
        expect(account.owner).to.equal(owner.address);
        expect(account.level).to.equal(0);
        expect(account.sold).to.equal(false);
    });

    it("Should fail to create account without payment", async function () {
        await expect(accountSale.createAccount()).to.be.revertedWith("Insufficient payment");
    });

    it("Should fail to create a new account if already created", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });
        await expect(
            accountSale.createAccount({ value: ethers.parseEther("0.01") })
        ).to.be.revertedWith("Account already exists");
    });

    it("Should allow multiple different accounts to be created", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });
        await accountSale.connect(other).createAccount({ value: ethers.parseEther("0.01") });

        const accOwner = await accountSale.accounts(owner.address);
        const accOther = await accountSale.accounts(other.address);
        expect(accOwner.owner).to.equal(owner.address);
        expect(accOther.owner).to.equal(other.address);
    });

    it("Should level up the account and sell at level 20 with event emitted", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });

        await owner.sendTransaction({
            to: await accountSale.getAddress(),
            value: ethers.parseEther("1.0"),
        });

        const balanceBefore = await ethers.provider.getBalance(owner);

        for (let i = 0; i < 19; i++) {
            const tx = await accountSale.levelUp();
            await tx.wait();
        }
        let account = await accountSale.accounts(owner.address);
        expect(account.level).to.equal(19);
        expect(account.sold).to.equal(false);
        expect(account.owner).to.equal(owner.address);

        await expect(accountSale.levelUp())
            .to.emit(accountSale, "AccountSold")
            .withArgs(await accountSale.getAddress(), owner.address, ethers.parseEther("1.0"));

        account = await accountSale.accounts(owner.address);
        expect(account.level).to.equal(20);
        expect(account.sold).to.be.true;
        expect(account.owner).to.equal(await accountSale.getAddress());

        const balanceAfter = await ethers.provider.getBalance(owner);
        expect(balanceAfter).to.be.above(balanceBefore);
    });

    it("Should fail to level up if account is already sold", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });
        await owner.sendTransaction({
            to: await accountSale.getAddress(),
            value: ethers.parseEther("1.0"),
        });

        for (let i = 0; i < 20; i++) {
            await accountSale.levelUp();
        }

        await expect(accountSale.levelUp()).to.be.revertedWith("Account is already sold");
    });

    it("Should fail to level up if account does not exist", async function () {
        await expect(accountSale.connect(other).levelUp()).to.be.revertedWith("Account does not exist");
    });

    it("Should receive ETH directly", async function () {
        const balanceBefore = await ethers.provider.getBalance(accountSale);

        await owner.sendTransaction({
            to: await accountSale.getAddress(),
            value: ethers.parseEther("1.0"),
        });

        const balanceAfter = await ethers.provider.getBalance(accountSale);
        expect(balanceAfter).to.be.above(balanceBefore);
    });

    it("Should handle insufficient funds during sale", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });

        for (let i = 0; i < 19; i++) {
            await accountSale.levelUp();
        }

        await expect(accountSale.levelUp()).to.be.revertedWith("Insufficient funds");
    });

    it("Should not allow non-owner to create account for another user", async function () {
        await accountSale.createAccount({ value: ethers.parseEther("0.01") });
        await accountSale.connect(other).createAccount({ value: ethers.parseEther("0.01") });

        const accountOther = await accountSale.accounts(other.address);
        expect(accountOther.owner).to.equal(other.address);
    });

    it("Should fail to create account if payment is less than 0.01 ETH", async function () {
        await expect(accountSale.createAccount({ value: ethers.parseEther("0.009") })).to.be.revertedWith("Insufficient payment");
    });
});

