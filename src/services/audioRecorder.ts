/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface AudioRecordResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationMs: number;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private startTime = 0;
  private isRecording = false;

  static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof window.MediaRecorder === 'function'
    );
  }

  static getSupportedMimeType(): string {
    if (typeof MediaRecorder === 'undefined') return 'audio/webm';
    const candidateTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav',
    ];
    for (const type of candidateTypes) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  }

  async start(): Promise<void> {
    if (this.isRecording) {
      this.cancel();
    }

    this.audioChunks = [];
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = AudioRecorder.getSupportedMimeType();
    const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
    this.mediaRecorder = new MediaRecorder(this.mediaStream, options);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.isRecording = true;
    this.mediaRecorder.start(250); // collect in 250ms slices
  }

  stop(): Promise<AudioRecordResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('Recorder is not active'));
        return;
      }

      const recorder = this.mediaRecorder;
      const durationMs = Date.now() - this.startTime;

      recorder.onstop = async () => {
        try {
          const mimeType = recorder.mimeType || AudioRecorder.getSupportedMimeType() || 'audio/webm';
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });

          // Convert blob to pure base64 (without data url prefix)
          const base64 = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              // Extract base64 portion
              const base64Data = result.split(',')[1] || '';
              res(base64Data);
            };
            reader.onerror = rej;
            reader.readAsDataURL(audioBlob);
          });

          this.cleanup();
          resolve({
            blob: audioBlob,
            base64,
            mimeType,
            durationMs,
          });
        } catch (err) {
          this.cleanup();
          reject(err);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  cancel(): void {
    if (this.mediaRecorder && this.isRecording) {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.cleanup();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
