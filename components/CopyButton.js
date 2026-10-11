'use client';
import { useState } from 'react';

export default function CopyButton({ text, label = '複製' }) {
  const [msg, setMsg] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('已複製');
    } catch {
      setMsg('請長按文字自行複製');
    }
    setTimeout(() => setMsg(''), 2500);
  }
  return (
    <button type="button" className="copy" onClick={copy}>
      {msg || label}
    </button>
  );
}
