import {
  JsonRpcProvider,
  Contract,
  Log,
  formatUnits,
  isAddress,
  EventLog,
} from "ethers";
import {
  uniswap_router_abi_decoder,
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  weth_abi_decoder,
  TOPICHASHTABLE,
  ETH_MAINNET_CONSTANTS,
} from "./constants/BasisConstants";
import { interface_pool_tokens } from "./PoolMetadata/PoolStorage";
import Decimal from "decimal.js";
import { PoolProvider } from "./PoolMetadata/ScriptInit";
import { TokenProvider } from "./TokenMetadata/ScriptInit";
// import {
//   interface_Transfer_Event_info,
//   interface_swap_info,
//   interface_LiqAction_Event_info,
//   interface_info_type,
//   interface_true_swap_info,
//   interface_true_LiqAction_Event_info,
// } from "./TypeAndInterface";
import {
  interface_transfer_info,
  interface_events_info,
  interface_general_info,
} from "./interface/UniEventsInterfaces";
import {
  sortUniV2SwapInfo,
  sortUniV3SwapInfo,
  sortUniV2SyncInfo,
} from "./UniSwapSorts";
import { EtherScanAPICLI } from "./EScanCLI";
import { ETH_BNB } from "@uniswap/smart-order-router";
// import { isTransferInfo } from "./SupplementInfo";
class CustomProvider extends JsonRpcProvider {
  readonly pool_provider!: PoolProvider;
  readonly token_provider!: TokenProvider;
  readonly etherscan_provider!: EtherScanAPICLI;
  constructor(
    url: string,
    pool_provider: PoolProvider,
    token_provider: TokenProvider,
    etherscan_provider: EtherScanAPICLI
  ) {
    super(url);
    this.pool_provider = pool_provider;
    this.token_provider = token_provider;
    this.etherscan_provider = etherscan_provider;
  }
  async getWhoOwnedTheERC721TokenWhen(
    block_number: number,
    contract_address: string,
    token_id: number,
    tx_hash: string
  ): Promise<string> {
    let erc721_contract = new Contract(
      contract_address,
      ETH_MAINNET_CONSTANTS.UNISWAP.V3NFTABI,
      this
    );
    const filter = erc721_contract.filters.Transfer(null, null, token_id);
    const events = (await erc721_contract.queryFilter(
      filter,
      0,
      block_number
    )) as EventLog[];
    // 其实暴力的话直接去length-1项就可以了
    // for (let i = events.length - 1; i >= 0; --i) {
    //   if (events[i].blockNumber <= block_number) {
    //     return events[i].args[1].toLowerCase();
    //   }
    // }
    if (
      events.length !== 0
      // &&
      // events[events.length - 1].transactionHash === tx_hash
    ) {
      return events
        .find((item) => item.transactionHash === tx_hash)!
        .args[1].toLowerCase();
    }
    return ETH_MAINNET_CONSTANTS["0Address"];
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
          TOPICHASHTABLE.Burn,
          TOPICHASHTABLE.Mint,
          TOPICHASHTABLE.Swap,
          TOPICHASHTABLE.Sync,
          TOPICHASHTABLE.Transfer,
          TOPICHASHTABLE.Deposit,
          TOPICHASHTABLE.Withdrawal,
          TOPICHASHTABLE.BurnV3,
          TOPICHASHTABLE.MintV3,
          TOPICHASHTABLE.SwapV3,
          TOPICHASHTABLE.DecreaseLiquidity,
          TOPICHASHTABLE.IncreaseLiquidity,
          // TOPICHASHTABLE.CollectV3,
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
      from: from.toLowerCase(),
      to: to.toLowerCase(),
      nonce,
    };
  }
  async decodeV2Swap(combine_logs: Array<Log>): Promise<interface_events_info> {
    let pool = await this.getUniPoolToken(combine_logs[1].address);
    // let token0_decimals = await this.getTokenDecimal(pool.token0);
    // let token1_decimals = await this.getTokenDecimal(pool.token1);
    let sort_out_info = sortUniV2SwapInfo(combine_logs[1]);
    let sort_out_sync_info = sortUniV2SyncInfo(combine_logs[0]);
    let pool_token0_before_tx =
      sort_out_sync_info.pool_token0 - sort_out_info.amount0In;
    let pool_token1_before_tx =
      sort_out_sync_info.pool_token1 - sort_out_info.amount1In;
    return {
      sender: sort_out_info.sender.toLowerCase(),
      to: sort_out_info.to.toLowerCase(),
      token0: pool.token0,
      token1: pool.token1,
      amount0In: sort_out_info.amount0In,
      amount1In: sort_out_info.amount1In,
      pool: pool.pool,
      pool_token0: pool_token0_before_tx,
      pool_token1: pool_token1_before_tx,
      type: "SwapV2",
      tick: 0n,
      tickLower: 0n,
      tickUpper: 0n,
      index: combine_logs[1].index,
    };
  }

  async decodeV3Swap(single_log: Log): Promise<interface_events_info> {
    let pool = await this.pool_provider.getPool(single_log.address);
    let sort_out_info = sortUniV3SwapInfo(single_log);
    return {
      sender: sort_out_info.sender.toLowerCase(),
      to: sort_out_info.to.toLowerCase(),
      token0: pool.token0,
      token1: pool.token1,
      amount0In: sort_out_info.amount0In,
      amount1In: sort_out_info.amount1In,
      pool: pool.pool,
      pool_token0: sort_out_info.pool_token0,
      pool_token1: sort_out_info.pool_token1,
      type: "SwapV3",
      tick: sort_out_info.tick,
      tickLower: 0n,
      tickUpper: 0n,
      index: single_log.index,
    };
  }
  // async decodeV3NFTTransfer(single_info: Log): Promise<interface_events_info> {}
  async decodeTransfer(single_log: Log): Promise<interface_transfer_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Transfer",
      single_log.data,
      single_log.topics
    );
    // let decimals = await this.getTokenDecimal(single_log.address);
    // let amount = formatUnits(decoded_log[2], decimals);
    return {
      from: decoded_log[0].toLowerCase(),
      to: decoded_log[1].toLowerCase(),
      amount: decoded_log[2],
      token: single_log.address.toLowerCase(),
      type: "Transfer",
      index: single_log.index,
    };
  }

  async decodeDeposit(single_log: Log): Promise<interface_transfer_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Deposit",
      single_log.data,
      single_log.topics
    );
    // let ether = formatUnits(decoded_log[1], "ether");
    return {
      from: decoded_log[0].toLowerCase(),
      to: decoded_log[0].toLowerCase(),
      // msg_sender: decoded_log[0],
      amount: decoded_log[1],
      token: "native",
      type: "Deposit",
      index: single_log.index,
    };
  }

  async decodeWithdrawal(single_log: Log): Promise<interface_transfer_info> {
    let decoded_log = weth_abi_decoder.decodeEventLog(
      "Withdrawal",
      single_log.data,
      single_log.topics
    );
    return {
      from: decoded_log[0].toLowerCase(),
      to: decoded_log[0].toLowerCase(),
      // msg_sender: decoded_log[0],
      token: "native",
      amount: decoded_log[1],
      type: "Withdrawal",
      index: single_log.index,
    };
  }

  async decodeUniV3Mint(combine_logs: Log[]): Promise<interface_events_info> {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "Mint",
      combine_logs[0].data,
      combine_logs[0].topics
    );
    let increase_liquidity_decoded_log = this.decodeUniV3IncreaseLiquidity(
      combine_logs[1]
    );
    let receiver = await this.getWhoOwnedTheERC721TokenWhen(
      combine_logs[1].blockNumber,
      combine_logs[1].address,
      Number(increase_liquidity_decoded_log.tokenId),
      combine_logs[1].transactionHash
    );
    let pool_tokens = await this.getUniPoolToken(combine_logs[0].address);
    return {
      sender: decoded_log[0].toLowerCase(),
      to: receiver,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: decoded_log[5] as bigint,
      amount1In: decoded_log[6] as bigint,
      pool_token0: 0n,
      pool_token1: 0n,
      type: "LiqV3",
      tick: 0n,
      tickUpper: decoded_log[3] as bigint,
      tickLower: decoded_log[2] as bigint,
      index: combine_logs[1].index,
    };
  }
  async decodeUniV3Burn(combine_logs: Log[]): Promise<interface_events_info> {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "Burn",
      combine_logs[0].data,
      combine_logs[0].topics
    );
    let decrease_decoded_log = this.decodeUniV3DecreaseLiquidity(
      combine_logs[1]
    );
    let receiver = await this.getWhoOwnedTheERC721TokenWhen(
      combine_logs[1].blockNumber,
      combine_logs[1].address,
      Number(decrease_decoded_log.tokenId),
      combine_logs[1].transactionHash
    );
    let pool_tokens = await this.getUniPoolToken(combine_logs[0].address);
    return {
      sender: decoded_log[0].toLowerCase(),
      to: receiver,
      // owner: decoded_log[0] as string,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: -(decoded_log[4] as bigint),
      amount1In: -(decoded_log[5] as bigint),
      pool_token0: 0n,
      pool_token1: 0n,
      type: "LiqV3",
      tick: 0n,
      tickUpper: decoded_log[2] as bigint,
      tickLower: decoded_log[1] as bigint,
      index: combine_logs[1].index,
    };
  }
  async decodeUniV2Mint(
    // TODO:寻找从address出来的0地址到to地址的transfer，把to放到这个返回的to上面
    combine_logs: Array<Log>,
    array_info_before_this_logs: interface_general_info[]
  ): Promise<interface_events_info> {
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
    //以下是找哪个是to_address_part
    // let pool_token_transfer_from_0Address: interface_transfer_info[] = [];
    let receiver = "";
    for (
      let index = array_info_before_this_logs.length - 1;
      index >= 0;
      --index
    ) {
      let now_transfer_info = array_info_before_this_logs[index];
      if (now_transfer_info.type === "Transfer") {
        if (
          now_transfer_info.from === ETH_MAINNET_CONSTANTS["0Address"] &&
          now_transfer_info.token === pool_tokens.pool &&
          now_transfer_info.to !== ETH_MAINNET_CONSTANTS["0Address"]
        ) {
          // pool_token_transfer_from_0Address.push(now_transfer_info);
          receiver = now_transfer_info.to;
        } else if (
          now_transfer_info.from !== ETH_MAINNET_CONSTANTS["0Address"]
        ) {
          break;
        }
      }
    }
    if (receiver === "") {
      throw new Error("can't find receiver");
    }
    // let to_address =
    //   pool_token_transfer_from_0Address.length === 1
    //     ? pool_token_transfer_from_0Address[0].to
    //     : pool_token_transfer_from_0Address.reduce((max, cur) => {
    //         return cur.amount > max.amount ? cur : max;
    //       }).to;
    return {
      sender: decoded_log[0].toLowerCase(),
      to: receiver,
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: decoded_log[1],
      amount1In: decoded_log[2],
      pool_token0: (decoded_log_sync[0] as bigint) - decoded_log[1],
      pool_token1: (decoded_log_sync[1] as bigint) - decoded_log[2],
      type: "LiqV2",
      tick: 0n,
      tickUpper: 0n,
      tickLower: 0n,
      index: combine_logs[1].index,
    };
  }
  async decodeUniV2Burn(
    combine_logs: Array<Log>,
    array_info_before_this_logs: interface_general_info[]
  ): Promise<interface_events_info> {
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
    let receiver = "";
    for (let i = array_info_before_this_logs.length - 1; i >= 0; --i) {
      let now_transfer_info = array_info_before_this_logs[i];
      if (now_transfer_info.type === "Transfer") {
        if (
          now_transfer_info.to === pool_tokens.pool &&
          now_transfer_info.token === pool_tokens.pool
        ) {
          receiver = now_transfer_info.from;
          break;
        }
      }
    }
    if (receiver === "") {
      throw new Error("can't find receiver");
    }
    return {
      sender: decoded_log[0].toLowerCase(),
      //TODO:查看这个逻辑严谨与否
      to: receiver.toLowerCase(),
      pool: pool_tokens.pool,
      token0: pool_tokens.token0,
      token1: pool_tokens.token1,
      amount0In: -(decoded_log[1] as bigint),
      amount1In: -(decoded_log[2] as bigint),
      pool_token0: decoded_log_sync[0] + decoded_log[1],
      pool_token1: decoded_log_sync[1] + decoded_log[2],
      type: "LiqV2",
      tick: 0n,
      tickUpper: 0n,
      tickLower: 0n,
      index: combine_logs[1].index,
    };
  }
  decodeUniV3DecreaseLiquidity(single_log: Log): {
    tokenId: bigint;
    amount0In: bigint;
    amount1In: bigint;
  } {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "DecreaseLiquidity",
      single_log.data,
      single_log.topics
    );
    return {
      tokenId: decoded_log[0] as bigint,
      amount0In: -(decoded_log[2] as bigint),
      amount1In: -(decoded_log[3] as bigint),
    };
  }
  decodeUniV3IncreaseLiquidity(single_log: Log): {
    tokenId: bigint;
    amount0In: bigint;
    amount1In: bigint;
  } {
    let decoded_log = uniswap_v3_abi_decoder.decodeEventLog(
      "IncreaseLiquidity",
      single_log.data,
      single_log.topics
    );
    return {
      tokenId: decoded_log[0] as bigint,
      amount0In: decoded_log[2] as bigint,
      amount1In: decoded_log[3] as bigint,
    };
  }
}
export { CustomProvider };
