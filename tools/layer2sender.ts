import { ethers, Network, Wallet, formatEther, formatUnits } from "ethers";
import { configDotenv } from "dotenv";
const zksync_era_provider = new ethers.JsonRpcProvider(
  "https://mainnet.era.zksync.io"
);
const envPath = "../.env";

// 加载环境变量
configDotenv({ path: envPath });
let priv_key = process.env.ZKSYNC_KEY!;

let appointed_wallet = new Wallet(priv_key, zksync_era_provider);
// let i = [
//   "0xd4b0C2790bf561F0b9d23DCb2332E1751Ee41878",
//   "0x355f39bfb2709C6000ebd1Ff25f919374Fdc1Ef9",
//   "0x2357176c760611Be62df01a125E03F3f50A00d6a",
//   "0x95582F660D44955Fb5Dc52D0ACEe7aD586e2B881",
//   "0x5cBEDB602BD1C8f042307edD4Fd626d81A06ab34",
//   "0x1230f634f8A8804c06606059bf9888a264b48691",
//   "0xa5E4F16DB47750D87Ad799D97411c5FE04c9C725",
//   "0x7ff3819Aa077dD4F31eeFaB8350e267abF68D40a",
//   "0x2F5239DE69c3DDF7575Cd31d5EB6D4785368F5A8",
//   "0x7865700cA4C6191EB36d162112a43019CF794147",
//   "0x9d3A4e544191EF3F30f038E5bAbea59C1f8163a2",
//   "0x0beae50e83b0FF48f58B4E1510469449Cf4a07C8",
//   "0x96d2C5D1aE689e404Ec9129A3078817947Cf8dFF",
//   "0x996DEb236231fe857eC7b3fb7cf6D68e5c52C4C3",
//   "0x5f3bE7b11d6bC6D933FB59B481DdE4e95c19691c",
//   "0x83A8F303c0D99A9dc802E5A61c0797D011cC103D",
//   "0x259EC24cc9a9535c310F2F4e48216AfCC375C8ff",
//   "0x28c22E21a7DED887a69bCcFC5292e6461e4CCF35",
//   "0x6D002Da1104816d4A4015786F462D07D6770faa3",
//   "0xB560b043FedF435E1AF7A14eFe5e79b57691c457",
//   "0xC8abbbf596b9E56E33beD637FF2F01E1a5DdB684",
//   "0xdcC4a9027ecf3D6D85baa0A49C50162c15407F5D",
//   "0x018C3eE286B164E899478ec1b8E842449048503d",
//   "0x21b9ee60d9B1dBECB3C2037627E7f3eA13fC605c",
//   "0x53abdc8a9237230072feCe1e3C030Eb9f641d058",
//   "0xA6E648d32beDc005495F8cCf4e1e79092617bc69",
//   "0xeB94CB5908710B02E359d6e738dB7BadFB824D77",
// ];
// async function main() {
//   for (let ii of i) {
//     let res = await appointed_wallet.sendTransaction({
//       to: ii,
//       value: "400000000000000",
//       data: "0x",
//     });
//     console.log(res);
//   }
// }
// main();
export { zksync_era_provider };
