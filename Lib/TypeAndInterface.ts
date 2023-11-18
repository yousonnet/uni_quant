interface interface_swap_info {
  sender: string;
  to: string;
  token0: string;
  token1: string;
  amount0In: bigint;
  amount1In: bigint;
  pool: string;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "v2" | "v3";
  tick: bigint;
}
interface interface_chain_swap_info {}

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

interface interface_Transfer_Event_info {
  from: string;
  to: string;
  amount: bigint;
  token: string;
}

interface interface_Deposit_Event_info {
  to: string;
  amount: bigint;
}
interface interface_Withdrawal_Event_info {
  from: string;
  amount: bigint;
}
interface interface_LiqAction_Event_V3_info {
  owner: string;
  pool: string;
  token0: string;
  token1: String;
  amount0In: bigint;
  amount1In: bigint;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "v2" | "v3";
  tickUpper: bigint;
  tickLower: bigint;
}
interface interface_LiqAction_Event_V2_info {
  sender: string;
  to: string;
  pool: string;
  token0: string;
  token1: String;
  amount0In: bigint;
  amount1In: bigint;
  pool_token0: bigint;
  pool_token1: bigint;
  type: "v2" | "v3";
  tickUpper: bigint;
  tickLower: bigint;
}
export {
  interface_swap_info,
  interface_chain_swap_info,
  interface_internal_tx_info_from_etherscan,
  interface_Transfer_Event_info,
  interface_Deposit_Event_info,
  interface_Withdrawal_Event_info,
  interface_LiqAction_Event_V3_info,
  interface_LiqAction_Event_V2_info,
};
