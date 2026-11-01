import React, { useState } from 'react';
import { Store, Printer, QrCode, Settings, RefreshCw, CheckCircle2, X } from 'lucide-react';
import { Language, PrintJob, EpsonPrinterStatus, PricingRates } from '../types/index.ts';
import { SHEET_PRICE_TABLE, IMAGE_PRICE_TABLE, formatTZS } from '../utils/pricing.ts';
import { QrPosterModal } from './QrPosterModal.tsx';

interface Props {
  lang: Language;
  jobs: PrintJob[];
  printerStatus: EpsonPrinterStatus;
  pricingRates: PricingRates;
  onUpdatePricing: (rates: PricingRates) => void;
}

type Section = 'printer' | 'qr' | 'settings' | null;
const SIZES = ['A3', 'A4', 'A5', 'A6'] as const;
const IMG = ['A4', 'A5', 'A6'] as const;
const PAYS = ['M-Pesa', 'Tigo Pesa', 'Airtel Money', 'Halopesa', 'Kaunta (Cash)'];

export const AdminStorePanel: React.FC<Props> = ({ lang, jobs, printerStatus, pricingRates, onUpdatePricing }) => {
  const [open, setOpen] = useState<Section>(null);
  const [store, setStore] = useState({ name: 'Ibn Smart Print Stationery', phone: '+255 754 889 900', address: 'Dar es Salaam, Tanzania', hours: '08:00 - 20:00', open: true });
  const [printers] = useState([
    { id: 'wifi', label: `${printerStatus.name} (Wi-Fi) • ${printerStatus.ipAddress}` },
    { id: 'usb', label: `${printerStatus.name} (USB)` },
    { id: 'pdf', label: 'Microsoft Print to PDF (jaribio)' },
  ]);
  const [sel, setSel] = useState('wifi');
  const [ps, setPs] = useState({ paper: 'A4', color: 'bw', quality: 'standard', autoPrint: true, duplex: true });
  const [scanning, setScanning] = useState(false);
  const [prices, setPrices] = useState(() => JSON.parse(JSON.stringify({ sheet: SHEET_PRICE_TABLE, image: IMAGE_PRICE_TABLE })));
  const [rates, setRates] = useState({ staple: pricingRates.stapleCostTZS, spiral: pricingRates.spiralBindingCostTZS, duplex: pricingRates.manualDuplexDiscountPercent });
  const [pays, setPays] = useState<string[]>(PAYS);
  const [autoDelete, setAutoDelete] = useState(true);
  const [toast, setToast] = useState('');

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2500); };
  const today = jobs.filter((j) => new Date(j.createdAt).toDateString() === new Date().toDateString()).length;
  const pending = jobs.filter((j) => ['uploaded', 'awaiting_payment', 'queued', 'printing'].includes(j.status)).length;
  const online = printerStatus.status === 'online' && store.open;

  const saveSettings = () => {
    SIZES.forEach((s) => Object.assign(SHEET_PRICE_TABLE[s], prices.sheet[s]));
    IMG.forEach((s) => Object.assign(IMAGE_PRICE_TABLE[s], prices.image[s]));
    onUpdatePricing({ ...pricingRates, stapleCostTZS: rates.staple, spiralBindingCostTZS: rates.spiral, manualDuplexDiscountPercent: rates.duplex });
    flash('Mipangilio ya duka imehifadhiwa. Bei mpya zimeanza kutumika kwa wateja.');
  };
  const num = (v: string) => Math.max(0, parseInt(v, 10) || 0);
  const inp = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-sm bg-white';
  const btn = 'px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition flex items-center gap-1.5';
  const card = (id: Exclude<Section, null>, Icon: typeof Store, title: string, sub: string) => (
    <button type="button" onClick={() => setOpen(open === id ? null : id)}
      className={`text-left p-4 rounded-xl border bg-white shadow-xs hover:border-emerald-500 transition cursor-pointer ${open === id ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'}`}>
      <Icon className="w-5 h-5 text-emerald-600 mb-1.5" />
      <div className="font-bold text-sm text-slate-900">{title}</div>
      <div className="text-[11px] text-slate-500">{sub}</div>
    </button>
  );

  return (
    <div className="mb-6 space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center"><Store className="w-5 h-5" /></div>
            <div>
              <input value={store.name} onChange={(e) => setStore({ ...store, name: e.target.value })} className="font-extrabold text-lg text-slate-900 bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-emerald-600" />
              <div className="text-xs text-slate-500 mt-0.5">{store.address} • {store.phone} • {store.hours}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${online ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'}`}>
              {online ? '● Duka Liko Wazi' : '● Duka Limefungwa / Printa Offline'}
            </span>
            <button type="button" onClick={() => setStore({ ...store, open: !store.open })} className={btn}>{store.open ? 'Funga Duka' : 'Fungua Duka'}</button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
          {[['Kazi za leo', today], ['Zinasubiri/Zinachapishwa', pending], ['Foleni ya printa', printerStatus.queueCount], ['Printa', printerStatus.status.toUpperCase()]].map(([l, v]) => (
            <div key={String(l)} className="rounded-lg bg-slate-50 border border-slate-200 py-2"><div className="text-lg font-black text-slate-900">{v}</div><div className="text-[11px] text-slate-500">{l}</div></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {card('printer', Printer, 'Mipangilio ya Printa', 'Chagua printa na mipangilio yake')}
        {card('qr', QrCode, 'QR Code ya Duka', 'Print QR ya wateja kuanza kuprint')}
        {card('settings', Settings, 'Mipangilio ya Duka', 'Bei za karatasi na mengineyo')}
      </div>

      {open && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 relative">
          <button type="button" onClick={() => setOpen(null)} className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>

          {open === 'printer' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Chagua Printa Iliyounganishwa</h3>
                <button type="button" className={btn} onClick={() => { setScanning(true); setTimeout(() => { setScanning(false); flash('Utafutaji umekamilika: printa 3 zimepatikana.'); }, 1000); }}>
                  <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />Tafuta Printa
                </button>
              </div>
              <div className="space-y-2">
                {printers.map((p) => (
                  <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${sel === p.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200'}`}>
                    <input type="radio" name="printer" checked={sel === p.id} onChange={() => setSel(p.id)} className="accent-emerald-600" />
                    <span className="text-sm font-semibold text-slate-800">{p.label}</span>
                  </label>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
                <label>Karatasi ya kawaida<select value={ps.paper} onChange={(e) => setPs({ ...ps, paper: e.target.value })} className={inp}>{['A3', 'A4', 'A5', 'A6'].map((s) => <option key={s}>{s}</option>)}</select></label>
                <label>Rangi ya kawaida<select value={ps.color} onChange={(e) => setPs({ ...ps, color: e.target.value })} className={inp}><option value="bw">Nyeusi na Nyeupe</option><option value="color">Rangi</option></select></label>
                <label>Ubora<select value={ps.quality} onChange={(e) => setPs({ ...ps, quality: e.target.value })} className={inp}><option value="draft">Draft (haraka)</option><option value="standard">Standard</option><option value="high">High (picha)</option></select></label>
              </div>
              <div className="space-y-1.5 text-sm text-slate-700">
                <label className="flex items-center gap-2"><input type="checkbox" checked={ps.autoPrint} onChange={(e) => setPs({ ...ps, autoPrint: e.target.checked })} className="accent-emerald-600" />Print kiotomatiki baada ya malipo kuthibitishwa</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={ps.duplex} onChange={(e) => setPs({ ...ps, duplex: e.target.checked })} className="accent-emerald-600" />Ruhusu duplex ya mkono (pande mbili)</label>
              </div>
              <div className="text-[11px] text-slate-500">Wino: Black {printerStatus.blackInkPercent}% • Cyan {printerStatus.cyanInkPercent}% • Magenta {printerStatus.magentaInkPercent}% • Yellow {printerStatus.yellowInkPercent}% • Tray: {printerStatus.paperTrayStatus}</div>
              <div className="flex gap-2">
                <button type="button" className={btn} onClick={() => flash(`Mipangilio ya printa imehifadhiwa (${printers.find((p) => p.id === sel)?.label}).`)}>Hifadhi Mipangilio</button>
                <button type="button" className={btn} onClick={() => flash('Ukurasa wa majaribio umetumwa kwa printa.')}>Print Ukurasa wa Majaribio</button>
              </div>
            </div>
          )}

          {open === 'qr' && <div className="-mx-4 -my-6"><QrPosterModal lang={lang} /></div>}

          {open === 'settings' && (
            <div className="space-y-5 max-w-3xl">
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Bei kwa Kila Karatasi (TZS)</h3>
                <div className="grid grid-cols-3 gap-2 text-xs font-bold text-slate-500 mb-1"><span>Karatasi</span><span>Nyeusi na Nyeupe</span><span>Rangi</span></div>
                {SIZES.map((s) => (
                  <div key={s} className="grid grid-cols-3 gap-2 mb-1.5 items-center">
                    <span className="font-bold text-sm">{s}</span>
                    <input type="number" className={inp} value={prices.sheet[s].bw} onChange={(e) => setPrices({ ...prices, sheet: { ...prices.sheet, [s]: { ...prices.sheet[s], bw: num(e.target.value) } } })} />
                    <input type="number" className={inp} value={prices.sheet[s].color} onChange={(e) => setPrices({ ...prices, sheet: { ...prices.sheet, [s]: { ...prices.sheet[s], color: num(e.target.value) } } })} />
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-2">Bei za Kuprint Picha (kwa karatasi)</h3>
                {IMG.map((s) => (
                  <div key={s} className="grid grid-cols-3 gap-2 mb-1.5 items-center">
                    <span className="font-bold text-sm">{s}</span>
                    <input type="number" className={inp} value={prices.image[s].bw} onChange={(e) => setPrices({ ...prices, image: { ...prices.image, [s]: { ...prices.image[s], bw: num(e.target.value) } } })} />
                    <input type="number" className={inp} value={prices.image[s].color} onChange={(e) => setPrices({ ...prices, image: { ...prices.image, [s]: { ...prices.image[s], color: num(e.target.value) } } })} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-600">
                <label>Staple (TZS)<input type="number" className={inp} value={rates.staple} onChange={(e) => setRates({ ...rates, staple: num(e.target.value) })} /></label>
                <label>Spiral Binding (TZS)<input type="number" className={inp} value={rates.spiral} onChange={(e) => setRates({ ...rates, spiral: num(e.target.value) })} /></label>
                <label>Punguzo la duplex (%)<input type="number" className={inp} value={rates.duplex} onChange={(e) => setRates({ ...rates, duplex: Math.min(100, num(e.target.value)) })} /></label>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1.5">Njia za Malipo Zinazokubalika</h3>
                <div className="flex flex-wrap gap-2">
                  {PAYS.map((p) => (
                    <label key={p} className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${pays.includes(p) ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300'}`}>
                      <input type="checkbox" className="hidden" checked={pays.includes(p)} onChange={() => setPays(pays.includes(p) ? pays.filter((x) => x !== p) : [...pays, p])} />{p}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-semibold text-slate-600">
                <label>Namba ya simu ya duka<input className={inp} value={store.phone} onChange={(e) => setStore({ ...store, phone: e.target.value })} /></label>
                <label>Anwani<input className={inp} value={store.address} onChange={(e) => setStore({ ...store, address: e.target.value })} /></label>
                <label>Saa za kazi<input className={inp} value={store.hours} onChange={(e) => setStore({ ...store, hours: e.target.value })} /></label>
                <label className="flex items-center gap-2 pt-5 text-sm text-slate-700"><input type="checkbox" checked={autoDelete} onChange={(e) => setAutoDelete(e.target.checked)} className="accent-emerald-600" />Futa mafaili kiotomatiki baada ya kuprintiwa</label>
              </div>
              <button type="button" className={btn} onClick={saveSettings}><CheckCircle2 className="w-3.5 h-3.5" />Hifadhi Mipangilio ya Duka</button>
              <p className="text-[11px] text-slate-400">Mfano wa bei A4 rangi baada ya kuhifadhi: {formatTZS(prices.sheet.A4.color)}</p>
            </div>
          )}
        </div>
      )}
      {toast && <div className="fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-emerald-700 text-white text-xs font-bold shadow-lg">{toast}</div>}
    </div>
  );
};
