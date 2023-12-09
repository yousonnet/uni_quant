import { Log } from "ethers";
import { reDivideArray, deletePureTransferTxFromMap } from "./UniSwapSorts";
import {
  TOPICHASHTABLE,
  ETH_MAINNET_CONSTANTS,
} from "./constants/BasisConstants";

import { CustomProvider } from "./ProviderExtends";

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
}

export { SwapSequencer };
