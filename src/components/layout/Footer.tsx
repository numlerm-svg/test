import { SYSTEM_NAME, AI_ASSISTANT_NAME } from '../../config/policy';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:px-6">
        <p>{SYSTEM_NAME}</p>
        <p>Powered by {AI_ASSISTANT_NAME}</p>
      </div>
    </footer>
  );
}
