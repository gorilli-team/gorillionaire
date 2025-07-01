// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SmartWallet } from "./SmartWallet.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract SmartWalletFactory is Ownable {
    event SmartWalletCreated(address indexed user, address indexed smartWallet);
    event UserWalletLimitUpdated(uint256 indexed newLimit);
    
    error SmartWalletFactory__ExceededWalletLimit();

    SmartWallet[] public s_deployedSmartWallets;
    mapping(address user => SmartWallet[] smartWallets) public s_userToSmartWallets;

    uint256 public s_userWalletLimit = 1;

    constructor() Ownable(msg.sender) {}

    function createSmartWallet() public returns(SmartWallet) {
        if(s_userToSmartWallets[msg.sender].length >= s_userWalletLimit) {
            revert SmartWalletFactory__ExceededWalletLimit();
        }

        SmartWallet smartWallet = new SmartWallet(msg.sender);
        s_deployedSmartWallets.push(smartWallet);
        s_userToSmartWallets[msg.sender].push(smartWallet);

        emit SmartWalletCreated(msg.sender, address(smartWallet));

        return smartWallet;
    }

    function setUserWalletLimit(uint256 _newLimit) public onlyOwner {
        s_userWalletLimit = _newLimit;
        emit UserWalletLimitUpdated(_newLimit);
    }

    function getUserSmartWallets(address _user) public view returns(SmartWallet[] memory) {
        return s_userToSmartWallets[_user];
    }
}