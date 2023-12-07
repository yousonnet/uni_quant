import Decimal from "decimal.js";
import {
  interface_LiqAction_Event_info,
  interface_Transfer_Event_info,
  interface_general_action_info,
  interface_info_type,
  interface_swap_info,
  interface_general_info_wrapped,
} from "./TypeAndInterface";
import { tradeComparator } from "@uniswap/v3-sdk";
import { ETH_MAINNET_CONSTANTS } from "./constants/BasisConstants";
import { isTransferInfo } from "./SupplementInfo";

class TransferTOPO {
  readonly whole_array_info!: interface_info_type[];
  readonly root_transfer_index: number;
  this_transfer_feats: {
    isEnd: boolean;
    routerTaxedAmountOfContract: number;
  };
  inferiorTransfers: TransferTOPO[] = [];

  constructor(
    whole_array_info: interface_info_type[],
    root_transfer_index: number,
    already_checked_index_memo: number[],
    //TODO:already_checked_index_memo是为了防止遇到本体的swap的info时，不会再次遍历到本体从而导致break掉
    superior_feats: {
      isEnd: boolean;
      routerTaxedAmountOfContract: number;
    } = {
      isEnd: false,
      routerTaxedAmountOfContract: 0,
    }
  ) {
    this.whole_array_info = whole_array_info;
    this.root_transfer_index = root_transfer_index;
    this.this_transfer_feats = superior_feats;
    this.parseInfoToTransferTOPO(
      root_transfer_index,
      whole_array_info,
      already_checked_index_memo
    );
    if (this.inferiorTransfers.length == 0) {
      this.this_transfer_feats.isEnd = true;
    } else {
      this.this_transfer_feats.isEnd = false;
    }
  }
  public parseAllEndsTransfer(
    collected_end_transfer_index: {
      index: number;
      routerTaxedAmountOfContract: number;
    }[] = []
  ): { index: number; routerTaxedAmountOfContract: number }[] {
    if (this.this_transfer_feats.isEnd) {
      collected_end_transfer_index.push({
        index: this.root_transfer_index,
        routerTaxedAmountOfContract:
          this.this_transfer_feats.routerTaxedAmountOfContract,
      });
    } else {
      for (let i of this.inferiorTransfers) {
        i.parseAllEndsTransfer(collected_end_transfer_index);
      }
    }
    return collected_end_transfer_index;
  }
  private parseInfoToTransferTOPO(
    root_transfer_index: number,
    whole_array_info: interface_info_type[],
    already_checked_index_memo: number[]
  ) {
    let root_transfer_info = whole_array_info[
      root_transfer_index
    ] as interface_Transfer_Event_info;
    let instances_array: number[] = [];
    for (let i = root_transfer_index + 1; i < whole_array_info.length; ++i) {
      if (already_checked_index_memo.includes(i)) {
        //swap 的index也在其中
        continue;
      }
      let now_transfer_info = whole_array_info[i];
      if (isTransferInfo(now_transfer_info)) {
        if (
          now_transfer_info.token === root_transfer_info.token &&
          now_transfer_info.from === root_transfer_info.to &&
          now_transfer_info.amount <= root_transfer_info.amount
        ) {
          instances_array.push(i);
          already_checked_index_memo.push(i);
        }
        // this.inferiorTransfers.push(new TransferTOPO(whole_array_info,i))
      } else {
        break;
      }
    }
    this.this_transfer_feats.routerTaxedAmountOfContract =
      this.this_transfer_feats.routerTaxedAmountOfContract +
      Number(
        Decimal.sub(
          root_transfer_info.amount.toString(),
          instances_array
            .reduce(
              (acc, cur) =>
                acc +
                (whole_array_info[cur] as interface_Transfer_Event_info).amount,
              0n
            )
            .toString()
        )
          .div(root_transfer_info.amount.toString())
          .toFixed(2)
      );
    //TODO:这里直接fixed到2位，所以如果tax过小则直接不会被算作taxedcontract
    for (let i of instances_array) {
      this.inferiorTransfers.push(
        new TransferTOPO(
          whole_array_info,
          i,
          already_checked_index_memo,
          this.this_transfer_feats
        )
      );
    }
  }
}
function getSwapOutToken(info: interface_swap_info) {
  return {
    amount: info.amount0In > info.amount1In ? info.amount0In : info.amount1In,
    token: info.amount0In > info.amount1In ? info.token1 : info.token0,
  };
}
function parseOutFirstStepTokensTransferFromSwap(
  root_swap_index: number,
  whole_array_info: interface_info_type[]
): { index: number; poolTaxed: number } {
  let swap_info = whole_array_info[root_swap_index] as interface_swap_info;
  let swap_out_token_info = getSwapOutToken(swap_info);
  for (let i = root_swap_index - 1; i >= 0; --i) {
    let now_transfer_info = whole_array_info[i];
    if (isTransferInfo(now_transfer_info)) {
      if (
        now_transfer_info.token == swap_out_token_info.token &&
        now_transfer_info.to === swap_info.to &&
        now_transfer_info.from === swap_info.pool &&
        now_transfer_info.amount <= swap_out_token_info.amount
      ) {
        return {
          index: i,
          poolTaxed: Number(
            Decimal.div(
              now_transfer_info.amount.toString(),
              swap_out_token_info.amount.toString()
            )
              .sub(1)
              .abs()
              .toFixed(2)
          ),
        };
      }
    }
  }
  throw new Error("can't find the first step transfer");
}
//TODO:onlyfor v2 and v2 like other liq action
function parseOutFirstStepTokensTransferFromLiqActions(
  root_liq_index: number,
  whole_array_info: interface_info_type[],
  token0: boolean
) {
  let liq_info = whole_array_info[
    root_liq_index
  ] as interface_LiqAction_Event_info;
  if (liq_info.amount0In > 0) {
    //mint
    for (let i = root_liq_index - 1; i >= 0; --i) {
      let now_transfer_info = whole_array_info[
        i
      ] as interface_Transfer_Event_info;
      if (
        now_transfer_info.from === ETH_MAINNET_CONSTANTS["0Address"] &&
        now_transfer_info.token === liq_info.pool &&
        now_transfer_info.to === liq_info.to
      ) {
        return {
          index: i,
          poolTaxed: Decimal.div(
            new Decimal(now_transfer_info.amount.toString()).pow(2),
            Decimal.mul(
              liq_info.amount0In.toString(),
              liq_info.amount1In.toString()
            )
          )
            .sub(1)
            .abs()
            .toFixed(2),
        };
      }
    }
  }

  if (token0) {
    //burn
    for (let i = root_liq_index - 1; i >= 0; --i) {
      let now_transfer_info = whole_array_info[
        i
      ] as interface_Transfer_Event_info;
      if (
        now_transfer_info.token === liq_info.token0 &&
        now_transfer_info.to === liq_info.to &&
        now_transfer_info.amount <= -liq_info.amount0In
      ) {
        return {
          index: i,
          poolTaxed: Decimal.div(
            now_transfer_info.amount.toString(),
            liq_info.amount0In.toString()
          )
            .sub(1)
            .abs()
            .toFixed(2),
        };
      }
    }
  } else {
    for (let i = root_liq_index - 1; i >= 0; --i) {
      let now_transfer_info = whole_array_info[
        i
      ] as interface_Transfer_Event_info;
      if (
        now_transfer_info.token === liq_info.token1 &&
        now_transfer_info.to === liq_info.to &&
        now_transfer_info.amount <= -liq_info.amount1In
      ) {
        return {
          index: i,
          poolTaxed: Decimal.div(
            now_transfer_info.amount.toString(),
            liq_info.amount1In.toString()
          )
            .sub(1)
            .abs()
            .toFixed(2),
        };
      }
    }
  }
  throw new Error("can't find the first step transfer from liq action");
}
class BaseUnit {
  feats!: interface_general_action_info;
  constructor(single_info: interface_general_action_info) {
    this.feats = single_info;
  }
}
class UnitSwap {
  swaps: BaseUnit[] = [];
  constructor(
    root_swap_index: number,
    whole_array_info: interface_info_type[]
  ) {
    let first_swap_out_info = parseOutFirstStepTokensTransferFromSwap(
      root_swap_index,
      whole_array_info
    );
    let transfer_topo_ends_array = new TransferTOPO(
      whole_array_info,
      first_swap_out_info.index,
      [root_swap_index]
    ).parseAllEndsTransfer();
    let isMultiReceive = false;
    let receiving_total = 0n;
    if (transfer_topo_ends_array.length === 1) {
      let only_1_info = whole_array_info[
        transfer_topo_ends_array[0].index
      ] as interface_Transfer_Event_info;
      let info = whole_array_info[
        root_swap_index
      ] as interface_general_info_wrapped;

      info.to = only_1_info.to;
      info.proportion = 1;
      info.isMultiReceive = false;
      //因为是swap，之前没有设置tick 的upper limit和lower limit
      info.tickLower = 0n;
      info.tickUpper = 0n;
      info.poolTaxed = first_swap_out_info.poolTaxed;
      info.routerTaxedAmountOfContract =
        transfer_topo_ends_array[0].routerTaxedAmountOfContract;
      this.swaps.push(new BaseUnit(info));
    } else {
      isMultiReceive = true;
      receiving_total = transfer_topo_ends_array.reduce(
        (acc, cur) =>
          acc +
          (whole_array_info[cur.index] as interface_Transfer_Event_info).amount,
        0n
      );
      for (let item of transfer_topo_ends_array) {
        let info = whole_array_info[
          root_swap_index
        ] as interface_general_info_wrapped;
        info.to = (
          whole_array_info[item.index] as interface_Transfer_Event_info
        ).to;
        info.proportion = Number(
          Decimal.div(
            (
              whole_array_info[item.index] as interface_Transfer_Event_info
            ).amount.toString(),
            receiving_total.toString()
          ).toFixed(2)
        );
        info.isMultiReceive = true;
        info.tickLower = 0n;
        info.tickUpper = 0n;
        info.poolTaxed = first_swap_out_info.poolTaxed;
        info.routerTaxedAmountOfContract = item.routerTaxedAmountOfContract;
        this.swaps.push(new BaseUnit(info));
      }
    }
  }
}
class UnitBurnV2 {
  BurnV2s: BaseUnit[] = [];
  constructor(
    root_burn_index: number,
    whole_array_info: interface_info_type[]
  ) {
    let token0_out_info = parseOutFirstStepTokensTransferFromLiqActions(
      root_burn_index,
      whole_array_info,
      true
    );
    let token1_out_info = parseOutFirstStepTokensTransferFromLiqActions(
      root_burn_index,
      whole_array_info,
      false
    );
    if (token0_out_info && token1_out_info) {
      let transfer_topo_ends_array = new TransferTOPO(
        whole_array_info,
        token0_out_info.index,
        [root_burn_index]
      ).parseAllEndsTransfer();
      //TODO:暂时就跟踪tken0的transfer
    }
  }
}
class UnitMintV2 {
  constructor(
    root_mint_index: number,
    whole_array_info: interface_info_type[]
  ) {}
}

class UnitBurnV3 {}
class UnitMintV3 {}
export { TransferTOPO };
