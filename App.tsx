import React, { useState, useCallback } from 'react';
import HomePage from './components/HomePage';
import OptimizerPage from './components/OptimizerPage';
import Header from './components/Header';
import Footer from './components/Footer';
import PaywallModal from './components/PaywallModal';
import { GENERATION_LIMIT } from './constants';
import { Page, OptimizerTab } from './types';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [initialTab, setInitialTab] = useState<OptimizerTab>('product');
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [showCopyMessage, setShowCopyMessage] = useState<boolean>(false);

  const handleNavigateToOptimizer = (tab: OptimizerTab) => {
    setInitialTab(tab);
    setCurrentPage('optimizer');
  };

  const handleNavigateHome = () => {
    setCurrentPage('home');
  };

  const handleGenerationAttempt = useCallback(() => {
    if (generationCount >= GENERATION_LIMIT) {
      setShowPaywall(true);
      return false;
    }
    setGenerationCount(prev => prev + 1);
    return true;
  }, [generationCount]);

  const handleCopyToClipboard = () => {
    setShowCopyMessage(true);
    setTimeout(() => {
        setShowCopyMessage(false);
    }, 2000);
  };

  return (
    <div className="bg-white text-gray-800 flex flex-col items-center p-4 min-h-screen">
      <div className="container mx-auto bg-gray-100 rounded-2xl shadow-xl p-4 sm:p-8 mb-8 w-full max-w-4xl">
        <Header onLogoClick={handleNavigateHome} />
        <main id="main-content" className="space-y-12 mt-12">
          {currentPage === 'home' && (
            <HomePage
              onOptimizeProduct={() => handleNavigateToOptimizer('product')}
              onOptimizeCategory={() => handleNavigateToOptimizer('category')}
            />
          )}
          {currentPage === 'optimizer' && (
            <OptimizerPage 
              initialTab={initialTab}
              onGenerationAttempt={handleGenerationAttempt}
              onCopy={handleCopyToClipboard} 
            />
          )}
        </main>
      </div>
       <div 
        id="message-box"
        className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 ${showCopyMessage ? 'opacity-100' : 'opacity-0'}`}
      >
        Copied to clipboard!
      </div>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
