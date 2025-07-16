// backend/src/renderServer.ts
import express, { Request, Response } from 'express';
import { OnionShareService } from './services/onionShareService';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { IncomingMessage } from 'http';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json()); // Required to parse JSON bodies

const onionShare = OnionShareService.getInstance();

// Health check for Render
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy', timestamp: Date.now() });
});

// OnionShare channel management
app.post('/api/channels/create', async (req: Request, res: Response) => {
  try {
    const { codename }: { codename: string } = req.body;
    const channelId = await onionShare.createPrivateChannel(codename);
    res.json({ channelId });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// WebSocket for real-time messaging
wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  let codename: string | null = null;

  ws.on('message', async (data: WebSocket.RawData) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'auth') {
        codename = message.codename;
        // TODO: Authenticate user
      } else if (message.type === 'send_message') {
        await onionShare.sendEncryptedMessage(
          message.channelId,
          message.content,
          message.recipientPublicKey
        );
      }
    } catch (err) {
      console.error('Failed to handle WebSocket message:', err);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Tholos OnionShare server running on port ${PORT}`);
});
