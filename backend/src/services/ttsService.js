import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

/** Natural Indian English neural voice (Microsoft Edge TTS) */
const DEFAULT_VOICE = process.env.TTS_VOICE || 'en-IN-NeerjaNeural';
const DEFAULT_RATE = process.env.TTS_RATE || '+10%';

let ttsReady = false;
const tts = new MsEdgeTTS();

async function ensureTtsReady() {
  if (ttsReady) return;
  await tts.setMetadata(DEFAULT_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  ttsReady = true;
}

function streamToBuffer(audioStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    audioStream.on('data', (chunk) => chunks.push(chunk));
    audioStream.on('close', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

export async function synthesizeSpeech(text, options = {}) {
  const trimmed = text?.trim();
  if (!trimmed) throw new Error('Text is required');

  await ensureTtsReady();

  const { audioStream } = tts.toStream(trimmed, {
    rate: options.rate || DEFAULT_RATE,
    pitch: options.pitch || '+0Hz',
    volume: options.volume || '+0%',
  });

  return streamToBuffer(audioStream);
}

export function getTtsConfig() {
  return {
    voice: DEFAULT_VOICE,
    rate: DEFAULT_RATE,
    provider: 'msedge-neural',
  };
}
