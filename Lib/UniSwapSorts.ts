import { Contract, Log } from "ethers";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  weth_abi_decoder,
} from "./BasisConstants";
import { local_provider } from "./ProviderSetup";
import { Token, ChainId } from "@uniswap/sdk";
import Decimal from "decimal.js";
// interface interface_swap_abstract {
//   //   sender: Array<{ address: string; amount: number }>;
//   receiver: Array<{ address: string; amount: number }>;
//   pool: string;
// }

// interface interface_pool_tokens {
//   token0: string;
//   token1: string;
// }

function sortUniV2SwapInfo(log: Log): {
  amount0In: bigint;
  amount1In: bigint;
  pool: string;
  sender: string;
  to: string;
} {
  let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
    "Swap",
    log.data,
    log.topics
  );
  return {
    amount0In: BigInt(decoded_log[1] - decoded_log[3]),
    amount1In: BigInt(decoded_log[2] - decoded_log[4]),
    pool: log.address,
    sender: decoded_log[0],
    to: decoded_log[5],
  };
}
function sortUniV2SyncInfo(log: Log): {
  pool_token0: bigint;
  pool_token1: bigint;
} {
  let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
    "Sync",
    log.data,
    log.topics
  );
  // let pool_token0 = new Decimal(decoded_log[0].toString());
  // let pool_token1 = new Decimal(decoded_log[1].toString());
  return {
    pool_token0: decoded_log[0],
    pool_token1: decoded_log[1],
  };
}
function sortUniV3SwapInfo(log: Log): {
  amount0In: bigint;
  amount1In: bigint;
  pool: string;
  sender: string;
  to: string;
  pool_token0: bigint;
  pool_token1: bigint;
  tick: bigint;
} {
  let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
    "Swap",
    log.data,
    log.topics
  );
  let liq_sq = new Decimal(decoded_log[5].toString()).pow(2);
  // 假设x1是input token，y1是output token，
  // 然后等式(x1+x)/y=x1/y1，其中x是pool中x的余额，y是pool中y的余额，x1是input token的数量，y1是output token的数量
  // 我们知道x1的值，y1的值，也知道x*y的值也就是Liquidity的平方，那么就可以解出x和y的值
  // 这里的pool_token 是before交易的
  let pool_token_before: bigint[] = [];
  if (decoded_log[2] >= decoded_log[3]) {
    // token0_in token1out
    let x1 = decoded_log[2];
    let y1 = -decoded_log[3];
    let delta = Decimal.add(
      new Decimal(x1.toString()).pow(2),
      new Decimal(liq_sq).mul(4).mul(x1.toString()).div(y1.toString())
    );
    pool_token_before.push(
      BigInt(
        Decimal.div(
          Decimal.add(new Decimal(x1.toString()).negated(), delta.sqrt()),
          new Decimal(2)
        ).toFixed(0)
      )
    );
    pool_token_before.push(
      BigInt(liq_sq.div(pool_token_before[0].toString()).toFixed(0))
    );
  } else {
    // token1_in token0_out
    let x1 = decoded_log[3];
    let y1 = -decoded_log[2];
    let delta = Decimal.add(
      new Decimal(x1.toString()).pow(2),
      new Decimal(liq_sq).mul(4).mul(x1.toString()).div(y1.toString())
    );
    let pool_token1 = BigInt(
      Decimal.div(
        Decimal.add(new Decimal(x1.toString()).negated(), delta.sqrt()),
        new Decimal(2)
      ).toFixed(0)
    );
    pool_token_before.push(
      BigInt(liq_sq.div(pool_token1.toString()).toFixed(0))
    );
    pool_token_before.push(pool_token1);
  }

  return {
    amount0In: decoded_log[2],
    amount1In: decoded_log[3],
    pool: log.address,
    sender: decoded_log[0],
    to: decoded_log[1],
    pool_token0: pool_token_before[0],
    pool_token1: pool_token_before[1],
    tick: decoded_log[6],
  };
}

function reDivideArray<T extends { [key: string]: any }>(
  array: T[],
  same_prop: string
): Map<string, Array<T>> {
  let hashtable = new Map();
  for (let item of array) {
    if (hashtable.has(item[same_prop])) {
      hashtable.get(item[same_prop]).push(item);
    } else if (!hashtable.has(item[same_prop])) {
      hashtable.set(item[same_prop], [item]);
    }
  }
  return hashtable;
}

function deletePureTransferTxFromMap(
  map_type_logs_divide: Map<string, Array<Log>>
) {
  let non_swap_topics: string[] = [
    weth_abi_decoder.getEvent("Transfer")?.topicHash as string,
    weth_abi_decoder.getEvent("Deposit")?.topicHash as string,
    weth_abi_decoder.getEvent("Withdrawal")?.topicHash as string,
  ];
  for (let tx_logs of map_type_logs_divide) {
    let transfer_mark = false;
    for (let log of tx_logs[1]) {
      if (
        !(
          // log.topics[0] ===
          // (weth_abi_decoder.getEvent("Transfer")?.topicHash as string)
          non_swap_topics.includes(log.topics[0])
        )
      ) {
        transfer_mark = true;
        break;
      }
    }
    if (!transfer_mark) {
      map_type_logs_divide.delete(tx_logs[0]);
    }
  }
  return map_type_logs_divide;
}

function decodeUniActionInTheBlock(logs: Log[]): void {
  let swap_number: number = 0;
  for (let log of logs) {
    if (
      log.topics[0] ===
      (uniswap_v2_abi_decoder.getEvent("Swap")?.topicHash as string)
    ) {
      let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
        "Swap",
        log.data,
        log.topics
      );
      // console.log(decoded_log);
      swap_number++;
    } else if (
      log.topics[0] ===
      (uniswap_v3_abi_decoder.getEvent("Swap")?.topicHash as string)
    ) {
      let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
        "Swap",
        log.data,
        log.topics
      );
      // console.log(decoded_log);
      swap_number++;
    }
  }
  if (swap_number >= 2) {
    console.log(logs);
  }
}

export {
  sortUniV2SwapInfo,
  sortUniV3SwapInfo,
  reDivideArray,
  deletePureTransferTxFromMap,
  decodeUniActionInTheBlock,
  sortUniV2SyncInfo,
};
