// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract LedgerWatch {
    struct Debt {
        address debtor;
        address creditor;
        uint256 amount;   // in wei (MON)
        bool settled;
    }

    Debt[] public debts;

    event DebtLogged(uint256 indexed id, address indexed debtor, address indexed creditor, uint256 amount);
    event DebtSettled(uint256 indexed id, uint256 amountPaid);

    error NotDebtor(uint256 id, address caller);
    error AlreadySettled(uint256 id);
    error WrongAmount(uint256 expected, uint256 sent);

    function logDebt(address creditor, uint256 amount) external returns (uint256 id) {
        id = debts.length;
        debts.push(Debt(msg.sender, creditor, amount, false));
        emit DebtLogged(id, msg.sender, creditor, amount);
    }

    function settle(uint256 id) external payable {
        Debt storage d = debts[id];
        if (msg.sender != d.debtor) revert NotDebtor(id, msg.sender);
        if (d.settled) revert AlreadySettled(id);
        if (msg.value != d.amount) revert WrongAmount(d.amount, msg.value);

        d.settled = true;
        (bool ok, ) = d.creditor.call{value: msg.value}("");
        require(ok, "transfer failed");
        emit DebtSettled(id, msg.value);
    }

    function getDebt(uint256 id) external view returns (Debt memory) {
        return debts[id];
    }
}
