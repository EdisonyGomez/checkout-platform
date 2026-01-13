export default function TopBar() {
  return (
    <header className="h-14 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-green-600 text-white flex items-center justify-center font-extrabold">
            W
          </div>
          <div className="font-bold text-slate-900">Wompi Store</div>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Secure Checkout
        </div>
      </div>
    </header>
  );
}
