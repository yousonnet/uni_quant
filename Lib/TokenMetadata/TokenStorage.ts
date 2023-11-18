import { local_provider } from "../ProviderSetup";
import { weth_abi_decoder } from "../BasisConstants";
import { Contract } from "ethers";
interface interface_token {
  address: string;
  decimals: number;
}

async function getTokenMetadata(
  token_address: string
): Promise<interface_token> {
  let token_contract = new Contract(
    token_address,
    weth_abi_decoder,
    local_provider
  );
  let decimals = Number(await token_contract.decimals());
  return { address: token_address, decimals };
}

export { getTokenMetadata, interface_token };
