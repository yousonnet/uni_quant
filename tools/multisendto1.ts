import { zksync_era_provider } from "./layer2sender";
import { Contract, Interface, Wallet, isBytesLike } from "ethers";
import fs from "fs";
import { parse } from "fast-csv";
let abi_interface = new Interface([
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "guy", type: "address" },
      { name: "wad", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "src", type: "address" },
      { name: "dst", type: "address" },
      { name: "wad", type: "uint256" },
    ],
    name: "transferFrom",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "wad", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "dst", type: "address" },
      { name: "wad", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      { name: "", type: "address" },
      { name: "", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  { payable: true, stateMutability: "payable", type: "fallback" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "src", type: "address" },
      { indexed: true, name: "guy", type: "address" },
      { indexed: false, name: "wad", type: "uint256" },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "src", type: "address" },
      { indexed: true, name: "dst", type: "address" },
      { indexed: false, name: "wad", type: "uint256" },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "dst", type: "address" },
      { indexed: false, name: "wad", type: "uint256" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "src", type: "address" },
      { indexed: false, name: "wad", type: "uint256" },
    ],
    name: "Withdrawal",
    type: "event",
  },
]);
let token_contract = new Contract(
  "0x7D54a311D56957fa3c9a3e397CA9dC6061113ab3",
  abi_interface,
  zksync_era_provider
);

async function sendToken() {
  let data = await readCSV(
    "/Users/xiaohanli/Documents/temporaryDoc/Untitled 2.csv"
  );

  let cleanOutData: string[] = [];
  for (let data_item of data) {
    if (data_item[0].length >= 10) {
      cleanOutData.push(data_item[0] as string);
    }
  }

  for (let i of cleanOutData) {
    console.log(i);
    let wallet = new Wallet(i, zksync_era_provider);
    let address = await wallet.getAddress();
    let balance: bigint = await token_contract.balanceOf(address);
    if (balance === 0n) {
      continue;
    }
    let wallet_connected_contract = new Contract(
      "0x7D54a311D56957fa3c9a3e397CA9dC6061113ab3",
      abi_interface,
      wallet
    );
    // await wallet_connected_contract.transfer(
    //   "0xb8d2b659D2458C99D4A06077b6d53c721eD8C1c1",
    //   balance
    // );
    const transactionData =
      wallet_connected_contract.interface.encodeFunctionData("transfer", [
        "0xb8d2b659D2458C99D4A06077b6d53c721eD8C1c1",
        balance,
      ]);
    let gasprice = (await zksync_era_provider.getFeeData()).gasPrice;
    let estimatedGas = await wallet.estimateGas({
      to: "0x7D54a311D56957fa3c9a3e397CA9dC6061113ab3",
      data: transactionData,
      value: 0,
    });
    console.log(gasprice);
    console.log(estimatedGas);
    wallet
      .sendTransaction({
        to: "0x7D54a311D56957fa3c9a3e397CA9dC6061113ab3",
        data: transactionData,
        value: 0,
        gasLimit: estimatedGas,
        gasPrice: gasprice,
      })
      .then((res) => {
        console.log(res);
      });
    console.log(transactionData);
    // token_contract.connect(wallet).transfer(address, balance).then((res) => {console.log(res)});
    // token_contract.transfer(address, balance).then((res) => {
    //   console.log(res);
    // });
    // break;
  }
}
sendToken();
async function readCSV(path: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let data: any[] = [];

    fs.createReadStream(path)
      .pipe(parse())
      .on("data", (data_item) => {
        data.push(data_item);
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}
