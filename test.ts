import { SwapSequencer } from "./Lib/UniSwapSequenceSort";
import Decimal from "decimal.js";
import { decode } from "punycode";
import { default_provider } from "./Lib/ProviderSetup";
import { PoolProvider } from "./Lib/PoolMetadata/ScriptInit";
import { TokenProvider } from "./Lib/TokenMetadata/ScriptInit";
import { Token } from "@uniswap/sdk";
import { CustomProvider } from "./Lib/ProviderExtends";
import test from "node:test";
import { formatUnits, ethers, Log } from "ethers";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  weth_abi_decoder,
} from "./Lib/BasisConstants";
import { getInternalTxFromBlockRange } from "./Lib/EScanCLI";
import { Trade } from "@uniswap/sdk";
import { sortUniV3SwapInfo } from "./Lib/UniSwapSorts";
async function main() {
  console.time();
  // local_custom_provider.getBlockConsumedGas(18542299).then((res) => {
  //   console.log(res);
  // });
  // let block_logs = await local_custom_provider.getSwapRelatedLogs(
  //   17176506,
  //   17176506
  // );

  let res = await TokenProvider.getAllTokensFromDB();
  let token_provider = new TokenProvider(res);
  let res1 = await PoolProvider.getAllPoolsFromDB();
  let pool_provider = new PoolProvider(res1);
  let test_custom_provider = new CustomProvider(
    "http://127.0.0.1:3334",
    pool_provider,
    token_provider
  );
  let logs = await test_custom_provider.getSwapRelatedLogs(17176506, 17176506);
  let internal_txs = await getInternalTxFromBlockRange(17176506, 17176506, 1);
  let test_swap_sequencer = new SwapSequencer(
    logs,
    internal_txs,
    test_custom_provider
  );
  let log = test_swap_sequencer.map_logs_divided;
  // for (let i = 0; i <= log.size; i++) {
  //   if (i == 1) {
  //     let ir = await test_custom_provider.decodeV2Swap(
  //       Array.from(log.entries())[i][1][3]
  //     );
  //     console.log(ir.amount0In <= ir.amount1In);
  //   }
  // }

  // let ir = await test_custom_provider.decodeV3Swap(
  //   Array.from(log.entries())[0][1][4]
  //   // [Array.from(log.entries())[1][1][2], Array.from(log.entries())[1][1][3]]
  // );
  // let ir2 = await test_custom_provider.decodeTransfer(
  //   Array.from(log.entries())[0][1][1]
  // );
  // let ir3 = await test_custom_provider.decodeDeposit(
  //   Array.from(log.entries())[0][1][0]
  // );
  // console.log(ir);
  // console.log(ir2);
  // console.log(Array.from(log.entries())[0][1]);
  let log_burn = (
    await test_custom_provider.getTransactionReceipt(
      "0x51cc837e294f26477cdefc057e55a6cd8d9ac98d5c1b73d72c60f47f5cf556bf"
    )
  )?.logs.slice(5, 7) as Array<Log>;
  let decoded = await test_custom_provider.decodeUniV2Burn(log_burn);
  console.log(decoded);
  // let res3 = await test_custom_provider.getLogs({
  //   topics: [[uniswap_v2_abi_decoder.getEvent("Burn")?.topicHash as string]],
  //   fromBlock: 18591380,
  //   toBlock: 18591680,
  // });
  // console.log(res3);
  // console.log([
  //   Array.from(log.entries())[1][1][2],
  //   Array.from(log.entries())[1][1][3],
  // ]);
  // console.log(log);
  // console.log(block_logs);
  // .then((res) => {
  //   console.log(res);
  // });
  // let res = await getSwapRelatedLogs(17176506, 17176506);

  // let sort_result = reDivideArray(res, "transactionHash");

  // sort_result = deleteNonTransferTxFromMap(sort_result);
  console.timeEnd();
  // for (let item of sort_result) {
  //   decodeUniActionInTheBlock(item[1]);
  // }

  // console.log(sort_result);

  // console.log(uniswap_v2_abi_decoder.fragments);
  //   let res = uniswap_v2_abi_decoder.getFunction("token0")?.outputs;
  //   console.log(res);
  //   let v2_pool = new Contract(
  //     "0x43f8e84E77431D370934585C0bCb4624af907518",
  //     uniswap_v2_abi_decoder,
  //     local_provider
  //   );
  //   let res = await v2_pool.token1();
  //   console.log(res);
}
main();
// main();
interface unmutable {}

async function main2() {
  console.time();
  let res = await TokenProvider.getAllTokensFromDB();
  let token_provider = new TokenProvider(res);
  let res1 = await PoolProvider.getAllPoolsFromDB();
  let pool_provider = new PoolProvider(res1);
  let test_custom_provider = new CustomProvider(
    "http://127.0.0.1:3334",
    pool_provider,
    token_provider
  );
  // await test_custom_provider
  //   .send("debug_traceTransaction", [
  //     "0xefadcdb2362d304ee37eb8ebf8b4e000a49be5adfddd3d1d51e5a01a4a7252b2",
  //     {},
  //   ])
  //   .then((trace) => {
  //     console.log(trace);
  //   });
  // let infura_provider = new ethers.JsonRpcProvider(
  //   "https://mainnet.infura.io/v3/b9c14a8a1c654185b637535b66c4950b"
  // );
}
