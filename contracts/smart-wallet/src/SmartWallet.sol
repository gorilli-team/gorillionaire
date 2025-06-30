// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SmartWallet {
    event Deposit(address indexed token, uint256 indexed amount);
    event Withdraw(address indexed token, uint256 indexed amount);

    error SmartWallet__NotOwner();
    error SmartWallet__InvalidTokenAddress();
    error SmartWallet__InvalidAmount();
    error SmartWallet__TransferFailed();
    error SmartWallet__TokenNotInWallet();
    error SmartWallet__InsufficientBalance();
    error SmartWallet__NoTokensToWithdraw();

    address public s_owner;
    uint256 public s_tokenCounter;

    mapping(address token => uint256 amount) public s_balances;
    mapping(uint256 index => address token) public s_tokens;
    mapping(address token => bool inWallet) public s_isTokenInWallet;
    
    constructor(address user) {
        s_owner = user;
    }

    modifier onlyOwner {
        if(msg.sender != s_owner) {
            revert SmartWallet__NotOwner();
        }
        _;
    }

    modifier onlyValidParams(address _token, uint256 amount) {
        if(_token == address(0)) {
            revert SmartWallet__InvalidTokenAddress();
        }
        if(amount <= 0) {
            revert SmartWallet__InvalidAmount();
        }
        _;
    }

    function deposit(address _token, uint256 amount) public onlyOwner onlyValidParams(_token, amount) {
        s_balances[_token] += amount;
        if(s_isTokenInWallet[_token] == false) {
            s_tokens[s_tokenCounter] = _token;
            s_tokenCounter += 1;
            s_isTokenInWallet[_token] = true;
        }
        

        IERC20 token = IERC20(_token);
        bool success = token.transferFrom(msg.sender, address(this), amount);
        if(!success) {
            revert SmartWallet__TransferFailed();
        }

        emit Deposit(_token, amount);
    }

    function withdraw(address _token, uint256 amount) public onlyOwner onlyValidParams(_token, amount) {
        if(s_isTokenInWallet[_token] == false) {
            revert SmartWallet__TokenNotInWallet();
        }

        if(s_balances[_token] < amount) {
            revert SmartWallet__InsufficientBalance();
        }

        s_balances[_token] -= amount;
        if(s_balances[_token] == 0) {
            s_isTokenInWallet[_token] = false;
        }

        IERC20 token = IERC20(_token);
        bool success = token.transfer(msg.sender, amount);

        if(!success) {
            revert SmartWallet__TransferFailed();
        }

        emit Withdraw(_token, amount);
    }

    function withdrawAll() public onlyOwner {
        if(s_tokenCounter == 0) {
            revert SmartWallet__NoTokensToWithdraw();
        }
        for(uint256 i = 0; i < s_tokenCounter; i++) {
            IERC20 token = IERC20(s_tokens[i]);
            uint256 amountToWithdraw = s_balances[address(token)];

            if(amountToWithdraw == 0 ) {
                delete s_tokens[i];
                continue;
            }

            delete s_balances[address(token)];
            delete s_tokens[i];
            s_isTokenInWallet[address(token)] = false;

            bool success = token.transfer(msg.sender, amountToWithdraw);
            if(!success) {
                revert SmartWallet__TransferFailed();
            }
            emit Withdraw(address(token), amountToWithdraw);
        }

        s_tokenCounter = 0;
    }

    function getTokenBalance(address _token) public view returns(uint256) {
        return s_balances[_token];
    }

    function checkIfTokenInWallet(address _token) public view returns(bool) {
        return s_isTokenInWallet[_token];
    }

    function getTokenByIndex(uint256 index) public view returns(address) {
        return s_tokens[index];
    }
}