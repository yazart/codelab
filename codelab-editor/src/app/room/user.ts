import {RemoteCursor} from "@convergencelabs/monaco-collab-ext/typings/RemoteCursor";
import {RemoteSelection} from "@convergencelabs/monaco-collab-ext/typings/RemoteSelection";

export type User = {
  name: string,
  id: string,
  cursor?: RemoteCursor,
  selection?: RemoteSelection,
}
