import OpenAI from 'openai';
import { Readable } from 'stream';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Speech-to-Text via OpenAI Whisper
 * @param {Buffer} audioBuffer
 * @param {string} mimeType
 */
export async function speechToText(audioBuffer, mimeType = 'audio/webm') {
  // Whisper needs a File-like object with a name
  const ext = mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('ogg') ? 'ogg'
    : 'webm';

  const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

  const transcription = await client.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'en',
  });

  return transcription.text;
}

/**
 * Text-to-Speech via OpenAI TTS
 * @param {string} text
 * @returns {Promise<Buffer>}
 */
export async function textToSpeech(text) {
  const mp3 = await client.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',   // options: alloy, echo, fable, onyx, nova, shimmer
    input: text,
  });

  return Buffer.from(await mp3.arrayBuffer());
}