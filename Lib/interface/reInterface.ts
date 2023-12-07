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
  tick: bigint;
  tickUpper: bigint;
  tickLower: bigint;
  index: number;
}

interface interface_events_info extends interface_general_info {
  type: "SwapV2" | "SwapV3" | "LiqV2" | "LiqV3";
}
interface interface_fake_events_info extends interface_general_info {
  type: "Other" | "OtherLiq";
}
interface interface_transfer_info extends interface_general_info {
  type: "Transfer" | "Withdrawal" | "Deposit";
  token: string;
  amount: bigint;
  from: string;
  sender: "";
  pool: "";
  token0: "";
  token1: "";
  amount0In: 0n;
  amount1In: 0n;
  pool_token0: 0n;
  pool_token1: 0n;
  tick: 0n;
  tickUpper: 0n;
  tickLower: 0n;
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
export {
  interface_general_info,
  interface_events_info,
  interface_fake_events_info,
  interface_transfer_info,
  interface_internal_tx_info_from_etherscan,
};
