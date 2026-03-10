import { useState, useEffect } from 'react';
import { Code } from './lib/supabase';
import { Language, translations } from './lib/translations';
import CodeValidator from './components/CodeValidator';
import FileUploader from './components/FileUploader';
import AdminPanel from './components/AdminPanel';
import AdminLogin from './components/AdminLogin';
import { Settings, MessageCircle } from 'lucide-react';

function App() {
  const [language, setLanguage] = useState<Language>('en');
  const [validatedCode, setValidatedCode] = useState<Code | null>(null);
  const [isAdminRoute, setIsAdminRoute] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [showAdminButton, setShowAdminButton] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/admin') {
      setIsAdminRoute(true);
      const authenticated = sessionStorage.getItem('admin_authenticated');
      setIsAdminAuthenticated(authenticated === 'true');
    }
  }, []);

  const t = translations[language];

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAdminAuthenticated(false);
    window.location.href = '/';
  };

  const toggleAdminButton = () => {
    setShowAdminButton(!showAdminButton);
  };

  if (isAdminRoute) {
    if (!isAdminAuthenticated) {
      return <AdminLogin onLogin={handleAdminLogin} language={language} />;
    }
    return <AdminPanel language={language} onLogout={handleAdminLogout} />;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="fixed top-4 right-4 flex gap-2 z-50">
        <button
          onClick={toggleLanguage}
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200"
        >
          {language === 'en' ? 'AR' : 'EN'}
        </button>

        <button
          onClick={toggleAdminButton}
          className="bg-white hover:bg-gray-100 text-gray-800 p-2 rounded-lg shadow-lg transition duration-200"
          title={t.adminPanel}
        >
          <Settings size={24} />
        </button>

        {showAdminButton && (
          <a
            href="/admin"
            className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200"
          >
            Admin
          </a>
        )}
      </div>

      <div className="fixed top-4 left-4 z-50">
        <a
          href="https://discord.gg/txS89MEAu"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-lg shadow-lg transition duration-200 flex items-center gap-2"
        >
          <MessageCircle size={20} />
          {t.discord}
        </a>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {t.title}
          </h1>
          <div className="h-1 w-32 bg-white mx-auto rounded-full"></div>
        </div>

        <div className="flex justify-center items-center min-h-[400px]">
          {!validatedCode ? (
            <CodeValidator onValidCode={setValidatedCode} language={language} />
          ) : (
            <FileUploader codeData={validatedCode} language={language} />
          )}
        </div>
      </div>

      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-75">
        FIX HOLOPRINT © 2024
      </div>
    </div>
  );
}

export default App;
