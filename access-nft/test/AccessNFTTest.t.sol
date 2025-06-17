// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Test, console} from "forge-std/Test.sol";
import {AccessNFT} from "../src/AccessNFT.sol";

contract AccessNFTTest is Test {
    AccessNFT public accessNFT;

    address deployer = makeAddr("deployer");
    address user1 = makeAddr("user1");

    uint256 public INITIAL_BALANCE = 1 ether;
    uint256 public NEW_PRICE = 2 ether;

    function setUp() public {
        vm.prank(deployer);
        accessNFT = new AccessNFT();
    }

    function testInitialization() public view {
        assertEq(accessNFT.name(), "Gorillionaire Access NFT");
        assertEq(accessNFT.symbol(), "GOR-AX");
        assertEq(accessNFT.s_isMinting(), true);
    }

    function testMint() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        accessNFT.mint{value: 1 ether}();

        uint256 user1Balance = accessNFT.balanceOf(user1);
        assertEq(user1Balance, 1);
        assertEq(accessNFT.s_nextTokenId(), 1);
    }

    function testMultipleMint() public {
        vm.deal(user1, INITIAL_BALANCE * 2);
        vm.startPrank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();
        accessNFT.mint{value: INITIAL_BALANCE}();
        vm.stopPrank();

        uint256 user1Balance = accessNFT.balanceOf(user1);
        assertEq(user1Balance, 2);
        assertEq(accessNFT.s_nextTokenId(), 2);
    }

    function testCannotMintIfUnsufficientPayment() public {
        vm.deal(user1, INITIAL_BALANCE);
        vm.prank(user1);
        vm.expectRevert(AccessNFT.AccessNFT__InsufficientPayment.selector);
        accessNFT.mint{value: 0.5 ether}();
    }

    function testCannotMintIfNotMintable() public {
        vm.prank(deployer);
        accessNFT.pauseMinting();

        vm.deal(user1, INITIAL_BALANCE);
        vm.prank(user1);
        vm.expectRevert(AccessNFT.AccessNFT__NFTCurrentlyNotMintable.selector);
        accessNFT.mint{value: INITIAL_BALANCE}();
    }

    function testNonOwnersCannotPauseMinting() public {
        vm.prank(user1);
        vm.expectRevert();
        accessNFT.pauseMinting();
    }

    function testMintAfterResumeMinting() public {
        vm.prank(deployer);
        accessNFT.pauseMinting();

        vm.deal(user1, INITIAL_BALANCE);
        vm.prank(user1);
        vm.expectRevert(AccessNFT.AccessNFT__NFTCurrentlyNotMintable.selector);
        accessNFT.mint{value: INITIAL_BALANCE}();

        vm.prank(deployer);
        accessNFT.resumeMinting();

        vm.prank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();

        uint256 user1Balance = accessNFT.balanceOf(user1);
        assertEq(user1Balance, 1);
        assertEq(accessNFT.s_nextTokenId(), 1);
    }

    function testCannotPauseIfAlreadyPaused() public {
        vm.prank(deployer);
        accessNFT.pauseMinting();

        vm.prank(deployer);
        vm.expectRevert(AccessNFT.AccessNFT__AlreadyPaused.selector);
        accessNFT.pauseMinting();
    }

    function testCannotResumeIfAlreadyMinting() public {
        vm.prank(deployer);
        vm.expectRevert(AccessNFT.AccessNFT__MintingAlreadyEnabled.selector);
        accessNFT.resumeMinting();
    }

    function testSetPrice() public {
        vm.prank(deployer);
        accessNFT.setPrice(NEW_PRICE);

        assertEq(accessNFT.s_price(), NEW_PRICE);
    }

    function testShouldNotAllowNonOwnersToSetPrice() public {
        vm.prank(user1);
        vm.expectRevert();
        accessNFT.setPrice(NEW_PRICE);
    }

    function testMintingAtNewPrice() public {
        vm.prank(deployer);
        accessNFT.setPrice(NEW_PRICE);

        assertEq(accessNFT.s_price(), NEW_PRICE);

        vm.deal(user1, NEW_PRICE);
        vm.prank(user1);
        accessNFT.mint{value: NEW_PRICE}();

        uint256 user1Balance = accessNFT.balanceOf(user1);
        assertEq(user1Balance, 1);
        assertEq(accessNFT.s_nextTokenId(), 1);
    }

    function testMintingFailsIfValueNotEqualNewPrice() public {
        vm.prank(deployer);
        accessNFT.setPrice(NEW_PRICE);

        assertEq(accessNFT.s_price(), NEW_PRICE);

        vm.deal(user1, INITIAL_BALANCE);
        vm.prank(user1);
        vm.expectRevert(AccessNFT.AccessNFT__InsufficientPayment.selector);
        accessNFT.mint{value: INITIAL_BALANCE}();
    }

    function testWithdraw() public {
        vm.deal(user1, INITIAL_BALANCE * 2);
        vm.startPrank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();
        accessNFT.mint{value: INITIAL_BALANCE}();
        vm.stopPrank();

        uint256 contractBalanceBeforeWithdraw = address(accessNFT).balance;

        vm.prank(deployer);
        accessNFT.withdraw(1 ether);

        uint256 contractBalanceAfterWithdraw = address(accessNFT).balance;

        assertEq(contractBalanceAfterWithdraw, contractBalanceBeforeWithdraw - 1 ether);
    }

    function testWithdrawAll() public {
        vm.deal(user1, INITIAL_BALANCE * 2);
        vm.startPrank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();
        accessNFT.mint{value: INITIAL_BALANCE}();
        vm.stopPrank();

        uint256 contractBalanceBeforeWithdraw = address(accessNFT).balance;

        vm.prank(deployer);
        accessNFT.withdrawAll();

        uint256 contractBalanceAfterWithdraw = address(accessNFT).balance;

        assertEq(contractBalanceBeforeWithdraw, 2 ether);
        assertEq(contractBalanceAfterWithdraw, 0);
    }

    function testUsersCannotWithdraw() public {
        vm.deal(user1, INITIAL_BALANCE * 2);
        vm.startPrank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();
        accessNFT.mint{value: INITIAL_BALANCE}();
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert();
        accessNFT.withdraw(1 ether);
    }

    function testUsersCannotWithdrawAll() public {
        vm.deal(user1, INITIAL_BALANCE * 2);
        vm.startPrank(user1);
        accessNFT.mint{value: INITIAL_BALANCE}();
        accessNFT.mint{value: INITIAL_BALANCE}();
        vm.stopPrank();

        vm.prank(user1);
        vm.expectRevert();
        accessNFT.withdrawAll();
    }

    function testTokenURI() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        accessNFT.mint{value: 1 ether}();

        vm.prank(user1);
        string memory tokenURI = accessNFT.tokenURI(0);
        assertEq(tokenURI, "ipfs://bafkreihfw6v2h57tr3isst6rxzmtgqym3oxpthla75xj6rp7ubjajvmd6e");
    }

    function testCannotCheckTokenURIOfNonExistingNFT() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        accessNFT.mint{value: 1 ether}();

        vm.prank(user1);
        vm.expectRevert(AccessNFT.AccessNFT__InvalidTokenId.selector);
        accessNFT.tokenURI(1);
    }

    function testSetBaseURI() public {
        vm.deal(user1, 1 ether);
        vm.prank(user1);
        accessNFT.mint{value: 1 ether}();

        vm.prank(user1);
        string memory tokenURI = accessNFT.tokenURI(0);
        assertEq(tokenURI, "ipfs://bafkreihfw6v2h57tr3isst6rxzmtgqym3oxpthla75xj6rp7ubjajvmd6e");

        vm.prank(deployer);
        accessNFT.setBaseURI("ipfs://test");

        vm.prank(user1);
        string memory newTokenURI = accessNFT.tokenURI(0);
        assertEq(newTokenURI, "ipfs://test");
    }
}
