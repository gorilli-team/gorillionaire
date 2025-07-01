// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { SmartWallet } from "../src/SmartWallet.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";

contract SmartWalletTest is Test {
    SmartWallet smartWallet;
    MockERC20 tokenA;
    MockERC20 tokenB;
    MockERC20 tokenC;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");

    function setUp() public {
        vm.startPrank(deployer);
        smartWallet = new SmartWallet(deployer);
        tokenA = new MockERC20("TokenA", "TKNA");
        tokenB = new MockERC20("TokenB", "TKNB");
        tokenC = new MockERC20("TokenC", "TKNC");
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

    function test_depositShouldFailIfNotOwner() public {
        vm.prank(user1);
        tokenA.approve(address(smartWallet), 100);

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.deposit(address(tokenA), 100);
    }

    function test_depositShouldFailIfInvalidAmount() public {
        vm.prank(deployer);
        tokenA.approve(address(smartWallet), 100);

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.deposit(address(tokenA), 0);
    }

    function test_depositShouldFailIfInvalidTokenAddress() public {
        vm.prank(deployer);
        tokenA.approve(address(smartWallet), 100);

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
        smartWallet.deposit(address(0), 100);
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

    function test_withdrawShouldFailIfNotOwner() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.withdraw(address(tokenA), 50);
    }

    function test_withdrawShouldFailIfInvalidAmount() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.withdraw(address(tokenA), 0);
    }

    function test_withdrawShouldFailIfInvalidTokenAddress() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
        smartWallet.withdraw(address(0), 100);
    }

    function test_withdrawShouldFailIfTokenNotInWallet() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__TokenNotInWallet.selector);
        smartWallet.withdraw(address(tokenB), 100);
    }

    function test_withdrawShouldFailIfInsufficientBalance() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InsufficientBalance.selector);
        smartWallet.withdraw(address(tokenA), 200);
    }

    function test_withdrawAll() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        tokenB.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        smartWallet.deposit(address(tokenB), 100);
        vm.stopPrank();

        uint256 tokenABalanceBefore = smartWallet.getTokenBalance(address(tokenA));
        uint256 tokenBBalanceBefore = smartWallet.getTokenBalance(address(tokenB));

        assertEq(tokenABalanceBefore, 100);
        assertEq(tokenBBalanceBefore, 100);

        vm.prank(deployer);
        smartWallet.withdrawAll();

        uint256 tokenABalanceAfter = smartWallet.getTokenBalance(address(tokenA));
        uint256 tokenBBalanceAfter = smartWallet.getTokenBalance(address(tokenB));

        bool isTokenAInWallet = smartWallet.checkIfTokenInWallet(address(tokenA));
        bool isTokenBInWallet = smartWallet.checkIfTokenInWallet(address(tokenB));

        assertEq(tokenABalanceAfter, 0);
        assertEq(tokenBBalanceAfter, 0);
        assertEq(isTokenAInWallet, false);
        assertEq(isTokenBInWallet, false);
        assertEq(smartWallet.s_tokenCounter(), 0);
    }

    function test_withdrawAllShouldFailIfNotOwner() public {
        vm.startPrank(deployer);
        tokenA.approve(address(smartWallet), 100);
        tokenB.approve(address(smartWallet), 100);
        smartWallet.deposit(address(tokenA), 100);
        smartWallet.deposit(address(tokenB), 100);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.withdrawAll();
    }

    function test_withdrawAllShouldFailIfNoTokensToWithdraw() public {
        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__NoTokensToWithdraw.selector);
        smartWallet.withdrawAll();
    }
}