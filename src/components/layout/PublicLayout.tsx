import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <img
            src="/Jungo_logo_greenbrown_no_background.png"
            alt="Jungo Solutions"
            className="h-10 w-auto"
          />
          <div>
            <h1 className="text-lg font-semibold text-jungo-brown-700">Jungo Solutions</h1>
            <p className="text-xs text-gray-500">Schedule your appointment</p>
          </div>
        </div>
      </header>
      <main className="flex-1 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <Outlet />
        </div>
      </main>
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center text-sm text-gray-500">
          Powered by Jungo Solutions
        </div>
      </footer>
    </div>
  );
}
