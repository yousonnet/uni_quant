import { mongoose_provider } from "../MongoInit/MongoInit";
import { getTokenMetadata } from "./TokenStorage";
import { interface_token } from "./TokenStorage";
import { isAddress } from "ethers";

const token_schema = new mongoose_provider.Schema({
  address: String,
  decimals: Number,
});

const TokenModel = mongoose_provider.model("token", token_schema);

class TokenProvider {
  readonly token_object: { [key: string]: number } = {};
  constructor(tokens: Array<interface_token>) {
    for (let token of tokens) {
      this.token_object[token.address] = token.decimals;
    }
  }

  async getTokenDecimals(token_address: string): Promise<number> {
    if (!isAddress(token_address)) {
      throw new Error("Invalid token address");
    }
    if (this.token_object[token_address] === undefined) {
      let token_metadata = await getTokenMetadata(token_address);
      this.token_object[token_address] = token_metadata.decimals;
      await this.writeDownNewRow(token_metadata);
      return token_metadata.decimals;
    } else {
      return this.token_object[token_address];
    }
  }

  private async writeDownNewRow(
    token_metadata: interface_token
  ): Promise<void> {
    let doc = new TokenModel(token_metadata);
    await doc.save();
  }

  static async getTokenFromDB(token_address: string): Promise<number> {
    let res = await TokenModel.findOne({ address: token_address }).lean();
    if (res === null) {
      throw new Error("Token not found");
    } else {
      return res.decimals as number;
    }
  }
  static async getAllTokensFromDB(): Promise<Array<interface_token>> {
    let res = await TokenModel.find({}).lean();
    return res as Array<interface_token>;
  }
}
export { TokenProvider };
