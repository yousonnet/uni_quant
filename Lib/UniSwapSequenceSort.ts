import { Log } from "ethers";
import { reDivideArray, deletePureTransferTxFromMap } from "./UniSwapSorts";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  TOPICHASHTABLE,
  weth_abi_decoder,
  ETH_MAINNET_CONSTANTS,
} from "./BasisConstants";
import { PoolProvider } from "./PoolMetadata/ScriptInit";
import { TokenProvider } from "./TokenMetadata/ScriptInit";
import { CustomProvider } from "./ProviderExtends";
import {
  interface_LiqAction_Event_info,
  interface_Transfer_Event_info,
  interface_internal_tx_info_from_etherscan,
  interface_swap_info,
  interface_info_type,
  // interface_Withdrawal_Event_info,
} from "./TypeAndInterface";
import { last } from "lodash";
import { receiveMessageOnPort } from "worker_threads";
import { FixedLengthArray } from "./basisUtils";
class SwapSequencer {
  readonly logs!: Log[];
  readonly map_logs_divided!: Map<string, Array<Log>>;
  readonly local_custom_provider: CustomProvider;
  readonly internal_txs!: Map<
    string,
    interface_internal_tx_info_from_etherscan[]
  >;
  constructor(
    logs: Log[],
    internal_txs: Array<interface_internal_tx_info_from_etherscan>,
    local_custom_provider: CustomProvider
  ) {
    this.local_custom_provider = local_custom_provider;
    this.logs = logs;
    this.map_logs_divided = this.getReDivideLogsIntoSameTx(logs);
    this.map_logs_divided = this.getNonPureTransferTx(this.map_logs_divided);
    // this.local_custom_provider = local_custom_provider;
    this.internal_txs = this.getReDevideInternalTxsIntoSameTx(internal_txs);
    let array_info = this.forLogsArrayToInfo(this.logs);
  }
  private getReDivideLogsIntoSameTx(logs: Log[]): Map<string, Array<Log>> {
    return reDivideArray(logs, "transactionHash");
  }
  private getReDevideInternalTxsIntoSameTx(
    internal_txs: Array<interface_internal_tx_info_from_etherscan>
  ): Map<string, Array<interface_internal_tx_info_from_etherscan>> {
    return reDivideArray(internal_txs, "hash");
  }
  private getNonPureTransferTx(
    map_logs_divide: Map<string, Array<Log>>
  ): Map<string, Array<Log>> {
    return deletePureTransferTxFromMap(map_logs_divide);
  }
  private reformTheNativeTransferArray(
    array_native_transfer: Array<interface_internal_tx_info_from_etherscan>
  ): Array<interface_Transfer_Event_info> {
    return array_native_transfer.map((one_native_transfer) => {
      return {
        from: one_native_transfer.from,
        to: one_native_transfer.to,
        amount: BigInt(one_native_transfer.value),
        token: ETH_MAINNET_CONSTANTS.WETH.ADDRESS,
        type: "Transfer",
        index: 0,
      };
    });
  }
  private parseNextSubSwap(
    array_info: { type: string }[],
    index: number,
    origin_swap_info: interface_swap_info
  ): number {
    let origin_out_token =
      origin_swap_info.amount0In > origin_swap_info.amount1In
        ? origin_swap_info.token1
        : origin_swap_info.token0;
    for (let i = index; i < array_info.length; i++) {
      if (this.isSwapInfo(array_info[i])) {
        let now_swap_info = array_info[i] as interface_swap_info;
        let swap_in_token =
          now_swap_info.amount0In > now_swap_info.amount1In
            ? now_swap_info.token0
            : now_swap_info.token1;
        if (
          swap_in_token === origin_out_token &&
          now_swap_info.sender === origin_swap_info.sender &&
          origin_swap_info.to === now_swap_info.pool
          //
        ) {
          return i;
        } else {
          // 因为swap一般是连起来的，当if进了isswapinfo的block后，如果这个swap不是subswap，那么后面的也不应该是了
          return -1;
        }
      }
    }
    return -1;
  }
  private isSwapInfo(obj: any): obj is interface_swap_info {
    return obj.type === "SwapV2" || obj.type === "SwapV3";
  }
  // 甄别出哪些是真正契合swap amount的sub transfer（为了防止含税的token swap）
  private amountChangeFromTransfer(
    array_info: { type: string }[],
    index_array: number[],
    amount: bigint,
    already_in_change: number[] = []
  ) {
    if (amount === 0n) {
      return already_in_change;
    }
    function backTrack(
      remain_amount: bigint,
      start_index_of_index_array: number,
      combination: number[]
    ) {
      if (remain_amount === 0n) {
        already_in_change = combination;
        return;
      }
      for (let i = start_index_of_index_array; i < index_array.length; i++) {
        let now_info = array_info[
          index_array[i]
        ] as interface_Transfer_Event_info;
        // TODO:虽然是as transfer但实际上可能是withdrawal
        if (remain_amount - now_info.amount >= 0n) {
          combination.push(index_array[i]);
          backTrack(remain_amount - now_info.amount, i + 1, combination);
          combination.pop();
        }
      }
    }
    backTrack(amount, 0, []);
    return already_in_change;
  }
  // parse出来所有从同一from地址to出来的同一token的amount小于或等于的transfer
  // TODO:修改逻辑，transfer的receiver是唯一不再transfer out的地址，也就是说它不会出现在transfer.from的地址里面
  //TODO:可能会有多个swap，然后最后transfer到一起再transfer到一个地址的情况，想想这种情况怎么避免
  private verifyTransferStatus(
    array_info: { type: string }[],
    end_transfer_index_array: number[]
  ) {}
  private parseNextTransfer(
    array_info: { type: string }[],
    index: number,
    ori_swap_or_transfer: interface_Transfer_Event_info | interface_swap_info
  ): number {
    if (
      ori_swap_or_transfer.type === "SwapV2" ||
      ori_swap_or_transfer.type === "SwapV3"
    ) {
      let swap_out_token =
        ori_swap_or_transfer.amount0In > ori_swap_or_transfer.amount1In
          ? ori_swap_or_transfer.token1
          : ori_swap_or_transfer.token0;
      let swap_out_amount =
        ori_swap_or_transfer.amount0In > ori_swap_or_transfer.amount1In
          ? ori_swap_or_transfer.amount1In
          : ori_swap_or_transfer.amount0In;
      for (let i = index; i < array_info.length; i++) {
        if (this.isTransfer(array_info[i])) {
          let transfer_info = array_info[i] as interface_Transfer_Event_info;
          if (
            transfer_info.from === ori_swap_or_transfer.pool &&
            transfer_info.token === swap_out_token &&
            transfer_info.amount <= swap_out_amount &&
            transfer_info.amount !== 0n
          ) {
            return i;
          }
        }
      }
    } else if (ori_swap_or_transfer.type === "Transfer") {
      let transfer_out_token = ori_swap_or_transfer.token;
      let transfer_out_amount = ori_swap_or_transfer.amount;
      for (let i = index; i < array_info.length; i++) {
        if (this.isTransfer(array_info[i])) {
          let transfer_info = array_info[i] as interface_Transfer_Event_info;
          if (
            transfer_info.from === ori_swap_or_transfer.to &&
            transfer_info.token === transfer_out_token &&
            transfer_out_amount <= transfer_out_amount &&
            transfer_info.amount !== 0n
          ) {
            return i;
          }
        } else if (
          transfer_out_token === ETH_MAINNET_CONSTANTS.WETH.ADDRESS &&
          //swap_out_token必须是weth
          this.isWithdrawal(array_info[i])
        ) {
          let withdrawal_info = array_info[i] as interface_Transfer_Event_info;
          if (
            withdrawal_info.amount <= transfer_out_amount &&
            withdrawal_info.from === ori_swap_or_transfer.to &&
            withdrawal_info.amount !== 0n
          ) {
            return i;
          }
        }
      }
    }
    return -1;
  }
  private isTransfer(obj: any): obj is interface_Transfer_Event_info {
    return obj.type === "Transfer";
  }
  private isWithdrawal(obj: any): obj is interface_Transfer_Event_info {
    return obj.type === "Withdrawal";
  }
  public async sortsOutSwap() {
    for (let one_tx of this.map_logs_divided) {
      let swap_array = [];
      let internal_txs_in_hash = this.internal_txs.get(one_tx[0]);
      let flatten_info_array_in_hash = await this.forLogsArrayToInfo(one_tx[1]);
      let start_index: number = 0;
      while (true) {
        let parse_index = this.parseFirstSwap(
          flatten_info_array_in_hash,
          start_index
        );
        if (parse_index === -1) {
          break;
        } else {
          let swap_info = flatten_info_array_in_hash[
            parse_index
          ] as interface_swap_info;
          while (true) {}
        }
      }
    }
  }
  // private formatChainSwap(
  //   internal_txs: interface_internal_tx_info_from_etherscan[],
  //   head_swap_index: number,
  //   array_info: { type: string }[]
  // ): {
  //   token_transfer: number[];
  //   eth_transfer: number[];
  //   swap_index_array: number[];
  // } {
  //   let swap_index_array: number[] = [head_swap_index];
  //   while (true) {
  //     let next_swap_index = this.parseNextSubSwap(
  //       array_info,
  //       head_swap_index,
  //       array_info[head_swap_index] as interface_swap_info
  //     );
  //     if (next_swap_index !== -1) {
  //       swap_index_array.push(next_swap_index);
  //       head_swap_index = next_swap_index;
  //     } else {
  //       break;
  //     }
  //   }
  //   let last_swap_info = array_info[
  //     swap_index_array[swap_index_array.length - 1]
  //   ] as interface_swap_info;
  //   let swap_out_amount =
  //     last_swap_info.amount0In > last_swap_info.amount1In
  //       ? last_swap_info.amount1In
  //       : last_swap_info.amount0In;
  //   let swap_out_token =
  //     last_swap_info.amount0In > last_swap_info.amount1In
  //       ? last_swap_info.token1
  //       : last_swap_info.token0;
  //   let transfer_info_arrayOfarray = this.parseAllTransferToEnd(array_info, [
  //     swap_index_array[swap_index_array.length - 1],
  //   ]);
  //   // TODO:需要用amount check先把array过滤一次
  //   let end_transfer_info_array =
  //     transfer_info_arrayOfarray[transfer_info_arrayOfarray.length - 1];
  //   end_transfer_info_array = this.amountChangeFromTransfer(
  //     array_info,
  //     end_transfer_info_array,
  //     swap_out_amount
  //   );
  //   let eth_rceiver_transfer_info_array: number[] = [];
  //   let weth_receiver_transfer_info_array: number[] = [];
  //   if (swap_out_token === ETH_MAINNET_CONSTANTS.WETH.ADDRESS) {
  //     for (let i = 0; i < end_transfer_info_array.length; i++) {
  //       if (this.isWithdrawal(array_info[end_transfer_info_array[i]])) {
  //         let native_eth_transfer_receivers_info =
  //           this.amountChangeFromWithdrawal(
  //             internal_txs,
  //             array_info[end_transfer_info_array[i]]
  //             //  as interface_Withdrawal_Event_info
  //           );
  //         eth_rceiver_transfer_info_array.push(
  //           ...native_eth_transfer_receivers_info
  //         );
  //       } else {
  //         weth_receiver_transfer_info_array.push(end_transfer_info_array[i]);
  //       }
  //     }
  //     return {
  //       token_transfer: weth_receiver_transfer_info_array,
  //       eth_transfer: eth_rceiver_transfer_info_array,
  //       swap_index_array,
  //     };
  //   } else {
  //     return {
  //       token_transfer: end_transfer_info_array,
  //       eth_transfer: eth_rceiver_transfer_info_array,
  //       swap_index_array,
  //     };
  //   }
  // }
  private parseFirstSwap(
    array_info: { type: string }[],
    index: number
  ): number {
    for (let i = index; i < array_info.length; i++) {
      if (array_info[i].type === "SwapV2" || array_info[i].type === "SwapV3") {
        return i;
      }
    }
    return -1;
  }
  // private decodeSwapFromTx(tx_logs: Array<Log>,index:number) {
  //   let [swap_index, v2_or_v3] = this.searchSwap(tx_logs, index);
  //   if(swap_index === 1){
  //     let {info,chainSwapEndIndex}=this.parseChainSwap(tx_logs,swap_index,v2_or_v3);
  //   }
  // }

