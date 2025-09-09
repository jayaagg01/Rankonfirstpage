import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES (from types.ts) ---
export type Page = 'home' | 'optimizer' | 'pricing';
export type OptimizerTab = 'product' | 'category';

export interface ProductContent {
  url: string;
  title: string;
  metaDescription: string;
  productDescription: string;
  faqs: { question: string; answer: string }[];
}

export interface CategoryContent {
  title: string;
  content: string;
  url: string;
  metaDescription: string;
  faqs: { question: string; answer: string }[];
}

export interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

export interface IconProps {
    className?: string;
}

// --- CONSTANTS (from constants.ts) ---
export const GENERATION_LIMIT = 20;

// --- ICONS (from components/icons/index.tsx) ---
const SearchCodeIcon: React.FC<IconProps> = ({ className = "w-8 h-8" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={`lucide lucide-search-code ${className}`}>
        <path d="m21 21-3.5-3.5" />
        <circle cx="11.5" cy="11.5" r="5.5" />
        <path d="m18 11.5 2-2L22 11.5" />
        <path d="m22 14-2 2-2-2" />
    </svg>
);

const LinkIcon: React.FC<IconProps> = ({ className = "w-12 h-12 text-yellow-500" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-link ${className}`}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L13 7" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07L11 17" />
    </svg>
);

const FileTextIcon: React.FC<IconProps> = ({ className = "w-12 h-12 text-yellow-500" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-file-text ${className}`}>
        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
        <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        <path d="M10 9H8" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
    </svg>
);

const HelpCircleIcon: React.FC<IconProps> = ({ className = "w-12 h-12 text-yellow-500" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-help-circle ${className}`}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.8 1c0 2-2 3-3 3" />
        <path d="M12 17h.01" />
    </svg>
);

const PackageIcon: React.FC<IconProps> = ({ className = "w-12 h-12 text-yellow-500" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-package ${className}`}>
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
    </svg>
);


// --- GEMINI SERVICE (from services/geminiService.ts) ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const productResponseSchema = {
  type: Type.OBJECT,
  properties: {
    url: { type: Type.STRING, description: "A short, SEO-friendly URL slug for the product." },
    title: { type: Type.STRING, description: "An SEO-optimized title for the product page and meta title." },
    metaDescription: { type: Type.STRING, description: "A compelling, keyword-optimized meta description (maximum 150 characters)." },
    productDescription: { type: Type.STRING, description: "A detailed, keyword-rich product description between 200 and 400 words, incorporating the product price." },
    faqs: {
      type: Type.ARRAY,
      description: "An array of frequently asked questions about the product.",
      items: {
        type: Type.OBJECT,
        properties: {
          question: { type: Type.STRING },
          answer: { type: Type.STRING },
        },
        required: ["question", "answer"],
      },
    },
  },
  required: ["url", "title", "metaDescription", "productDescription", "faqs"],
};

const categoryResponseSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "An SEO-optimized title for the category page and meta title." },
        content: { type: Type.STRING, description: "SEO-optimized content for the category page footer, summarizing the category and its products." },
        url: { type: Type.STRING, description: "A short, SEO-friendly URL slug for the category." },
        metaDescription: { type: Type.STRING, description: "A compelling meta description for the category page." },
        faqs: {
            type: Type.ARRAY,
            description: "An array of frequently asked questions about the product category.",
            items: {
                type: Type.OBJECT,
                properties: {
                    question: { type: Type.STRING },
                    answer: { type: Type.STRING },
                },
                required: ["question", "answer"],
            },
        },
    },
    required: ["title", "content", "url", "metaDescription", "faqs"],
};

