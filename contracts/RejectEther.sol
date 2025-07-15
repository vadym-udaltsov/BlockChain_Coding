// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

contract RejectEther {
    receive() external payable {
        revert("I don't accept ETH");
    }
}
