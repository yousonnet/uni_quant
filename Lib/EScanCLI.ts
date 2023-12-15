import axios from "axios";
import "dotenv/config";
import { sleepWhile } from "./basisUtils";
// import { interface_internal_tx_info_from_etherscan } from "./TypeAndInterface";
import {
  interface_internal_tx_info_from_etherscan,
  interface_pruned_internal_tx_info,
} from "./interface/UniEventsInterfaces";
import { AxiosResponse, AxiosInstance } from "axios";
import { ETH_MAINNET_CONSTANTS } from "./constants/BasisConstants";
const E_SCAN_API_KEY = process.env.E_SCAN_API_KEY!;

class EtherScanAPICLI {
  readonly e_scan_cli!: AxiosInstance;
  constructor(api_key: string) {
    this.e_scan_cli = axios.create({
      baseURL: "https://api.etherscan.io/api",
      params: {
        apikey: api_key,
      },
    });
  }
  // const e_scan_cli = axios.create({
  //   baseURL: "https://api.etherscan.io/api",
  //   params: {
  //     apikey: E_SCAN_API_KEY,
  //   },
  // });

  async getBlockNumberFromTimestamp(timestamp: number): Promise<number> {
    const response = await this.e_scan_cli.get("", {
      params: {
        module: "block",
        action: "getblocknobytime",
        timestamp,
        closest: "before",
      },
    });
    return response.data.result;
  }
  async getInternalTxByHash(hash: string) {
    const response = (
      await this.e_scan_cli.get("", {
        params: {
          module: "account",
          action: "txlistinternal",
          txhash: hash,
          page: 1,
          offset: 10000,
          sort: "asc",
        },
      })
    ).data.result;

    return response;
  }
  async getInternalTxFromBlockRange(
    start_block_number: number,
    end_block_number: number,
    duration_number: number
  ): Promise<interface_pruned_internal_tx_info[]> {
    let mod = Math.floor(
      (end_block_number - start_block_number) / duration_number
    );

    let total_res: interface_internal_tx_info_from_etherscan[] = [];
    let total_axios_response_promise: Promise<AxiosResponse<any, any>>[] = [];
    for (let i = 0; i <= mod; ++i) {
      if (i !== mod) {
        const response_promise = this.e_scan_cli.get("", {
          params: {
            module: "account",
            action: "txlistinternal",
            startblock: start_block_number,
            endblock:
              (start_block_number = start_block_number + duration_number) - 1,
            page: 1,
            offset: 10000,
            sort: "asc",
          },
        });
        total_axios_response_promise.push(response_promise);
        await sleepWhile(870);
        //一天etherscan free 账号可以call的极限 100000
      } else {
        const response_promise = this.e_scan_cli.get("", {
          params: {
            module: "account",
            action: "txlistinternal",
            startblock: start_block_number,
            endblock: end_block_number,
            page: 1,
            offset: 10000,
            sort: "asc",
          },
        });
        total_axios_response_promise.push(response_promise);
        await sleepWhile(870);
      }
    }
    let total_axios_response = await Promise.all(total_axios_response_promise);
    for (let axios_response of total_axios_response) {
      if (axios_response.data.result.length === 0) {
        throw new Error(
          "no internal tx in this block range,weird,must panic!!!"
        );
      } else if (axios_response.data.result.length === 10000) {
        throw new Error(
          "more ten thousand internal tx in this block range,weird,must panic!!!"
        );
      } else {
        total_res = total_res.concat(axios_response.data.result);
      }
    }
    return total_res.map((internal_tx) => {
      return {
        blockNumber: Number(internal_tx.blockNumber),
        hash: internal_tx.hash,
        from: internal_tx.from,
        to: internal_tx.to,
        amount: BigInt(internal_tx.value),
        token: ETH_MAINNET_CONSTANTS.WETH.ADDRESS,
        type: "Transfer",
        index: 0,
      };
    });
  }
}
// getInternalTxFromBlockRange(18579866, 18579866, 1).then((res) =>
//   console.log(res)
// );

// 0503000000
// 1683072000 time stamp
// 17176506 block number
// 1103000000
// 1698969600 time stamp
// 18487824 block number
// getBlockNumberFromTimestamp(1698969600).then((res) => console.log(res));
let etherscan_cli = new EtherScanAPICLI(E_SCAN_API_KEY);
// etherscan_cli
//   .getInternalTxFromBlockRange(18487824, 18487824, 1)
//   .then((res) => console.log(res));
export {
  // getBlockNumberFromTimestamp,
  // getInternalTxByHash,
  // getInternalTxFromBlockRange,
  etherscan_cli,
  EtherScanAPICLI,
};
