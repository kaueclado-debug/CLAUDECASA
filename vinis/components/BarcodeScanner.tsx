"use client";

import { useEffect, useRef, useState } from "react";

type Props = { onDetect: (code: string) => void };

/** Lê EAN/UPC pela câmera. Usa o leitor nativo quando existe (Android) e o polyfill no iPhone. */
export default function BarcodeScanner({ onDetect }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;

    (async () => {
      try {
        const Detector =
          "BarcodeDetector" in window
            ? (window as unknown as { BarcodeDetector: typeof import("barcode-detector/ponyfill").BarcodeDetector })
                .BarcodeDetector
            : (await import("barcode-detector/ponyfill")).BarcodeDetector;
        const detector = new Detector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
          audio: false,
        });
        if (stopped) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        let last = 0;
        const tick = async (t: number) => {
          if (stopped || done.current) return;
          if (t - last > 250 && video.readyState >= 2) {
            last = t;
            try {
              const codes = await detector.detect(video);
              const code = codes[0]?.rawValue;
              if (code && !done.current) {
                done.current = true;
                navigator.vibrate?.(60);
                onDetect(code);
                return;
              }
            } catch {
              // Frame ilegível; tenta o próximo.
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch (err) {
        const name = (err as Error).name;
        setError(
          name === "NotAllowedError"
            ? "A câmera foi bloqueada. Libere o acesso nas configurações do navegador ou digite o código abaixo."
            : "Não deu para abrir a câmera neste aparelho. Digite o código abaixo.",
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetect]);

  if (error) return <p className="notice notice-error">{error}</p>;

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted />
      <div className="scanner-frame" aria-hidden="true" />
      <span className="visually-hidden" aria-live="polite">
        Aponte a câmera para o código de barras na contracapa.
      </span>
    </div>
  );
}
