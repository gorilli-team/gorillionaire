// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";

contract SmartWallet {
    event DepositUSDC(address indexed usdc, uint256 indexed amount);
    event WithdrawUSDC(address indexed usdc, uint256 indexed amount);
    event Swap(
        address indexed operator,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 amountOut
    );

    error SmartWallet__NotOwner();
    error SmartWallet__InvalidTokenAddress();
    error SmartWallet__InvalidAmount();
    error SmartWallet__TransferFailed();
    error SmartWallet__TokenNotInWallet();
    error SmartWallet__InsufficientBalance();
    error SmartWallet__NoTokensToWithdraw();
    error SmartWallet__NotOperator();
    error SmartWallet__InvalidRouterAddress();
    error SmartWallet__TokensMustBeDifferent();
    error SmartWallet__InvalidOperatorAddress();
    error SmartWallet__InsufficientUSDCBalance();
    error SmartWallet__EmptyUSDCBalance();

    address public immutable i_usdc;
    address public s_owner;
    uint256 public s_tokenCounter;
    mapping(address => bool) public s_isOperator;
    mapping(address => bool) public s_isWhitelistedRouter;

    mapping(address token => uint256 amount) public s_balances;
    mapping(uint256 index => address token) public s_tokens;
    mapping(address token => bool inWallet) public s_isTokenInWallet;

    constructor(address user, address usdc) {
        s_owner = user;
        i_usdc = usdc;
    }

    modifier onlyOwner() {
        if (msg.sender != s_owner) {
            revert SmartWallet__NotOwner();
        }
        _;
    }

    modifier onlyValidParams(address _token, uint256 amount) {
        if (_token == address(0)) {
            revert SmartWallet__InvalidTokenAddress();
        }
        if (amount <= 0) {
            revert SmartWallet__InvalidAmount();
        }
        _;
    }

    modifier onlyOperator() {
        if (!s_isOperator[msg.sender]) {
            revert SmartWallet__NotOperator();
        }
        _;
    }

    function depositUSDC(uint256 amount) public onlyOwner {
        if (amount <= 0) {
            revert SmartWallet__InvalidAmount();
        }

        IERC20 usdc = IERC20(i_usdc);
        bool success = usdc.transferFrom(msg.sender, address(this), amount);
        if (!success) {
            revert SmartWallet__TransferFailed();
        }

        emit DepositUSDC(address(usdc), amount);
    }

    function withdrawUSDC(uint256 amount) public onlyOwner {
        if (amount <= 0) {
            revert SmartWallet__InvalidAmount();
        }

        IERC20 usdc = IERC20(i_usdc);
        uint256 usdcBalance = usdc.balanceOf(msg.sender);

        if (usdcBalance == 0) {
            revert SmartWallet__EmptyUSDCBalance();
        }

        if (usdcBalance < amount) {
            revert SmartWallet__InsufficientUSDCBalance();
        }

        bool success = usdc.transfer(msg.sender, amount);
        if (!success) {
            revert SmartWallet__TransferFailed();
        }

        emit WithdrawUSDC(address(usdc), amount);
    }

    function withdrawAllUSDC() public onlyOwner {
        IERC20 usdc = IERC20(i_usdc);
        uint256 usdcBalance = usdc.balanceOf(msg.sender);

        if (usdcBalance == 0) {
            revert SmartWallet__EmptyUSDCBalance();
        }

        bool success = usdc.transfer(msg.sender, usdcBalance);
        if (!success) {
            revert SmartWallet__TransferFailed();
        }

        emit WithdrawUSDC(address(usdc), usdcBalance);
    }

    function performSwapV2(address router, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutMin)
        external
        onlyOperator
    {
        if(!s_isWhitelistedRouter[router]) {
            revert SmartWallet__InvalidRouterAddress();
        }

        if(tokenIn == address(0) || tokenOut == address(0)) {
            revert SmartWallet__InvalidTokenAddress();
        }

        if(tokenIn == tokenOut) {
            revert SmartWallet__TokensMustBeDifferent();
        }

        if(amountIn <= 0) {
            revert SmartWallet__InvalidAmount();
        }

        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), router);
        if (currentAllowance < amountIn) {
            IERC20(tokenIn).approve(router, 0);
            IERC20(tokenIn).approve(router, amountIn);
        }

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn, amountOutMin, path, address(this), block.timestamp + 60
        );

        emit Swap(msg.sender, tokenIn, tokenOut, amountIn, amountOutMin, amounts[amounts.length - 1]);
    }

    function setOperator(address _operator, bool authorized) external onlyOwner {
        if(_operator == address(0)) {
            revert SmartWallet__InvalidOperatorAddress();
        }
        s_isOperator[_operator] = authorized;
    }

    function setWhitelistedRouter(address _router, bool whitelisted) external onlyOwner {
        if(_router == address(0)) {
            revert SmartWallet__InvalidRouterAddress();
        }
        s_isWhitelistedRouter[_router] = whitelisted;
    }

    function getTokenBalance(address _token) public view returns (uint256) {
        return s_balances[_token];
    }

    function checkIfTokenInWallet(address _token) public view returns (bool) {
        return s_isTokenInWallet[_token];
    }

    function getTokenByIndex(uint256 index) public view returns (address) {
        return s_tokens[index];
    }

    function checkIsOperator(address _operator) public view returns (bool) {
        return s_isOperator[_operator];
    }

    function checkIsWhitelistedRouter(address _router) public view returns(bool) {
        return s_isWhitelistedRouter[_router];
    }
}
