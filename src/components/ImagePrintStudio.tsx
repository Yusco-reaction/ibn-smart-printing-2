import React, { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, RefreshCw, Plus, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { DocumentItem, Language } from '../types/index.ts';
import { IMAGE_PRICE_TABLE, formatTZS } from '../utils/pricing.ts';

type LayoutId = 'single' | 'two_h' | 'two_v' | 'four' | 'custom';
type Sz = 'A4' | 'A5' | 'A6';
interface Img { id: string; name: string; url: string; size: number; zoom: number; rot: number; px: number; py: number }

interface Props {
  lang: Language;
  active: boolean;
  onChange: (item: DocumentItem | null) => void;
  onProceed: () => void;
}

export const ImagePrintStudio: React.FC<Props> = ({ lang, active, onChange, onProceed }) => {
  const L = (sw: string, en: string) => (lang === 'sw' ? sw : en);
  const [images, setImages] = useState<Img[]>([]);
  const [layout, setLayout] = useState<LayoutId>('single');
  const [custom, setCustom] = useState(6);
  const [color, setColor] = useState<'color' | 'bw'>('color');
  const [size, setSize] = useState<Sz>('A4');
  const [copies, setCopies] = useState(1);
  const [globalZoom, setGlobalZoom] = useState(1);
  const [sel, setSel] = useState(0);
  const [sheetNo, setSheetNo] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const n = layout === 'single' ? 1 : layout === 'four' ? 4 : layout === 'custom' ? custom : 2;
  const cols = layout === 'two_h' ? 2 : layout === 'two_v' ? 1 : layout === 'four' ? 2 : Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const landscape = layout === 'two_h';
  const sheets = Math.max(1, Math.ceil(images.length / n));
  const rate = IMAGE_PRICE_TABLE[size][color];
  const total = images.length ? sheets * copies * rate : 0;
  const page = Math.min(sheetNo, sheets - 1);

  useEffect(() => {
    if (!active) return;
    if (!images.length) return onChange(null);
    onChange({
      id: 'img_studio_job',
      name: `Picha ${images.length} • ${n}/karatasi • ${size}`,
      sizeBytes: images.reduce((a, i) => a + i.size, 0),
      type: 'image/jpeg',
      pageCount: sheets,
      previewUrl: images[0].url,
      settings: {
        colorMode: color, paperSize: size, copies, pageRangeMode: 'all', customPageRange: '',
        orientation: landscape ? 'landscape' : 'portrait', scaling: 'fit', quality: 'high',
        isManualDuplex: false, manualDuplexConfirmed: false, bindingOrStapling: 'none',
      },
      calculation: {
        totalSelectedPages: sheets, totalPagesToPrint: sheets * copies, basePricePerPage: rate,
        paperMultiplier: 1, printingCost: total, finishingCost: 0, discountAmount: 0, totalTZS: total,
        breakdown: [{ labelSw: `Karatasi ${sheets * copies} × ${size}`, labelEn: `${sheets * copies} × ${size} sheets`, amountTZS: total }],
      },
    });
  }, [active, images.length, n, color, size, copies, landscape]);

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/'));
    setImages((p) => [...p, ...fs.map((f) => ({ id: `${Date.now()}${Math.random()}`, name: f.name, url: URL.createObjectURL(f), size: f.size, zoom: 1, rot: 0, px: 0, py: 0 }))]);
    e.target.value = '';
  };
  const upd = (i: number, patch: Partial<Img>) => setImages((p) => p.map((im, k) => (k === i ? { ...im, ...patch } : im)));
  const reset = (i: number) => upd(i, { zoom: 1, rot: 0, px: 0, py: 0 });
  const remove = (i: number) => { setImages((p) => p.filter((_, k) => k !== i)); setSel(0); };

  const layouts: [LayoutId, string][] = [
    ['single', L('Picha 1', '1 image')], ['two_h', L('Picha 2 (ulalo)', '2 images (wide)')],
    ['two_v', L('Picha 2 (wima)', '2 images (tall)')], ['four', L('Picha 4', '4 images')], ['custom', L('Custom', 'Custom')],
  ];
  const chip = (on: boolean) => `px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${on ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-300 hover:border-emerald-500'}`;
  const cur = images[sel] || null;

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
        <h3 className="font-bold text-sm text-slate-900">{L('1. Pakia Picha', '1. Upload Images')}</h3>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={addFiles} />
        <button type="button" onClick={() => fileRef.current?.click()} className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" /><span>{images.length ? L('Ongeza Picha Zaidi', 'Add More Images') : L('Chagua Picha', 'Choose Images')}</span>
        </button>
        <div className="flex gap-1.5 text-[11px]">
          {(['color', 'bw'] as const).map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} className={`flex-1 ${chip(color === c)}`}>{c === 'color' ? L('Rangi', 'Colour') : L('Nyeusi & Nyeupe', 'Black & White')}</button>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
        <h3 className="font-bold text-sm text-slate-900">{L('2. Idadi ya Picha kwa Karatasi Moja', '2. Images per Sheet')}</h3>
        <div className="flex flex-wrap gap-1.5">
          {layouts.map(([id, label]) => (<button key={id} type="button" onClick={() => { setLayout(id); setSheetNo(0); }} className={chip(layout === id)}>{label}</button>))}
        </div>
        {layout === 'custom' && (
          <label className="block text-xs font-semibold text-slate-600">{L('Idadi ya picha (1–16):', 'Images (1–16):')} <b className="text-emerald-700">{custom}</b>
            <input type="range" min={1} max={16} value={custom} onChange={(e) => { setCustom(+e.target.value); setSheetNo(0); }} className="w-full accent-emerald-600" />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
          <label>{L('Karatasi', 'Paper')}
            <select value={size} onChange={(e) => setSize(e.target.value as Sz)} className="w-full mt-1 px-2 py-2 rounded-xl border border-slate-300 bg-white">
              {(['A4', 'A5', 'A6'] as Sz[]).map((s) => <option key={s} value={s}>{s} — {formatTZS(IMAGE_PRICE_TABLE[s][color])}</option>)}
            </select>
          </label>
          <label>{L('Nakala za karatasi', 'Sheet copies')}
            <input type="number" min={1} max={50} value={copies} onChange={(e) => setCopies(Math.max(1, Math.min(50, +e.target.value || 1)))} className="w-full mt-1 px-2 py-2 rounded-xl border border-slate-300" />
          </label>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">{L('3. Preview ya Mpangilio', '3. Layout Preview')}</h3>
          <span className="text-[11px] font-mono text-slate-500">{size} • {L('karatasi', 'sheet')} {page + 1}/{sheets}</span>
        </div>
        <div className="flex justify-center py-1">
          <div className="bg-white shadow-md border border-slate-300 p-1.5" style={{ width: landscape ? '92%' : '58%', aspectRatio: landscape ? '1.414' : '0.707' }}>
            <div className="w-full h-full grid gap-1" style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)` }}>
              {Array.from({ length: n }).map((_, s) => {
                const idx = page * n + s;
                const im = images[idx];
                return (
                  <div key={s} onClick={() => im ? setSel(idx) : fileRef.current?.click()} className={`relative overflow-hidden bg-slate-200 cursor-pointer min-h-0 ${im && sel === idx ? 'ring-2 ring-emerald-500' : ''}`}>
                    {im ? (
                      <img src={im.url} alt="" draggable={false} className={`w-full h-full object-cover ${color === 'bw' ? 'grayscale' : ''}`}
                        style={{ transform: `translate(${im.px}%,${im.py}%) scale(${im.zoom * globalZoom}) rotate(${im.rot}deg)` }} />
                    ) : (<span className="absolute inset-0 flex items-center justify-center text-slate-400"><Plus className="w-4 h-4" /></span>)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {sheets > 1 && (
          <div className="flex items-center justify-center gap-3">
            <button type="button" disabled={page === 0} onClick={() => setSheetNo(page - 1)} className="w-7 h-7 rounded-lg bg-emerald-600 text-white disabled:opacity-30 flex items-center justify-center cursor-pointer"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs font-bold text-slate-700">{page + 1} / {sheets}</span>
            <button type="button" disabled={page >= sheets - 1} onClick={() => setSheetNo(page + 1)} className="w-7 h-7 rounded-lg bg-emerald-600 text-white disabled:opacity-30 flex items-center justify-center cursor-pointer"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        <label className="block text-xs font-semibold text-slate-600">{L('Zoom ya picha zote', 'Zoom all images')}: <b className="text-emerald-700">{Math.round(globalZoom * 100)}%</b>
          <input type="range" min={1} max={3} step={0.05} value={globalZoom} onChange={(e) => setGlobalZoom(+e.target.value)} className="w-full accent-emerald-600" />
        </label>
      </div>

      {cur && (
        <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
          <h3 className="font-bold text-sm text-slate-900">{L('4. Hariri Slot', '4. Edit Slot')}</h3>
          {images.length > 1 && (
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {images.map((im, i) => (
                <button key={im.id} type="button" onClick={() => { setSel(i); setSheetNo(Math.floor(i / n)); }} className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${sel === i ? 'border-emerald-600' : 'border-slate-200'}`}>
                  <img src={im.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-slate-500 truncate">{L('Slot', 'Slot')} {sel + 1}: {cur.name}</p>
          {([['zoom', L('Zoom', 'Zoom'), 1, 3, 0.05], ['px', L('Crop: sogeza kushoto/kulia', 'Crop: move left/right'), -50, 50, 1], ['py', L('Crop: sogeza juu/chini', 'Crop: move up/down'), -50, 50, 1]] as const).map(([k, label, mn, mx, st]) => (
            <label key={k} className="block text-xs font-semibold text-slate-600">{label}
              <input type="range" min={mn} max={mx} step={st} value={cur[k]} onChange={(e) => upd(sel, { [k]: +e.target.value } as Partial<Img>)} className="w-full accent-emerald-600" />
            </label>
          ))}
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => upd(sel, { rot: (cur.rot + 90) % 360 })} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"><RefreshCw className="w-3.5 h-3.5" />{L('Zungusha', 'Rotate')}</button>
            <button type="button" onClick={() => reset(sel)} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer">{L('Reset Slot', 'Reset Slot')}</button>
            <button type="button" onClick={() => remove(sel)} className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"><Trash2 className="w-3.5 h-3.5" />{L('Ondoa', 'Remove')}</button>
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block">{L('Jumla ya Kulipa', 'Total Payable')}</span>
            <span className="text-3xl font-black font-mono">{formatTZS(total)}</span>
          </div>
          <span className="text-[11px] text-emerald-300 font-mono text-right">{images.length} {L('picha', 'images')}<br />{sheets * copies} × {size} @ {rate}</span>
        </div>
        <button type="button" disabled={!images.length} onClick={onProceed} className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer">
          <Printer className="w-4 h-4" /><span>{L('Endelea Kulipa', 'Continue to Payment')}</span>
        </button>
      </div>
    </div>
  );
};
