import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { ABI, CONTRACT_ADDRESS } from './contract';
import { parseAbiItem } from 'viem';

export interface OnchainDebt {
  id: number;
  debtor: string;
  creditor: string;
  amount: bigint;
  settled: boolean;
}

export function useOnchainDebts() {
  const [onchainDebts, setOnchainDebts] = useState<OnchainDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!publicClient) return;

    const fetchDebts = async () => {
      try {
        // Monad Testnet does not support multicall3 yet, and eth_getLogs has strict range limits.
        // We will fetch debts concurrently in small batches using readContract until we hit an out-of-bounds error.
        const fetchedDebts: OnchainDebt[] = [];
        let currentId = 0;
        let hasMore = true;

        while (hasMore) {
          const batchSize = 10;
          const promises = [];
          
          for (let i = 0; i < batchSize; i++) {
            promises.push(
              publicClient.readContract({
                address: CONTRACT_ADDRESS as `0x${string}`,
                abi: ABI,
                functionName: 'getDebt',
                args: [BigInt(currentId + i)],
              })
            );
          }

          const results = await Promise.allSettled(promises);

          for (let i = 0; i < results.length; i++) {
            const result = results[i];
            
            if (result.status === 'fulfilled' && result.value) {
              const debtData: any = result.value;
              const debtor = Array.isArray(debtData) ? debtData[0] : debtData.debtor;
              const creditor = Array.isArray(debtData) ? debtData[1] : debtData.creditor;
              const amount = Array.isArray(debtData) ? debtData[2] : debtData.amount;
              const settled = Array.isArray(debtData) ? debtData[3] : debtData.settled;

              fetchedDebts.push({
                id: currentId + i,
                debtor,
                creditor,
                amount,
                settled,
              });
            } else {
              // Revert indicates we reached the end of the debts array
              hasMore = false;
              break;
            }
          }

          currentId += batchSize;
        }
        
        setOnchainDebts(fetchedDebts);
      } catch (e) {
        console.error("Failed to fetch on-chain debts", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();

    // Poll every 5s
    const interval = setInterval(fetchDebts, 5000);
    return () => clearInterval(interval);
  }, [publicClient]);

  return { onchainDebts, loading };
}
