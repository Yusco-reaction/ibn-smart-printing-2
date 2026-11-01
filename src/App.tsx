/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useId, useRef } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Search,
  QrCode,
  Code,
  FileText,
  Image as ImageIcon,
  Printer,
  ArrowLeft,
  Signal,
  Wifi,
  Battery,
  CheckCircle2,
  Clock,
  CreditCard,
  Trash2,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Upload,
  Eye,
  X,
  FileCheck,
  Sparkles,
  Phone,
  HelpCircle,
  Zap,
  Plus,
  Files,
  Layers,
  DollarSign,
  Search,
} from 'lucide-react';
import { ImagePrintStudio } from './components/ImagePrintStudio.tsx';
import { AdminDjangoDashboard } from './components/AdminDjangoDashboard.tsx';
import { PythonSourceCodeHub } from './components/PythonSourceCodeHub.tsx';
import { QrPosterModal } from './components/QrPosterModal.tsx';
import { DocumentSetupCard } from './components/DocumentSetupCard.tsx';
import {
  Language,
  PrintJob,
  EpsonPrinterStatus,
  PricingRates,
  JobStatus,
  PrintSettings,
  PaperSize,
  ColorMode,
  PaymentMethod,
  DocumentItem,
} from './types/index.ts';
import { INITIAL_JOBS, INITIAL_PRINTER_STATUS, SAMPLE_DOCUMENTS } from './utils/dummyData.ts';
import {
  DEFAULT_PRICING_RATES,
  calculatePrintPrice,
  calculateDocumentsTotal,
  formatTZS,
  getSheetPrice,
  SHEET_PRICE_TABLE,
} from './utils/pricing.ts';
import { translations } from './utils/translations.ts';

// Explicit 5-step Mobile Flow Requested by User
type MobileStep =
  | 'step1_welcome'
  | 'step_prices'
  | 'step_track'
  | 'step2_service_choice'
  | 'step3_document_and_settings'
  | 'step4_payment_choice'
  | 'step5_job_final_summary';