  private parseAllTransferToEnd(
    // internal_txs_array: interface_internal_tx_info_from_etherscan[],
    array_info: { type: string }[],
    last_swap_or_transfer_info_array: number[],
    return_index_array: number[][] = []
  ): number[][] {
    let tmp_transfer_index_array: number[] = [];
    for (let i = 0; i < last_swap_or_transfer_info_array.length; i++) {
      let isSwap = this.isSwapInfo(
        array_info[last_swap_or_transfer_info_array[i]]
      );
      while (true) {
        let transfer_index = this.parseNextTransfer(
          array_info,
          last_swap_or_transfer_info_array[i],
          isSwap
            ? (array_info[
                last_swap_or_transfer_info_array[i]
              ] as interface_swap_info)
            : (array_info[
                last_swap_or_transfer_info_array[i]
              ] as interface_Transfer_Event_info)
        );
        if (transfer_index !== -1) {
          tmp_transfer_index_array.push(transfer_index);
        } else {
          break;
        }
      }
    }
    if (tmp_transfer_index_array.length === 0) {
      return return_index_array;
    }
    return_index_array.push(tmp_transfer_index_array);
    this.parseAllTransferToEnd(
      // internal_txs_array,
      array_info,
      tmp_transfer_index_array,
      return_index_array
    );

    return return_index_array;
  }
  private async findChainSwap() {}
  private async findTransfer() {}
  private async findChainTransfer() {}
  //   private async find
  //   private async parseChainSwap(tx_logs:Array<Log>,index:number,v2_or_v3:number):{[],chainSwapEndIndex:number}{
  //     if(v2_or_v3 === 0){
  //  let decoded_swap_info =await this.local_custom_provider.decodeV2Swap([tx_logs[index-1],tx_logs[index]]);
  //       let next_swap = this.searchSwap(tx_logs,index+1);
  //       if(next_swap[0] === -1){
  //         return {,chainSwapEndIndex:index}
  //       }else if {
  //         if (){
  //           return {}
  //         }
  //         else {
  //           return {}
  //         }
  //       }

