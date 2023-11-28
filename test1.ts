import Decimal from "decimal.js";
import { etherscan_cli } from "./Lib/EScanCLI";
import { reDivideArray } from "./Lib/UniSwapSorts";
import { TOPICHASHTABLE } from "./Lib/BasisConstants";
let i = [1, 7, 8, 1, 0, 2, 31, 2, 3, 5];
console.log(i.sort((a, b) => a - b));
console.log(TOPICHASHTABLE.Mint);
// etherscan_cli
//   .getInternalTxFromBlockRange(17176506, 17176706, 50)
//   .then((res) => {
//     let res0 = reDivideArray(res, "hash");
//     for (let i of res0) {
//       if (i[1].length >= 6) {
//         console.log(i);
//       }
//     }
//   });
// enum i {
//   "sj",
//   "sun",
// }

// console.log(Object.keys(i));
