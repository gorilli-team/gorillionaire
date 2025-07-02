// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV2Router02 {
    event SwapCalled(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory _amounts) {
        emit SwapCalled(amountIn, amountOutMin, path, to, deadline);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOutMin + 100;
        return amounts;
    }
}
