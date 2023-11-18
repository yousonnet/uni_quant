import "dotenv/config";
import { Mongoose } from "mongoose";
const mongo_url = process.env.MONGODB as string;

let mongoose_provider = new Mongoose();
mongoose_provider.connect(mongo_url);

export { mongoose_provider };
