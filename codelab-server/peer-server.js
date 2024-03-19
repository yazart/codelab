const { PeerServer } = require("peer");

const peerServer = PeerServer({ port: 3300, path: "/async" });