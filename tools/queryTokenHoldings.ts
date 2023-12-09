import { default_provider } from "../Lib/ProviderSetup";
import { weth_abi_decoder } from "../Lib/constants/BasisConstants";
import { Contract, isAddress } from "ethers";
import { readCSV } from "./readCSV";
let path =
  "/Users/xiaohanli/Documents/temporaryDoc/姨太地址/Sheet1-Table 1.csv";

let token_address = "0x686f2404e77Ab0d9070a46cdfb0B7feCDD2318b0";
let token_contract = new Contract(
  token_address,
  weth_abi_decoder,
  default_provider
);
async function queryTokenHoldings() {
  let data = await readCSV(path);
  let address_array = data.map((item) => item[0]);
  let balance_array: { address: string; value: bigint }[] = [];
  for (let index = 0; index < address_array.length; index++) {
    if (isAddress(address_array[index]) === false) {
      continue;
    }
    let balance = (await token_contract.balanceOf(
      address_array[index]
    )) as bigint;
    if (balance !== 0n) {
      balance_array.push({ address: address_array[index], value: balance });
    }
  }
  console.log(balance_array);
}
queryTokenHoldings();
