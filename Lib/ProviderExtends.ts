import { JsonRpcProvider, Contract, Log, formatUnits, isAddress } from "ethers";
import {
  uniswap_router_abi_decoder,
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  weth_abi_decoder,
} from "./BasisConstants";
import { interface_pool_tokens } from "./PoolMetadata/PoolStorage";
import Decimal from "decimal.js";
import { PoolProvider } from "./PoolMetadata/ScriptInit";
import { TokenProvider } from "./TokenMetadata/ScriptInit";
import {
  interface_Deposit_Event_info,
  interface_LiqAction_Event_V3_info,
  interface_Transfer_Event_info,
  interface_Withdrawal_Event_info,
  interface_swap_info,
  interface_LiqAction_Event_V2_info,
} from "./TypeAndInterface";
import {
  sortUniV2SwapInfo,
  sortUniV3SwapInfo,
  sortUniV2SyncInfo,
} from "./UniSwapSorts";
import { type } from "os";
import { decode } from "punycode";

class CustomProvider extends JsonRpcProvider {
  readonly pool_provider: PoolProvider;
  readonly token_provider: TokenProvider;
  constructor(
    url: string,
    pool_provider: PoolProvider,
    token_provider: TokenProvider
  ) {
    super(url);
    this.pool_provider = pool_provider;
    this.token_provider = token_provider;
  }

  async getSwapRelatedLogs(
    start_block_number: number,
    end_block_number: number
  ): Promise<Array<Log>> {
    let res = await this.getLogs({
      fromBlock: start_block_number,
      toBlock: end_block_number,
      topics: [
        [
          uniswap_v3_abi_decoder.getEvent("Swap")?.topicHash as string,
          uniswap_v2_abi_decoder.getEvent("Swap")?.topicHash as string,
          uniswap_v2_abi_decoder.getEvent("Sync")?.topicHash as string,
          uniswap_v2_abi_decoder.getEvent("Mint")?.topicHash as string,
          uniswap_v2_abi_decoder.getEvent("Burn")?.topicHash as string,
          uniswap_v3_abi_decoder.getEvent("Mint")?.topicHash as string,
          uniswap_v3_abi_decoder.getEvent("Burn")?.topicHash as string,
          weth_abi_decoder.getEvent("Transfer")?.topicHash as string,
          weth_abi_decoder.getEvent("Deposit")?.topicHash as string,
          weth_abi_decoder.getEvent("Withdrawal")?.topicHash as string,
        ],
      ],
    });
    return res;
  }

  async getUniPoolToken(pool: string): Promise<interface_pool_tokens> {
    let result = await this.pool_provider.getPool(pool);
    return result;
  }

  async getTokenDecimal(token: string): Promise<number> {
    return await this.token_provider.getTokenDecimals(token);
  }

  async getBlockFeats(
    block_number: number
  ): Promise<{ consumedGas: number; timestamp: number; blockLength: number }> {
    let block = await this.getBlock(block_number);
    let gas_consumed = Decimal.mul(
      formatUnits(block?.gasUsed as bigint, 0),
      formatUnits(block?.baseFeePerGas as bigint, "ether")
    );
    let block_timestamp = block?.timestamp;
    return {
      consumedGas: Number(gas_consumed.toFixed(6)),
      timestamp: block_timestamp as number,
      blockLength: block?.length as number,
    };
  }

  async getIsContract(address: string): Promise<boolean> {
    if (!isAddress(address)) {
      throw new Error("invalid address");
    }
    let code = await this.getCode(address);
    if (code === "0x") {
      return false;
    } else {
      return true;
    }
  }

  async getTransactionFeats(tx_hash: string): Promise<{
    priority_fee: number;
    from: string;
    to: string;
    nonce: number;
  }> {
    let tx = await this.getTransaction(tx_hash);
    let priority_fee = Number(tx?.maxPriorityFeePerGas);
    let from = tx?.from as string;
    let to = tx?.to as string;
    let nonce = tx?.nonce as number;
    return {
      priority_fee,
      from,
      to,
      nonce,
    };
  }
  async decodeV2Swap(combine_logs: Array<Log>): Promise<interface_swap_info> {
    let pool = await this.getUniPoolToken(combine_logs[1].address);
    // let token0_decimals = await this.getTokenDecimal(pool.token0);
    // let token1_decimals = await this.getTokenDecimal(pool.token1);
    let sort_out_info = sortUniV2SwapInfo(combine_logs[1]);
    let sort_out_sync_info = sortUniV2SyncInfo(combine_logs[0]);
    // let pool_token0 = new Decimal(
    //   formatUnits(sort_out_sync_info.pool_token0, token0_decimals)
    // ).toFixed(6);
    // let pool_token1 = new Decimal(
    //   formatUnits(sort_out_sync_info.pool_token1, token1_decimals)
    // ).toFixed(6);
    // let amount0In = new Decimal(
    //   formatUnits(sort_out_info.amount0In, token0_decimals)
    // ).toFixed(6);
    // let amount1In = new Decimal(
    //   formatUnits(sort_out_info.amount1In, token1_decimals)
    // ).toFixed(6);
    let pool_token0_before_tx =
      sort_out_sync_info.pool_token0 - sort_out_info.amount0In;
    let pool_token1_before_tx =
      sort_out_sync_info.pool_token1 - sort_out_info.amount1In;
    return {
      sender: sort_out_info.sender,
      to: sort_out_info.to,
      token0: pool.token0,
      token1: pool.token1,
      amount0In: sort_out_info.amount0In,
      amount1In: sort_out_info.amount1In,
      pool: pool.pool,
      pool_token0: pool_token0_before_tx,
      pool_token1: pool_token1_before_tx,
      type: "v2",
      tick: 0n,
    };
  }

