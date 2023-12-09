import fs from "fs";
import { parse } from "fast-csv";

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
export { readCSV };
