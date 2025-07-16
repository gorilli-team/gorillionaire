// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test, console } from "forge-std/Test.sol";
import { SmartWallet } from "../src/SmartWallet.sol";
import { MockERC20 } from "./mocks/MockERC20.sol";
import { MockUniswapV2Router02 } from "./mocks/MockUniswapV2Router02.sol";
import { MockUniswapV2Factory } from "./mocks/MockUniswapV2Factory.sol";

contract SmartWalletTest is Test {
    SmartWallet smartWallet;
    MockERC20 usdc;
    MockERC20 tokenA;
    MockERC20 tokenB;
    MockERC20 tokenC;
    MockUniswapV2Router02 router;
    MockUniswapV2Factory factoryV2;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address operator = makeAddr("operator");

    function setUp() public {
        vm.startPrank(deployer);
        usdc = new MockERC20("USDC", "USDC");
        tokenA = new MockERC20("TokenA", "TKNA");
        tokenB = new MockERC20("TokenB", "TKNB");
        tokenC = new MockERC20("TokenC", "TKNC");

        router = new MockUniswapV2Router02();
        factoryV2 = new MockUniswapV2Factory();

        smartWallet = new SmartWallet(deployer, address(usdc), address(factoryV2));
        vm.stopPrank();
    }

    //////////////////////////////////////////
    ///////////// DEPOSIT USDC ///////////////
    //////////////////////////////////////////

    function test_depositUSDC() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        uint256 usdcBalance = usdc.balanceOf(address(smartWallet));

        assertEq(usdcBalance, 100);
    }

    function test_depositShouldFailIfNotOwner() public {
        vm.prank(user1);
        usdc.approve(address(smartWallet), 100);

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.depositUSDC(100);
    }

    function test_depositShouldFailIfInvalidAmount() public {
        vm.prank(deployer);
        usdc.approve(address(smartWallet), 100);

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.depositUSDC(0);
    }

    //////////////////////////////////////////
    /////////////// WITHDRAW USDC ////////////
    //////////////////////////////////////////

    function test_withdrawUSDC() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        uint256 usdcBalanceBefore = usdc.balanceOf(address(smartWallet));

        assertEq(usdcBalanceBefore, 100);

        vm.prank(deployer);
        smartWallet.withdrawUSDC(50);

        uint256 usdcBalanceAfter = usdc.balanceOf(address(smartWallet));

        assertEq(usdcBalanceAfter, 50);
    }

    function test_withdrawUSDCShouldFailIfNotOwner() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.withdrawUSDC(50);
    }

    function test_withdrawUSDCShouldFailIfInvalidAmount() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.withdrawUSDC(0);
    }

    function test_withdrawUSDCShouldFailIfEmptyUSDCBalance() public {
        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__EmptyUSDCBalance.selector);
        smartWallet.withdrawUSDC(100);
    }

    function test_withdrawUSDCShouldFailIfInsufficientBalance() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InsufficientUSDCBalance.selector);
        smartWallet.withdrawUSDC(200);
    }

    //////////////////////////////////////////
    ///////////// WITHDRAW ALL USDC //////////
    //////////////////////////////////////////

    function test_withdrawAllUSDC() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        uint256 usdcBalanceBefore = usdc.balanceOf(address(smartWallet));

        assertEq(usdcBalanceBefore, 100);

        vm.prank(deployer);
        smartWallet.withdrawAllUSDC();

        uint256 usdcBalanceAfter = usdc.balanceOf(address(smartWallet));

        assertEq(usdcBalanceAfter, 0);
    }

    function test_withdrawAllUSDCShouldFailIfNotOwner() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.withdrawAllUSDC();
    }

    function test_withdrawAllUSDCShouldFailIfUSDCBalanceIsZero() public {
        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__EmptyUSDCBalance.selector);
        smartWallet.withdrawAllUSDC();
    }

    //////////////////////////////////////////
    ////////////// SET OPERATOR //////////////
    //////////////////////////////////////////

    function test_setOperator() public {
        vm.prank(deployer);
        smartWallet.setOperator(operator, true);

        bool isOperator = smartWallet.s_isOperator(operator);

        assertEq(isOperator, true);
    }

    function test_setOperatorShouldFailIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.setOperator(operator, true);
    }

    function test_setOperatorShouldFailIfOperatorAddressIsAddressZero() public {
        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidOperatorAddress.selector);
        smartWallet.setOperator(address(0), true);
    }

    //////////////////////////////////////////
    ///////// SET WHITELISTED ROUTER /////////
    //////////////////////////////////////////

    function test_setWhitelistedRouter() public {
        vm.prank(deployer);
        smartWallet.setWhitelistedRouter(address(router), true);

        bool isWhitelistedRouter = smartWallet.s_isWhitelistedRouter(address(router));

        assertEq(isWhitelistedRouter, true);
    }

    function test_setWhitelistedRouterShouldFailIfAddressZero() public {
        vm.prank(deployer);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        smartWallet.setWhitelistedRouter(address(0), true);
    }

    function test_setWhitelistedRouterShouldFailIfNotOwner() public {
        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOwner.selector);
        smartWallet.setWhitelistedRouter(address(router), true);
    }

    //////////////////////////////////////////
    /////////////// BUY TOKENS ///////////////
    //////////////////////////////////////////

    function test_buyTokens() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);
    }

    function test_buyTokensShouldFailIfNotOperator() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOperator.selector);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);
    }

    function test_buyTokensShouldFailIfNotWhitelistedRouter() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        smartWallet.buyTokens(address(user2), address(tokenA), 200, 100);
    }

    function test_buyTokensShouldFailIfRouterAddressIsAddressZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        smartWallet.buyTokens(address(0), address(tokenA), 200, 100);
    }

    function test_buyTokensShouldFailIfAmountOutIsZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.buyTokens(address(router), address(tokenA), 0, 100);
    }

    function test_buyTokensShouldFailIfTokenOutIsAddressZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
        smartWallet.buyTokens(address(router), address(0), 200, 100);
    }

    //////////////////////////////////////////
    ////////////// SELL TOKENS ///////////////
    //////////////////////////////////////////

    function test_sellTokens() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(operator);
        smartWallet.sellTokens(address(router), address(tokenA), 200, 100);
    }

    function test_sellTokensShouldFailIfNotOperator() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(user1);
        vm.expectRevert(SmartWallet.SmartWallet__NotOperator.selector);
        smartWallet.sellTokens(address(router), address(tokenA), 200, 100);
    }

    function test_sellTokensShouldFailIfNotWhitelistedRouter() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        smartWallet.sellTokens(address(user2), address(tokenA), 200, 100);
    }

    function test_sellTokensShouldFailIfRouterAddressIsAddressZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        smartWallet.sellTokens(address(0), address(tokenA), 200, 100);
    }

    function test_sellTokensShouldFailIfAmountInIsZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidAmount.selector);
        smartWallet.sellTokens(address(router), address(tokenA), 0, 100);
    }

    function test_sellTokensShouldFailIfTokenInIsAddressZero() public {
        vm.startPrank(deployer);
        usdc.approve(address(smartWallet), 100);
        smartWallet.depositUSDC(100);
        smartWallet.setOperator(operator, true);
        smartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        smartWallet.buyTokens(address(router), address(tokenA), 200, 100);

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidTokenAddress.selector);
        smartWallet.sellTokens(address(router), address(0), 0, 100);
    }
}