  //     }
  //   }
  public async forLogsArrayToInfo(
    tx_logs: Array<Log>
  ): Promise<Array<interface_info_type>> {
    let return_info_array: interface_info_type[] = [];
    for (let log_index = 0; log_index < tx_logs.length; log_index++) {
      switch (tx_logs[log_index].topics[0]) {
        case TOPICHASHTABLE.Swap:
          let info = await this.local_custom_provider.decodeV2Swap([
            tx_logs[log_index - 1],
            tx_logs[log_index],
          ]);
          return_info_array.push(info);
          break;
        case TOPICHASHTABLE.SwapV3:
          let info2 = await this.local_custom_provider.decodeV3Swap(
            tx_logs[log_index]
          );
          return_info_array.push(info2);
          break;
        case TOPICHASHTABLE.Mint:
          let info3 = await this.local_custom_provider.decodeUniV2Mint(
            [tx_logs[log_index - 1], tx_logs[log_index]],
            return_info_array
          );
          return_info_array.push(info3);
          break;
        case TOPICHASHTABLE.MintV3:
          let info4 = await this.local_custom_provider.decodeUniV3Mint(
            tx_logs[log_index]
          );
          return_info_array.push(info4);
          break;
        case TOPICHASHTABLE.Burn:
          let info5 = await this.local_custom_provider.decodeUniV2Burn([
            tx_logs[log_index - 1],
            tx_logs[log_index],
          ]);
          return_info_array.push(info5);
          break;
        case TOPICHASHTABLE.BurnV3:
          let info6 = await this.local_custom_provider.decodeUniV3Burn(
            tx_logs[log_index]
          );
          return_info_array.push(info6);
          break;
        case TOPICHASHTABLE.Transfer:
          let info7 = await this.local_custom_provider.decodeTransfer(
            tx_logs[log_index]
          );
          return_info_array.push(info7);
          break;
        case TOPICHASHTABLE.Deposit:
          //deposit和withdrawal出来的类型是transfer event;
          let info8 = await this.local_custom_provider.decodeDeposit(
            tx_logs[log_index]
          );
          return_info_array.push(info8);
          break;
        case TOPICHASHTABLE.Withdrawal:
          let info9 = await this.local_custom_provider.decodeWithdrawal(
            tx_logs[log_index]
          );
          return_info_array.push(info9);
          break;
      }
    }
    //   let previous_diff_token_transfer =
    //   for (let i=0; i< return_info_array.length;++i){

    //   }
    return return_info_array;
  }
  // TODO:在总sort里加一个备忘录，把记录过的final transfer（包括eth——native）记在memo里，然后parse firstswap，如果有，那就通过memo删掉array——info里的final transfer(只用delete internal——txs——array里的，logs里的只需要记录上一次的lastswap的index，从index开始parse transfer就好)。
  // private amountChangeFromWithdrawal(
  //   internal_txs_array: interface_internal_tx_info_from_etherscan[],
  //   withdrawal_info,
  //   // : interface_Withdrawal_Event_info
  //   in_change: number[] = []
  // ) {
  //   let amount = withdrawal_info.amount;
  //   if (amount === 0n) {
  //     return in_change;
  //   }
  //   function backTrack(
  //     remain_amount: bigint,
  //     start_index_of_index_array: number,
  //     combination: number[]
  //   ) {
  //     if (remain_amount === 0n) {
  //       in_change = combination;
  //       return;
  //     }
  //     for (
  //       let i = start_index_of_index_array;
  //       i < internal_txs_array.length;
  //       i++
  //     ) {
  //       let now_info = internal_txs_array[i];
  //       if (
  //         remain_amount - BigInt(now_info.value) >= 0n &&
  //         withdrawal_info.msg_sender.toLowerCase() === now_info.from &&
  //         now_info.to !== ETH_MAINNET_CONSTANTS.WETH.ADDRESS.toLowerCase()
  //       ) {
  //         combination.push(i);
  //         backTrack(remain_amount - BigInt(now_info.value), i + 1, combination);
  //         combination.pop();
  //       }
  //     }
  //   }
  //   backTrack(amount, 0, []);
  //   return in_change;
  // }
  // 0代表v2，1代表v3
  // private searchSwap(
  //   tx_logs: Array<Log>,
  //   index: number,
  //   token_in?: string
  // ): [number, number] {
  //   for (let i = index; i < tx_logs.length; i++) {
  //     if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v2_abi_decoder.getEvent("Swap")?.topicHash as string)
  //     ) {
  //       return [i, 0];
  //     } else if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v3_abi_decoder.getEvent("Swap")?.topicHash as string)
  //     ) {
  //       return [i, 1];
  //     }
  //   }
  //   return [-1, -1];
  // }

  // private searchLiqAction(
  //   tx_logs: Array<Log>,
  //   index: number
  // ): [number, number] {
  //   for (let i = index; i < tx_logs.length; i++) {
  //     if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v2_abi_decoder.getEvent("Mint")?.topicHash as string)
  //     ) {
  //       return [i, 0];
  //     } else if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v2_abi_decoder.getEvent("Burn")?.topicHash as string)
  //     ) {
  //       return [i, 1];
  //     } else if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v3_abi_decoder.getEvent("Mint")?.topicHash as string)
  //     ) {
  //       return [i, 2];
  //     } else if (
  //       tx_logs[i].topics[0] ===
  //       (uniswap_v3_abi_decoder.getEvent("Burn")?.topicHash as string)
  //     ) {
  //       return [i, 3];
  //     }
  //   }
  //   return [-1, -1];
  // }
}

export { SwapSequencer };
