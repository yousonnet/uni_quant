import { Log } from "ethers";
import { reDivideArray, deletePureTransferTxFromMap } from "./UniSwapSorts";
import {
  uniswap_v2_abi_decoder,
  uniswap_v3_abi_decoder,
} from "./BasisConstants";
import { PoolProvider } from "./PoolMetadata/ScriptInit";
import { TokenProvider } from "./TokenMetadata/ScriptInit";
import { CustomProvider } from "./ProviderExtends";
import { interface_internal_tx_info_from_etherscan } from "./TypeAndInterface";
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
    this.logs = logs;
    this.map_logs_divided = this.getReDivideLogsIntoSameTx(logs);
    this.map_logs_divided = this.getNonPureTransferTx(this.map_logs_divided);
    this.local_custom_provider = local_custom_provider;
    this.internal_txs = this.getReDevideInternalTxsIntoSameTx(internal_txs);
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

  public sortsOutSwap() {
    for (let one_tx of this.map_logs_divided) {
    }
  }

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

  // 0代表v2，1代表v3
  private searchSwap(
    tx_logs: Array<Log>,
    index: number,
    token_in?: string
  ): [number, number] {
    for (let i = index; i < tx_logs.length; i++) {
      if (
        tx_logs[i].topics[0] ===
        (uniswap_v2_abi_decoder.getEvent("Swap")?.topicHash as string)
      ) {
        return [i, 0];
      } else if (
        tx_logs[i].topics[0] ===
        (uniswap_v3_abi_decoder.getEvent("Swap")?.topicHash as string)
      ) {
        return [i, 1];
      }
    }
    return [-1, -1];
  }

  private searchLiqAction(
    tx_logs: Array<Log>,
    index: number
  ): [number, number] {
    for (let i = index; i < tx_logs.length; i++) {
      if (
        tx_logs[i].topics[0] ===
        (uniswap_v2_abi_decoder.getEvent("Mint")?.topicHash as string)
      ) {
        return [i, 0];
      } else if (
        tx_logs[i].topics[0] ===
        (uniswap_v2_abi_decoder.getEvent("Burn")?.topicHash as string)
      ) {
        return [i, 1];
      } else if (
        tx_logs[i].topics[0] ===
        (uniswap_v3_abi_decoder.getEvent("Mint")?.topicHash as string)
      ) {
        return [i, 2];
      } else if (
        tx_logs[i].topics[0] ===
        (uniswap_v3_abi_decoder.getEvent("Burn")?.topicHash as string)
      ) {
        return [i, 3];
      }
    }
    return [-1, -1];
  }
}

export { SwapSequencer };
