import { interface_general_info } from "./UniEventsInterfaces";

interface interface_FormalInfo_LV1 {
  LV1_type: "orthodox action of UNI" | "deprectated" | "other action";
}
//TODO:面对transfer out累加和transfer in 累加相对于info上数量不对的info，直接deprecated，这样的非uni正统info但是feat相同，处理逻辑稍微不一样的不被考虑。（也没办法考虑）
