// import Decimal from "decimal.js";
// import { ETH_MAINNET_CONSTANTS, TOPICHASHTABLE } from "./BasisConstants";
// import { isNative, now } from "lodash";
// import { Log } from "ethers";

interface interface_info_type {
  type:
    | "SwapV2"
    | "SwapV3"
    | "Other"
    | "LiqV2"
    | "LiqV3"
    | "OtherLiq"
    | "Transfer"
    | "Deposit"
    | "Withdrawal";
}
interface interface_swap_info extends interface_info_type {
  sender: string;
  to: string;
  token0: string;
  token1: string;
  amount0In: bigint;
  amount1In: bigint;
  pool: string;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "SwapV2" | "SwapV3" | "Other";
  tick: bigint;
  index: number;
}

interface interface_conceived_swap_info extends interface_swap_info {
  sender: "";
  // to: "";
  pool_token0: 0n;
  pool_token1: 0n;
  type: "Other";
  index: 0;
}

interface interface_Transfer_Event_info extends interface_info_type {
  from: string;
  to: string;
  amount: bigint;
  token: string;
  type: "Transfer" | "Withdrawal" | "Deposit";
  index: number;
}
interface interface_LiqAction_Event_info extends interface_info_type {
  sender: string;
  to: string;
  pool: string;
  token0: string;
  token1: String;
  amount0In: bigint;
  amount1In: bigint;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "LiqV2" | "LiqV3" | "OtherLiq";
  tickUpper: bigint;
  tickLower: bigint;
  index: number;
}

interface interface_general_info {
  sender: string;
  to: string;
  pool: string;
  token0: string;
  token1: string;
  amount0In: bigint;
  amount1In: bigint;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "SwapV2" | "SwapV3" | "Other" | "LiqV2" | "LiqV3" | "OtherLiq";
  tick: bigint;
  tickUpper: bigint;
  tickLower: bigint;
  index: number;
  routerTaxedAmountOfContract: number;
  poolTaxed: number;
  isMultiReceive: boolean;
  proportion: number;
}
interface interface_conceived_Liq_Event_info
  extends interface_LiqAction_Event_info {
  sender: "";
  // to: string;
  pool_token0: 0n;
  pool_token1: 0n;
  type: "OtherLiq";
  tickUpper: 0n;
  tickLower: 0n;
  index: 0;
}
// interface interface_standard_swap_format_info {
//   blockNumber: string;

//   receiver: string;
//   pool: string;
//   amount0Received: string;
//   amount1Received: string;
//   // is_0为false 1为true
//   isV2: type_bool;
//   isLiqAction: type_bool;
//   tick: string;
//   tickLower: string;
//   tickUpper: string;
//   // 如果是v2的话以上三个为0
// }
// type type_info =
//   | interface_LiqAction_Event_info
//   | interface_Transfer_Event_info
//   | interface_swap_info;

interface interface_internal_tx_info_from_etherscan {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}
export {
  interface_swap_info,
  interface_internal_tx_info_from_etherscan,
  interface_Transfer_Event_info,
  // interface_Deposit_Event_info,
  // interface_Withdrawal_Event_info,
  interface_LiqAction_Event_info,
  // type_info,
  interface_conceived_Liq_Event_info,
  interface_conceived_swap_info,
  interface_info_type,
  interface_general_info,
};
// export type { type_info };
