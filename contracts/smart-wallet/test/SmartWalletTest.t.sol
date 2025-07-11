// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.20;

// import { Test, console } from "forge-std/Test.sol";
// import { SmartWallet } from "../src/SmartWallet.sol";
// import { MockERC20 } from "./mocks/MockERC20.sol";
// import { MockUniswapV2Router02 } from "./mocks/MockUniswapV2Router02.sol";

// contract SmartWalletTest is Test {
//     SmartWallet smartWallet;
//     MockERC20 usdc;
//     MockERC20 tokenA;
//     MockERC20 tokenB;
//     MockERC20 tokenC;
//     MockUniswapV2Router02 mockUniswapV2Router02;

//     address deployer = makeAddr("deployer");
//     address user1 = makeAddr("user1");
//     address user2 = makeAddr("user2");
//     address operator = makeAddr("operator");

//     function setUp() public {
//         vm.startPrank(deployer);
//         smartWallet = new SmartWallet(deployer, address(usdc));
//         usdc = new MockERC20("USDC", "USDC");
//         tokenA = new MockERC20("TokenA", "TKNA");
//         tokenB = new MockERC20("TokenB", "TKNB");
//         tokenC = new MockERC20("TokenC", "TKNC");
//         mockUniswapV2Router02 = new MockUniswapV2Router02();
//         vm.stopPrank();
//     }

//     //////////////////////////////////////////
//     /////////////// DEPOSIT //////////////////
//     //////////////////////////////////////////

//     function test_deposit() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         uint256 tokenABalance = smartWallet.getTokenBalance(address(tokenA));
//         uint256 tokenCounter = smartWallet.s_tokenCounter();
//         bool isTokenAInWallet = smartWallet.checkIfTokenInWallet(address(tokenA));
//         address savedToken = smartWallet.getTokenByIndex(tokenCounter - 1);

//         assertEq(tokenABalance, 100);
//         assertEq(isTokenAInWallet, true);
//         assertEq(tokenCounter, 1);
//         assertEq(savedToken, address(tokenA));
//     }

//     function test_tokenCounterShouldNotIncreaseWhenDepositingSameToken() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 200);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         uint256 tokenCounterBefore = smartWallet.s_tokenCounter();

//         vm.prank(deployer);
//         smartWallet.deposit(address(tokenA), 100);

//         uint256 tokenCounterAfter = smartWallet.s_tokenCounter();

//         uint256 tokenABalance = smartWallet.getTokenBalance(address(tokenA));

//         assertEq(tokenCounterBefore, tokenCounterAfter);
//         assertEq(tokenABalance, 200);
//     }

//     function test_depositShouldFailIfNotOwner() public {
//         vm.prank(user1);
//         tokenA.approve(address(smartWallet), 100);

//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
//         smartWallet.deposit(address(tokenA), 100);
//     }

//     function test_depositShouldFailIfInvalidAmount() public {
//         vm.prank(deployer);
//         tokenA.approve(address(smartWallet), 100);

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
//         smartWallet.deposit(address(tokenA), 0);
//     }

//     function test_depositShouldFailIfInvalidTokenAddress() public {
//         vm.prank(deployer);
//         tokenA.approve(address(smartWallet), 100);

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
//         smartWallet.deposit(address(0), 100);
//     }

//     //////////////////////////////////////////
//     ///////////////// WITHDRAW ///////////////
//     //////////////////////////////////////////

//     function test_withdraw() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         uint256 tokenABalanceBefore = smartWallet.getTokenBalance(address(tokenA));

//         assertEq(tokenABalanceBefore, 100);

//         vm.prank(deployer);
//         smartWallet.withdraw(address(tokenA), 50);

//         uint256 tokenABalanceAfter = smartWallet.getTokenBalance(address(tokenA));

//         assertEq(tokenABalanceAfter, 50);
//     }

//     function test_isTokenInWalletShouldUpdateToFalseIfRemainingTokenBalanceIsZero() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         smartWallet.withdraw(address(tokenA), 50);

//         bool isTokenAInWalletBefore = smartWallet.checkIfTokenInWallet(address(tokenA));
//         assertEq(isTokenAInWalletBefore, true);

//         vm.prank(deployer);
//         smartWallet.withdraw(address(tokenA), 50);

//         bool isTokenAInWalletAfter = smartWallet.checkIfTokenInWallet(address(tokenA));
//         assertEq(isTokenAInWalletAfter, false);
//     }

//     function test_withdrawShouldFailIfNotOwner() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
//         smartWallet.withdraw(address(tokenA), 50);
//     }

//     function test_withdrawShouldFailIfInvalidAmount() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
//         smartWallet.withdraw(address(tokenA), 0);
//     }

//     function test_withdrawShouldFailIfInvalidTokenAddress() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
//         smartWallet.withdraw(address(0), 100);
//     }

//     function test_withdrawShouldFailIfTokenNotInWallet() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__TokenNotInWallet.selector);
//         smartWallet.withdraw(address(tokenB), 100);
//     }

//     function test_withdrawShouldFailIfInsufficientBalance() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InsufficientBalance.selector);
//         smartWallet.withdraw(address(tokenA), 200);
//     }

//     //////////////////////////////////////////
//     /////////////// WITHDRAW ALL /////////////
//     //////////////////////////////////////////

//     function test_withdrawAll() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         tokenB.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         smartWallet.deposit(address(tokenB), 100);
//         vm.stopPrank();

