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

    function test_deposit() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        uint256 tokenABalance = smartWallet.getTokenBalance(address(tokenA));
        uint256 tokenCounter = smartWallet.s_tokenCounter();
        bool isTokenAInWallet = smartWallet.checkIfTokenInWallet(address(tokenA));
        address savedToken = smartWallet.getTokenByIndex(tokenCounter - 1);

        assertEq(tokenABalance, 100);
        assertEq(isTokenAInWallet, true);
        assertEq(tokenCounter, 1);
        assertEq(savedToken, address(tokenA));
    }

    function test_tokenCounterShouldNotIncreaseWhenDepositingSameToken() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 200);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        uint256 tokenCounterBefore = smartWallet.s_tokenCounter();

        vm.prank(deployer);
        smartWallet.deposit(address(tokenA), 100);

        uint256 tokenCounterAfter = smartWallet.s_tokenCounter();

        uint256 tokenABalance = smartWallet.getTokenBalance(address(tokenA));

        assertEq(tokenCounterBefore, tokenCounterAfter);
        assertEq(tokenABalance, 200);
    }

    function test_depositShouldFailWhenNonOwner() public {
        vm.prank(user1);
        tokenA.approve(address(smartWallet), 100);

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.deposit(address(tokenA), 100);
    }

    function test_withdraw() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        uint256 tokenABalanceBefore = smartWallet.getTokenBalance(address(tokenA));

        assertEq(tokenABalanceBefore, 100);

        vm.prank(deployer);
        smartWallet.withdraw(address(tokenA), 50);

        uint256 tokenABalanceAfter = smartWallet.getTokenBalance(address(tokenA));

        assertEq(tokenABalanceAfter, 50);
    }
}