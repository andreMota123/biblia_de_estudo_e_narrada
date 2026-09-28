import { useState } from "react";
import { HeadphonesIcon } from "../lib/icons";

type Props = {
  // Identifica o bloco: trocar de bloco volta ao botão "Ouvir".
  audioKey: string;
  src: string;
  rate: number;
  onStart: () => void;
};

// Botão "Ouvir comentário" e o player do áudio gerado sob demanda
// (/api/comentario-audio). Na primeira vez o servidor narra o bloco, o que
// leva de 15 s a 1 min; depois o áudio fica guardado e toca na hora.
export default function CommentaryAudioBox({ audioKey, src, rate, onStart }: Props) {
  const [state, setState] = useState<{ key: string; status: "loading" | "ready" | "error" } | null>(null);
  const active = state?.key === audioKey ? state : null;

  return (
    <div className="mb-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)]/60">
      {!active ? (
        <button
          onClick={() => {
            onStart();
            setState({ key: audioKey, status: "loading" });
          }}
          className="flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] px-3 py-1.5 rounded-lg"
        >
          <HeadphonesIcon /> Ouvir comentário
        </button>
      ) : (
        <div className="space-y-1.5">
          {active.status === "loading" && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Preparando o áudio… na primeira vez leva de 15 segundos a 1 minuto (comentários longos); depois fica
              guardado e toca na hora.
            </p>
          )}
          {active.status === "error" ? (
            <p className="text-[10px] text-[var(--danger)]">
              Não foi possível gerar o áudio agora.{" "}
              <button className="underline" onClick={() => setState({ key: audioKey, status: "loading" })}>
                Tentar de novo
              </button>
            </p>
          ) : (
            <audio
              key={audioKey}
              src={src}
              controls
              autoPlay
              preload="auto"
              className="w-full h-9"
              onCanPlay={() => setState({ key: audioKey, status: "ready" })}
              onPlay={(e) => {
                e.currentTarget.playbackRate = rate;
                onStart();
              }}
              onError={() => setState({ key: audioKey, status: "error" })}
            />
          )}
        </div>
      )}
    </div>
  );
}
