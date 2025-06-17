// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract AccessNFT is ERC721, Ownable {
    uint256 public s_nextTokenId;
    uint256 public s_price;
    bool public s_isMinting;
    string private s_baseURI;

    event Withdraw(uint256 indexed amount, address indexed owner);

    error AccessNFT__InsufficientPayment();
    error AccessNFT__TransferFailed();
    error AccessNFT__NFTCurrentlyNotMintable();
    error AccessNFT__AlreadyPaused();
    error AccessNFT__MintingAlreadyEnabled();
    error AccessNFT__InvalidTokenId();

    modifier isMintable() {
        if (!s_isMinting) {
            revert AccessNFT__NFTCurrentlyNotMintable();
        }
        _;
    }

    constructor() ERC721("Gorillionaire Access NFT", "GOR-AX") Ownable(msg.sender) {
        s_nextTokenId = 0;
        s_isMinting = true;
        s_price = 1 ether;
        s_baseURI = "ipfs://bafkreihfw6v2h57tr3isst6rxzmtgqym3oxpthla75xj6rp7ubjajvmd6e";
    }

    function mint() public payable isMintable {
        if (msg.value < s_price) {
            revert AccessNFT__InsufficientPayment();
        }
        uint256 tokenId = s_nextTokenId;
        s_nextTokenId++;
        _safeMint(msg.sender, tokenId);
    }

    function withdraw(uint256 amount) public onlyOwner {
        address contractOwner = owner();
        (bool success,) = payable(contractOwner).call{value: amount}("");
        if (!success) {
            revert AccessNFT__TransferFailed();
        }
        emit Withdraw(amount, msg.sender);
    }

    function withdrawAll() public onlyOwner {
        address contractOwner = owner();
        uint256 amountToWithdraw = address(this).balance;

        (bool success,) = payable(contractOwner).call{value: amountToWithdraw}("");
        if (!success) {
            revert AccessNFT__TransferFailed();
        }
        emit Withdraw(amountToWithdraw, msg.sender);
    }

    function pauseMinting() public onlyOwner {
        if (!s_isMinting) {
            revert AccessNFT__AlreadyPaused();
        }
        s_isMinting = false;
    }

    function resumeMinting() public onlyOwner {
        if (s_isMinting) {
            revert AccessNFT__MintingAlreadyEnabled();
        }
        s_isMinting = true;
    }

    function setPrice(uint256 newPrice) public onlyOwner {
        s_price = newPrice;
    }


    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (s_nextTokenId == 0 || tokenId >= s_nextTokenId) {
            revert AccessNFT__InvalidTokenId();
        }
        return string(abi.encodePacked(s_baseURI));
    }

    function setBaseURI(string memory _baseURI) public onlyOwner {
        s_baseURI = _baseURI;
    }
}