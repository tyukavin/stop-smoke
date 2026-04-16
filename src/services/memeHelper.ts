import type { Context } from 'grammy';
import { getRandomSticker } from './stickers.js';

/**
 * Randomly sends a sticker/meme after a message.
 * Returns true if a sticker was sent.
 * Probability: ~30% per call, context-aware.
 */
export async function maybeSendMeme(ctx: Context, stickerContext: string, probability = 0.3): Promise<boolean> {
  if (Math.random() > probability) return false;

  const sticker = getRandomSticker(stickerContext);
  if (!sticker) return false;

  try {
    await ctx.replyWithSticker(sticker.file_id);
    return true;
  } catch (e) {
    console.error('Failed to send sticker:', (e as Error).message);
    return false;
  }
}

/**
 * Always sends a sticker for the given context.
 */
export async function sendMeme(ctx: Context, stickerContext: string): Promise<boolean> {
  return maybeSendMeme(ctx, stickerContext, 1);
}
