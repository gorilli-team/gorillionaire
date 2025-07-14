// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script } from "forge-std/Script.sol";
import { SmartWalletFactory } from "../src/SmartWalletFactory.sol";

contract DeploySmartWalletFactory is Script {
    function run() public {
        vm.startBroadcast();
        new SmartWalletFactory();
        vm.stopBroadcast();
    }
}