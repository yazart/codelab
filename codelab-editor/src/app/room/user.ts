import {RemoteCursor} from "../remote-lib/RemoteCursor";
import {RemoteSelection} from "../remote-lib/RemoteSelection";
import {TUserColors} from "./color-palete";

export type User = {
  name: string,
  id: string,
  color: TUserColors[keyof TUserColors],
  cursor?: RemoteCursor,
  selection?: RemoteSelection,
}
