// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import {ERC4626, Math, IERC20, ERC20, SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol";
import {Ownable} from "openzeppelin-contracts/contracts/access/Ownable.sol";

contract GorillionaireVault is ERC4626, Ownable {
    using Math for uint256;

    mapping(address => uint256) public pendingDepositRequest;
    mapping(address => uint256) public claimableDepositRequest;
    mapping(address controller => mapping(address operator => bool))
        public isOperator;

    event DepositRequest(
        address controller,
        address owner,
        uint256 requestId,
        address requester,
        uint256 assets
    );
    event RedeemRequest(
        address indexed owner,
        address indexed requester,
        uint256 requestId,
        uint256 shares,
        uint256 assets
    );
    event OperatorSet(address owner, address operator, bool approved);

    modifier canMakeRequests(address owner) {
        require(
            owner == msg.sender || isOperator[owner][msg.sender],
            "Not authorized"
        );
        _;
    }

    function requestDeposit(
        uint256 assets,
        address controller,
        address owner
    ) external canMakeRequests(owner) returns (uint256 requestId) {
        require(assets != 0, "Assets cannot be zero");

        requestId = 0; // request ID logic to be implemented

        IERC20(asset()).transferFrom(owner, address(this), assets);

        pendingDepositRequest[controller] += assets;

        emit DepositRequest(controller, owner, requestId, msg.sender, assets);
        return requestId;
    }

    function requestRedeem(
        uint256 shares,
        address owner
    ) external canMakeRequests(owner) returns (uint256 requestId) {
        require(shares != 0, "Shares cannot be zero");

        uint256 assets = previewRedeem(shares);

        _transfer(owner, address(this), shares);

        requestId = 0; // request ID logic to be implemented

        emit RedeemRequest(owner, msg.sender, requestId, shares, assets);

        return requestId;
    }

    function setOperator(
        address operator,
        bool approved
    ) public returns (bool) {
        isOperator[msg.sender][operator] = approved;
        emit OperatorSet(msg.sender, operator, approved);
        return true;
    }

    uint256 private constant _BASIS_POINT_SCALE = 1e4;

    uint256 public entryFeeBasisPoints;
    uint256 public immutable maxEntryFeeBasisPoints;

    event EntryFeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(
        IERC20 _asset,
        uint256 _basisPoints,
        uint256 _maxBasisPoints
    )
        Ownable(msg.sender)
        ERC4626(_asset)
        ERC20("Gorillionaire Vault Token", "vGOR")
    {
        entryFeeBasisPoints = _basisPoints;
        maxEntryFeeBasisPoints = _maxBasisPoints;
    }

    function updateEntryFeeBasisPoints(
        uint256 newBasisPoints
    ) external onlyOwner {
        require(newBasisPoints <= maxEntryFeeBasisPoints, "Entry fee too high");
        emit EntryFeeUpdated(entryFeeBasisPoints, newBasisPoints);
        entryFeeBasisPoints = newBasisPoints;
    }

    function previewDeposit(
        uint256 assets
    ) public view virtual override returns (uint256) {
        uint256 fee = _feeOnTotal(assets, _entryFeeBasisPoints());
        return super.previewDeposit(assets - fee);
    }

    function previewMint(
        uint256 shares
    ) public view virtual override returns (uint256) {
        uint256 assets = super.previewMint(shares);
        return assets + _feeOnRaw(assets, _entryFeeBasisPoints());
    }

    function previewWithdraw(
        uint256 assets
    ) public view virtual override returns (uint256) {
        uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints());
        return super.previewWithdraw(assets + fee);
    }

    function previewRedeem(
        uint256 shares
    ) public view virtual override returns (uint256) {
        uint256 assets = super.previewRedeem(shares);
        return assets - _feeOnTotal(assets, _exitFeeBasisPoints());
    }

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        uint256 fee = _feeOnTotal(assets, _entryFeeBasisPoints());
        address recipient = _entryFeeRecipient();

        super._deposit(caller, receiver, assets, shares);

        if (fee > 0 && recipient != address(this)) {
            SafeERC20.safeTransfer(IERC20(asset()), recipient, fee);
        }
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal virtual override {
        uint256 fee = _feeOnRaw(assets, _exitFeeBasisPoints());
        address recipient = _exitFeeRecipient();

        super._withdraw(caller, receiver, owner, assets, shares);

        if (fee > 0 && recipient != address(this)) {
            SafeERC20.safeTransfer(IERC20(asset()), recipient, fee);
        }
    }

    function _entryFeeBasisPoints() internal view virtual returns (uint256) {
        return entryFeeBasisPoints;
    }

    function _exitFeeBasisPoints() internal view virtual returns (uint256) {
        return 100; // 1% exit fee, adjust this as needed
    }

    function _entryFeeRecipient() internal view virtual returns (address) {
        return owner();
    }

    function _exitFeeRecipient() internal view virtual returns (address) {
        return address(0); // Set this to the treasury address or another recipient
    }

    function _feeOnRaw(
        uint256 assets,
        uint256 feeBasisPoints
    ) private pure returns (uint256) {
        uint256 numerator = assets * feeBasisPoints;
        uint256 denominator = _BASIS_POINT_SCALE;
        uint256 result = numerator / denominator;
        return result + (numerator % denominator != 0 ? 1 : 0);
    }

    function _feeOnTotal(
        uint256 assets,
        uint256 feeBasisPoints
    ) private pure returns (uint256) {
        uint256 numerator = assets * feeBasisPoints;
        uint256 denominator = feeBasisPoints + _BASIS_POINT_SCALE;
        uint256 result = numerator / denominator;
        return result + (numerator % denominator != 0 ? 1 : 0);
    }
}
