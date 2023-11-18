import { isAddress } from "ethers";
import { getPoolToken, interface_pool_tokens } from "./PoolStorage";
import { mongoose_provider } from "../MongoInit/MongoInit";

const pool_schema = new mongoose_provider.Schema({
  pool: String,
  token0: String,
  token1: String,
});
const PoolModel = mongoose_provider.model("pool", pool_schema);

class PoolProvider {
  readonly pool_object: { [key: string]: interface_pool_tokens } = {};
  constructor(pure_object_from_mongd: Array<interface_pool_tokens>) {
    for (let pool of pure_object_from_mongd) {
      this.pool_object[pool.pool] = pool;
    }
  }

  async getPool(pool_address: string): Promise<interface_pool_tokens> {
    if (!isAddress(pool_address)) {
      throw new Error("Invalid pool address");
    }

    if (this.pool_object[pool_address] === undefined) {
      let pool_tokens = await getPoolToken(pool_address);
      this.pool_object[pool_address] = pool_tokens;
      await this.writeDownNewRow(pool_tokens);
      return pool_tokens;
    } else {
      return this.pool_object[pool_address];
    }
  }

  private async writeDownNewRow(
    pool_tokens: interface_pool_tokens
  ): Promise<void> {
    let doc = new PoolModel(pool_tokens);
    await doc.save();
  }

  static async getPoolFromDB(
    pool_address: string
  ): Promise<interface_pool_tokens> {
    let pool_tokens = await PoolModel.findOne({ pool: pool_address }).lean();
    if (pool_tokens === null) {
      throw new Error("Pool not found");
    } else {
      return pool_tokens as interface_pool_tokens;
    }
  }

  static async getAllPoolsFromDB(): Promise<Array<interface_pool_tokens>> {
    let pool_tokens = await PoolModel.find({}).lean();
    return pool_tokens as Array<interface_pool_tokens>;
  }
}

export { PoolProvider };
