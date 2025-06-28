// SPDX-License-Identifier: MIT

pragma solidity ^0.8.15;

contract Granny {
    uint8 public counter;
    uint256 public bank;
    address public owner;

    struct Grandchild {
        string name;
        uint256 birthday;
        bool alreadyGotMoney;
        bool exist;
    }

    address[] public arrGrandchilds;
    mapping(address => Grandchild) public grandchilds;

    constructor() {
        owner = msg.sender;
        counter = 0;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can do this action.");
        _;
    }

    function addGrandChild(
        address walletAddress,
        string memory name,
        uint256 birthday
    ) public onlyOwner{
        require(birthday > 0, "Something is wrong with the date of birth!");
        require(
            grandchilds[walletAddress].exist == false,
            "There is already such a grandchild!"
        );
        grandchilds[walletAddress] = (
            Grandchild(name, birthday, false, true)
        );
        arrGrandchilds.push(walletAddress);
        counter++;
        //emit NewGrandChild(walletAddress, name, birthday);
    }

    function balanceOf() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable { 
        bank += msg.value;
    }
    
}

