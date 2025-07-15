// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Router02} from "./interfaces/IUniswapV2Router02.sol";
import {IUniswapV2Factory} from "./interfaces/IUniswapV2Factory.sol";

/**
 * @title A Smart Wallet for trading with the Gorillionaire bot automation
 * @author Gorilli
 * @notice This contract represents a Smart Wallet that any user can deploy via the SmartWalletFactory
 * The Smart Wallet manages user funds and restricts access to only the Smart Wallet owner and the bot operator,
 * each with permission to perform specific actions.
 */
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
    error SmartWallet__NotOperator();
    error SmartWallet__InvalidRouterAddress();
    error SmartWallet__InvalidOperatorAddress();
    error SmartWallet__InsufficientUSDCBalance();
    error SmartWallet__EmptyUSDCBalance();

    address public immutable i_usdc;
    address public immutable i_owner;
    address public immutable i_factoryV2;

    mapping(address => bool) public s_isOperator;
    mapping(address => bool) public s_isWhitelistedRouter;

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

    /**
     * @notice Deposits a specified amount of USDC into the Smart Wallet
     * @param amount The amount of USDC to deposit
     * @dev Only the Smart Wallet owner can call this function
     * @dev The specified amount must be approved to this contract before calling
     */
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

    /**
     * @notice Withdraws a specified amount of USDC from the Smart Wallet
     * @param amount The amount of USDC to withdraw
     * @dev Only the Smart Wallet owner can call this function
     * @dev The function reverts if the Smart Wallet has no USDC balance
     * @dev The specified amount must not exceed the current USDC balance of the Smart Wallet
     */
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

    /**
     * @notice Withdraws all the USDC in the Smart Wallet
     * @dev Only the Smart Wallet owner can call this function
     * @dev The function reverts if the Smart Wallet has no USDC balance
     */
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

    /**
     * @notice Buys a given amount of tokenOut
     * @param router The address of the UniswapV2Router02 contract
     * @param tokenOut The address of the token to be received
     * @param amountOut The exact amount of tokenOut to receive
     * @param amountInMax The maximum amount of tokenIn to send
     * @dev The router address must have been approved by the owner of the Smart Wallet
     * @dev Only the allowed operator(s) can call this function
     * @dev tokenIn is always USDC
     */
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

    /**
     * @notice Sells a given amount of tokenIn
     * @param router The address of the UniswapV2Router02 contract
     * @param tokenIn The address of the token to be sent
     * @param amountIn The exact amount of tokenIn to send
     * @param amountOutMin The minimum amount of tokenOut to receive
     * @dev The router address must have been approved by the owner of the Smart Wallet
     * @dev Only the allowed operator(s) can call this function
     * @dev tokenOut is always USDC
     */
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

    /**
     * @notice Sets the authorization status of an operator
     * @param operator The address of the operator (e.g., the Gorillionaire bot)
     * @param authorized True to authorize the operator, false to revoke authorization
     * @dev Only the owner of the Smart Wallet can call this function
     * @dev To revoke authorization, set `authorized` to false
     */
    function setOperator(address operator, bool authorized) external onlyOwner {
        if(operator == address(0)) {
            revert SmartWallet__InvalidOperatorAddress();
        }
        s_isOperator[operator] = authorized;

        emit AuthorizeOperator(operator, authorized);
    }

    /**
     * @notice Sets the whitelisted status of a router
     * @param router The address of the UniswapV2Router02 contract
     * @param whitelisted True to whitelist the router, false to remove it from the whitelist
     * @dev Only the owner of the Smart Wallet can call this function
     * @dev To remove a router from the whitelist, set `whitelisted` to false
     */
    function setWhitelistedRouter(address router, bool whitelisted) external onlyOwner {
        if(router == address(0)) {
            revert SmartWallet__InvalidRouterAddress();
        }
        s_isWhitelistedRouter[router] = whitelisted;

        emit SetWhitelistedRouter(router, whitelisted);
    }
}
