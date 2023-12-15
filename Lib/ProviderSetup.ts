import {
  ethers,
  TransactionDescription,
  TransactionReceipt,
  TransactionResponse,
} from "ethers";
import "dotenv/config";
import { CustomProvider } from "./ProviderExtends";
// import { Alchemy, Network } from "alchemy-sdk";

// const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY as string;
// const JSON_NODE_PORT = process.env.JSON_NODE_PORT as string;
const local_provider = new ethers.JsonRpcProvider("http://127.0.0.1:3334");
// const local_custom_provider = new CustomProvider("http://127.0.0.1:3334");
// const default_provider = ethers.getDefaultProvider("homestead");
const default_provider = new ethers.AlchemyProvider(
  "homestead",
  "2GomDhKvLRCtjjlvbb-EX58NYKcbNbYy"
);
export { local_provider, default_provider };
