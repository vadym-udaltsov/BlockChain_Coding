const { expect } = require("chai");
const { ethers } = require("hardhat");
const { parseEther } = require("ethers");

describe("FamilyChoreContract", function () {
    let contract, owner, wife, other;
    const WEEKLY_ALLOWANCE = 10000;

    beforeEach(async function () {
        [owner, wife, other] = await ethers.getSigners();
        const FamilyChoreContract = await ethers.getContractFactory("FamilyChoreContract");
        contract = await FamilyChoreContract.connect(owner).deploy(wife.address);
        await contract.waitForDeployment();
    });

    it("should set correct owner and wife", async function () {
        expect(await contract.owner()).to.equal(owner.address);
        expect(await contract.wife()).to.equal(wife.address);
    });

    it("should only allow wife to add chores", async function () {
        await expect(contract.connect(owner).addChore("Wash dishes", 100)).to.be.revertedWith("Only wife allowed");
        await expect(contract.connect(wife).addChore("Wash dishes", 100)).to.emit(contract, "ChoreAdded");
        expect((await contract.chores(0)).description).to.equal("Wash dishes");
        expect(await contract.wifeAccumulated()).to.equal(100);
    });

    it("should only allow owner to add weekly allowance", async function () {
        await expect(contract.connect(wife).addWeeklyAllowance()).to.be.revertedWith("Only owner allowed");
    });

    it("should not allow weekly allowance before 7 days", async function () {
        await expect(contract.connect(owner).addWeeklyAllowance()).to.be.revertedWith("Week has not passed yet");
    });

    it("should add weekly allowance after 7 days", async function () {
        await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60]);
        await ethers.provider.send("evm_mine");
        await expect(contract.connect(owner).addWeeklyAllowance()).to.emit(contract, "AllowanceAdded");
        expect(await contract.husbandBalance()).to.equal(WEEKLY_ALLOWANCE * 2);
    });

    it("should allow wife to request payout for chores", async function () {
        await contract.connect(wife).addChore("Laundry", 200);
        await contract.connect(wife).addChore("Cooking", 300);
        // Пополняем контракт эфиром для успешной выплаты
        await owner.sendTransaction({ to: await contract.getAddress(), value: parseEther("1.0") });
        const ids = [0, 1];
        const wifeBalanceBefore = await ethers.provider.getBalance(wife.address);
        await expect(contract.connect(wife).requestPayout(ids)).to.emit(contract, "Payout");
        expect(await contract.husbandBalance()).to.equal(BigInt(WEEKLY_ALLOWANCE) + parseEther("1.0") - BigInt(500));
        expect(await contract.wifeAccumulated()).to.equal(0);
        expect(await contract.chorePaid(0)).to.equal(true);
        expect(await contract.chorePaid(1)).to.equal(true);
    });

    it("should not allow payout if not enough accumulated", async function () {
        await contract.connect(wife).addChore("Laundry", 200);
        await expect(contract.connect(wife).requestPayout([0, 1])).to.be.reverted;
    });

    it("should not allow payout if not enough husband balance", async function () {
        await contract.connect(wife).addChore("Big Job", WEEKLY_ALLOWANCE + 1);
        await expect(contract.connect(wife).requestPayout([0])).to.be.revertedWith("Not enough husband balance");
    });

    it("should not allow double payout for same chore", async function () {
        await contract.connect(wife).addChore("Laundry", 200);
        await owner.sendTransaction({ to: await contract.getAddress(), value: parseEther("1.0") });
        await contract.connect(wife).requestPayout([0]);
        await expect(contract.connect(wife).requestPayout([0])).to.be.revertedWith("Chore already paid");
    });

    it("should allow wife to take advance", async function () {
        await contract.connect(wife).addChore("Ironing", 400);
        await owner.sendTransaction({ to: await contract.getAddress(), value: parseEther("1.0") });
        const wifeBalanceBefore = await ethers.provider.getBalance(wife.address);
        await expect(contract.connect(wife).takeAdvance(300)).to.emit(contract, "AdvanceTaken");
        expect(await contract.husbandBalance()).to.equal(BigInt(WEEKLY_ALLOWANCE) + parseEther("1.0") - BigInt(300));
        expect(await contract.wifeAccumulated()).to.equal(100);
    });

    it("should not allow advance if not enough accumulated", async function () {
        await contract.connect(wife).addChore("Ironing", 200);
        await expect(contract.connect(wife).takeAdvance(300)).to.be.revertedWith("Not enough accumulated");
    });

    it("should not allow advance if not enough husband balance", async function () {
        await contract.connect(wife).addChore("Big Ironing", WEEKLY_ALLOWANCE);
        await contract.connect(wife).takeAdvance(WEEKLY_ALLOWANCE);
        await contract.connect(wife).addChore("Another Big", 100);
        // Не пополняем контракт эфиром перед второй попыткой!
        expect(await contract.husbandBalance()).to.equal(0n);
        expect(await contract.wifeAccumulated()).to.equal(100);
        await expect(contract.connect(wife).takeAdvance(100)).to.be.revertedWith("Not enough husband balance");
    });

    it("should allow wife to save for next week (no payout)", async function () {
        await contract.connect(wife).addChore("Save", 500);
        // Явно вызываем saveForNextWeek для покрытия функции
        await contract.connect(wife).saveForNextWeek();
        expect(await contract.wifeAccumulated()).to.equal(500);
    });

    it("should receive ether via receive() and increase husband balance", async function () {
        const tx = await owner.sendTransaction({ to: await contract.getAddress(), value: 12345 });
        await tx.wait();
        expect(await contract.husbandBalance()).to.equal(WEEKLY_ALLOWANCE + 12345);
    });

    it("should handle requestPayout with empty array (no error, no payout)", async function () {
        await contract.connect(wife).addChore("Empty", 100);
        await expect(contract.connect(wife).requestPayout([])).to.not.be.reverted;
        // Балансы не меняются
        expect(await contract.husbandBalance()).to.equal(WEEKLY_ALLOWANCE);
        expect(await contract.wifeAccumulated()).to.equal(100);
    });

    it("should revert requestPayout with non-existent choreId", async function () {
        await contract.connect(wife).addChore("Laundry", 100);
        await expect(contract.connect(wife).requestPayout([9999])).to.be.reverted;
    });

    it("should receive ether and increase husband balance", async function () {
        await owner.sendTransaction({ to: await contract.getAddress(), value: 12345 });
        expect(await contract.husbandBalance()).to.equal(WEEKLY_ALLOWANCE + 12345);
    });

    it("should revert when non-wife tries to take advance", async function () {
        await expect(contract.connect(owner).takeAdvance(100)).to.be.revertedWith("Only wife allowed");
        await expect(contract.connect(other).takeAdvance(100)).to.be.revertedWith("Only wife allowed");
    });

    it("should revert when non-wife tries to request payout", async function () {
        await expect(contract.connect(owner).requestPayout([0])).to.be.revertedWith("Only wife allowed");
        await expect(contract.connect(other).requestPayout([0])).to.be.revertedWith("Only wife allowed");
    });

    it("should revert when non-owner tries to add weekly allowance", async function () {
        await expect(contract.connect(wife).addWeeklyAllowance()).to.be.revertedWith("Only owner allowed");
        await expect(contract.connect(other).addWeeklyAllowance()).to.be.revertedWith("Only owner allowed");
    });
});
