// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

/**
 * @title FamilyChoreContract
 * @notice Contract between husband and wife for chore accounting and payouts.
 *
 * Conditions:
 * - The husband (owner) receives a fixed income every week (10000)
 * - The wife (wife) adds completed chores and their cost
 * - The wife can request a payout of accumulated funds at the end of the week or an advance
 * - The husband must pay if there is enough balance
 * - The wife can save money for the next period
 */
contract FamilyChoreContract {
    address public owner; // The husband
    address public wife; // The wife

    uint256 public constant WEEKLY_ALLOWANCE = 10000;
    uint256 public lastWeekTimestamp;
    uint256 public husbandBalance;
    uint256 public wifeAccumulated;

    struct Chore {
        string description;
        uint256 reward;
        uint256 timestamp;
    }

    Chore[] public chores;
    mapping(uint256 => bool) public chorePaid;

    event ChoreAdded(
        uint256 indexed choreId,
        string description,
        uint256 reward
    );
    event Payout(address indexed to, uint256 amount);
    event AdvanceTaken(address indexed to, uint256 amount);
    event AllowanceAdded(uint256 week, uint256 amount);

    modifier onlyWife() {
        require(msg.sender == wife, "Only wife allowed");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    constructor(address _wife) {
        owner = msg.sender;
        wife = _wife;
        lastWeekTimestamp = block.timestamp;
        husbandBalance = WEEKLY_ALLOWANCE;
        emit AllowanceAdded(0, WEEKLY_ALLOWANCE);
    }

    function addChore(
        string calldata description,
        uint256 reward
    ) external onlyWife {
        chores.push(Chore(description, reward, block.timestamp));
        wifeAccumulated += reward;
        emit ChoreAdded(chores.length - 1, description, reward);
    }

    function addWeeklyAllowance() public onlyOwner {
        require(
            block.timestamp >= lastWeekTimestamp + 7 days,
            "Week has not passed yet"
        );
        husbandBalance += WEEKLY_ALLOWANCE;
        lastWeekTimestamp = block.timestamp;
        emit AllowanceAdded((block.timestamp / 1 weeks), WEEKLY_ALLOWANCE);
    }

    function requestPayout(uint256[] calldata choreIds) external onlyWife {
        uint256 total;
        for (uint256 i = 0; i < choreIds.length; i++) {
            require(!chorePaid[choreIds[i]], "Chore already paid");
            total += chores[choreIds[i]].reward;
            chorePaid[choreIds[i]] = true;
        }
        require(total <= wifeAccumulated, "Not enough accumulated");
        require(total <= husbandBalance, "Not enough husband balance");
        wifeAccumulated -= total;
        husbandBalance -= total;
        payable(wife).transfer(total);
        emit Payout(wife, total);
    }

    function takeAdvance(uint256 amount) external onlyWife {
        require(amount <= wifeAccumulated, "Not enough accumulated");
        require(amount <= husbandBalance, "Not enough husband balance");
        wifeAccumulated -= amount;
        husbandBalance -= amount;
        payable(wife).transfer(amount);
        emit AdvanceTaken(wife, amount);
    }

    function saveForNextWeek() external onlyWife {
        // Just don't request a payout -- the amount remains on the wife's balance
    }

    // Helper function to deposit ether into the contract
    receive() external payable {
        husbandBalance += msg.value;
    }
}
