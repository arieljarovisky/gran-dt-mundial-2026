import { useState } from 'react';
import { resolveFlagUrl } from '../utils/flags';

interface FlagImageProps {
  flag?: string | null;
  teamCode?: string;
  className?: string;
  fallbackClassName?: string;
}

export default function FlagImage({ flag, teamCode, className = '', fallbackClassName = '' }: FlagImageProps) {
  const [failed, setFailed] = useState(false);
  const src = resolveFlagUrl(flag, teamCode);

  if (!src || failed) {
    return (
      <span className={`font-bold text-gray-400 ${fallbackClassName}`}>
        {teamCode || '?'}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
