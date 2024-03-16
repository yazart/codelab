import {RemoteCursor} from "../remote-lib/RemoteCursor";
import {RemoteSelection} from "../remote-lib/RemoteSelection";

export type User = {
  name: string,
  id: string,
  cursor?: RemoteCursor,
  selection?: RemoteSelection,
}
