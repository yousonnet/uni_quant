import { createObjectCsvWriter } from "csv-writer";
import { local_provider } from "./Lib/ProviderSetup";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
} from "./Lib/BasisConstants";
import { Block, Contract, Log, ethers } from "ethers";
import Decimal from "decimal.js";
import { sortUniV2SwapInfo } from "./Lib/UniSwapSorts";

let csv_writer = createObjectCsvWriter({
  path: "half_year_swap_and_liq_on_uniswap_table.csv",
  header: [
    { id: "block", title: "Block" },
    { id: "pool", title: "Pool" },
    { id: "user", title: "User" },
    { id: "blockTimestamp", title: "BlockTimestamp" },
    { id: "amount0_address", title: "Amount0_Address" },
    { id: "amount1_address", title: "Amount1_Address" },
    { id: "amount0", title: "Amount0" },
    { id: "amount1", title: "Amount1" },
    { id: "isLiqAction", title: "IsLiqAction" },
    { id: "liqChange", title: "LiqChange" },
    // { id: "gasFee", title: "GasFee" },
    { id: "priorityFeePerGas_Gwei", title: "PriorityFeePerGas_Gwei" },
    { id: "blockBaseGasConsumed", title: "BlockBaseGasConsumed" },
    { id: "innerBlockSwapQuantity", title: "InnerBlockSwapQuantity" },
    { id: "innerBlockLiqActionQuantity", title: "InnerBlockLiqActionQuantity" },
    {
      id: "innerBlockTransactionsQuantity",
      title: "InnerBlockTransactionsQuantity",
    },
  ],
});

// csv_writer
//   .writeRecords(data)
//   .then(() => console.log("The CSV file was written successfully"));
export { csv_writer };

async function downloadAllHalfTX(start: number, end: number): Promise<void> {
  for (
    let begin_block = start, end_block = end;
    begin_block <= end_block;
    begin_block++
  ) {
    let block_info = await local_provider.getBlock(begin_block);
    let base_gas_consumed_inner_block_ethers = calculateBurntFee(
      block_info as Block
    );
    let block_length = block_info?.length;
    let block_timestamp = block_info?.timestamp;

    let v2_logs = await getUniV2SwapInnerBlock(begin_block);
    console.log(v2_logs);
    for (let log of v2_logs) {
      // decodeUniV2SwapAction(log);
      let res = decodeUniV2SwapAction(log);
      console.log(res);
      console.log(log.transactionHash);
    }
    // let v3_logs = await getUniV3SwapInnerBlock(begin_block);
    // for (let log of v3_logs) {
    //   let res = decodeUniV3SwapAction(log);
    //   console.log(res);
    //   console.log(log.transactionHash);
    // }
  }
}

function calculateBurntFee(block: Block): number {
  let base_gas_consumed_inner_block_ethers = Decimal.mul(
    ethers.formatUnits(block?.baseFeePerGas as bigint, "gwei"),
    ethers.formatUnits(block?.gasUsed as bigint, "gwei")
  );
  return new Decimal(
    base_gas_consumed_inner_block_ethers.toFixed(2)
  ).toNumber();
}

async function getUniV2SwapInnerBlock(block: number): Promise<Array<Log>> {
  let logs = await local_provider.getLogs({
    fromBlock: block,
    toBlock: block,
    topics: [[uniswap_v2_abi_decoder.getEvent("Swap")?.topicHash as string]],
  });
  return logs;
}

async function getUniV3SwapInnerBlock(block: number): Promise<Array<Log>> {
  let logs = await local_provider.getLogs({
    fromBlock: block,
    toBlock: block,
    topics: [[uniswap_v3_abi_decoder.getEvent("Swap")?.topicHash as string]],
  });
  return logs;
}

interface UniSwapAction {
  amount0In: number;
  amount1In: number;
  pool: string;
}

function decodeUniV2SwapAction(log: Log): UniSwapAction {
  let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
    "Swap",
    log.data,
    log.topics
  );
  return {
    amount0In: decoded_log[3] - decoded_log[1],
    amount1In: decoded_log[4] - decoded_log[2],
    pool: log.address,
  };
  // return decoded_log;
}

function decodeUniV3SwapAction(log: Log) {
  let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
    "Swap",
    log.data,
    log.topics
  );

  return {
    amount0In: -decoded_log[1],
    amount1In: -decoded_log[2],
    pool: log.address,
  };
}

downloadAllHalfTX(17176506, 17176506);
