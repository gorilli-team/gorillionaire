// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SmartWallet } from "./SmartWallet.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Factory contract for deploying Smart Wallets
 * @author Gorilli
 * @notice Allows users to create their own Smart Wallets
 */
contract SmartWalletFactory is Ownable {
    event SmartWalletCreated(address indexed user, address indexed smartWallet);
    event UserWalletLimitUpdated(uint256 indexed newLimit);
    
    error SmartWalletFactory__ExceededWalletLimit();

    SmartWallet[] public s_deployedSmartWallets;
    mapping(address user => SmartWallet[] smartWallets) public s_userToSmartWallets;

    uint256 public s_userWalletLimit = 1;

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Creates a Smart Wallet
     * @param usdc The address of the USDC contract
     * @param factoryV2 The address of the UniswapV2Factory contract
     * @dev The `owner` parameter of the SmartWallet constructor is always set to the caller of this function
     */
    function createSmartWallet(address usdc, address factoryV2) public returns(SmartWallet) {
        if(s_userToSmartWallets[msg.sender].length >= s_userWalletLimit) {
            revert SmartWalletFactory__ExceededWalletLimit();
        }

        SmartWallet smartWallet = new SmartWallet(msg.sender, usdc, factoryV2);
        s_deployedSmartWallets.push(smartWallet);
        s_userToSmartWallets[msg.sender].push(smartWallet);

        emit SmartWalletCreated(msg.sender, address(smartWallet));

        return smartWallet;
    }

    /**
     * @notice Updates the maximum number of Smart Wallets a single user can deploy
     * @param newLimit The new maximum number of Smart Wallets per user
     */
    function setUserWalletLimit(uint256 newLimit) public onlyOwner {
        s_userWalletLimit = newLimit;
        emit UserWalletLimitUpdated(newLimit);
    }

    /**
     * @notice Returns the list of Smart Wallets deployed by a given user
     * @param user The address of the user
     */
    function getUserSmartWallets(address user) public view returns(SmartWallet[] memory) {
        return s_userToSmartWallets[user];
    }
}