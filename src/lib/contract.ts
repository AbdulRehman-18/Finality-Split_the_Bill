export const CONTRACT_ADDRESS = "0x80297E799b71D0913Ce74C7dBb1CB9640e039e92" as const;

export const ABI = [
  {"type":"function","name":"debts","inputs":[{"name":"","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"debtor","type":"address","internalType":"address"},{"name":"creditor","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"settled","type":"bool","internalType":"bool"}],"stateMutability":"view"},
  {"type":"function","name":"getDebt","inputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"","type":"tuple","internalType":"struct LedgerWatch.Debt","components":[{"name":"debtor","type":"address","internalType":"address"},{"name":"creditor","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"},{"name":"settled","type":"bool","internalType":"bool"}]}],"stateMutability":"view"},
  {"type":"function","name":"logDebt","inputs":[{"name":"creditor","type":"address","internalType":"address"},{"name":"amount","type":"uint256","internalType":"uint256"}],"outputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"stateMutability":"nonpayable"},
  {"type":"function","name":"settle","inputs":[{"name":"id","type":"uint256","internalType":"uint256"}],"outputs":[],"stateMutability":"payable"},
  {"type":"event","name":"DebtLogged","inputs":[{"name":"id","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"debtor","type":"address","indexed":true,"internalType":"address"},{"name":"creditor","type":"address","indexed":true,"internalType":"address"},{"name":"amount","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"event","name":"DebtSettled","inputs":[{"name":"id","type":"uint256","indexed":true,"internalType":"uint256"},{"name":"amountPaid","type":"uint256","indexed":false,"internalType":"uint256"}],"anonymous":false},
  {"type":"error","name":"AlreadySettled","inputs":[{"name":"id","type":"uint256","internalType":"uint256"}]},
  {"type":"error","name":"NotDebtor","inputs":[{"name":"id","type":"uint256","internalType":"uint256"},{"name":"caller","type":"address","internalType":"address"}]},
  {"type":"error","name":"WrongAmount","inputs":[{"name":"expected","type":"uint256","internalType":"uint256"},{"name":"sent","type":"uint256","internalType":"uint256"}]}
] as const;
