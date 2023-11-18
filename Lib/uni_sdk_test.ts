import { AlphaRouter } from "@uniswap/smart-order-router";
import { ChainId } from "@uniswap/sdk-core";
import { local_provider } from "./ProviderSetup";

function getMainnetProvider(): BaseProvider {
  return local_provider;
}
let router = new AlphaRouter({
  chainId: ChainId.MAINNET,
  provider: local_provider,
});
