import { WebSocket } from "ws";
import { randomUUID } from "crypto";
import { players, games, connections } from "./store.js";
import {
  generateRoomCode,
  sendMsg,
  broadcastToGame,
  broadcastPlayerUpdate,
} from "./utils.js";
import { startQuestion, endQuestion } from "./gameLogic.js";

/**
 * Acts as a router, taking incoming parsed JSON messages and executing the correct commands.
 * @param {WebSocket} ws - Current socket.
 * @param {string} message - The incoming JSON string message from the client.
 */
export const handleMessage = (ws: WebSocket, message: string) => {
  try {
    const parsed = JSON.parse(message);
    const { type, data } = parsed;
    const playerId = connections.get(ws);

    switch (type) {
      case "reg": {
        const newId = randomUUID();
        players.set(newId, { name: data.name, index: newId, score: 0, ws });
        connections.set(ws, newId);
        sendMsg(ws, "reg", {
          name: data.name,
          index: newId,
          error: false,
          errorText: "",
        });
        break;
      }

      case "create_game": {
        if (!playerId) return;
        const gameId = randomUUID();
        const code = generateRoomCode();

        games.set(gameId, {
          id: gameId,
          code,
          hostId: playerId,
          hostWs: ws,
          questions: data.questions,
          players: [],
          currentQuestion: -1,
          status: "waiting",
          currentAnswers: new Map(),
        });

        sendMsg(ws, "game_created", { gameId, code });
        break;
      }

      case "join_game": {
        if (!playerId) return;
        const game = Array.from(games.values()).find(
          (g) => g.code === data.code && g.status === "waiting",
        );
        const player = players.get(playerId);

        if (game && player) {
          // Reset score on join
          player.score = 0;
          game.players.push(player);
          sendMsg(ws, "game_joined", { gameId: game.id });
          broadcastToGame(game, "player_joined", {
            playerName: player.name,
            playerCount: game.players.length,
          });
          broadcastPlayerUpdate(game);
        }
        break;
      }

      case "start_game": {
        const game = games.get(data.gameId);
        if (game && game.hostId === playerId && game.status === "waiting") {
          game.status = "in_progress";
          game.currentQuestion = 0;
          startQuestion(game);
        }
        break;
      }

      case "answer": {
        if (!playerId) return;
        const game = games.get(data.gameId);

        if (
          game &&
          game.status === "in_progress" &&
          game.currentQuestion === data.questionIndex
        ) {
          const timeElapsed = Date.now() - (game.questionStartTime || 0);

          if (!game.currentAnswers.has(playerId)) {
            game.currentAnswers.set(playerId, {
              answerIndex: data.answerIndex,
              timeElapsed,
            });
            sendMsg(ws, "answer_accepted", {
              questionIndex: data.questionIndex,
            });

            if (game.currentAnswers.size === game.players.length) {
              endQuestion(game);
            }
          }
        }
        break;
      }

      case "export_questions": {
        const game = games.get(data.gameId);
        if (game && game.hostId === playerId) {
          sendMsg(ws, "questions_exported", {
            schemaVersion: 1,
            questions: game.questions,
          });
        }
        break;
      }

      case "import_questions": {
        const game = games.get(data.gameId);
        if (game && game.hostId === playerId && game.status === "waiting") {
          game.questions = data.questions;
          sendMsg(ws, "questions_imported", {
            gameId: game.id,
            totalQuestions: game.questions.length,
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Invalid message format:", err);
  }
};
