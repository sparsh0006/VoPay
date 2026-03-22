'use client';

import { useRef, useState, useCallback } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

interface Props {
  stage: 'idle' | 'recording' | 'processing';
  onStart: () => void;
  onTranscript: (text: string) => void;
  onError?: (msg: string) => void;
}

export default function VoiceRecorder({ stage, onStart, onTranscript, onError }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [isReady, setIsReady] = useState(false); // true once MediaRecorder is actually running

  const startRecording = useCallback(async () => {
    chunksRef.current = [];
    setIsReady(false);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      onError?.('Microphone permission denied. Please allow mic access and try again.');
      return;
    }

    // Pick a supported mimeType
    const mimeType = ['audio/webm', 'audio/ogg', 'audio/mp4', '']
      .find(t => t === '' || MediaRecorder.isTypeSupported(t)) ?? '';

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    } catch (err) {
      stream.getTracks().forEach(t => t.stop());
      onError?.('Could not start recording. Please try a different browser.');
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      setIsReady(false);

      if (chunksRef.current.length === 0) {
        onError?.('No audio recorded. Please try again.');
        return;
      }

      const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' });

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/pay/stt`, {
          method: 'POST',
          headers: { 'Content-Type': mimeType || 'audio/webm' },
          body: blob,
        });

        if (!res.ok) throw new Error(`STT failed: ${res.status}`);
        const data = await res.json();

        if (!data.transcript) throw new Error('Empty transcript returned');
        onTranscript(data.transcript);
      } catch (err: any) {
        console.error('STT error:', err);
        onError?.(err.message || 'Could not transcribe audio. Please try again.');
      }
    };

    recorder.onerror = (e) => {
      console.error('MediaRecorder error:', e);
      stream.getTracks().forEach(t => t.stop());
      onError?.('Recording error. Please try again.');
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // collect data every 100ms so onstop has chunks
    setIsReady(true);    // mark ready AFTER recorder.start() succeeds
    onStart();           // update parent stage AFTER recorder is running
  }, [onStart, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      onError?.('Recorder not ready yet. Please wait a moment.');
      return;
    }
    if (recorder.state === 'inactive') {
      onError?.('Recording already stopped.');
      return;
    }
    recorder.stop();
  }, [onError]);

  const isRecording = stage === 'recording';
  const isProcessing = stage === 'processing';

  return (
    <div className="flex flex-col items-center py-8">
      <div className="relative">
        {isRecording && (
          <>
            <span className="mic-ring" />
            <span className="mic-ring" style={{ animationDelay: '0.5s', opacity: 0.5 }} />
          </>
        )}
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing || (isRecording && !isReady)}
          title={isRecording ? 'Tap to stop' : 'Tap to record'}
          className={`
            relative z-10 w-24 h-24 rounded-full flex items-center justify-center
            transition-all duration-200 active:scale-95
            ${isRecording
              ? 'bg-red-500 hover:bg-red-400'
              : isProcessing
                ? 'bg-celo-card border border-celo-border cursor-not-allowed opacity-60'
                : 'bg-celo-gold hover:brightness-110'
            }
          `}
        >
          {isProcessing
            ? <Loader2 size={32} className="text-white animate-spin" />
            : isRecording
              ? <Square size={28} className="text-white fill-white" />
              : <Mic size={32} className="text-black" />
          }
        </button>
      </div>

      <p className="mt-6 text-celo-muted text-sm">
        {stage === 'idle'       && 'Tap to describe an expense'}
        {stage === 'recording'  && (isReady ? 'Listening… tap to stop' : 'Starting mic…')}
        {stage === 'processing' && 'Transcribing…'}
      </p>

      {stage === 'idle' && (
        <p className="mt-2 text-celo-muted/50 text-xs max-w-xs text-center">
          Example: "Dinner was $120, split between me, Alice and Bob"
        </p>
      )}
    </div>
  );
}