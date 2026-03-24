import { WebSocket } from "ws";
import { Player } from "./types/player";
import { Game } from "./types/Game";

// Simple in-memory database

export const players = new Map<string, Player>();
export const games = new Map<string, Game>();
// Maps WS to Player ID
export const connections = new Map<WebSocket, string>();
