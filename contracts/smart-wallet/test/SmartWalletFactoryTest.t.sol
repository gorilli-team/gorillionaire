// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { SmartWallet } from "../src/SmartWallet.sol";
import { SmartWalletFactory } from "../src/SmartWalletFactory.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockUniswapV2Factory } from "./mocks/MockUniswapV2Factory.sol";

contract SmartWalletFactoryTest is Test {
    SmartWalletFactory smartWalletFactory;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");

    MockERC20 usdc;
    MockUniswapV2Factory factoryV2;

    function setUp() public {
        vm.startPrank(deployer);
        smartWalletFactory = new SmartWalletFactory();
        usdc = new MockERC20("USDC", "USDC");
        factoryV2 = new MockUniswapV2Factory();
        vm.stopPrank();
    }

    function test_createSmartWallet() public {
        vm.prank(deployer);
        SmartWallet smartWallet = smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));

        address smartWalletOwner = smartWallet.i_owner();

        assertEq(smartWalletOwner, deployer);
    }

    function test_createSmartWalletShouldFailIfExceededWalletLimit() public {
        vm.prank(deployer);
        smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));

        vm.prank(deployer);
        vm.expectRevert(SmartWalletFactory.SmartWalletFactory__ExceededWalletLimit.selector);
        smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));
    }

    function test_setUserWalletLimit() public {
        vm.prank(deployer);
        smartWalletFactory.setUserWalletLimit(2);

        uint256 currentUserWalletLimit = smartWalletFactory.s_userWalletLimit();

        assertEq(currentUserWalletLimit, 2);
    }

    function test_userShouldBeAbleToCreateMoreWalletsAfterUpdatingUserWalletLimit() public {
        vm.prank(user1);
        smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));

        vm.prank(user1);
        vm.expectRevert(SmartWalletFactory.SmartWalletFactory__ExceededWalletLimit.selector);
        smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));
        
        vm.prank(deployer);
        smartWalletFactory.setUserWalletLimit(2);

        vm.prank(user1);
        smartWalletFactory.createSmartWallet(address(usdc), address(factoryV2));

        uint256 numberOfSmartWalletsUser1 = smartWalletFactory.getUserSmartWallets(user1).length;

        assertEq(numberOfSmartWalletsUser1, 2);
    }
}