import { WebSocketServer } from "ws";
import { handleMessage } from "./messageHandler.js";
import { players, games, connections } from "./store.js";
import { broadcastPlayerUpdate } from "./utils.js";

const PORT = 8080;
const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    handleMessage(ws, message.toString());
  });

  ws.on("close", () => {
    const playerId = connections.get(ws);
    if (playerId) {
      connections.delete(ws);

      // Remove player from any active or waiting games
      games.forEach((game) => {
        if (game.status === "waiting" || game.status === "in_progress") {
          const initialLen = game.players.length;
          game.players = game.players.filter((p) => p.index !== playerId);
          if (game.players.length < initialLen) broadcastPlayerUpdate(game);
        }
      });

      players.delete(playerId);
    }
  });
});

console.log(`Live Quiz Game Server is running!`);
console.log(`WebSocket Address: ws://localhost:${PORT}`);
