import {
  interface_conceived_Liq_Event_info,
  interface_info_type,
  interface_internal_tx_info_from_etherscan,
  interface_LiqAction_Event_info,
  interface_swap_info,
  interface_Transfer_Event_info,
} from "./TypeAndInterface";
import { ETH_MAINNET_CONSTANTS } from "./BasisConstants";
import { FixedLengthArray } from "./basisUtils";
import { forEach } from "lodash";
class TxReasoning {
  // readonly logs!: Log[];
  format_all_info!: interface_info_type[];
  constructor(
    array_info: interface_info_type[],
    internal_txs: interface_internal_tx_info_from_etherscan[]
  ) {
    // this.logs = logs;
    let format_internal_txs = this.formatInternalTransfer(internal_txs);
    array_info = this.supplementOtherSwapAndV2TypeMint(array_info);
    this.format_all_info = this.combineLogsAndInternalTxs(
      array_info,
      format_internal_txs
    );
  }
  private supplementOtherSwapAndV2TypeMint(
    array_info: interface_info_type[]
  ): interface_info_type[] {
    //这个method 只适用于同logs里由uniswap的 action然后再有other swap 的action时，才能identify。
    let same_depth_block_transfer_action = new FixedLengthArray<
      interface_Transfer_Event_info[]
    >(2);
    initIdentifyParameters();
    let if_has_mint = { hasMint: false, to: "test", pool: "test_pool_token" };
    let is_after_orthodox_info = false;
    let previous_formal_swap_receiver: string[] = [];
    for (let index = 0; index < array_info.length; ++index) {
      let now_info_type = array_info[index] as interface_info_type;
      if (now_info_type.type === "SwapV2" || now_info_type.type === "SwapV3") {
        initIdentifyParameters();
        is_after_orthodox_info = true;
        previous_formal_swap_receiver.push(
          (now_info_type as interface_swap_info).to
        );
        continue;
      } else if (
        now_info_type.type === "LiqV2" ||
        now_info_type.type === "LiqV3"
      ) {
        initIdentifyParameters(true);
        previous_formal_swap_receiver.push(
          (now_info_type as interface_LiqAction_Event_info).to
        );
        is_after_orthodox_info = true;
        continue;
      }
      let now_info = array_info[index] as interface_Transfer_Event_info;
      if (is_after_orthodox_info && now_info.type === "Transfer") {
        if (
          now_info.token ===
            same_depth_block_transfer_action.array[0][0].token &&
          now_info.from === same_depth_block_transfer_action.array[0][0].from
        ) {
          same_depth_block_transfer_action.array[0].push(now_info);
        } else if (
          now_info.token ===
            same_depth_block_transfer_action.array[1][0].token &&
          now_info.from === same_depth_block_transfer_action.array[1][0].from
        ) {
          same_depth_block_transfer_action.array[1].push(now_info);
        } else if (now_info.from === ETH_MAINNET_CONSTANTS["0Address"]) {
          if_has_mint = {
            hasMint: true,
            to: now_info.to,
            pool: now_info.token,
          };
        } else {
          let result_0 = this.fakeSwapIdentify(
            same_depth_block_transfer_action.array[0],
            same_depth_block_transfer_action.array[1],
            previous_formal_swap_receiver
          );
          if (result_0.isOtherSwap) {
            array_info.splice(index + 1, 0, result_0.info);
            initIdentifyParameters();
          }
          let result_1 = this.fakeMintIdentify(
            same_depth_block_transfer_action.array[0],
            same_depth_block_transfer_action.array[1],
            if_has_mint,
            previous_formal_swap_receiver
          );
          if (result_1.isOtherMint) {
            array_info.splice(index + 1, 0, result_1.info);
            initIdentifyParameters(true);
          }
        }
        same_depth_block_transfer_action.add([now_info]);
      }
    }
    function initIdentifyParameters(also_mint: boolean = false) {
      same_depth_block_transfer_action.add([
        {
          from: "test0",
          to: "test0",
          token: "test0",
          amount: 0n,
          type: "Transfer",
          index: 0,
        },
      ]);
      same_depth_block_transfer_action.add([
        {
          from: "test1",
          to: "test1",
          token: "test1",
          amount: 0n,
          type: "Transfer",
          index: 0,
        },
      ]);
      if (also_mint) {
        if_has_mint = { hasMint: false, to: "test", pool: "test_pool_token" };
      }
    }
    return array_info;
  }
  private fakeMintIdentify(
    pos0_transfer_block: interface_Transfer_Event_info[],
    pos1_transfer_block: interface_Transfer_Event_info[],
    if_has_mint: { hasMint: boolean; to: string; pool: string },
    previous_swap_or_liq_to_receiver: string[]
  ): { info: interface_conceived_Liq_Event_info; isOtherMint: boolean } {
    // pos0_transfer_block.forEach((item, index) => {
    //   if (pos1_transfer_block.map((ite) => ite.to).includes(item.to) &&if_has_mint.hasMint === true) {
    //     let transfer_1 = pos1_transfer_block.find((ite) => ite.to === item.to)!;
    let transfer_0 = pos0_transfer_block.find(
      (item) => item.to === if_has_mint.pool
    );
    let transfer_1 = pos1_transfer_block.find(
      (item) => item.to === if_has_mint.pool
    );
    if (
      transfer_0 &&
      transfer_1 &&
      if_has_mint.hasMint &&
      transfer_0.from === transfer_1.from &&
      previous_swap_or_liq_to_receiver.includes(transfer_0.from)
    ) {
      return {
        info: {
          sender: "",
          to: "",
          pool: transfer_1.to,
          token0: transfer_0.token,
          token1: transfer_1.token,
          amount0In: -transfer_0.amount,
          amount1In: -transfer_1.amount,
          pool_token0: 0n,
          pool_token1: 0n,
          type: "OtherLiq",
          tickUpper: 0n,
          tickLower: 0n,
          index: 0,
        },
        isOtherMint: true,
      };
    }
    return {
      info: {
        sender: "",
        to: "",
        pool: "",
        token0: "",
        token1: "",
        amount0In: 0n,
        amount1In: 0n,
        pool_token0: 0n,
        pool_token1: 0n,
        type: "OtherLiq",
        tickUpper: 0n,
        tickLower: 0n,
        index: 0,
      },
      isOtherMint: false,
    };
  }
  private fakeSwapIdentify(
    pos0_transfer_block: interface_Transfer_Event_info[],
    pos1_transfer_block: interface_Transfer_Event_info[],
    previous_swap_or_liq_to_address: string[]
  ): { info: interface_swap_info; isOtherSwap: boolean } {
    let pos0_topos1 = pos0_transfer_block.find(
      (item) => item.to === pos1_transfer_block[0].from
    );
    let pos1_topos0 = pos1_transfer_block.find(
      (item) => item.to === pos0_transfer_block[0].from
    );
    if (
      pos0_topos1 &&
      previous_swap_or_liq_to_address.includes(pos0_topos1.from)
    ) {
      return {
        info: {
          sender: "",
          to: "",
          pool: pos0_topos1.to,
          token0: pos0_topos1.token,
          token1: pos1_transfer_block[0].token,
          amount0In: pos0_topos1.amount,
          amount1In: -pos1_transfer_block.reduce((acc, cur) => {
            return acc + cur.amount;
          }, 0n),
          pool_token0: 0n,
          pool_token1: 0n,
          type: "Other",
          tick: 0n,
          index: 0,
        },
        isOtherSwap: true,
      };
    } else if (
      pos1_topos0 &&
      previous_swap_or_liq_to_address.includes(pos1_topos0.from)
    ) {
      return {
        info: {
          sender: "",
          to: "",
          pool: pos1_topos0.to,
          token0: pos1_topos0.token,
          token1: pos0_transfer_block[0].token,
          amount0In: pos1_topos0.amount,
          amount1In: -pos0_transfer_block.reduce((acc, cur) => {
            return acc + cur.amount;
          }, 0n),
          pool_token0: 0n,
          pool_token1: 0n,
          type: "Other",
          tick: 0n,
          index: 0,
        },
        isOtherSwap: true,
      };
    }
    return {
      info: {
        sender: "",
        to: "",
        pool: "",
        token0: "",
        token1: "",
        amount0In: 0n,
        amount1In: 0n,
        pool_token0: 0n,
        pool_token1: 0n,
        type: "Other",
        tick: 0n,
        index: 0,
      },
      isOtherSwap: false,
    };
  }
  // 如果第一个transfer 是deposit的话，那么是无法cover deposit以上的transfer的，因为deposit只能insert一个transfer，
  private formatInternalTransfer(
    internal_txs: interface_internal_tx_info_from_etherscan[]
  ): interface_Transfer_Event_info[] {
    return internal_txs.map((internal_tx) => {
      return {
        from: internal_tx.from,
        to: internal_tx.to,
        amount: BigInt(internal_tx.value),
        token: ETH_MAINNET_CONSTANTS.WETH.ADDRESS,
        type: "Transfer",
        index: 0,
      };
    });
  }

