// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract AccountSale {
    struct Account {
        address owner;
        uint256 level;
        bool sold;
    }

    mapping(address => Account) public accounts;

    event AccountCreated(address indexed owner, uint256 level);
    event AccountSold(
        address indexed buyer,
        address indexed seller,
        uint256 price
    );

    function createAccount() public payable {
        require(msg.value >= 0.01 ether, "Insufficient payment");
        require(
            accounts[msg.sender].owner == address(0),
            "Account already exists"
        );

        accounts[msg.sender] = Account(msg.sender, 0, false);
        emit AccountCreated(msg.sender, 0);
    }

    function levelUp() public {
        require(
            accounts[msg.sender].owner != address(0),
            "Account does not exist"
        );
        require(!accounts[msg.sender].sold, "Account is already sold");

        accounts[msg.sender].level++;

        if (accounts[msg.sender].level >= 20) {
            address buyer = address(this);
            require(buyer.balance >= 1 ether, "Insufficient funds");

            address seller = accounts[msg.sender].owner;

            payable(seller).transfer(1 ether);

            accounts[msg.sender].sold = true;
            accounts[msg.sender].owner = buyer;

            emit AccountSold(buyer, seller, 1 ether);
        }
    }

    receive() external payable {}
}