  async decodeV3Swap(single_log: Log): Promise<interface_swap_info> {
    // let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
    //   "Swap",
    //   single_log.data,
    //   single_log.topics
    // );
    let pool = await this.pool_provider.getPool(single_log.address);
    // let token0_decimals = await this.getTokenDecimal(pool.token0);
    // let token1_decimals = await this.getTokenDecimal(pool.token1);
    let sort_out_info = sortUniV3SwapInfo(single_log);
    // let amount0In = new Decimal(
    //   formatUnits(sort_out_info.amount0In, token0_decimals)
    // ).toFixed(6);
    // let amount1In = new Decimal(
    //   formatUnits(sort_out_info.amount1In, token1_decimals)
    // ).toFixed(6);
    // let pool_token0 = new Decimal(
    //   formatUnits(sort_out_info.pool_token0, token0_decimals)
    // ).toFixed(6);
    // let pool_token1 = new Decimal(
    //   formatUnits(sort_out_info.pool_token1, token1_decimals)
    // ).toFixed(6);
    return {
      sender: sort_out_info.sender,
      to: sort_out_info.to,
      token0: pool.token0,
      token1: pool.token1,
      amount0In: sort_out_info.amount0In,
      amount1In: sort_out_info.amount1In,
      pool: pool.pool,
      pool_token0: sort_out_info.pool_token0,
      pool_token1: sort_out_info.pool_token1,
      type: "v3",
      tick: sort_out_info.tick,
    };
  }

  async decodeTransfer(
    single_log: Log
  ): Promise<interface_Transfer_Event_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Transfer",
      single_log.data,
      single_log.topics
    );
    // let decimals = await this.getTokenDecimal(single_log.address);
    // let amount = formatUnits(decoded_log[2], decimals);
    return {
      from: decoded_log[0],
      to: decoded_log[1],
      amount: decoded_log[2],
      token: single_log.address,
    };
  }

  async decodeDeposit(single_log: Log): Promise<interface_Deposit_Event_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Deposit",
      single_log.data,
      single_log.topics
    );
    // let ether = formatUnits(decoded_log[1], "ether");
    return {
      to: decoded_log[0],
      amount: decoded_log[1],
    };
  }

  async decodeWithdrawal(
    single_log: Log
  ): Promise<interface_Withdrawal_Event_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Withdrawal",
      single_log.data,
      single_log.topics
    );
    return {
      from: decoded_log[0],
      amount: decoded_log[1],
    };
  }

  async decodeUniV3Mint(
    single_log: Log
  ): Promise<interface_LiqAction_Event_V3_info> {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "Mint",
      single_log.data,
      single_log.topics
    );
    let pool_tokens = await this.getUniPoolToken(single_log.address);
    return {
      owner: decoded_log[0] as string,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: decoded_log[5] as bigint,
      amount1In: decoded_log[6] as bigint,
      pool_token0: 0n,
      pool_token1: 0n,
      type: "v3",
      tickUpper: decoded_log[3] as bigint,
      tickLower: decoded_log[2] as bigint,
    };
  }
  async decodeUniV3Burn(
    single_log: Log
  ): Promise<interface_LiqAction_Event_V3_info> {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "Burn",
      single_log.data,
      single_log.topics
    );
    let pool_tokens = await this.getUniPoolToken(single_log.address);
    return {
      owner: decoded_log[0] as string,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: -(decoded_log[4] as bigint),
      amount1In: -(decoded_log[5] as bigint),
      pool_token0: 0n,
      pool_token1: 0n,
      type: "v3",
      tickUpper: decoded_log[2] as bigint,
      tickLower: decoded_log[1] as bigint,
    };
  }
  async decodeUniV2Mint(
    combine_logs: Array<Log>
  ): Promise<interface_LiqAction_Event_V2_info> {
    let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
      "Mint",
      combine_logs[1].data,
      combine_logs[1].topics
    );
    let decoded_log_sync = uniswap_v2_abi_decoder.decodeEventLog(
      "Sync",
      combine_logs[0].data,
      combine_logs[0].topics
    );
    let pool_tokens = await this.getUniPoolToken(combine_logs[1].address);
    return {
      sender: decoded_log[0] as string,
      to: "",
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: decoded_log[1],
      amount1In: decoded_log[2],
      pool_token0: (decoded_log_sync[0] as bigint) - decoded_log[1],
      pool_token1: (decoded_log_sync[1] as bigint) - decoded_log[2],
      type: "v2",
      tickUpper: 0n,
      tickLower: 0n,
    };
  }

  async decodeUniV2Burn(
    combine_logs: Array<Log>
  ): Promise<interface_LiqAction_Event_V2_info> {
    let decoded_log = uniswap_v2_abi_decoder.decodeEventLog(
      "Burn",
      combine_logs[1].data,
      combine_logs[1].topics
    );
    let decoded_log_sync = uniswap_v2_abi_decoder.decodeEventLog(
      "Sync",
      combine_logs[0].data,
      combine_logs[0].topics
    );
    let pool_tokens = await this.getUniPoolToken(combine_logs[1].address);
    return {
      sender: decoded_log[0] as string,
      to: decoded_log[3] as string,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: -(decoded_log[1] as bigint),
      amount1In: -(decoded_log[2] as bigint),
      pool_token0: decoded_log_sync[0] + decoded_log[1],
      pool_token1: decoded_log_sync[1] + decoded_log[2],
      type: "v2",
      tickUpper: 0n,
      tickLower: 0n,
    };
  }
}
export { CustomProvider };
