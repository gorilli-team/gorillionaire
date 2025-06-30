// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { AccessNFT } from "../src/AccessNFT.sol";

contract DeployAccessNFT is Script {
    function run() external returns (AccessNFT) {
        vm.startBroadcast();
        AccessNFT accessNFT = new AccessNFT();
        vm.stopBroadcast();

        return accessNFT;
    }
}