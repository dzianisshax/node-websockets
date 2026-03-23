export interface Player {
  name: string;
  index: string;
  score: number;
  // Kept as reference for broadcasting
  ws?: WebSocket;
}
