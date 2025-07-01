// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { SmartWallet } from "../src/SmartWallet.sol";
import { SmartWalletFactory } from "../src/SmartWalletFactory.sol";

contract SmartWalletFactoryTest is Test {
    SmartWalletFactory smartWalletFactory;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");

    function setUp() public {
        vm.prank(deployer);
        smartWalletFactory = new SmartWalletFactory();
    }

    function test_createSmartWallet() public {
        vm.prank(deployer);
        SmartWallet smartWallet = smartWalletFactory.createSmartWallet();

        address smartWalletOwner = smartWallet.s_owner();

        assertEq(smartWalletOwner, deployer);
    }

    function test_createSmartWalletShouldFailIfExceededWalletLimit() public {
        vm.prank(deployer);
        smartWalletFactory.createSmartWallet();

        vm.prank(deployer);
        vm.expectRevert(SmartWalletFactory.SmartWalletFactory__ExceededWalletLimit.selector);
        smartWalletFactory.createSmartWallet();
    }

    function test_setUserWalletLimit() public {
        vm.prank(deployer);
        smartWalletFactory.setUserWalletLimit(2);

        uint256 currentUserWalletLimit = smartWalletFactory.s_userWalletLimit();

        assertEq(currentUserWalletLimit, 2);
    }

    function test_userShouldBeAbleToCreateMoreWalletsAfterUpdatingUserWalletLimit() public {
        vm.prank(user1);
        smartWalletFactory.createSmartWallet();

        vm.prank(user1);
        vm.expectRevert(SmartWalletFactory.SmartWalletFactory__ExceededWalletLimit.selector);
        smartWalletFactory.createSmartWallet();
        
        vm.prank(deployer);
        smartWalletFactory.setUserWalletLimit(2);

        vm.prank(user1);
        smartWalletFactory.createSmartWallet();

        uint256 numberOfSmartWalletsUser1 = smartWalletFactory.getUserSmartWallets(user1).length;

        assertEq(numberOfSmartWalletsUser1, 2);
    }
}