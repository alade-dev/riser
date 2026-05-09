// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {
    FHE,
    euint64,
    externalEuint64,
    ebool
} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract RiserToken is ZamaEthereumConfig {
    string public name;
    string public symbol;
    uint8 public decimals;

    mapping(address => euint64) internal balances;
    euint64 internal _totalSupply;

    // Events cannot emit encrypted data natively without decryption, so we just emit addresses.
    event Transfer(address indexed from, address indexed to);

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
        decimals = 18;
    }

    // Mint encrypted tokens to msg.sender
    function mint(
        externalEuint64 inputEuint64,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);

        if (FHE.isInitialized(balances[msg.sender])) {
            balances[msg.sender] = FHE.add(balances[msg.sender], amount);
        } else {
            balances[msg.sender] = amount;
        }

        if (FHE.isInitialized(_totalSupply)) {
            _totalSupply = FHE.add(_totalSupply, amount);
        } else {
            _totalSupply = amount;
        }

        FHE.allowThis(balances[msg.sender]);
        FHE.allow(balances[msg.sender], msg.sender);
    }

    // Confidential transfer function
    function transfer(
        address to,
        externalEuint64 inputEuint64,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.fromExternal(inputEuint64, inputProof);
        euint64 senderBalance = balances[msg.sender];

        // Ensure the sender has enough balance
        ebool canTransfer = FHE.le(amount, senderBalance);
        euint64 transferAmount = FHE.select(
            canTransfer,
            amount,
            FHE.asEuint64(0)
        );

        // Update balances
        balances[msg.sender] = FHE.sub(senderBalance, transferAmount);

        if (FHE.isInitialized(balances[to])) {
            balances[to] = FHE.add(balances[to], transferAmount);
        } else {
            balances[to] = transferAmount;
        }

        // Allow the users to decrypt their balances
        FHE.allowThis(balances[msg.sender]);
        FHE.allowThis(balances[to]);

        FHE.allow(balances[msg.sender], msg.sender);
        FHE.allow(balances[to], to);

        emit Transfer(msg.sender, to);
    }

    function getBalance() external view returns (euint64) {
        return balances[msg.sender];
    }
}
