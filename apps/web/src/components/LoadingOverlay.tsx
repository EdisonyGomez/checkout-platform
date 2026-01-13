export default function LoadingOverlay({
  show,
  title = 'Processing payment…',
  subtitle = 'Please wait, this may take a few seconds.',
}: {
  show: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="relative w-[92vw] max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-600 flex items-center justify-center">
            <div className="spinner" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-extrabold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
          </div>
        </div>

        <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full w-1/2 bg-green-600/70 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