//         uint256 tokenABalanceBefore = smartWallet.getTokenBalance(address(tokenA));
//         uint256 tokenBBalanceBefore = smartWallet.getTokenBalance(address(tokenB));

//         assertEq(tokenABalanceBefore, 100);
//         assertEq(tokenBBalanceBefore, 100);

//         vm.prank(deployer);
//         smartWallet.withdrawAll();

//         uint256 tokenABalanceAfter = smartWallet.getTokenBalance(address(tokenA));
//         uint256 tokenBBalanceAfter = smartWallet.getTokenBalance(address(tokenB));

//         bool isTokenAInWallet = smartWallet.checkIfTokenInWallet(address(tokenA));
//         bool isTokenBInWallet = smartWallet.checkIfTokenInWallet(address(tokenB));

//         assertEq(tokenABalanceAfter, 0);
//         assertEq(tokenBBalanceAfter, 0);
//         assertEq(isTokenAInWallet, false);
//         assertEq(isTokenBInWallet, false);
//         assertEq(smartWallet.s_tokenCounter(), 0);
//     }

//     function test_withdrawAllShouldSkipTransferOfTokensWithZeroBalance() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         tokenB.approve(address(smartWallet), 100);
//         tokenC.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         smartWallet.deposit(address(tokenB), 100);
//         smartWallet.deposit(address(tokenC), 100);
//         vm.stopPrank();

//         vm.prank(deployer);
//         smartWallet.withdraw(address(tokenB), 100);

//         uint256 tokenBBalance = smartWallet.getTokenBalance(address(tokenB));
//         address tokenBByIndexBefore = smartWallet.getTokenByIndex(1);
//         assertEq(tokenBBalance, 0);
//         assertEq(tokenBByIndexBefore, address(tokenB));

//         // we expect the function to skip the transfer of tokens with the index
//         // still stored in s_tokens, but with 0 balance
//         vm.prank(deployer);
//         smartWallet.withdrawAll();

//         // after withdrawing all the tokens should reset all token indexes
//         address tokenBByIndexAfter = smartWallet.getTokenByIndex(1);
//         assertEq(tokenBByIndexAfter, address(0));
//     }

//     function test_withdrawAllShouldFailIfNotOwner() public {
//         vm.startPrank(deployer);
//         tokenA.approve(address(smartWallet), 100);
//         tokenB.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         smartWallet.deposit(address(tokenB), 100);
//         vm.stopPrank();

//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
//         smartWallet.withdrawAll();
//     }

//     function test_withdrawAllShouldFailIfNoTokensToWithdraw() public {
//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__NoTokensToWithdraw.selector);
//         smartWallet.withdrawAll();
//     }

//     //////////////////////////////////////////
//     ////////////// SET OPERATOR //////////////
//     //////////////////////////////////////////

//     function test_setOperator() public {
//         vm.prank(deployer);
//         smartWallet.setOperator(operator, true);

//         bool isOperator = smartWallet.checkIsOperator(operator);

//         assertEq(isOperator, true);
//     }

//     function test_setOperatorShouldFailIfNotOwner() public {
//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
//         smartWallet.setOperator(operator, true);
//     }

//     function test_setOperatorShouldFailIfOperatorAddressIsAddressZero() public {
//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidOperatorAddress.selector);
//         smartWallet.setOperator(address(0), true);
//     }

//     //////////////////////////////////////////
//     ///////// SET WHITELISTED ROUTER /////////
//     //////////////////////////////////////////

//     function test_setWhitelistedRouter() public {
//         vm.prank(deployer);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         bool isWhitelistedRouter = smartWallet.checkIsWhitelistedRouter(address(mockUniswapV2Router02));

//         assertEq(isWhitelistedRouter, true);
//     }

//     function test_setWhitelistedRouterShouldFailIfAddressZero() public {
//         vm.prank(deployer);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
//         smartWallet.setWhitelistedRouter(address(0), true);
//     }

//     function test_setWhitelistedRouterShouldFailIfNotOwner() public {
//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);
//     }

//     //////////////////////////////////////////
//     ///////////// PERFORM SWAP V2 ////////////
//     //////////////////////////////////////////

//     function test_performSwapV2() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenB), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfNotOperator() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(user1);
//         vm.expectRevert(SmartWallet.SmartWallet__NotOperator.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenB), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfNotWhitelistedRouter() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenB), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfRouterAddressIsAddressZero() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
//         smartWallet.performSwapV2(address(0), address(tokenA), address(tokenB), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfIdenticalTokens() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__TokensMustBeDifferent.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenA), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfAmountTokenInIsZero() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenB), 0, 400);
//     }

//     function test_performSwapV2ShouldAllowAmountOutMinToBeZero() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(tokenB), 300, 0);
//     }

//     function test_performSwapV2ShouldFailIfTokenInIsAddressZero() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(0), address(tokenB), 300, 400);
//     }

//     function test_performSwapV2ShouldFailIfTokenOutIsAddressZero() public {
//         vm.startPrank(deployer);
//         smartWallet.setOperator(operator, true);
//         smartWallet.setWhitelistedRouter(address(mockUniswapV2Router02), true);

//         tokenA.approve(address(smartWallet), 100);
//         smartWallet.deposit(address(tokenA), 100);
//         vm.stopPrank();

//         vm.prank(operator);
//         vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
//         smartWallet.performSwapV2(address(mockUniswapV2Router02), address(tokenA), address(0), 300, 400);
//     }
// }