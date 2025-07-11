// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockUniswapV2Router02 {
    event Sell(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline);
    event Buy(uint256 amountInMax, uint256 amountOut, address[] path, address to, uint256 deadline);

    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory _amounts) {
        emit Sell(amountIn, amountOutMin, path, to, deadline);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOutMin + 100;
        return amounts;
    }

    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory _amounts) {
        emit Buy(amountInMax, amountOut, path, to, deadline);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountInMax - 10;
        amounts[1] = amountOut;
        return amounts;
    }
}
