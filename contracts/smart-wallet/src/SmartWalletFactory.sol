// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SmartWallet } from "./SmartWallet.sol";

contract SmartWalletFactory {
    SmartWallet[] public s_deployedSmartWallets;
    mapping(address user => SmartWallet[] smartWallets) public s_userToSmartWallets;

    event SmartWalletCreated(address indexed user, address indexed smartWallet, uint256 index);

    
}