import { default_provider } from "./Lib/ProviderSetup";
import {
  TOPICHASHTABLE,
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
} from "./Lib/constants/BasisConstants";
import { Log, TransactionResponse } from "ethers";
async function test() {
  let block = 18736389;
  for (let i = block; i < block + 10000; i++) {
    let logs = await default_provider.getLogs({
      fromBlock: i,
      toBlock: i,
      topics: [[TOPICHASHTABLE.Burn]],
    });
    let hash_swap_log_table: { [key: string]: Log[] } = {};
    for (let i of logs) {
      if (hash_swap_log_table[i.transactionHash] === undefined) {
        hash_swap_log_table[i.transactionHash] = [i];
      } else {
        hash_swap_log_table[i.transactionHash].push(i);
      }
    }
    let hash_swap_log_table_array = Object.values(hash_swap_log_table);
    for (let i of hash_swap_log_table_array) {
      if (i.length === 0) {
        continue;
      }
      console.log(i);
      // for (let ii of i) {
      //   if (ii.topics[0] === TOPICHASHTABLE.Burn) {
      //     let docoded_log = uniswap_v2_abi_decoder.decodeEventLog(
      //       "Burn",
      //       ii.data,
      //       ii.topics
      //     );
      //     console.log
      //     let tx_info = await default_provider.getTransaction(
      //       ii.transactionHash
      //     );
      //     if (tx_info!.to !== docoded_log[3]) {
      //       console.log(ii.transactionHash);
      //     } else {
      //       console.log("pass");
      //     }
      //   }
      // }
    }
    // console.log(i);
    // break;
  }
}
test();
