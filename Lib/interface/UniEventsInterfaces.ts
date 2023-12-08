import { ETH_MAINNET_CONSTANTS } from "../constants/BasisConstants";

// interface interface_base_info {
//   sender: string;
//   to: string;
//   pool: string;
//   token0: string;
//   token1: string;
//   amount0In: bigint;
//   amount1In: bigint;
//   pool_token0: bigint;
//   pool_token1: bigint;
//   tick: bigint;
//   tickUpper: bigint;
//   tickLower: bigint;
//   index: number;
// }

interface interface_events_info {
  sender: string;
  to: string;
  pool: string;
  token0: string;
  token1: string;
  amount0In: bigint;
  amount1In: bigint;
  pool_token0: bigint;
  pool_token1: bigint;
  tick: bigint;
  tickUpper: bigint;
  tickLower: bigint;
  index: number;
  type: "SwapV2" | "SwapV3" | "LiqV2" | "LiqV3";
}
interface interface_fake_events_info {
  sender: string;
  to: string;
  pool: string;
  token0: string;
  token1: string;
  amount0In: bigint;
  amount1In: bigint;
  tick: 0n;
  tickUpper: 0n;
  tickLower: 0n;
  pool_token0: 0n;
  pool_token1: 0n;
  type: "Other" | "OtherLiq";
  index: 0;
}
interface interface_transfer_info {
  type: "Transfer" | "Withdrawal" | "Deposit";
  token: string;
  amount: bigint;
  from: string;
  to: string;
  index: number;
}
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
interface interface_pruned_internal_tx_info extends interface_transfer_info {
  blockNumber: number;
  hash: string;
  from: string;
  to: string;
  amount: bigint;
  token: typeof ETH_MAINNET_CONSTANTS.WETH.ADDRESS;
  //TODO:这样可以将其作为字符类型来使用
  type: "Transfer";
  index: 0;
}
type interface_general_info =
  | interface_events_info
  | interface_fake_events_info
  | interface_transfer_info;
export {
  //   interface_base_info,
  interface_events_info,
  interface_fake_events_info,
  interface_transfer_info,
  interface_internal_tx_info_from_etherscan,
  interface_pruned_internal_tx_info,
  interface_general_info,
};
