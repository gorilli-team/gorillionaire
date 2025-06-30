// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { SmartWallet } from "../src/SmartWallet.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract SmartWalletTest is Test {
    SmartWallet smartWallet;
    MockERC20 tokenA;
    MockERC20 tokenB;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");

    function setUp() public {
        vm.startPrank(deployer);
        smartWallet = new SmartWallet(deployer);
        tokenA = new MockERC20("TokenA", "TKNA");
        tokenB = new MockERC20("TokenB", "TKNB");
        vm.stopPrank();
    }

    function testDeposit() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        uint256 tokenABalance = smartWallet.getTokenBalance(address(tokenA));

        assertEq(tokenABalance, 100);
    }

    function testDepositShouldFailWhenNonOwner() public {
        vm.prank(user1);
        tokenA.approve(address(smartWallet), 100);

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.deposit(address(tokenA), 100);
    }
}