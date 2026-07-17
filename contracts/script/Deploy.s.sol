// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Script, console} from "forge-std/Script.sol";
import {LedgerWatch} from "../src/LedgerWatch.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        LedgerWatch watch = new LedgerWatch();
        console.log("LedgerWatch deployed to:", address(watch));

        vm.stopBroadcast();
    }
}
