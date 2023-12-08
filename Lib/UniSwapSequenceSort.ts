import { Log } from "ethers";
import { reDivideArray, deletePureTransferTxFromMap } from "./UniSwapSorts";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
  TOPICHASHTABLE,
  weth_abi_decoder,
  ETH_MAINNET_CONSTANTS,
} from "./constants/BasisConstants";
import { PoolProvider } from "./PoolMetadata/ScriptInit";
import { TokenProvider } from "./TokenMetadata/ScriptInit";
import { CustomProvider } from "./ProviderExtends";
// import {
//   interface_LiqAction_Event_info,
//   interface_Transfer_Event_info,
//   interface_pruned_internal_tx_info,
//   interface_swap_info,
//   interface_general_info,
//   // interface_Withdrawal_Event_info,
// } from "./TypeAndInterface";
import {
  interface_events_info,
  interface_general_info,
  interface_internal_tx_info_from_etherscan,
  interface_pruned_internal_tx_info,
  interface_transfer_info,
} from "./interface/UniEventsInterfaces";
class SwapSequencer {
  readonly logs!: Log[];
  readonly map_logs_divided!: Map<string, Array<Log>>;
  readonly local_custom_provider: CustomProvider;
  readonly internal_txs!: Map<string, interface_pruned_internal_tx_info[]>;
  constructor(
    logs: Log[],
    internal_txs: Array<interface_pruned_internal_tx_info>,
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
    internal_txs: Array<interface_pruned_internal_tx_info>
  ): Map<string, Array<interface_pruned_internal_tx_info>> {
    return reDivideArray(internal_txs, "hash");
  }
  private getNonPureTransferTx(
    map_logs_divide: Map<string, Array<Log>>
  ): Map<string, Array<Log>> {
    return deletePureTransferTxFromMap(map_logs_divide);
  }
  private reasoningWholeTxActionSystem(
    whole_array_info: interface_general_info[]
  ) {
    // TODO:这里需要一个整体的逻辑，来判断这个tx是什么类型的，然后再去分析
    let actions_memo: number[] = [];
    for (let index = 0; index < whole_array_info.length; ++index) {
      if (
        whole_array_info[index].type !== "Transfer" &&
        whole_array_info[index].type !== "Deposit" &&
        whole_array_info[index].type !== "Withdrawal"
      ) {
        actions_memo.push(index);
      }
    }
  }
  // private parseAtomicSwap(
  //   index: number,
  //   whole_array_info: interface_general_info
  // ) {
  //   let token_out_info = this.getSwapOutToken(whole_array_info[index]);
  // }
  // private getSwapOutToken(info: interface_swap_info) {
  //   return {
  //     amount: info.amount0In > info.amount1In ? info.token1 : info.token0,
  //     token: info.amount0In > info.amount1In ? info.token1 : info.token0,
  //   };
  // }
  // private isSwapInfo(obj: any): obj is interface_swap_info {
  //   return obj.type === "SwapV2" || obj.type === "SwapV3";
  // }
  // 甄别出哪些是真正契合swap amount的sub transfer（为了防止含税的token swap）
  // parse出来所有从同一from地址to出来的同一token的amount小于或等于的transfer
  // TODO:修改逻辑，transfer的receiver是唯一不再transfer out的地址，也就是说它不会出现在transfer.from的地址里面
  //TODO:可能会有多个swap，然后最后transfer到一起再transfer到一个地址的情况，想想这种情况怎么避免
  // private verifyTransferStatus(
  //   array_info: { type: string }[],
  //   end_transfer_index_array: number[]
  // ) {}
  // private isTransfer(obj: any): obj is interface_Transfer_Event_info {
  //   return obj.type === "Transfer";
  // }
  // private isWithdrawal(obj: any): obj is interface_Transfer_Event_info {
  //   return obj.type === "Withdrawal";
  // }
  // private formatChainSwap(
  //   internal_txs: interface_pruned_internal_tx_info[],
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
  // private decodeSwapFromTx(tx_logs: Array<Log>,index:number) {
  //   let [swap_index, v2_or_v3] = this.searchSwap(tx_logs, index);
  //   if(swap_index === 1){
  //     let {info,chainSwapEndIndex}=this.parseChainSwap(tx_logs,swap_index,v2_or_v3);
  //   }
  // }

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
  ): Promise<Array<interface_general_info>> {
    let return_info_array: interface_general_info[] = [];
    for (let log_index = 0; log_index < tx_logs.length; log_index++) {
      try {
        switch (tx_logs[log_index].topics[0]) {
          case TOPICHASHTABLE.Swap:
            // TODO:改成try catch 模式，以防同名同参数的topic 但是执行逻辑不一样导致decode报错
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
          case TOPICHASHTABLE.Deposit &&
            tx_logs[log_index].address === ETH_MAINNET_CONSTANTS.WETH.ADDRESS:
            //deposit和withdrawal出来的类型是transfer event;
            let info8 = await this.local_custom_provider.decodeDeposit(
              tx_logs[log_index]
            );
            return_info_array.push(info8);
            break;
          case TOPICHASHTABLE.Withdrawal &&
            tx_logs[log_index].address === ETH_MAINNET_CONSTANTS.WETH.ADDRESS:
            let info9 = await this.local_custom_provider.decodeWithdrawal(
              tx_logs[log_index]
            );
            return_info_array.push(info9);
            break;
        }
      } catch (err) {
        throw new Error(
          "decode same parameters,same function name,but not same execution logic"
        );
      }
    }
    //   let previous_diff_token_transfer =
    //   for (let i=0; i< return_info_array.length;++i){

    //   }
    return return_info_array;
  }
  // TODO:在总sort里加一个备忘录，把记录过的final transfer（包括eth——native）记在memo里，然后parse firstswap，如果有，那就通过memo删掉array——info里的final transfer(只用delete internal——txs——array里的，logs里的只需要记录上一次的lastswap的index，从index开始parse transfer就好)。
  // private amountChangeFromWithdrawal(
  //   internal_txs_array: interface_pruned_internal_tx_info[],
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
