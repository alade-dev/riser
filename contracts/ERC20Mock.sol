// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    constructor(string memory name, string memory symbol, address initialOwner, uint256 initialAmount) ERC20(name, symbol) {
        _mint(initialOwner, initialAmount);
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
