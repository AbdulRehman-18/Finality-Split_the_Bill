// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Test, console} from "forge-std/Test.sol";
import {LedgerWatch} from "../src/LedgerWatch.sol";

contract LedgerWatchTest is Test {
    LedgerWatch public watch;

    address public debtor = address(1);
    address public creditor = address(2);

    event DebtLogged(uint256 indexed id, address indexed debtor, address indexed creditor, uint256 amount);
    event DebtSettled(uint256 indexed id, uint256 amountPaid);

    function setUp() public {
        watch = new LedgerWatch();
        vm.deal(debtor, 100 ether);
    }

    function test_LogDebt() public {
        vm.prank(debtor);
        vm.expectEmit(true, true, true, true);
        emit DebtLogged(0, debtor, creditor, 1 ether);
        uint256 id = watch.logDebt(creditor, 1 ether);
        assertEq(id, 0);

        LedgerWatch.Debt memory d = watch.getDebt(0);
        assertEq(d.debtor, debtor);
        assertEq(d.creditor, creditor);
        assertEq(d.amount, 1 ether);
        assertEq(d.settled, false);
    }

    function test_Settle() public {
        vm.prank(debtor);
        watch.logDebt(creditor, 1 ether);

        uint256 preBalance = creditor.balance;

        vm.prank(debtor);
        vm.expectEmit(true, false, false, true);
        emit DebtSettled(0, 1 ether);
        watch.settle{value: 1 ether}(0);

        LedgerWatch.Debt memory d = watch.getDebt(0);
        assertTrue(d.settled);
        assertEq(creditor.balance, preBalance + 1 ether);
    }

    function test_RevertSettle_WrongAmount() public {
        vm.prank(debtor);
        watch.logDebt(creditor, 1 ether);

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(LedgerWatch.WrongAmount.selector, 1 ether, 0.5 ether));
        watch.settle{value: 0.5 ether}(0);
    }

    function test_RevertSettle_AlreadySettled() public {
        vm.prank(debtor);
        watch.logDebt(creditor, 1 ether);

        vm.prank(debtor);
        watch.settle{value: 1 ether}(0);

        vm.prank(debtor);
        vm.expectRevert(abi.encodeWithSelector(LedgerWatch.AlreadySettled.selector, 0));
        watch.settle{value: 1 ether}(0);
    }

    function test_RevertSettle_NotDebtor() public {
        vm.prank(debtor);
        watch.logDebt(creditor, 1 ether);

        address other = address(3);
        vm.deal(other, 100 ether);
        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(LedgerWatch.NotDebtor.selector, 0, other));
        watch.settle{value: 1 ether}(0);
    }
}