  private combineLogsAndInternalTxs(
    array_info: interface_info_type[],
    format_internal_txs: interface_Transfer_Event_info[]
  ): interface_info_type[] {
    let breakpoint: {
      amount: bigint;
      type: "Withdrawal" | "Deposit";
      sender: string;
      breakpoint: number;
    }[] = [];
    for (let i = 0; i < format_internal_txs.length; i++) {
      if (format_internal_txs[i].from === ETH_MAINNET_CONSTANTS.WETH.ADDRESS) {
        breakpoint.push({
          amount: format_internal_txs[i].amount,
          type: "Withdrawal",
          sender: format_internal_txs[i].to,
          breakpoint: i,
        });
      } else if (
        format_internal_txs[i].to === ETH_MAINNET_CONSTANTS.WETH.ADDRESS
      ) {
        breakpoint.push({
          amount: format_internal_txs[i].amount,
          type: "Deposit",
          sender: format_internal_txs[i].from,
          breakpoint: i,
        });
      }
    }

    if (breakpoint.length === 0) {
      return array_info;
    }
    let traverser = 0;
    for (let index = 0; index < array_info.length; ++index) {
      if (
        array_info[index].type === "Withdrawal" ||
        array_info[index].type === "Deposit"
      ) {
        let before_slice = array_info.slice(0, index);
        let after_slice = array_info.slice(index + 1);
        array_info = before_slice
          .concat(
            format_internal_txs.slice(
              breakpoint[traverser].breakpoint + 1,
              breakpoint[traverser + 1] === undefined
                ? undefined
                : breakpoint[traverser + 1].breakpoint
            )
          )
          .concat(after_slice);
        traverser = traverser + 1;
      }
    }
    return array_info;
  }
}
export { TxReasoning };
