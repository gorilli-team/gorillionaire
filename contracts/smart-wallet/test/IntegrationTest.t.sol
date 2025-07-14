// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {SmartWallet} from "../src/SmartWallet.sol";
import {SmartWalletFactory} from "../src/SmartWalletFactory.sol";
import {MockERC20} from "./mocks/MockERC20.sol";
import {MockUniswapV2Router02} from "./mocks/MockUniswapV2Router02.sol";

contract IntegrationTest is Test {
    SmartWallet smartWallet;
    SmartWalletFactory smartWalletFactory;
    MockERC20 usdc;
    MockERC20 btc;
    MockUniswapV2Router02 router;

    address factoryDeployer = makeAddr("factoryDeployer");
    address user1 = makeAddr("user1");
    address operator = makeAddr("operator");

    function setUp() public {
        vm.startPrank(factoryDeployer);
        usdc = new MockERC20("USDC", "USDC");
        btc = new MockERC20("BTC", "BTC");
        smartWalletFactory = new SmartWalletFactory();
        router = new MockUniswapV2Router02();

        usdc.transfer(user1, 500_000 * 10 ** usdc.decimals());
        vm.stopPrank();
    }

    function test_initialization() public view {
        assertEq(usdc.balanceOf(user1), 500_000 * 10 ** usdc.decimals());
    }

    function test_createSmartWallet() public {
        vm.prank(user1);
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        address user1SmartWalletOwner = user1SmartWallet.s_owner();
        assertEq(user1SmartWalletOwner, user1);
    }

    function test_createSmartWalletAndDepositUSDC() public {
        uint256 usdcPrivateAmountBeforeDeposit = usdc.balanceOf(user1);
        uint256 usdcAmountToDeposit = 1000 * 10 ** usdc.decimals();

        vm.startPrank(user1);
        // user creates the smart wallet
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        // user approves usdc to the smart wallet
        usdc.approve(address(user1SmartWallet), usdcAmountToDeposit);

        // user deposits usdc into the smart wallet
        user1SmartWallet.depositUSDC(usdcAmountToDeposit);
        vm.stopPrank();

        uint256 usdcPrivateBalanceAfterDeposit = usdc.balanceOf(user1);
        uint256 usdcSmartWalletBalanceAfterDeposit = usdc.balanceOf(address(user1SmartWallet));

        assertEq(usdcPrivateBalanceAfterDeposit, usdcPrivateAmountBeforeDeposit - usdcAmountToDeposit);
        assertEq(usdcSmartWalletBalanceAfterDeposit, usdcAmountToDeposit);
    }

    function test_depositUSDCShouldFailIfInsufficientBalance() public {
        uint256 usdcAmountToDeposit = 1_000_000 * 10 ** usdc.decimals();

        vm.startPrank(user1);
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        usdc.approve(address(user1SmartWallet), type(uint256).max);

        vm.expectRevert();
        user1SmartWallet.depositUSDC(usdcAmountToDeposit);
        vm.stopPrank();
    }

    function test_cannotBuyTokensWithoutAuthorizedOperator() public {
        uint256 usdcAmountToDeposit = 1000 * 10 ** usdc.decimals();

        vm.startPrank(user1);
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        usdc.approve(address(user1SmartWallet), usdcAmountToDeposit);

        user1SmartWallet.depositUSDC(usdcAmountToDeposit);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__NotOperator.selector);
        user1SmartWallet.buyTokens(address(router), address(btc), 100, 50);
    }

    function test_operatorCannotBuyTokensIfRouterNotWhitelisted() public {
        uint256 usdcAmountToDeposit = 1000 * 10 ** usdc.decimals();

        vm.startPrank(user1);
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        usdc.approve(address(user1SmartWallet), usdcAmountToDeposit);

        user1SmartWallet.depositUSDC(usdcAmountToDeposit);

        user1SmartWallet.setOperator(operator, true);
        vm.stopPrank();

        vm.prank(operator);
        vm.expectRevert(SmartWallet.SmartWallet__InvalidRouterAddress.selector);
        user1SmartWallet.buyTokens(address(router), address(btc), 100, 50);
    }

    function test_buyTokens() public {
        uint256 usdcAmountToDeposit = 1000 * 10 ** usdc.decimals();

        vm.startPrank(user1);
        SmartWallet user1SmartWallet = smartWalletFactory.createSmartWallet(address(usdc));

        usdc.approve(address(user1SmartWallet), usdcAmountToDeposit);

        user1SmartWallet.depositUSDC(usdcAmountToDeposit);

        user1SmartWallet.setOperator(operator, true);
        user1SmartWallet.setWhitelistedRouter(address(router), true);
        vm.stopPrank();

        vm.prank(operator);
        user1SmartWallet.buyTokens(address(router), address(btc), 100, 50);
    }

    function test_userCannotCreateMoreThanOneWallet() public {
        vm.startPrank(user1);
        smartWalletFactory.createSmartWallet(address(usdc));
        vm.expectRevert(SmartWalletFactory.SmartWalletFactory__ExceededWalletLimit.selector);
        smartWalletFactory.createSmartWallet(address(usdc));
    }
}
