import { default_provider } from "./Lib/ProviderSetup";
import { Contract, Provider } from "ethers";
import { ETH_MAINNET_CONSTANTS } from "./Lib/constants/BasisConstants";
import { EventLog } from "ethers";
async function getWhoOwnedTheERC721TokenWhen(
  block_number: number,
  contract_address: string,
  token_id: number,
  provider: Provider
) {
  let erc721_contract = new Contract(
    contract_address,
    ETH_MAINNET_CONSTANTS.UNISWAP.V3NFTABI,
    provider
  );
  const filter = erc721_contract.filters.Transfer(null, null, token_id);
  let events = (await erc721_contract.queryFilter(filter)) as EventLog[];

  for (let i = events.length - 1; i >= 0; --i) {
    if (events[i].blockNumber <= block_number) {
      return events[i].args[1].toLowerCase();
    }
  }
  // (event => {
  //     return {
  //         from: event.,
  //         to: event.args.to,
  //         tokenId: event.args.tokenId.toString(),
  //         transactionHash: event.transactionHash
  //     };
  // });
}
getWhoOwnedTheERC721TokenWhen(
  18471940,
  "0xc36442b4a4522e871399cd717abdd847ab11fe88",
  594542,
  default_provider
).then((i) => console.log(i));