const generateProductContent = async (
  productName: string,
  keywords: string,
  price: string
): Promise<ProductContent> => {
  const prompt = `
    You are an expert SEO specialist and content writer for D2C e-commerce brands.
    Your task is to generate optimized content for a product page.

    Product Name: "${productName}"
    Target Keywords: "${keywords}"
    Product Price: "${price || 'Not specified'}"

    Based on this information, generate the following content:
    1.  **URL Slug**: A short, SEO-friendly URL slug.
    2.  **Product Title / Meta Title**: An SEO-optimized title (under 60 characters).
    3.  **Meta Description**: A compelling, keyword-optimized meta description (strictly under 150 characters).
    4.  **Product Description**: A detailed, keyword-rich product description (between 200 and 400 words). Structure the content with **bold and large headings using Markdown** (e.g., \`## Key Benefits\`). Do not use hashtags or asterisks for bullet points; write in full paragraphs under the headings. Focus on highlighting the key benefits of the product for the customer. Ensure the entire text is optimized with the target keywords. If the price is provided, naturally incorporate it. **Important: Do not use any star emojis (e.g., ⭐) or star ratings in the description.**
    5.  **FAQs**: 3-5 frequently asked questions and their answers related to the product.

    Return the content in a valid JSON format according to the provided schema.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: productResponseSchema,
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating product content:", error);
    throw new Error("Failed to generate product content from Gemini API.");
  }
};

const generateCategoryContent = async (
  categoryKeywords: string,
  productDetails: string
): Promise<CategoryContent> => {
  const prompt = `
    You are an expert SEO specialist and content writer for D2C e-commerce brands.
    Your task is to generate optimized content for a category page.

    Category Keywords: "${categoryKeywords}"
    Products in this category:
    ${productDetails}

    Based on this information, generate the following content:
    1.  **URL Slug**: A short, SEO-friendly URL slug for the category.
    2.  **Category Title / Meta Title**: An SEO-optimized title for the page (under 60 characters).
    3.  **Meta Description**: A compelling meta description (under 160 characters).
    4.  **Category Page Footer Content**: A highly detailed, long-form article for the category page footer, with a strict minimum word count of **10,000 words**. The entire article must be keyword-rich, maintaining an approximate **1% keyword density** with the provided keywords. Structure the content with **bold and large headings using Markdown** (e.g., \`## Explore Our Collection\`). It should comprehensively introduce the category, highlight its benefits in detail, and must include a well-structured Markdown table of the products provided. Write in full paragraphs under the headings.
    5.  **FAQs**: 3-5 frequently asked questions and their answers related to this product category.

    Return the content in a valid JSON format according to the provided schema.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: categoryResponseSchema,
      },
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error generating category content:", error);
    throw new Error("Failed to generate category content from Gemini API.");
  }
};


// --- UI COMPONENTS ---

const Spinner: React.FC = () => (
    <div className="flex justify-center items-center py-8">
        <div 
            className="w-8 h-8 border-4 border-gray-300 border-t-yellow-500 rounded-full animate-spin"
        ></div>
        <p className="ml-4 text-xl">Generating content...</p>
    </div>
);

const Footer: React.FC = () => (
    <footer className="text-center text-sm text-gray-500 pt-12">
        <p>&copy; 2024 Rankonfirstpage. Built for D2C brands who want to dominate search results.</p>
    </footer>
);

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => (
    <div className="bg-gray-200 p-6 rounded-xl shadow-inner text-center space-y-4">
        <div className="flex justify-center">{icon}</div>
        <h4 className="text-xl font-semibold">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
    </div>
);

interface OutputBlockProps {
  title: string;
  content: string;
  rows: number;
  onCopy: () => void;
  renderMarkdown?: boolean;
}

const OutputBlock: React.FC<OutputBlockProps> = ({ title, content, rows, onCopy, renderMarkdown = false }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    onCopy();
  };

  const simpleMarkdownToHtml = (markdown: string): string => {
    return markdown
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-3 mb-1">$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  };

  return (
    <div className="bg-gray-200 p-6 rounded-xl shadow-inner">
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <div className="flex items-start flex-col sm:flex-row sm:space-x-4">
        {renderMarkdown ? (
          <div
            className="flex-grow w-full p-3 rounded-lg bg-white text-gray-800 prose max-w-none"
            style={{ minHeight: `${rows * 1.5}rem`, overflowY: 'auto' }}
            dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(content) }}
          />
        ) : (
          <textarea
            value={content}
            className="flex-grow p-3 rounded-lg bg-white text-gray-800 w-full"
            rows={rows}
            readOnly
          />
        )}
        <div className="w-full sm:w-auto mt-2 sm:mt-0 flex-shrink-0 self-center">
          <button
            onClick={handleCopy}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition-colors w-full sm:w-auto"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
};

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const PaywallModal: React.FC<PaywallModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md mx-4">
        <h2 className="text-3xl font-bold mb-4 text-yellow-600">Unlock Unlimited Generations</h2>
        <p className="mb-6 text-gray-600">
          You've reached your free generation limit. Upgrade to a paid plan to continue using this powerful SEO tool without limits.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <button onClick={onUpgrade} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-full transition-colors duration-200 w-full sm:w-auto">
              Upgrade Now
            </button>
            <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-8 rounded-full transition-colors duration-200 w-full sm:w-auto">
              Maybe Later
            </button>
        </div>
      </div>
    </div>
  );
};

interface PayPalButtonProps {
  amount: string;
  onSuccess: () => void;
}

declare global {
    interface Window { paypal: any; }
}

const PayPalButton: React.FC<PayPalButtonProps> = ({ amount, onSuccess }) => {
    const paypalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Ensure the PayPal SDK is loaded and the ref is available.
        if (!window.paypal || !window.paypal.Buttons || !paypalRef.current) {
            return;
        }

        const container = paypalRef.current;
        
        // Create the button instance.
        const buttons = window.paypal.Buttons({
            createOrder: (_: any, actions: any) => {
                return actions.order.create({
                    purchase_units: [{
                        amount: { value: amount, currency_code: 'USD' }
                    }]
                });
            },
            onApprove: async (_: any, actions: any) => {
                await actions.order.capture();
                onSuccess();
            },
            onError: (err: any) => {
                console.error("PayPal SDK Error:", err);
            }
        });

        // Render the button into our container.
        buttons.render(container).catch((err: any) => {
            console.error("Failed to render PayPal button:", err);
        });

        // This cleanup function is crucial. It's called when the component unmounts
        // or when the dependencies (amount, onSuccess) change.
        return () => {
            // Use the official .close() method to safely destroy the button.
            buttons.close().catch(() => { /* Suppress errors on close */ });
        };
    }, [amount, onSuccess]); // Correctly declare dependencies.

    return <div ref={paypalRef} className="w-full max-w-xs z-0 relative" />;
};


interface HeaderProps {
    onLogoClick: () => void;
    onNavigateToPricing: () => void;
    isPremium: boolean;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, onNavigateToPricing, isPremium }) => (
    <header className="flex flex-col sm:flex-row justify-between items-center">
        <div className="flex items-center space-x-2 cursor-pointer" onClick={onLogoClick}>
            <SearchCodeIcon className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-yellow-600">Rankonfirstpage</h1>
        </div>
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {!isPremium && (
                <button onClick={onNavigateToPricing} className="text-sm font-semibold px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white transition-colors">
                    Go Premium
                </button>
            )}
            <p className={`text-sm font-semibold px-4 py-2 rounded-full ${isPremium ? 'bg-green-400 text-gray-900' : 'bg-yellow-400 text-gray-900'}`}>
                {isPremium ? 'Premium Account' : 'For D2C Brands'}
            </p>
        </div>
    </header>
);

interface ProductOptimizerProps {
  onGenerationAttempt: () => boolean;
  onCopy: () => void;
}

const ProductOptimizer: React.FC<ProductOptimizerProps> = ({ onGenerationAttempt, onCopy }) => {
  const [productName, setProductName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<ProductContent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim() || !keywords.trim()) {
      setError('Please fill out both product name and keywords.');
      return;
    }
    if (!onGenerationAttempt()) return;

    setIsLoading(true);
    setError(null);
    setContent(null);

    try {
      const result = await generateProductContent(productName, keywords, price);
      setContent(result);
    } catch (err) {
      setError('Failed to generate content. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatFaqs = (faqs: { question: string; answer: string }[]): string => {
    return faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');
  };

  return (
    <div className="space-y-8">
      <div className="bg-gray-200 p-6 rounded-xl shadow-inner">
        <h2 className="text-2xl font-bold mb-4 text-center">Generate Product Page Content</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="productName" className="block text-sm font-medium mb-1">Product Name</label>
            <input type="text" id="productName" value={productName} onChange={(e) => setProductName(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="keywords" className="block text-sm font-medium mb-1">Keywords (e.g., organic, vegan, cruelty-free)</label>
            <input type="text" id="keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="productPrice" className="block text-sm font-medium mb-1">Product Price (e.g., $19.99)</label>
            <input type="text" id="productPrice" value={price} onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50" />
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="flex justify-center pt-2">
            <button type="submit" disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isLoading ? 'Generating...' : 'Generate Product Content'}
            </button>
          </div>
        </form>
      </div>
      {isLoading && <Spinner />}
      {content && (
        <div id="output-section-product" className="space-y-6 animate-fade-in">
          <OutputBlock title="Optimized URL" content={content.url} rows={1} onCopy={onCopy} />
          <OutputBlock title="Product Title / Meta Title" content={content.title} rows={2} onCopy={onCopy} />
          <OutputBlock title="Meta Description" content={content.metaDescription} rows={3} onCopy={onCopy} />
          <OutputBlock title="Product Description" content={content.productDescription} rows={12} onCopy={onCopy} renderMarkdown={true} />
          <OutputBlock title="FAQs" content={formatFaqs(content.faqs)} rows={10} onCopy={onCopy} />
        </div>
      )}
    </div>
  );
};

interface CategoryOptimizerProps {
  onGenerationAttempt: () => boolean;
  onCopy: () => void;
}

const CategoryOptimizer: React.FC<CategoryOptimizerProps> = ({ onGenerationAttempt, onCopy }) => {
  const [categoryKeywords, setCategoryKeywords] = useState('');
  const [productNames, setProductNames] = useState('');
  const [productPrices, setProductPrices] = useState('');
  const [productLinks, setProductLinks] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<CategoryContent | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryKeywords.trim() || !productNames.trim()) {
      setError('Please fill out category keywords and at least one product name.');
      return;
    }
    if (!onGenerationAttempt()) return;

    setIsLoading(true);
    setError(null);
    setContent(null);

    const names = productNames.split('\n');
    const prices = productPrices.split('\n');
    const links = productLinks.split('\n');
    const productDetails = names.map((name, index) => 
        `- ${name.trim()} (Price: ${prices[index]?.trim() || 'N/A'}, Link: ${links[index]?.trim() || '#'})`
    ).join('\n');

    try {
      const result = await generateCategoryContent(categoryKeywords, productDetails);
      setContent(result);
    } catch (err) {
      setError('Failed to generate content. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatFaqs = (faqs: { question: string; answer: string }[]): string => {
    return faqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n');
  };

  return (
    <div className="space-y-8">
      <div className="bg-gray-200 p-6 rounded-xl shadow-inner">
        <h2 className="text-2xl font-bold mb-4 text-center">Generate Category Page Content</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="categoryKeywords" className="block text-sm font-medium mb-1">Keywords for Category Page</label>
            <input type="text" id="categoryKeywords" value={categoryKeywords} onChange={(e) => setCategoryKeywords(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50" />
          </div>
          <div>
            <label htmlFor="productNames" className="block text-sm font-medium mb-1">Product Names (one per line)</label>
            <textarea id="productNames" value={productNames} onChange={(e) => setProductNames(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50"
              rows={4} placeholder="e.g.&#10;Organic Green Tea&#10;Herbal Chamomile Tea"></textarea>
          </div>
          <div>
            <label htmlFor="productPrices" className="block text-sm font-medium mb-1">Prices (one per line, matching order)</label>
            <textarea id="productPrices" value={productPrices} onChange={(e) => setProductPrices(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50"
              rows={4} placeholder="e.g.&#10;$12.99&#10;$9.50"></textarea>
          </div>
          <div>
            <label htmlFor="productLinks" className="block text-sm font-medium mb-1">Product Page Links (one per line, matching order)</label>
            <textarea id="productLinks" value={productLinks} onChange={(e) => setProductLinks(e.target.value)}
              className="w-full p-3 rounded-lg bg-white text-gray-800 border border-gray-400 focus:border-yellow-600 focus:ring focus:ring-yellow-600 focus:ring-opacity-50"
              rows={4} placeholder="e.g.&#10;https://example.com/green-tea&#10;https://example.com/chamomile-tea"></textarea>
          </div>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <div className="flex justify-center pt-2">
            <button type="submit" disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isLoading ? 'Generating...' : 'Generate Category Content'}
            </button>
          </div>
        </form>
      </div>
      {isLoading && <Spinner />}
      {content && (
        <div id="output-section-category" className="space-y-6 animate-fade-in">
          <OutputBlock title="Optimized Category URL" content={content.url} rows={1} onCopy={onCopy} />
          <OutputBlock title="Category page title / Meta title" content={content.title} rows={2} onCopy={onCopy} />
          <OutputBlock title="Meta Description" content={content.metaDescription} rows={3} onCopy={onCopy} />
          <OutputBlock title="Category page footer content" content={content.content} rows={20} onCopy={onCopy} renderMarkdown={true} />
          <OutputBlock title="FAQs" content={formatFaqs(content.faqs)} rows={10} onCopy={onCopy} />
        </div>
      )}
    </div>
  );
};

interface OptimizerPageProps {
  initialTab: OptimizerTab;
  onGenerationAttempt: () => boolean;
  onCopy: () => void;
}

const OptimizerPage: React.FC<OptimizerPageProps> = ({ initialTab, onGenerationAttempt, onCopy }) => {
  const [activeTab, setActiveTab] = useState<OptimizerTab>(initialTab);
  const getTabClass = (tabName: OptimizerTab) => `tab-button px-6 py-3 font-semibold text-lg rounded-full transition-colors duration-200 border border-transparent hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 ${activeTab === tabName ? 'bg-slate-200 border-gray-400' : ''}`;
  return (
    <div id="optimizer-pages" className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-4 mb-8">
        <button onClick={() => setActiveTab('product')} className={getTabClass('product')}>
          Product Page Optimizer
        </button>
        <button onClick={() => setActiveTab('category')} className={getTabClass('category')}>
          Category Page Optimizer
        </button>
      </div>
      <div>
        {activeTab === 'product' && <ProductOptimizer onGenerationAttempt={onGenerationAttempt} onCopy={onCopy} />}
        {activeTab === 'category' && <CategoryOptimizer onGenerationAttempt={onGenerationAttempt} onCopy={onCopy} />}
      </div>
    </div>
  );
};

interface HomePageProps {
  onOptimizeProduct: () => void;
  onOptimizeCategory: () => void;
}

const HomePage: React.FC<HomePageProps> = ({ onOptimizeProduct, onOptimizeCategory }) => (
    <div id="home-page" className="text-center space-y-12">
      <div className="space-y-6">
        <p className="text-sm font-semibold text-yellow-600 tracking-wide uppercase">Professional SEO Tools</p>
        <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
          Optimize Your D2C Store for <span className="text-purple-600">Maximum Visibility</span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Generate keyword-optimized content for your product and category pages. Boost your search rankings and drive more organic traffic to your store.
        </p>
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
          <button onClick={onOptimizeProduct} className="bg-gray-900 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 w-full sm:w-auto">
            Optimize Product Pages
          </button>
          <button onClick={onOptimizeCategory} className="bg-gray-900 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 w-full sm:w-auto">
            Optimize Category Pages
          </button>
        </div>
      </div>
      <div className="space-y-8 pt-8">
        <div className="text-center space-y-2">
          <h3 className="text-3xl sm:text-4xl font-bold">Everything You Need for SEO Success</h3>
          <p className="text-gray-600 max-w-3xl mx-auto">Our AI-powered tools generate optimized content that helps your products rank higher in search results.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <FeatureCard icon={<LinkIcon />} title="SEO-Optimized URLs" description="Generate clean, keyword-rich URLs that search engines love and users can easily remember." />
          <FeatureCard icon={<FileTextIcon />} title="Meta Optimization" description="Create compelling meta titles and descriptions that improve click-through rates from search results." />
          <FeatureCard icon={<HelpCircleIcon />} title="Smart FAQs" description="Generate relevant FAQs that answer customer questions and capture long-tail keyword traffic." />
          <FeatureCard icon={<PackageIcon />} title="Product Descriptions" description="Create detailed, keyword-optimized product descriptions that convert visitors into customers." />
        </div>
      </div>
      <Footer />
    </div>
);

interface PricingPageProps {
    onPaymentSuccess: () => void;
}

const PricingPage: React.FC<PricingPageProps> = ({ onPaymentSuccess }) => (
    <div id="pricing-page" className="text-center space-y-12">
        <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight">
                Unlock <span className="text-purple-600">Unlimited SEO Power</span>
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose a plan that fits your needs and get unlimited access to our AI-powered content generation tools. Supercharge your D2C brand's SEO today.
            </p>
        </div>
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="bg-gray-200 p-8 rounded-xl shadow-inner flex flex-col items-center space-y-6">
                <h3 className="text-2xl font-bold">Monthly Plan</h3>
                <p className="text-4xl font-extrabold">$69<span className="text-lg font-medium text-gray-500">/month</span></p>
                <p className="text-gray-600">Billed monthly, cancel anytime.</p>
                <PayPalButton amount="69.00" onSuccess={onPaymentSuccess} />
            </div>
            <div className="bg-gray-200 p-8 rounded-xl shadow-inner flex flex-col items-center space-y-6">
                <h3 className="text-2xl font-bold">Yearly Plan</h3>
                <p className="text-4xl font-extrabold">$80<span className="text-lg font-medium text-gray-500">/year</span></p>
                <p className="text-gray-600">Get the best value with yearly billing.</p>
                <PayPalButton amount="80.00" onSuccess={onPaymentSuccess} />
            </div>
        </div>
        <Footer />
    </div>
);


// --- MAIN APP COMPONENT (from App.tsx) ---
const App = () => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [initialTab, setInitialTab] = useState<OptimizerTab>('product');
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);
  const [showCopyMessage, setShowCopyMessage] = useState<boolean>(false);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPaymentSuccessMessage, setShowPaymentSuccessMessage] = useState<boolean>(false);

  const handleNavigateToOptimizer = (tab: OptimizerTab) => {
    setInitialTab(tab);
    setCurrentPage('optimizer');
  };

  const handleNavigateHome = () => setCurrentPage('home');
  const handleNavigateToPricing = () => setCurrentPage('pricing');

  const handlePaymentSuccess = useCallback(() => {
    setIsPremium(true);
    setCurrentPage('optimizer');
    setShowPaymentSuccessMessage(true);
    setTimeout(() => setShowPaymentSuccessMessage(false), 3000);
  }, []);

  const handleGenerationAttempt = useCallback(() => {
    if (isPremium) return true;
    if (generationCount >= GENERATION_LIMIT) {
      setShowPaywall(true);
      return false;
    }
    setGenerationCount(prev => prev + 1);
    return true;
  }, [generationCount, isPremium]);

  const handleCopyToClipboard = () => {
    setShowCopyMessage(true);
    setTimeout(() => setShowCopyMessage(false), 2000);
  };

  return (
    <div className="bg-white text-gray-800 flex flex-col items-center p-4 min-h-screen">
      <div className="container mx-auto bg-gray-100 rounded-2xl shadow-xl p-4 sm:p-8 mb-8 w-full max-w-4xl">
        <Header 
            onLogoClick={handleNavigateHome} 
            onNavigateToPricing={handleNavigateToPricing}
            isPremium={isPremium} 
        />
        <main id="main-content" className="space-y-12 mt-12">
          {currentPage === 'home' && <HomePage onOptimizeProduct={() => handleNavigateToOptimizer('product')} onOptimizeCategory={() => handleNavigateToOptimizer('category')} />}
          {currentPage === 'optimizer' && <OptimizerPage initialTab={initialTab} onGenerationAttempt={handleGenerationAttempt} onCopy={handleCopyToClipboard} />}
          {currentPage === 'pricing' && <PricingPage onPaymentSuccess={handlePaymentSuccess} />}
        </main>
      </div>
      <div id="message-box" className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 ${showCopyMessage ? 'opacity-100' : 'opacity-0'}`}>
        Copied to clipboard!
      </div>
      <div id="payment-success-message" className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg transition-all duration-300 ${showPaymentSuccessMessage ? 'opacity-100' : 'opacity-0'}`}>
        Payment Successful! Welcome to Premium.
      </div>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} onUpgrade={() => { setShowPaywall(false); handleNavigateToPricing(); }} />
    </div>
  );
};


// --- RENDER LOGIC (from original index.tsx) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