export default function App() {
  const [lang, setLang] = useState<Language>('sw');
  const [currentTab, setCurrentTab] = useState<'customer' | 'admin' | 'poster' | 'code'>('customer');
  const [mobileStep, setMobileStep] = useState<MobileStep>('step1_welcome');
  const [trackJobId, setTrackJobId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackResult, setTrackResult] = useState<PrintJob | 'notfound' | null>(null);
  const handleTrackJob = () => {
    const digits = (v: string) => v.replace(/\D/g, '').slice(-9);
    const found = jobs.find(
      (j) => j.id.toLowerCase() === trackJobId.trim().toLowerCase() && digits(j.customerPhone) === digits(trackPhone)
    );
    setTrackResult(found || 'notfound');
  };
  const statusLabel = (st: string) => {
    const sw: Record<string, [string, string]> = {
      uploaded: ['Pending (Imepokelewa)', 'bg-amber-100 text-amber-800'],
      awaiting_payment: ['Awaiting (Inasubiri malipo)', 'bg-amber-100 text-amber-800'],
      payment_confirmed: ['Malipo yamethibitishwa', 'bg-blue-100 text-blue-800'],
      queued: ['Pending (Kwenye foleni)', 'bg-amber-100 text-amber-800'],
      printing: ['Inachapishwa sasa', 'bg-blue-100 text-blue-800'],
      completed: ['Tayari (Completed)', 'bg-emerald-100 text-emerald-800'],
      failed: ['Imeshindikana', 'bg-rose-100 text-rose-800'],
      cancelled: ['Imefutwa', 'bg-slate-200 text-slate-700'],
    };
    return sw[st] || [st, 'bg-slate-100 text-slate-700'];
  };
  const [serviceType, setServiceType] = useState<'document' | 'image'>('document');
  const [studioKey, setStudioKey] = useState(0);

  // Application Data State
  const [jobs, setJobs] = useState<PrintJob[]>(INITIAL_JOBS);
  const [printerStatus, setPrinterStatus] = useState<EpsonPrinterStatus>(INITIAL_PRINTER_STATUS);
  const [pricingRates, setPricingRates] = useState<PricingRates>(DEFAULT_PRICING_RATES);
  const [activeJobId, setActiveJobId] = useState<string>(INITIAL_JOBS[0].id);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Active Multi-Document State
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('Baraka Juma');
  const [customerPhone, setCustomerPhone] = useState('0754 889 900');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('counter');
  const [mobileNetwork, setMobileNetwork] = useState<'mpesa' | 'tigopesa' | 'airtelmoney' | 'halopesa'>('mpesa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper to build a DocumentItem with default settings and initial calculation
  const buildDocumentItem = (
    name: string,
    sizeBytes: number,
    type: string,
    pageCount: number,
    previewUrl?: string
  ): DocumentItem => {
    const defaultSettings: PrintSettings = {
      colorMode: 'bw',
      paperSize: 'A4',
      copies: 1,
      pageRangeMode: 'all',
      customPageRange: '',
      orientation: 'portrait',
      scaling: 'fit',
      quality: 'standard',
      isManualDuplex: false,
      manualDuplexConfirmed: false,
      bindingOrStapling: 'none',
    };

    const calc = calculatePrintPrice(defaultSettings, pageCount, pricingRates, name);

    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name,
      sizeBytes,
      type,
      pageCount: Math.max(1, pageCount),
      previewUrl,
      settings: defaultSettings,
      calculation: calc,
    };
  };

  // Multi-file upload handler
  const handleAddFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setErrorMessage(null);
    const newItems: DocumentItem[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage(
          lang === 'sw'
            ? `Faili "${file.name}" limezidi 50MB. Halijaongezwa.`
            : `File "${file.name}" exceeds 50MB limit.`
        );
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      let estimatedPages = 1;
      if (ext === 'pdf') {
        estimatedPages = Math.max(1, Math.round(file.size / (180 * 1024)));
      } else if (ext === 'docx' || ext === 'doc') {
        estimatedPages = Math.max(1, Math.round(file.size / (120 * 1024)));
      } else if (ext === 'xlsx' || ext === 'xls') {
        estimatedPages = Math.max(1, Math.round(file.size / (90 * 1024)));
      } else {
        estimatedPages = 1;
      }

      const item = buildDocumentItem(
        file.name,
        file.size,
        file.type || (serviceType === 'document' ? 'application/pdf' : 'image/jpeg'),
        estimatedPages,
        URL.createObjectURL(file)
      );
      newItems.push(item);
    }

    if (newItems.length > 0) {
      setDocuments((prev) => {
        const next = [...prev, ...newItems];
        if (!activeDocId) {
          setActiveDocId(newItems[0].id);
        }
        return next;
      });
      showNotification(
        lang === 'sw'
          ? `Mafaili ${newItems.length} yameongezwa kwa ufanisi!`
          : `${newItems.length} file(s) added!`,
        'success'
      );
    }

    // Reset input value so the same file can be selected again if needed
    e.target.value = '';
  };

  // Sample document quick-add
  const handleSelectSample = (sample: typeof SAMPLE_DOCUMENTS[0]) => {
    const item = buildDocumentItem(
      sample.name,
      sample.sizeBytes,
      sample.type,
      sample.pageCount
    );
    setDocuments((prev) => {
      const next = [...prev, item];
      setActiveDocId(item.id);
      return next;
    });
    setErrorMessage(null);
  };

  // Update settings for an individual document
  const handleUpdateDocSettings = (docId: string, newSettings: Partial<PrintSettings>) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== docId) return doc;
        const updatedSettings: PrintSettings = { ...doc.settings, ...newSettings };
        const updatedCalc = calculatePrintPrice(
          updatedSettings,
          doc.pageCount,
          pricingRates,
          doc.name
        );
        return {
          ...doc,
          settings: updatedSettings,
          calculation: updatedCalc,
        };
      })
    );
  };

  // Remove a document
  const handleRemoveDoc = (docId: string) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== docId);
      if (activeDocId === docId && filtered.length > 0) {
        setActiveDocId(filtered[0].id);
      } else if (filtered.length === 0) {
        setActiveDocId(null);
      }
      return filtered;
    });
  };

  // Order-wide cumulative totals
  const orderTotals = calculateDocumentsTotal(documents);

  // Step 4 to Step 5: Final Submission (Chapisha Sasa)
  const handleExecutePrint = () => {
    if (documents.length === 0) {
      setErrorMessage(lang === 'sw' ? 'Tafadhali pakia faili kwanza.' : 'Please upload at least one file.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      setErrorMessage(lang === 'sw' ? 'Weka jina lako na namba ya simu.' : 'Please enter your name and phone.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const year = new Date().getFullYear();
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const newJobId = `IBN-${year}-${randomId}`;

      const primaryDoc = documents[0];
      const combinedBreakdowns = documents.flatMap((d) => d.calculation.breakdown);

      const newJob: PrintJob = {
        id: newJobId,
        accessToken: `sec_${Math.random().toString(36).substring(2, 11)}`,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        fileName:
          documents.length === 1
            ? primaryDoc.name
            : `${documents.length} Mafaili: ${documents.map((d) => d.name).join(', ')}`,
        fileSizeBytes: documents.reduce((sum, d) => sum + d.sizeBytes, 0),
        fileType: documents.length === 1 ? primaryDoc.type : 'application/pdf',
        pageCount: orderTotals.totalSelectedPages,
        files: [...documents],
        settings: { ...primaryDoc.settings },
        pricing: {
          totalSelectedPages: orderTotals.totalSelectedPages,
          totalPagesToPrint: orderTotals.totalSheetsToPrint,
          basePricePerPage: primaryDoc.calculation.basePricePerPage,
          paperMultiplier: 1.0,
          printingCost: orderTotals.grandTotalTZS,
          finishingCost: 0,
          discountAmount: 0,
          totalTZS: orderTotals.grandTotalTZS,
          breakdown: combinedBreakdowns,
        },
        paymentMethod: paymentMethod === 'counter' ? 'counter' : mobileNetwork,
        paymentStatus: paymentMethod === 'counter' ? 'counter_pending' : 'completed',
        paymentReference:
          paymentMethod === 'counter'
            ? undefined
            : `${mobileNetwork.toUpperCase()}-TZ-${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: paymentMethod === 'counter' ? 'awaiting_payment' : 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        printerAssigned: 'EPSON L3250 Series (Wi-Fi)',
      };

      setJobs([newJob, ...jobs]);
      setActiveJobId(newJobId);
      setIsSubmitting(false);
      setMobileStep('step5_job_final_summary');
      showNotification(
        lang === 'sw'
          ? `Kazi ${newJobId} imewasilishwa kwa ufanisi!`
          : `Job ${newJobId} submitted successfully!`,
        'success'
      );
    }, 700);
  };

  // Reset to start new print
  const handleStartNewPrint = () => {
    setStudioKey((k) => k + 1);
    setDocuments([]);
    setActiveDocId(null);
    setErrorMessage(null);
    setMobileStep('step1_welcome');
  };

  // Delete Job
  const handleDeleteJob = (jobId: string) => {
    setJobs(jobs.filter((j) => j.id !== jobId));
    setShowDeleteConfirmModal(false);
    showNotification(
      lang === 'sw' ? `Kazi ${jobId} imefutwa kwenye mfumo.` : `Job ${jobId} deleted.`,
      'info'
    );
    handleStartNewPrint();
  };

  // Admin status update handler
  const handleUpdateJobStatus = (jobId: string, status: JobStatus) => {
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, status, updatedAt: new Date().toISOString() } : j))
    );
  };

  const handleApproveCounterPayment = (jobId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? {
              ...j,
              paymentStatus: 'completed',
              status: 'queued',
              paymentReference: 'COUNTER-CASH-ADMIN',
              updatedAt: new Date().toISOString(),
            }
          : j
      )
    );
  };

  const currentSummaryJob = jobs.find((j) => j.id === activeJobId) || jobs[0];
  const t = translations[lang];

  // =========================================================================
  // 1. ADMIN DASHBOARD: FULL WIDESCREEN DESKTOP MODE (AS SPECIFIED)
  // =========================================================================
  if (currentTab === 'admin') {
    return (
      <div className="min-h-screen bg-slate-100 font-sans w-full">
        <AdminDjangoDashboard
          lang={lang}
          jobs={jobs}
          printerStatus={printerStatus}
          pricingRates={pricingRates}
          onUpdatePricing={setPricingRates}
          onUpdateJobStatus={handleUpdateJobStatus}
          onApproveCounterPayment={handleApproveCounterPayment}
          onBackToCustomerPortal={() => setCurrentTab('customer')}
        />
      </div>
    );
  }

  // =========================================================================
  // 2. PYTHON SOURCE CODE HUB: FULL WIDESCREEN DESKTOP MODE
  // =========================================================================
  if (currentTab === 'code') {
    return (
      <div className="min-h-screen bg-slate-900 font-sans p-6 text-white w-full">
        <div className="max-w-6xl mx-auto mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentTab('customer')}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>📱 Rudi kwenye Tovuti ya Wateja (Simu)</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTab('admin')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-2 border border-emerald-600 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>🛡️ Fungua Django Admin (Desktop)</span>
          </button>
        </div>
        <PythonSourceCodeHub lang={lang} />
      </div>
    );
  }

  // =========================================================================
  // 3. COUNTER QR POSTER (PRINTABLE)
  // =========================================================================
  if (currentTab === 'poster') {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <div className="max-w-4xl mx-auto mb-4 flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentTab('customer')}
            className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>📱 Rudi kwenye Simu</span>
          </button>
        </div>
        <QrPosterModal lang={lang} />
      </div>
    );
  }

  // =========================================================================
  // 4. CUSTOMER MULTI-PAGE FLOW: MOBILE VIEW FORMAT
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-200/90 flex flex-col items-center justify-start sm:py-6 sm:px-4 font-sans selection:bg-teal-600 selection:text-white">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 z-50 p-3.5 rounded-xl shadow-xl text-xs font-bold flex items-center gap-2 bg-slate-900 text-white border border-slate-700 animate-in slide-in-from-top-4">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Smartphone Chassis Container (max-w-md for Mobile Layout) */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen sm:min-h-[880px] sm:rounded-[36px] sm:shadow-2xl sm:border sm:border-slate-300 flex flex-col overflow-hidden relative">
        
        {/* Smartphone Top Status Bar */}
        <div className="bg-[#0b1e33] text-white px-5 py-2 flex items-center justify-between text-[11px] font-mono select-none">
          <span className="font-bold">10:45</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-teal-300 font-sans font-semibold">Epson L3250 Online</span>
            <div className="flex items-center gap-1 text-slate-300">
              <Signal className="w-3 h-3" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <header className="bg-[#0e253e] text-white px-4 py-3.5 shadow-xs sticky top-0 z-30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-extrabold tracking-tight block leading-tight">
                Ibn Smart Print
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === 'sw' ? 'en' : 'sw')}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-[#183654] border border-[#234b73] text-white hover:bg-[#1f4266] transition cursor-pointer"
            >
              {lang === 'sw' ? 'English' : 'Kiswahili'}
            </button>
          </div>
        </header>

        {/* Main Content Area: Step-by-Step Pages */}
        <main className="flex-1 p-4 pb-8 space-y-4 overflow-y-auto">
          
          {/* =========================================================================
              PAGE 1: PAGE YA UKARIBISHO (Welcome Page)
              Chini ya hii page kuwe na batani ya "Anza Kuprint"
             ========================================================================= */}
          {mobileStep === 'step1_welcome' && (
            <div className="space-y-4 animate-in fade-in duration-200 text-center">
              <div className="pt-2 pb-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Stationery ya Kisasa • Epson EcoTank L3250</span>
                </div>
                <h1 className="text-3xl font-extrabold text-[#0e253e] tracking-tight leading-tight">
                  {lang === 'sw' ? 'Printi kutoka kwenye simu yako.' : 'Print from your phone.'}
                </h1>
                <p className="text-sm text-slate-600 mt-2.5 leading-relaxed font-normal">
                  {lang === 'sw'
                    ? 'Pakia mafaili yako, chagua mipangilio ya Epson EcoTank L3250, lipa, kisha chukua kurasa zako kaunta. Hakuna app ya kusakinisha.'
                    : 'Upload your files, choose settings, pay, then collect your pages at the counter. No app to install.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileStep('step2_service_choice')}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>{lang === 'sw' ? 'Anza Kuprinti' : 'Start Printing'}</span>
              </button>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => { setMobileStep('step_prices'); }}
                  className="w-full p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-emerald-500 hover:shadow-md active:scale-[0.99] transition cursor-pointer text-center"
                >
                  <h3 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'sw' ? 'Bei za Karatasi' : 'Paper Prices'}</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    {lang === 'sw' ? 'Angalia bei za A3, A4, A5 na A6 (nyeusi na rangi).' : 'See A3, A4, A5 and A6 prices (B&W and colour).'}
                  </p>
                  <span className="block text-[11px] text-emerald-700 font-bold pt-1 border-t border-slate-100">
                    {lang === 'sw' ? 'Bonyeza kufungua →' : 'Tap to open →'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { setTrackResult(null); setMobileStep('step_track'); }}
                  className="w-full p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5 hover:border-emerald-500 hover:shadow-md active:scale-[0.99] transition cursor-pointer text-center"
                >
                  <h3 className="font-bold text-sm text-slate-900 flex items-center justify-center gap-2">
                    <Search className="w-4 h-4 text-emerald-600" />
                    <span>{lang === 'sw' ? 'Fuatilia Kazi Yangu' : 'Track My Job'}</span>
                  </h3>
                  <p className="text-xs text-slate-600">
                    {lang === 'sw' ? 'Weka namba ya kazi na simu uone hali ya kazi yako.' : 'Enter your job and phone number to see its status.'}
                  </p>
                  <span className="block text-[11px] text-emerald-700 font-bold pt-1 border-t border-slate-100">
                    {lang === 'sw' ? 'Bonyeza kufungua →' : 'Tap to open →'}
                  </span>
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1.5">
                  <h3 className="font-bold text-sm text-slate-900">
                    {lang === 'sw' ? 'Msaada na Huduma' : 'Support & Counter'}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {lang === 'sw'
                      ? 'Uliza mhudumu kaunta ya duka au piga simu: '
                      : 'Ask staff at the counter, or call: '}
                    <strong className="text-slate-900 font-bold block mt-0.5">+255 754 889 900</strong>
                  </p>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    {lang === 'sw'
                      ? 'Nyaraka zako zinafutwa kiotomatiki baada ya kuprintiwa.'
                      : 'Your file is deleted automatically after printing.'}
                  </p>
                </div>
              </div>

              {/* Printer Status Tag */}
              <div className="text-center pt-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Epson EcoTank L3250 Wi-Fi: ONLINE
                </span>
              </div>

            </div>
          )}

          {mobileStep === 'step_prices' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setMobileStep('step1_welcome')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Rudi' : 'Back'}</span>
              </button>
              <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
                {lang === 'sw' ? 'Bei za Karatasi' : 'Paper Prices'}
              </h2>
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-sm text-slate-900">
                      {lang === 'sw' ? 'Bei Rasmi za Karatasi (TZS)' : 'Stationery Price List (TZS)'}
                    </h3>
                    <span className="text-[10px] bg-teal-50 text-teal-800 font-bold px-2 py-0.5 rounded border border-teal-200">
                      Epson EcoTank
                    </span>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200 text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100/90 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-2">Karatasi</th>
                          <th className="p-2">Nyeusi na nyeupe</th>
                          <th className="p-2">Rangi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-2 font-bold font-sans text-slate-800">A3</td>
                          <td className="p-2 text-slate-700">{SHEET_PRICE_TABLE.A3.bw} TZS</td>
                          <td className="p-2 font-bold text-teal-700">{SHEET_PRICE_TABLE.A3.color} TZS</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 bg-blue-50/30">
                          <td className="p-2 font-bold font-sans text-blue-900">A4 (Standard)</td>
                          <td className="p-2 font-bold text-slate-900">{SHEET_PRICE_TABLE.A4.bw} TZS</td>
                          <td className="p-2 font-bold text-teal-700">{SHEET_PRICE_TABLE.A4.color} TZS</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-2 font-bold font-sans text-slate-800">A5</td>
                          <td className="p-2 text-slate-700">{SHEET_PRICE_TABLE.A5.bw} TZS</td>
                          <td className="p-2 font-bold text-teal-700">{SHEET_PRICE_TABLE.A5.color} TZS</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50">
                          <td className="p-2 font-bold font-sans text-slate-800">A6</td>
                          <td className="p-2 text-slate-700">{SHEET_PRICE_TABLE.A6.bw} TZS</td>
                          <td className="p-2 font-bold text-teal-700">{SHEET_PRICE_TABLE.A6.color} TZS</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              <button
                type="button"
                onClick={() => setMobileStep('step2_service_choice')}
                className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>{lang === 'sw' ? 'Anza Kuprinti' : 'Start Printing'}</span>
              </button>
            </div>
          )}

          {mobileStep === 'step_track' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setMobileStep('step1_welcome')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Rudi' : 'Back'}</span>
              </button>
              <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
                {lang === 'sw' ? 'Fuatilia Kazi Yako' : 'Track Your Job'}
              </h2>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <input
                  type="text"
                  value={trackJobId}
                  onChange={(e) => setTrackJobId(e.target.value)}
                  placeholder={lang === 'sw' ? 'Namba ya kazi (mf. IBN-2026-0841)' : 'Job number (e.g. IBN-2026-0841)'}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="tel"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  placeholder={lang === 'sw' ? 'Namba ya simu (mf. 0754 992 110)' : 'Phone number (e.g. 0754 992 110)'}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleTrackJob}
                  disabled={!trackJobId.trim() || !trackPhone.trim()}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Angalia Hali ya Kazi' : 'Check Job Status'}</span>
                </button>
              </div>
              {trackResult === 'notfound' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {lang === 'sw'
                    ? 'Kazi haijapatikana. Hakikisha namba ya kazi na namba ya simu ni sahihi.'
                    : 'Job not found. Check the job number and phone number.'}
                </div>
              )}
              {trackResult && trackResult !== 'notfound' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    {lang === 'sw' ? 'Namba ya Kazi' : 'Job Number'}
                  </span>
                  <span className="font-mono font-black text-3xl text-emerald-700 block">{trackResult.id}</span>
                  <span className={`inline-block text-xs font-bold px-3 py-1.5 rounded-full uppercase ${statusLabel(trackResult.status)[1]}`}>
                    {statusLabel(trackResult.status)[0]}
                  </span>
                  <p className="text-xs text-slate-500 pt-1">{trackResult.fileName}</p>
                </div>
              )}
            </div>
          )}

          {/* =========================================================================
              PAGE 2: UKARABATI WA KUCHAGUA HUDUMA (Document au Picha)
             ========================================================================= */}
          {mobileStep === 'step2_service_choice' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setMobileStep('step1_welcome')}
                className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Rudi' : 'Back'}</span>
              </button>

              <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight pt-1">
                {lang === 'sw' ? 'Chagua Huduma ya Kuprinti' : 'Choose a printing service'}
              </h2>
              <p className="text-xs text-slate-600">
                {lang === 'sw'
                  ? 'Gusa aina ya nyaraka unayotaka kuprinti kwenye printer ya duka:'
                  : 'Tap the service you want to print with our Epson printer:'}
              </p>

              {/* Option A: Document */}
              <button
                type="button"
                onClick={() => {
                  setServiceType('document');
                  setStudioKey((k) => k + 1);
                  setDocuments([]);
                  setActiveDocId(null);
                  setMobileStep('step3_document_and_settings');
                }}
                className="w-full text-left p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-500 transition block group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition">
                      {lang === 'sw' ? 'Uchapishaji wa Nyaraka (Document)' : 'Document Printing'}
                    </h3>
                    <span className="text-[11px] text-blue-700 font-semibold">PDF, Word (DOCX), Excel (XLSX)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'sw'
                    ? 'Kila faili lina mipangilio yake na bei. Jumla ya malipo itaonekana chini mara baada ya kupakia faili.'
                    : 'Every file has its own settings and price. The total is calculated and shown below.'}
                </p>
              </button>

              {/* Option B: Image / Photo */}
              <button
                type="button"
                onClick={() => {
                  setServiceType('image');
                  setStudioKey((k) => k + 1);
                  setDocuments([]);
                  setActiveDocId(null);
                  setMobileStep('step3_document_and_settings');
                }}
                className="w-full text-left p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-blue-500 transition block group cursor-pointer"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition">
                      {lang === 'sw' ? 'Uchapishaji wa Picha (Photos)' : 'Photo Printing'}
                    </h3>
                    <span className="text-[11px] text-teal-700 font-semibold">JPG, JPEG, PNG</span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'sw'
                    ? 'Picha za pasipoti, vyeti au vielelezo kwenye karatasi ya A4 au Photo Paper 10x15cm.'
                    : 'Photos on a sheet: 1, 2, 4 or full page photo print.'}
                </p>
              </button>
            </div>
          )}

          {/* =========================================================================
              PAGE 3: KUPAKIA NYARAKA (Step 1) -> (File selected) -> SETTINGS (Step 2)
              -> SUMMARY YA MALIPO YA PESA -> BATANI YA "FANYA MALIPO"
             ========================================================================= */}
          {mobileStep === 'step3_document_and_settings' && serviceType === 'document' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Back to service choice */}
              <button
                type="button"
                onClick={() => setMobileStep('step2_service_choice')}
                className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Rudi kwenye huduma' : 'Back to service'}</span>
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
                    {serviceType === 'document'
                      ? (lang === 'sw' ? 'Pakia Nyaraka' : 'Upload Documents')
                      : (lang === 'sw' ? 'Pakia Picha' : 'Upload Photos')}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {lang === 'sw'
                      ? 'Unaweza kuweka faili zaidi ya moja na kila moja lina setting zake.'
                      : 'You can upload multiple files, each with custom settings.'}
                  </p>
                </div>
                <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200">
                  Epson L3250
                </span>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Hidden multi-file input */}
              <input
                type="file"
                ref={fileInputRef}
                multiple
                onChange={handleAddFiles}
                accept={serviceType === 'document' ? '.pdf,.doc,.docx,.xlsx' : 'image/*'}
                className="hidden"
              />

              {/* EMPTY STATE: Upload Initial Files */}
              {documents.length === 0 && (
                <div className="space-y-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-blue-500 hover:border-blue-600 rounded-2xl p-6 bg-white flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs transition group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                      <Upload className="w-6 h-6" />
                    </div>

                    <button
                      type="button"
                      className="py-3 px-6 rounded-xl bg-[#1d63ed] text-white font-bold text-sm shadow-xs pointer-events-none mb-2"
                    >
                      {serviceType === 'document'
                        ? (lang === 'sw' ? 'Chagua Faili (PDF / Word)' : 'Upload PDF / Word')
                        : (lang === 'sw' ? 'Chagua Picha (Photo)' : 'Upload Photo')}
                    </button>

                    <p className="text-xs text-slate-500 font-medium">
                      {lang === 'sw'
                        ? 'Gusa kuchagua faili kutoka simu yako (Unaweza kuchagua zaidi ya moja)'
                        : 'Tap to select documents from your phone (Multiple files supported)'}
                    </p>
                  </div>

                  {/* Quick Sample Selector for 1-click testing */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      {lang === 'sw' ? 'Au jaribu faili ya mfano mara moja:' : 'Or pick a test document:'}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {SAMPLE_DOCUMENTS.slice(0, 2).map((doc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSample(doc)}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl text-left text-xs font-medium text-slate-800 hover:border-blue-400 transition truncate cursor-pointer shadow-2xs"
                        >
                          <span className="block font-bold truncate">{doc.name}</span>
                          <span className="text-[10px] text-teal-700 font-semibold">{doc.pageCount} pgs</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVE DOCUMENTS STATE */}
              {documents.length > 0 && (
                <div className="space-y-4">
                  {/* Top Bar with Add File button */}
                  <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-2xl p-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs">
                        {documents.length}
                      </div>
                      <div>
                        <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                          {documents.length === 1
                            ? (lang === 'sw' ? 'Faili 1 Limepakiwa' : '1 File Attached')
                            : `${documents.length} ${lang === 'sw' ? 'Mafaili Yamepakiwa' : 'Files Attached'}`}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {orderTotals.totalSelectedPages} {lang === 'sw' ? 'kurasa kwa jumla' : 'total pages'}
                        </span>
                      </div>
                    </div>

                    {/* Batani ya "Add File" (Kuweka faili zaidi ya moja) */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{lang === 'sw' ? 'Add File' : 'Add File'}</span>
                    </button>
                  </div>

                  {/* Multi-Document Tab Switcher (when > 1 document) */}
                  {documents.length > 1 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                        {lang === 'sw' ? 'Chagua faili la kubadilisha settings:' : 'Select file to adjust settings:'}
                      </span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {documents.map((doc, idx) => (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => setActiveDocId(doc.id)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                              activeDocId === doc.id
                                ? 'bg-[#0e253e] text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <span>#{idx + 1}</span>
                            <span className="max-w-[100px] truncate">{doc.name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                                activeDocId === doc.id
                                  ? 'bg-slate-800 text-teal-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              TZS {doc.calculation.totalTZS}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Individual Document Setup Cards */}
                  {/* If single file: render the card */}
                  {/* If multiple files: render all or active document card with full settings */}
                  <div className="space-y-3">
                    {documents.map((doc, idx) => {
                      // When multiple docs, we display either the active document or allow all to be inspected
                      const isTarget = documents.length === 1 || activeDocId === doc.id;
                      if (!isTarget && documents.length > 3) return null;

                      return (
                        <DocumentSetupCard
                          key={doc.id}
                          document={doc}
                          docIndex={idx}
                          totalDocs={documents.length}
                          onUpdateSettings={handleUpdateDocSettings}
                          onRemoveDocument={handleRemoveDoc}
                          isExpanded={isTarget}
                          onToggleExpand={() => setActiveDocId(doc.id)}
                        />
                      );
                    })}
                  </div>

                  {/* Secondary Add File Banner underneath cards */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3 px-4 rounded-xl border border-dashed border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'sw' ? '+ Weka Faili Lingine (Add Another File)' : '+ Add Another File'}</span>
                  </button>

                  {/* SEHEMU YA SUMMARY YA MALIPO YA PESA (Calculations kutoka kila document & Grand Total) */}
                  <div className="rounded-2xl bg-[#0e253e] text-white p-5 space-y-3 shadow-md animate-in slide-in-from-bottom-2">
                    <div className="flex items-center justify-between border-b border-slate-700/80 pb-2.5 text-xs">
                      <span className="font-bold text-slate-200 uppercase tracking-wider">
                        {lang === 'sw' ? 'Muhtasari wa Malipo (Total Summary)' : 'Payment Summary'}
                      </span>
                      <span className="font-mono text-teal-300 font-bold">
                        {documents.length} {documents.length === 1 ? 'Faili' : 'Mafaili'}
                      </span>
                    </div>

                    {/* Itemized Calculation breakdown per document */}
                    <div className="space-y-2 text-xs">
                      {documents.map((doc, idx) => {
                        const unitRate = getSheetPrice(doc.settings.paperSize, doc.settings.colorMode);
                        return (
                          <div key={doc.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
                            <div className="flex items-baseline justify-between text-xs font-semibold">
                              <span className="truncate pr-2 text-slate-100 max-w-[200px]">
                                {documents.length > 1 ? `#${idx + 1} ` : ''}{doc.name}
                              </span>
                              <span className="font-mono font-bold text-teal-300">
                                TZS {doc.calculation.totalTZS.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                Pages {doc.calculation.totalSelectedPages} × {doc.settings.copies} nakala • {doc.settings.paperSize} ({doc.settings.colorMode === 'color' ? 'Colour' : 'B&W'})
                              </span>
                              <span className="font-mono">
                                @ TZS {unitRate}/sheet
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cumulative Grand Total */}
                    <div className="border-t border-slate-700/80 pt-3 flex items-baseline justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          {lang === 'sw' ? 'Jumla Kuu ya Kulipa' : 'Grand Total Payable'}
                        </span>
                        <span className="text-3xl font-black font-mono tracking-tight text-white">
                          TZS {orderTotals.grandTotalTZS.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] text-teal-300 font-bold font-mono block">
                          {orderTotals.totalSheetsToPrint} sheets
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lang === 'sw' ? 'Mhudumu anathibitisha kaunta' : 'Staff confirm at counter'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 italic">
                      Estimate. Staff confirm the final price.
                    </p>
                  </div>

                  {/* BATANI YA KULIPIA (FANYA MALIPO) */}
                  <button
                    type="button"
                    onClick={() => setMobileStep('step4_payment_choice')}
                    className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{lang === 'sw' ? 'Fanya Malipo' : 'Proceed to Payment'}</span>
                    <span className="font-mono text-sm">
                      ({formatTZS(orderTotals.grandTotalTZS)})
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}

          <div className={mobileStep === 'step3_document_and_settings' && serviceType === 'image' ? 'space-y-4 animate-in fade-in duration-200' : 'hidden'}>
            <button
              type="button"
              onClick={() => setMobileStep('step2_service_choice')}
              className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-800"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'sw' ? 'Rudi kwenye huduma' : 'Back to service'}</span>
            </button>
            <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
              {lang === 'sw' ? 'Kuprint Picha' : 'Image Printing'}
            </h2>
            <ImagePrintStudio
              key={studioKey}
              lang={lang}
              active={serviceType === 'image'}
              onChange={(item) => {
                setDocuments(item ? [item] : []);
                setActiveDocId(item ? item.id : null);
              }}
              onProceed={() => setMobileStep('step4_payment_choice')}
            />
          </div>

          {/* =========================================================================
              PAGE 4: UCHAGUZI WA NJIA YA MALIPO (Steps 3) -> BATANI YA "CHAPISHA"
             ========================================================================= */}
          {mobileStep === 'step4_payment_choice' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setMobileStep('step3_document_and_settings')}
                className="text-xs font-semibold text-slate-500 flex items-center gap-1 hover:text-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{lang === 'sw' ? 'Rudi kwenye mipangilio' : 'Back to settings'}</span>
              </button>

              <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
                {lang === 'sw' ? 'Chagua Njia ya Malipo' : 'Choose Payment Method'}
              </h2>

              {/* Customer Verification Details */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Jina Lako Kamili' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Baraka Juma"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === 'sw' ? 'Namba ya Simu (Kwa Risiti & SMS)' : 'Phone Number'} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0754 123 456"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-blue-500"
                  />
                </div>
              </div>

              {/* Order Itemized Summary in Payment Step */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 shadow-2xs text-xs">
                <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                  {lang === 'sw' ? 'Muhtasari wa Kazi Yako' : 'Order Summary'}
                </span>
                <div className="divide-y divide-slate-100">
                  {documents.map((doc, idx) => (
                    <div key={doc.id} className="py-2 flex items-center justify-between">
                      <div className="truncate pr-2">
                        <span className="font-bold text-slate-900 block truncate">
                          {documents.length > 1 ? `#${idx + 1} ` : ''}{doc.name}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {doc.calculation.totalSelectedPages} pgs × {doc.settings.copies} nakala • {doc.settings.paperSize} ({doc.settings.colorMode === 'color' ? 'Colour' : 'B&W'})
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        TZS {doc.calculation.totalTZS.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5">
                {/* Method 1: Pay at Counter */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('counter')}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod === 'counter'
                      ? 'border-[#1d63ed] bg-blue-50/50 text-[#0e253e]'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {lang === 'sw' ? 'Lipia Kaunta ya Duka (Cash / POS)' : 'Pay at Counter (Cash / POS)'}
                    </span>
                    <CreditCard className="w-4 h-4 text-slate-600" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'sw'
                      ? 'Tuma kazi sasa, kisha unalipa fedha taslimu kaunta kwa mhudumu kabla haijachapishwa.'
                      : 'Submit now and pay cash at the stationery counter before printing starts.'}
                  </p>
                </button>

                {/* Method 2: Mobile Money */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mpesa')}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition cursor-pointer ${
                    paymentMethod !== 'counter'
                      ? 'border-[#1d63ed] bg-blue-50/50 text-[#0e253e]'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {lang === 'sw' ? 'Malipo ya Simu (M-Pesa / Tigo / Airtel)' : 'Mobile Money'}
                    </span>
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {lang === 'sw'
                      ? 'Lipa papo hapo kwa namba ya simu ya Vodacom, Tigo, Airtel au Halopesa.'
                      : 'Instant wallet payment via mobile prompt.'}
                  </p>
                </button>
              </div>

              {/* Final Amount Card */}
              <div className="p-4 rounded-2xl bg-[#0e253e] text-white flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[11px] text-slate-400 block">
                    {lang === 'sw' ? 'Jumla ya Kulipa' : 'Total Payable'}
                  </span>
                  <span className="text-2xl font-black font-mono text-white">
                    {formatTZS(orderTotals.grandTotalTZS)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-teal-300 font-semibold">
                  Epson EcoTank L3250
                </div>
              </div>

              {/* BATANI YA "CHAPISHA" (Print Button) */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecutePrint}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Inatuma kazi kwa printer...</span>
                  </span>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    <span>{lang === 'sw' ? 'Chapisha Sasa' : 'Print Now'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* =========================================================================
              PAGE 5: UKARABATI WA MWISHO (Summary ya kazi, Namba ya kazi, Maelezo
              ya malipo, Maendeleo ya kazi, Batani ya kuprint upya, Sehemu ya kufuta kazi)
             ========================================================================= */}
          {mobileStep === 'step5_job_final_summary' && currentSummaryJob && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center pt-1">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-extrabold text-[#0e253e] tracking-tight">
                  {lang === 'sw' ? 'Kazi Imepokelewa!' : 'Job Received!'}
                </h2>
                <p className="text-xs text-slate-500">
                  {lang === 'sw'
                    ? 'Ahsante kwa kutumia huduma zetu, kazi yako imewasilishwa kikamilifu na ipo katika mchakato wa mwisho. Fuatilia mwenendo wa kazi yako hapa chini.'
                    : 'Thank you for using our service. Your job has been submitted successfully and is in its final stage. Follow its progress below.'}
                </p>
              </div>

              {/* Summary ya Kazi Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-2xs">
                {/* 1. Namba ya Kazi */}
                <div className="flex flex-col items-center text-center gap-2 border-b pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {lang === 'sw' ? 'Namba ya Kazi (Job Reference)' : 'Job Reference ID'}
                    </span>
                    <span className="font-mono font-black text-3xl text-emerald-700">
                      {currentSummaryJob.id}
                    </span>
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${
                      currentSummaryJob.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentSummaryJob.status === 'printing'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {currentSummaryJob.status.replace('_', ' ')}
                  </span>
                </div>

                {/* 2. Maelezo ya Malipo na Mafaili */}
                <div className="space-y-1.5 text-xs">
                  <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                    {lang === 'sw' ? 'Maelezo ya Malipo na Mafaili' : 'Payment & File Details'}
                  </span>
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block font-semibold">
                        {lang === 'sw' ? 'Orodha ya Mafaili:' : 'Files in this job:'}
                      </span>
                      {currentSummaryJob.files && currentSummaryJob.files.length > 0 ? (
                        <div className="space-y-1">
                          {currentSummaryJob.files.map((f, i) => (
                            <div key={f.id || i} className="flex justify-between text-[11px] text-slate-700">
                              <span className="truncate max-w-[180px] font-medium">
                                #{i + 1} {f.name}
                              </span>
                              <span className="font-mono font-semibold">
                                {f.calculation.totalSelectedPages} pgs × {f.settings.copies} ({f.settings.paperSize}, {f.settings.colorMode}) = TZS {f.calculation.totalTZS}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-500">{lang === 'sw' ? 'Faili:' : 'File:'}</span>
                          <strong className="text-slate-900 truncate max-w-[180px]">{currentSummaryJob.fileName}</strong>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="text-slate-500">{lang === 'sw' ? 'Jumla ya Kurasa za Kuchapa:' : 'Total Sheets to Print:'}</span>
                      <span className="font-mono font-bold">{currentSummaryJob.pricing.totalPagesToPrint} sheets</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">{lang === 'sw' ? 'Njia ya Malipo:' : 'Payment Method:'}</span>
                      <strong className="text-teal-700 uppercase">{currentSummaryJob.paymentMethod}</strong>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200 text-sm font-bold">
                      <span className="text-slate-900">{lang === 'sw' ? 'Gharama ya Kulipa:' : 'Total Payable:'}</span>
                      <span className="text-blue-700 font-mono">{formatTZS(currentSummaryJob.pricing.totalTZS)}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Maendeleo ya Kazi (Dynamic Timeline - inabadilika admin akibadili hali ya kazi) */}
                {(() => {
                  const j = currentSummaryJob;
                  const paid = j.paymentStatus === 'completed' || ['payment_confirmed', 'queued', 'printing', 'completed'].includes(j.status);
                  const queued = ['queued', 'printing', 'completed'].includes(j.status);
                  const printing = ['printing', 'completed'].includes(j.status);
                  const done = j.status === 'completed';
                  const stages: [boolean, string, string][] = [
                    [true, 'Nyaraka imepokelewa kwenye seva', 'Document received'],
                    [paid, paid ? 'Malipo yamethibitishwa' : 'Inasubiri malipo', paid ? 'Payment confirmed' : 'Awaiting payment'],
                    [queued, 'Kazi ipo kwenye foleni ya printa', 'Job is in the printer queue'],
                    [printing, 'Inachapishwa na Epson EcoTank L3250', 'Printing on Epson L3250'],
                    [done, 'Imekamilika - Chukua karatasi kaunta!', 'Completed - pick up at the counter!'],
                  ];
                  const firstPending = stages.findIndex((st) => !st[0]);
                  return (
                    <div className="space-y-2 pt-1">
                      <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
                        {lang === 'sw' ? 'Maendeleo ya Kazi (Live)' : 'Live Printing Progress'}
                      </span>
                      <div className="space-y-2.5 text-xs">
                        {stages.map(([ok, sw, en], i) => (
                          <div key={i} className="flex items-center gap-2.5 text-slate-700">
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] text-white transition-all duration-500 ${
                                ok ? 'bg-emerald-500' : i === firstPending ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'
                              }`}
                            >
                              {ok ? '✓' : i + 1}
                            </span>
                            <span className={ok ? 'font-semibold text-slate-900' : 'text-slate-500'}>
                              {i + 1}. {lang === 'sw' ? sw : en}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Kaunta Instruction Notice */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                  {lang === 'sw'
                    ? `Fika kaunta na utaje Namba ya Kazi: ${currentSummaryJob.id} kulipia au kuchukua printi yako.`
                    : `Show Job ID: ${currentSummaryJob.id} at the counter to collect your pages.`}
                </div>

                {/* 4. Batani ya Kuanza Kuprint Upya */}
                <button
                  type="button"
                  onClick={handleStartNewPrint}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{lang === 'sw' ? 'Anza Kuprinti Kazi Nyingine' : 'Start New Print Job'}</span>
                </button>

                {/* 5. Futa faili (linapatikana baada ya kuprintiwa) - linafutika hadi kwenye Admin Dashboard */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <button
                    type="button"
                    disabled={currentSummaryJob.status !== 'completed'}
                    onClick={() => setShowDeleteConfirmModal(true)}
                    className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{lang === 'sw' ? 'Futa Faili Langu Sasa' : 'Delete My File Now'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center">
                    {currentSummaryJob.status === 'completed'
                      ? (lang === 'sw' ? 'Faili litafutwa pia kwenye Admin Dashboard.' : 'The file will also be removed from the Admin Dashboard.')
                      : (lang === 'sw' ? 'Batani hii itafunguka baada ya kazi yako kuprintiwa.' : 'This button unlocks once your job is printed.')}
                  </p>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Minimal Footer with Staff Links */}
        <footer className="bg-slate-900 text-slate-400 text-[11px] py-3 px-4 border-t border-slate-800 text-center space-y-1 select-none">
          <p className="text-slate-300 font-medium">Ibn Smart Print Stationery • Epson EcoTank L3250</p>
          <div className="flex items-center justify-center gap-3 text-xs pt-0.5">
            <button
              type="button"
              onClick={() => setCurrentTab('admin')}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Django Admin (Desktop Mode)</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setCurrentTab('poster')}
              className="text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Bango la QR</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setCurrentTab('code')}
              className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center gap-1"
            >
              <Code className="w-3.5 h-3.5" />
              <span>Python Code</span>
            </button>
          </div>
        </footer>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && currentSummaryJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xs w-full p-5 shadow-2xl space-y-3 animate-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-sm text-slate-900">
                {lang === 'sw' ? 'Futa Kazi Hii?' : 'Delete This Job?'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {lang === 'sw'
                  ? `Una uhakika unataka kufuta kazi ${currentSummaryJob.id} na faili lako? Litafutwa pia kwenye Admin Dashboard.`
                  : `Are you sure you want to remove job ${currentSummaryJob.id}?`}
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Ghairi
              </button>
              <button
                type="button"
                onClick={() => handleDeleteJob(currentSummaryJob.id)}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-700"
              >
                Ndio, Futa
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
