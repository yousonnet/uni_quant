import {
  Alchemy,
  Network,
  DebugTracerType,
  DebugCallTracer,
  DebugCallTrace,
} from "alchemy-sdk";
import "dotenv/config";

let a_provider = new Alchemy({
  apiKey: process.env.ALCHEMY_KEY as string,
  network: Network.ETH_MAINNET,
});

const main = async () => {
  // The transaction hash of the transaction to trace.

  let txHash =
    "0xd3da74302ec2a2eb742fba478afd8f653d4a63337fa4ce390f0368da88da4c58";
  let tran = await a_provider.core.getTransaction(txHash);
  console.log(tran);
  // Tracer type and configuration.
  let tracerConfig = {
    type: "callTracer",
    onlyTopCall: true,
  } as DebugCallTracer;

  let timeout = "10s";

  // Calling the traceTransaction method
  let response = await a_provider.debug.traceTransaction(
    txHash,
    tracerConfig,
    timeout
  );

  // Logging the response to the console
  console.log(response);
};

main();
