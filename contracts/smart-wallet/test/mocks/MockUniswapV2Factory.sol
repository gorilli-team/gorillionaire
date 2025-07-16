// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external pure returns (address pair) {
        bytes32 hash = keccak256(abi.encodePacked(tokenA, tokenB));
        pair = address(uint160(uint256(hash)));
    }
}