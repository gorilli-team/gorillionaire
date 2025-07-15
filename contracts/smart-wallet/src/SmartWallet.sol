// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";

contract SmartWallet {
    event AuthorizeOperator(address indexed operator, bool indexed authorized);
    event SetWhitelistedRouter(address indexed router, bool indexed whitelisted);
    event DepositUSDC(address indexed usdc, uint256 indexed amount);
    event WithdrawUSDC(address indexed usdc, uint256 indexed amount);
    event BuyTokens(
        address indexed smartWallet,
        address indexed pair,
        address tokenIn,
        address tokenOut,
        address operator,
        uint256 amountIn,
        uint256 amountOut,
        uint256 amountInMax
    );
    event SellTokens(
        address indexed smartWallet,
        address indexed pair,
        address tokenIn,
        address tokenOut,
        address operator,
        uint256 amountIn,
        uint256 amountOut,
        uint256 amountOutMin
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
    error SmartWallet__TokenInMustBeUSDC();

    address public immutable i_usdc;
    address public immutable i_owner;
    address public immutable i_factoryV2;
    uint256 public s_tokenCounter;
    mapping(address => bool) public s_isOperator;
    mapping(address => bool) public s_isWhitelistedRouter;

    mapping(address token => uint256 amount) public s_balances;
    mapping(uint256 index => address token) public s_tokens;
    mapping(address token => bool inWallet) public s_isTokenInWallet;

    constructor(address user, address usdc, address factoryV2) {
        i_owner = user;
        i_usdc = usdc;
        i_factoryV2 = factoryV2;
    }

    modifier onlyOwner() {
        if (msg.sender != i_owner) {
            revert SmartWallet__NotOwner();
        }
        _;
    }

    modifier onlyValidSwapParameters(address _router, address _token, uint256 _amount) {
        if(!s_isWhitelistedRouter[_router]) {
            revert SmartWallet__InvalidRouterAddress();
        }

        if (_token == i_usdc || _token == address(0)) {
            revert SmartWallet__InvalidTokenAddress();
        }

        if(_amount == 0) {
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
        uint256 usdcBalance = usdc.balanceOf(address(this));

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
        uint256 usdcBalance = usdc.balanceOf(address(this));

        if (usdcBalance == 0) {
            revert SmartWallet__EmptyUSDCBalance();
        }

        bool success = usdc.transfer(msg.sender, usdcBalance);
        if (!success) {
            revert SmartWallet__TransferFailed();
        }

        emit WithdrawUSDC(address(usdc), usdcBalance);
    }

    function buyTokens(address router, address tokenOut, uint256 amountOut, uint256 amountInMax) external onlyOperator onlyValidSwapParameters(router, tokenOut, amountOut) {
        uint256 currentAllowance = IERC20(i_usdc).allowance(address(this), router);
        if(currentAllowance < amountInMax) {
            IERC20(i_usdc).approve(router, type(uint256).max);
        }

        address[] memory path = new address[](2);
        path[0] = i_usdc;
        path[1] = tokenOut;

        address pair = IUniswapV2Factory(i_factoryV2).getPair(i_usdc, tokenOut);

        uint256[] memory amounts = IUniswapV2Router02(router).swapTokensForExactTokens(
            amountOut,
            amountInMax,
            path,
            address(this),
            block.timestamp + 60
        );

        emit BuyTokens(address(this), pair, i_usdc, tokenOut, msg.sender, amounts[0], amountOut, amountInMax);
    }

    function sellTokens(address router, address tokenIn, uint256 amountIn, uint256 amountOutMin) external onlyOperator onlyValidSwapParameters(router, tokenIn, amountIn) {
        uint256 currentAllowance = IERC20(tokenIn).allowance(address(this), router);
        if(currentAllowance < amountIn) {
            IERC20(tokenIn).approve(router, 0);
            IERC20(tokenIn).approve(router, type(uint256).max);
        }

        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = i_usdc;

        address pair = IUniswapV2Factory(i_factoryV2).getPair(tokenIn, i_usdc);

        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            block.timestamp + 60
        );

        emit SellTokens(address(this), pair, tokenIn, i_usdc, msg.sender, amountIn, amounts[amounts.length - 1], amountOutMin);
    }

    function setOperator(address _operator, bool authorized) external onlyOwner {
        if(_operator == address(0)) {
            revert SmartWallet__InvalidOperatorAddress();
        }
        s_isOperator[_operator] = authorized;

        emit AuthorizeOperator(_operator, authorized);
    }

    function setWhitelistedRouter(address _router, bool whitelisted) external onlyOwner {
        if(_router == address(0)) {
            revert SmartWallet__InvalidRouterAddress();
        }
        s_isWhitelistedRouter[_router] = whitelisted;

        emit SetWhitelistedRouter(_router, whitelisted);
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
