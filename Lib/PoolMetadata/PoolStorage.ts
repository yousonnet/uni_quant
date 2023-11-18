import { local_provider } from "../ProviderSetup";
import { uniswap_v3_abi_decoder } from "../BasisConstants";
import { Contract } from "ethers";

interface interface_pool_tokens {
  pool: string;
  token0: string;
  token1: string;
}

async function getPoolToken(
  pool_address: string
): Promise<interface_pool_tokens> {
  let contract_callable = new Contract(
    pool_address,
    uniswap_v3_abi_decoder,
    local_provider
  );
  let token0_promise = contract_callable.token0();
  let token1_promise = contract_callable.token1();
  let [token0, token1] = await Promise.all([token0_promise, token1_promise]);
  return {
    pool: pool_address,
    token0,
    token1,
  };
}

// getPoolToken("0x0d4a11d5eeaac28ec3f61d100daf4d40471f1852").then((res) => {
//   console.log(res);
// });
export { getPoolToken, interface_pool_tokens };
