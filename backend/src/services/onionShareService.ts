import { OnionShareAPI } from 'onionshare-api';
import crypto from 'crypto';

export class OnionShareService {
  private static instance: OnionShareService;
  private onionShare: OnionShareAPI;
  private messageChannels: Map<string, string> = new Map();
  private privateKeys: Map<string, Buffer> = new Map();

  constructor() {
    this.onionShare = new OnionShareAPI({
      baseUrl: 'https://render-server-znav.onrender.com',
      apiKey: process.env.ONIONSHARE_API_KEY
    });
  }

  static getInstance(): OnionShareService {
    if (!OnionShareService.instance) {
      OnionShareService.instance = new OnionShareService();
    }
    return OnionShareService.instance;
  }

  async createPrivateChannel(codename: string): Promise<string> {
    const privateKey = crypto.randomBytes(32);
    const channelId = await this.onionShare.createChannel({
      name: `tholos_${codename}`,
      private: true,
      encryptionKey: privateKey.toString('hex')
    });

    this.messageChannels.set(codename, channelId);
    this.privateKeys.set(codename, privateKey);

    return channelId;
  }

  async sendEncryptedMessage(channelId: string, message: string, recipientPublicKey: string): Promise<void> {
    const encrypted = await this.encryptMessage(message, recipientPublicKey);
    await this.onionShare.sendMessage(channelId, {
      type: 'tholos_message',
      data: encrypted,
      timestamp: Date.now()
    });
  }

  async encryptMessage(message: string, recipientPublicKey: string): Promise<string> {
    const signalEncrypted = await this.signalEncrypt(message, recipientPublicKey);
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);

    let encrypted = cipher.update(signalEncrypted, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return JSON.stringify({
      signal: encrypted,
      aes: aesKey.toString('hex'),
      iv: iv.toString('hex'),
      tag: cipher.getAuthTag().toString('hex')
    });
  }

  async decryptMessage(encryptedData: string, senderPublicKey: string): Promise<string> {
    const data = JSON.parse(encryptedData);
    const aesKey = Buffer.from(data.aes, 'hex');
    const iv = Buffer.from(data.iv, 'hex');
    const tag = Buffer.from(data.tag, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(data.signal, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return await this.signalDecrypt(decrypted, senderPublicKey);
  }

  private async signalEncrypt(message: string, recipientPublicKey: string): Promise<string> {
    const signalProtocol = await import('@privacyresearch/libsignal-protocol-javascript');
    return message;
  }

  private async signalDecrypt(encrypted: string, senderPublicKey: string): Promise<string> {
    return encrypted;
  }
}
