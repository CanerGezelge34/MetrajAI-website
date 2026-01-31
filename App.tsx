
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  ClipboardCheck, 
  History, 
  Settings as SettingsIcon, 
  ShieldAlert, 
  FileText,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Menu,
  Languages,
  Upload,
  X,
  Trash2,
  Plus,
  Briefcase,
  Clock,
  ArrowRight,
  Download,
  Database,
  User,
  CheckCircle,
  BarChart3,
  HelpCircle,
  Calculator,
  Loader2,
  FileSpreadsheet,
  Layers,
  Settings2,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MetrajItem, Project, AuditRecord, AppScreen, ValidationResult, AIAnalysis, Severity, Language } from './types';
import { runStructuralRules, calculateQuantity } from './services/ruleEngine';
import { getAIExpertAnalysis, analyzeExcelStructure } from './services/geminiService';
import { translations } from './services/translations';

interface UserSettings {
  orgName: string;
  preferredStandard: string;
}

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('metraj_projects');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [auditHistory, setAuditHistory] = useState<AuditRecord[]>(() => {
    const saved = localStorage.getItem('metraj_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('metraj_settings');
    return saved ? JSON.parse(saved) : { orgName: '', preferredStandard: 'TS 500' };
  });

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [screen, setScreen] = useState<AppScreen>('ONBOARDING');
  const [language, setLanguage] = useState<Language>('TR');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [viewingAudit, setViewingAudit] = useState<AuditRecord | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [guideContent, setGuideContent] = useState<string | null>(null);

  const t = (key: keyof typeof translations['TR']) => (translations[language] as any)[key] || key;

  useEffect(() => { localStorage.setItem('metraj_projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('metraj_history', JSON.stringify(auditHistory)); }, [auditHistory]);
  useEffect(() => { localStorage.setItem('metraj_settings', JSON.stringify(settings)); }, [settings]);

  const activeProject = useMemo(() => 
    projects.find(p => p.id === currentProjectId), 
    [projects, currentProjectId]
  );

  const validationResults = useMemo(() => 
    activeProject ? runStructuralRules(activeProject.items) : [], 
    [activeProject]
  );

  const createProject = (name: string) => {
    const newProj: Project = { id: Date.now().toString(), name, createdAt: new Date().toISOString(), items: [] };
    setProjects(prev => [...prev, newProj]);
    setCurrentProjectId(newProj.id);
    setScreen('INPUT');
  };

  const deleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
    if (currentProjectId === id) setCurrentProjectId(null);
  };

  const updateItems = (newItems: MetrajItem[]) => {
    if (!currentProjectId) return;
    setProjects(prev => prev.map(p => p.id === currentProjectId ? { ...p, items: newItems } : p));
  };

  const runFullAudit = async () => {
    if (!activeProject) return;
    setIsAnalyzing(true);
    setScreen('VALIDATION');
    try {
      const results = runStructuralRules(activeProject.items);
      const analysis = await getAIExpertAnalysis(activeProject.items, results, language);
      setAiAnalysis(analysis);
      const newRecord: AuditRecord = { id: Date.now().toString(), projectId: activeProject.id, projectName: activeProject.name, date: new Date().toISOString(), analysis, itemCount: activeProject.items.length, riskScore: analysis.riskScore };
      setAuditHistory(prev => [newRecord, ...prev]);
      setScreen('AI_PANEL');
    } catch (err) { console.error(err); } finally { setIsAnalyzing(false); setIsSidebarOpen(false); }
  };

  const clearAllData = () => {
    if (confirm(t('dangerZone'))) {
      setProjects([]); setAuditHistory([]); setCurrentProjectId(null); setScreen('ONBOARDING');
      localStorage.clear();
    }
  };

  const HelpModal = () => {
    if (!guideContent) return null;
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
          <button onClick={() => setGuideContent(null)} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full text-gray-400"><X size={20} /></button>
          <div className="flex items-center gap-3 mb-6"><div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><HelpCircle size={32} /></div><h3 className="text-2xl font-bold">{t('howToUse')}</h3></div>
          <div className="text-gray-600 leading-relaxed text-lg">{guideContent}</div>
          <button onClick={() => setGuideContent(null)} className="w-full mt-8 py-3 bg-blue-600 text-white rounded-xl font-bold">{t('close')}</button>
        </div>
      </div>
    );
  };

  const SectionHeader = ({ title, onInfo }: { title: string, onInfo: () => void }) => (
    <div className="flex items-center gap-3 mb-1">
      <h2 className="text-3xl font-bold">{title}</h2>
      <button onClick={onInfo} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"><Info size={22} /></button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gray-50 text-gray-900">
      <HelpModal />
      {screen !== 'ONBOARDING' && (
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b sticky top-0 z-50">
          <div className="flex items-center space-x-2"><ShieldCheck className="text-blue-600" size={24} /><span className="text-lg font-bold">METRAJ AI</span></div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2"><Menu size={24} /></button>
        </header>
      )}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[60] lg:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      {screen !== 'ONBOARDING' && (
        <aside className={`fixed lg:sticky top-0 left-0 h-full z-[70] bg-white border-r transition-all duration-300 ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'} ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-2"><ShieldCheck className="text-blue-600" size={28} /><span className={`text-xl font-bold ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>METRAJ AI</span></div>
            <button onClick={() => window.innerWidth >= 1024 ? setIsSidebarCollapsed(!isSidebarCollapsed) : setIsSidebarOpen(false)}>{isSidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            <NavItem icon={LayoutDashboard} label={t('dashboard')} target="DASHBOARD" active={screen === 'DASHBOARD'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem icon={PlusCircle} label={t('input')} target="INPUT" active={screen === 'INPUT'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem icon={History} label={t('history')} target="HISTORY" active={screen === 'HISTORY'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem icon={ShieldAlert} label={t('aiAdvisor')} target="AI_PANEL" active={screen === 'AI_PANEL'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
            <NavItem icon={FileText} label={t('reports')} target="REPORTS" active={screen === 'REPORTS'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
          </nav>
          <div className="p-4 border-t mt-auto">
            <button onClick={() => setLanguage(language === 'TR' ? 'EN' : 'TR')} className="w-full flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Languages size={20} className="text-blue-600" /><span className={`${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>{language === 'TR' ? 'English' : 'Türkçe'}</span>
            </button>
            <NavItem icon={SettingsIcon} label={t('settings')} target="SETTINGS" active={screen === 'SETTINGS'} setScreen={setScreen} setIsSidebarOpen={setIsSidebarOpen} isSidebarCollapsed={isSidebarCollapsed} />
          </div>
        </aside>
      )}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-4 lg:p-8">
          {screen === 'ONBOARDING' && <OnboardingView onComplete={() => setScreen('DASHBOARD')} t={t} />}
          {screen === 'DASHBOARD' && <ProjectHubView projects={projects} onCreate={createProject} onSelect={(id:string) => { setCurrentProjectId(id); setScreen('INPUT'); }} onDelete={deleteProject} onInfo={() => setGuideContent(t('guideDashboard'))} t={t} SectionHeader={SectionHeader} />}
          {screen === 'INPUT' && <MetrajInputView activeProject={activeProject} setItems={updateItems} onAudit={runFullAudit} onInfo={() => setGuideContent(t('guideInput'))} language={language} t={t} SectionHeader={SectionHeader} />}
          {screen === 'VALIDATION' && <ValidationView results={validationResults} isAnalyzing={isAnalyzing} onInfo={() => setGuideContent(t('guideAudit'))} t={t} SectionHeader={SectionHeader} />}
          {(screen === 'AI_PANEL' || screen === 'VIEW_AUDIT') && <AIExpertPanel analysis={screen === 'VIEW_AUDIT' ? viewingAudit?.analysis : aiAnalysis} isAnalyzing={isAnalyzing} title={screen === 'VIEW_AUDIT' ? viewingAudit?.projectName : undefined} onInfo={() => setGuideContent(t('guideAI'))} t={t} SectionHeader={SectionHeader} />}
          {screen === 'HISTORY' && <AuditHistoryView history={auditHistory} onView={(record: AuditRecord) => { setViewingAudit(record); setScreen('VIEW_AUDIT'); }} onInfo={() => setGuideContent(t('guideHistory'))} t={t} SectionHeader={SectionHeader} />}
          {screen === 'SETTINGS' && <SettingsView settings={settings} setSettings={setSettings} onClear={clearAllData} onInfo={() => setGuideContent(t('guideSettings'))} t={t} SectionHeader={SectionHeader} />}
          {screen === 'REPORTS' && <ReportsView activeProject={activeProject} settings={settings} onInfo={() => setGuideContent(t('guideReports'))} t={t} SectionHeader={SectionHeader} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon: Icon, label, target, active, setScreen, setIsSidebarOpen, isSidebarCollapsed }: any) => (
  <button onClick={() => { setScreen(target); setIsSidebarOpen(false); }} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-gray-500 hover:bg-gray-100'}`}>
    <Icon size={20} /><span className={`font-medium ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>{label}</span>
  </button>
);

const MetrajInputView = ({ activeProject, setItems, onAudit, onInfo, language, t, SectionHeader }: any) => {
  if (!activeProject) return <div className="py-20 text-center"><Info size={40} className="mx-auto mb-4 opacity-20" /><p>{t('noProjectSelected')}</p></div>;
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExcelLoading, setIsExcelLoading] = useState(false);
  const [analysisDuration, setAnalysisDuration] = useState<number | null>(null);
  
  const [importPreview, setImportPreview] = useState<{ 
    mapping: Record<string, number>, 
    rawRows: any[][], 
    startRow: number 
  } | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState<Partial<MetrajItem>>({
    pozNumber: '', description: '', unit: 'm3', multiplier: 1, x: 0, y: 0, z: 0, count: 1, unitWeight: 0, totalQuantity: 0, category: 'Concrete'
  });

  const calculatedVal = useMemo(() => calculateQuantity(newRow), [newRow]);

  const parseMetrajValue = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleaned = String(val)
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .replace(/[^-0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const parsedItemsPreview = useMemo(() => {
    if (!importPreview) return [];
    const { mapping, rawRows, startRow } = importPreview;
    return rawRows.slice(startRow).filter(r => r[mapping.pozNumber] || r[mapping.description]).map((cols, i) => {
      const itemBase: Partial<MetrajItem> = {
        pozNumber: String(cols[mapping.pozNumber] || ''),
        description: String(cols[mapping.description] || ''),
        unit: String(cols[mapping.unit] || 'm3'),
        multiplier: parseMetrajValue(cols[mapping.multiplier]) || 1,
        x: parseMetrajValue(cols[mapping.x]),
        y: parseMetrajValue(cols[mapping.y]),
        z: parseMetrajValue(cols[mapping.z]),
        unitWeight: parseMetrajValue(cols[mapping.unitWeight]),
        count: parseMetrajValue(cols[mapping.count]) || 1,
        totalQuantity: parseMetrajValue(cols[mapping.totalQuantity]),
        category: (cols[mapping.category] as any) || 'Concrete'
      };
      return {
        ...itemBase,
        id: `excel-${Date.now()}-${i}`,
        area: (itemBase.x || 0) * (itemBase.y || 0),
        volume: (itemBase.x || 0) * (itemBase.y || 0) * (itemBase.z || 0),
        calculatedQuantity: calculateQuantity(itemBase)
      } as MetrajItem;
    });
  }, [importPreview]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setIsExcelLoading(true);
    setAnalysisDuration(null);
    const startTime = performance.now();
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        const { mapping, startRow } = await analyzeExcelStructure(jsonData.slice(0, 10), language);
        
        const endTime = performance.now();
        setAnalysisDuration(Number(((endTime - startTime) / 1000).toFixed(2)));
        
        setImportPreview({ 
          mapping, 
          rawRows: jsonData, 
          startRow 
        });
      } catch (err) { 
        console.error(err);
        alert("Excel analysis error. Check console."); 
      } finally { 
        setIsExcelLoading(false); 
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; 
  };

  const addItem = (e: React.FormEvent) => {
    e.preventDefault();
    const item: MetrajItem = {
      ...newRow as MetrajItem,
      id: Date.now().toString(),
      area: (newRow.x || 0) * (newRow.y || 0),
      volume: (newRow.x || 0) * (newRow.y || 0) * (newRow.z || 0),
      calculatedQuantity: calculatedVal
    };
    setItems([item, ...activeProject.items]);
    setShowAddForm(false);
    setNewRow({ pozNumber: '', description: '', unit: 'm3', multiplier: 1, x: 0, y: 0, z: 0, count: 1, unitWeight: 0, totalQuantity: 0, category: 'Concrete' });
  };

  const ColumnMappingRow = ({ fieldKey, label, currentIdx, excelHeaders }: any) => (
    <div className="flex items-center justify-between gap-4 p-3 bg-white border rounded-xl shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
        <span className="text-sm font-bold text-gray-700">{label}</span>
      </div>
      <select 
        className="text-xs font-mono bg-gray-50 border-none rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none min-w-[120px]"
        value={currentIdx}
        onChange={(e) => {
          const val = parseInt(e.target.value);
          if (importPreview) {
            setImportPreview({
              ...importPreview,
              mapping: { ...importPreview.mapping, [fieldKey]: val }
            });
          }
        }}
      >
        <option value="-1">Eşleşmedi</option>
        {excelHeaders.map((header: string, idx: number) => (
          <option key={idx} value={idx}>
            {String.fromCharCode(65 + idx)} - {header ? (header.length > 20 ? header.substring(0,20)+'...' : header) : `Boş`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><div className="text-xs font-bold text-blue-600 uppercase mb-1">{t('activeProject')}</div><SectionHeader title={activeProject.name} onInfo={onInfo} /></div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddForm(!showAddForm)} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100"><Plus size={18} /> {t('addRow')}</button>
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isExcelLoading}
            className="px-4 py-2 bg-white border rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {isExcelLoading ? <Loader2 className="animate-spin" /> : <Upload size={18} />} {isExcelLoading ? 'Analiz Ediliyor...' : t('uploadExcel')}
          </button>
          <button onClick={onAudit} className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-700 shadow-lg shadow-blue-500/20"><ShieldAlert size={18} /> {t('verifyAudit')}</button>
        </div>
      </header>
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".xlsx,.xls,.csv" />

      {importPreview && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-6xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
            <div className="p-8 border-b flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Settings2 size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black">{t('preview')}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-blue-100 text-sm font-medium">{parsedItemsPreview.length} {t('itemsCount')} tespit edildi.</p>
                    {analysisDuration && (
                      <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Zap size={10} fill="currentColor"/> {analysisDuration} saniye
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setImportPreview(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="lg:w-80 border-r bg-gray-50/50 p-6 overflow-y-auto space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator size={18} className="text-blue-600" />
                  <h4 className="font-black text-gray-800 uppercase tracking-tight text-sm">Kolon Eşleşmeleri</h4>
                </div>
                <div className="space-y-3">
                  <ColumnMappingRow fieldKey="pozNumber" label="Poz No" currentIdx={importPreview.mapping.pozNumber} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="description" label="Açıklama" currentIdx={importPreview.mapping.description} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="totalQuantity" label="Manuel Miktar" currentIdx={importPreview.mapping.totalQuantity} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="unit" label="Birim" currentIdx={importPreview.mapping.unit} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="x" label="Boyut X" currentIdx={importPreview.mapping.x} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="y" label="Boyut Y" currentIdx={importPreview.mapping.y} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="z" label="Boyut Z" currentIdx={importPreview.mapping.z} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="multiplier" label="Benzer/Çarpan" currentIdx={importPreview.mapping.multiplier} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="unitWeight" label="Birim Ağırlık" currentIdx={importPreview.mapping.unitWeight} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                  <ColumnMappingRow fieldKey="count" label="Adet" currentIdx={importPreview.mapping.count} excelHeaders={importPreview.rawRows[importPreview.startRow - 1] || []} />
                </div>
              </div>

              <div className="flex-1 overflow-auto bg-white">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-gray-800 text-lg">Aktarım Önizlemesi</h4>
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold border border-green-100">
                      <ShieldCheck size={18} /> AI Analizi Aktif
                    </div>
                  </div>
                  
                  <div className="border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="p-4">Poz No</th>
                          <th className="p-4">Tanım</th>
                          <th className="p-4 text-right bg-blue-50/50">Manuel Miktar</th>
                          <th className="p-4 text-right">Hesaplanan</th>
                          <th className="p-4 text-center">Durum</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedItemsPreview.slice(0, 50).map((it, i) => {
                          const diff = Math.abs(it.calculatedQuantity - it.totalQuantity);
                          const isError = diff > 0.01;
                          return (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="p-4 font-bold text-blue-600">{it.pozNumber || '-'}</td>
                              <td className="p-4 text-gray-600 font-medium">{it.description || '-'}</td>
                              <td className="p-4 text-right font-black text-blue-800 bg-blue-50/20">{it.totalQuantity.toFixed(3)}</td>
                              <td className="p-4 text-right font-bold text-gray-400">{it.calculatedQuantity.toFixed(3)}</td>
                              <td className="p-4 text-center">
                                {isError ? (
                                  <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 px-2 py-1 rounded-lg font-bold">
                                    <AlertTriangle size={12}/> {t('mismatch')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 bg-green-50 text-green-600 px-2 py-1 rounded-lg font-bold">
                                    <CheckCircle size={12}/> {t('valid')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t flex gap-4">
              <button 
                onClick={() => setImportPreview(null)} 
                className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-gray-600 hover:bg-gray-100 transition-all shadow-sm"
              >
                İşlemi İptal Et
              </button>
              <button 
                onClick={() => { 
                  setItems([...parsedItemsPreview, ...activeProject.items]); 
                  setImportPreview(null); 
                }} 
                className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all transform active:scale-[0.98]"
              >
                {t('importConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddForm && (
        <form onSubmit={addItem} className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-xl space-y-6 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1"><label className="text-[10px] font-bold text-gray-400 uppercase">Poz No</label><input required placeholder="15.150.1001" className="w-full px-3 py-2 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold" value={newRow.pozNumber} onChange={e => setNewRow({...newRow, pozNumber: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="text-[10px] font-bold text-gray-400 uppercase">Açıklama</label><input required placeholder="C25/30 Beton" className="w-full px-3 py-2 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={newRow.description} onChange={e => setNewRow({...newRow, description: e.target.value})} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">Birim</label><select className="w-full px-3 py-2 bg-gray-50 rounded-xl outline-none" value={newRow.unit} onChange={e => setNewRow({...newRow, unit: e.target.value})}><option value="m3">m³</option><option value="m2">m²</option><option value="kg">kg</option><option value="adet">Adet</option></select></div>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-2xl">
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t('dimX')}</label><input type="number" step="any" className="w-full bg-transparent font-bold outline-none" value={newRow.x} onChange={e => setNewRow({...newRow, x: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t('dimY')}</label><input type="number" step="any" className="w-full bg-transparent font-bold outline-none" value={newRow.y} onChange={e => setNewRow({...newRow, y: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t('dimZ')}</label><input type="number" step="any" className="w-full bg-transparent font-bold outline-none" value={newRow.z} onChange={e => setNewRow({...newRow, z: parseFloat(e.target.value) || 0})} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t('multiplier')}</label><input type="number" step="any" className="w-full bg-transparent font-bold outline-none" value={newRow.multiplier} onChange={e => setNewRow({...newRow, multiplier: parseFloat(e.target.value) || 1})} /></div>
            <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t('unitWeight')}</label><input type="number" step="any" className="w-full bg-transparent font-bold outline-none" value={newRow.unitWeight} onChange={e => setNewRow({...newRow, unitWeight: parseFloat(e.target.value) || 0})} /></div>
            <div className="bg-blue-600 text-white p-2 rounded-xl text-center flex flex-col justify-center">
              <span className="text-[8px] font-bold opacity-70 uppercase">Hesaplanan</span>
              <span className="text-sm font-black">{calculatedVal.toFixed(3)}</span>
            </div>
          </div>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1"><label className="text-[10px] font-bold text-gray-400 uppercase">{t('totalManual')}</label><input type="number" step="any" className="w-full px-4 py-3 bg-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-black" value={newRow.totalQuantity} onChange={e => setNewRow({...newRow, totalQuantity: parseFloat(e.target.value) || 0})} /></div>
            <button type="submit" className="md:w-48 bg-gray-900 text-white rounded-xl font-bold hover:bg-black">{t('quickAdd')}</button>
          </div>
        </form>
      )}

      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left min-w-[1200px]">
          <thead className="bg-gray-50 font-bold uppercase text-gray-400 border-b">
            <tr>
              <th className="p-4">Poz No / Açıklama</th><th className="p-4">Birim</th>
              <th className="p-4 text-center">X (m)</th><th className="p-4 text-center">Y (m)</th><th className="p-4 text-center">Z (m)</th>
              <th className="p-4 text-center">Alan (m²)</th><th className="p-4 text-center">Hacim (m³)</th><th className="p-4 text-center">Birim Ağırlık</th>
              <th className="p-4 text-right">Hesaplanan</th><th className="p-4 text-right">Manuel</th><th className="p-4 text-center">Durum</th><th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {activeProject.items.map(item => {
              const hasError = Math.abs(item.calculatedQuantity - item.totalQuantity) > 0.01;
              return (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4"><div className="font-bold text-blue-600">{item.pozNumber}</div><div className="text-gray-500 truncate max-w-xs">{item.description}</div></td>
                  <td className="p-4 font-medium">{item.unit}</td>
                  <td className="p-4 text-center">{item.x || '-'}</td><td className="p-4 text-center">{item.y || '-'}</td><td className="p-4 text-center">{item.z || '-'}</td>
                  <td className="p-4 text-center text-gray-400">{item.area ? item.area.toFixed(2) : '-'}</td>
                  <td className="p-4 text-center text-gray-400">{item.volume ? item.volume.toFixed(2) : '-'}</td>
                  <td className="p-4 text-center">{item.unitWeight || '-'}</td>
                  <td className="p-4 text-right font-bold text-gray-400">{item.calculatedQuantity.toFixed(3)}</td>
                  <td className="p-4 text-right font-black text-lg">{item.totalQuantity.toFixed(3)}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full font-bold uppercase text-[10px] ${hasError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {hasError ? t('mismatch') : t('valid')}
                    </span>
                  </td>
                  <td className="p-4 text-right"><button onClick={() => setItems(activeProject.items.filter(it => it.id !== item.id))} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OnboardingView = ({ onComplete, t }: any) => (
  <div className="max-w-2xl mx-auto mt-12 text-center">
    <div className="mb-8 flex justify-center"><div className="p-6 bg-blue-100 rounded-3xl text-blue-600"><ShieldCheck size={64} /></div></div>
    <h1 className="text-5xl font-black mb-4 tracking-tight">{t('welcome')}</h1>
    <p className="text-xl text-gray-500 mb-12">{t('onboardingSub')}</p>
    <button onClick={onComplete} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-500/30 inline-flex items-center gap-2">{t('initSystem')} <ArrowRight size={20} /></button>
  </div>
);

const ProjectHubView = ({ projects, onCreate, onSelect, onDelete, onInfo, t, SectionHeader }: any) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end"><SectionHeader title={t('projectOverview')} onInfo={onInfo} /><button onClick={() => setShowModal(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20"><Plus size={20} /> {t('newProject')}</button></header>
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-6">{t('newProject')}</h3>
            <input autoFocus value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 border rounded-xl outline-none focus:ring-2 mb-6" placeholder={t('projectName')} />
            <div className="flex gap-3"><button onClick={() => setShowModal(false)} className="flex-1 py-3 border rounded-xl font-bold">Vazgeç</button><button onClick={() => { if(name){ onCreate(name); setName(''); setShowModal(false); } }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">{t('create')}</button></div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length === 0 ? <div className="col-span-full py-20 text-center bg-white border-2 border-dashed rounded-3xl text-gray-400"><Layers size={48} className="mx-auto mb-4 opacity-20"/><p>{t('noProjectSelected')}</p></div> : projects.map((p: any) => (
          <div key={p.id} className="bg-white p-6 rounded-3xl border shadow-sm hover:shadow-md transition-all group relative">
            <div className="flex justify-between mb-4"><div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Briefcase size={24}/></div><button onClick={() => onDelete(p.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18}/></button></div>
            <h4 className="text-xl font-bold mb-1 truncate">{p.name}</h4><p className="text-gray-400 text-sm mb-6">{new Date(p.createdAt).toLocaleDateString()}</p>
            <div className="flex justify-between items-center"><div className="text-xs font-bold text-gray-400 uppercase">{p.items.length} Kalem</div><button onClick={() => onSelect(p.id)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 group-hover:bg-blue-600 transition-colors">Aç <ArrowRight size={16}/></button></div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AuditHistoryView = ({ history, onView, onInfo, t, SectionHeader }: any) => (
  <div className="space-y-8">
    <header><SectionHeader title={t('history')} onInfo={onInfo} /><p className="text-gray-500">{history.length} {t('auditSaved')}</p></header>
    <div className="grid gap-4">
      {history.length === 0 ? <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed text-gray-400"><Clock size={48} className="mx-auto mb-4 opacity-10"/><p>Geçmiş bulunmuyor.</p></div> : history.map((h: any) => (
        <div key={h.id} onClick={() => onView(h)} className="bg-white p-5 rounded-2xl border hover:border-blue-200 transition-all cursor-pointer flex justify-between items-center">
          <div className="flex items-center gap-4"><div className={`h-12 w-12 rounded-full flex items-center justify-center font-black text-sm ${h.riskScore > 60 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{h.riskScore}%</div><div><h4 className="font-bold text-lg">{h.projectName}</h4><span className="text-xs text-gray-400 font-medium">{new Date(h.date).toLocaleString()}</span></div></div>
          <button className="text-blue-600 font-bold flex items-center gap-1">{t('viewReport')} <ChevronRight size={16}/></button>
        </div>
      ))}
    </div>
  </div>
);

const AIExpertPanel = ({ analysis, isAnalyzing, title, onInfo, t, SectionHeader }: any) => (
  <div className="space-y-8">
    <header><SectionHeader title={title || t('aiAdvisor')} onInfo={onInfo} /></header>
    {isAnalyzing ? <div className="py-20 text-center"><Loader2 className="animate-spin h-12 w-12 mx-auto mb-4 text-blue-600" /><p>{t('aiAnalyzing')}</p></div> : analysis ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-3xl border shadow-sm flex flex-col items-center sticky top-24 h-fit">
          <h3 className="font-bold text-lg mb-8">{t('riskProfile')}</h3>
          <div className={`h-40 w-40 rounded-full border-[12px] flex items-center justify-center text-4xl font-black ${analysis.riskScore > 60 ? 'border-red-500 text-red-500' : 'border-green-500 text-green-500'}`}>{analysis.riskScore}%</div>
          <p className="mt-8 text-center text-gray-500 leading-relaxed font-medium">{analysis.summary}</p>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-xl px-2">{t('keyFindings')}</h3>
          {analysis.findings.map((f: any, i: number) => (
            <div key={i} className={`bg-white p-6 rounded-3xl border-l-8 shadow-sm transition-all hover:translate-x-1 ${f.severity === 'CRITICAL' ? 'border-red-500' : 'border-amber-500'}`}>
              <div className="flex justify-between mb-3"><h4 className="font-bold text-lg">{f.title}</h4><span className="text-[10px] font-mono bg-gray-100 px-2 py-1 rounded-full">{f.standard}</span></div>
              <p className="text-gray-600 leading-relaxed">{f.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    ) : <div className="py-20 text-center bg-white rounded-3xl border border-dashed text-gray-400">{t('noData')}</div>}
  </div>
);

const ValidationView = ({ results, isAnalyzing, onInfo, t, SectionHeader }: any) => (
  <div className="space-y-6">
    <SectionHeader title={t('audit')} onInfo={onInfo} />
    {isAnalyzing ? <div className="py-20 text-center">Motor kuralları işliyor...</div> : (
      <div className="grid gap-4">
        {results.map((res: any, i: number) => (
          <div key={i} className={`p-6 bg-white rounded-2xl border-l-8 shadow-sm ${res.severity === 'CRITICAL' ? 'border-red-500' : 'border-amber-500'}`}>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{res.standardReference}</span>
            <h4 className="font-bold text-xl mt-1">{res.message}</h4>
            <p className="text-gray-500 mt-2 font-medium">👉 {res.suggestedAction}</p>
          </div>
        ))}
        {results.length === 0 && <div className="py-12 text-center bg-green-50 text-green-600 rounded-3xl font-bold"><CheckCircle className="mx-auto mb-2" size={32}/> Her şey yolunda görünüyor!</div>}
      </div>
    )}
  </div>
);

const ReportsView = ({ activeProject, settings, onInfo, t, SectionHeader }: any) => {
  const exportToExcel = () => {
    if (!activeProject) return;
    const worksheet = XLSX.utils.json_to_sheet(activeProject.items);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Metraj");
    XLSX.writeFile(workbook, `${activeProject.name}_Detayli_Metraj.xlsx`);
  };
  const stats = useMemo(() => {
    if (!activeProject) return { vol: 0, area: 0, count: 0 };
    return activeProject.items.reduce((acc: any, item: MetrajItem) => {
      if (item.unit === 'm3') acc.vol += item.totalQuantity;
      if (item.unit === 'm2') acc.area += item.totalQuantity;
      acc.count++;
      return acc;
    }, { vol: 0, area: 0, count: 0 });
  }, [activeProject]);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end"><SectionHeader title={t('reports')} onInfo={onInfo} /><button onClick={exportToExcel} disabled={!activeProject} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"><Download size={20}/> {t('exportExcel')}</button></header>
      {!activeProject ? <div className="py-20 text-center bg-white border-2 border-dashed rounded-3xl"><Info size={40} className="mx-auto mb-4 opacity-20"/><p>{t('noProjectSelected')}</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label={t('itemsCount')} value={stats.count} icon={Database} color="text-blue-500" />
          <StatCard label={t('totalVolume')} value={stats.vol.toFixed(2) + ' m³'} icon={BarChart3} color="text-indigo-500" />
          <StatCard label={t('totalArea')} value={stats.area.toFixed(2) + ' m²'} icon={FileText} color="text-amber-500" />
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ settings, setSettings, onClear, onInfo, t, SectionHeader }: any) => {
  const [success, setSuccess] = useState(false);
  const save = () => { setSuccess(true); setTimeout(() => setSuccess(false), 2000); };
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <SectionHeader title={t('settings')} onInfo={onInfo} />
      <div className="bg-white p-8 rounded-3xl border shadow-sm space-y-6">
        <h3 className="text-lg font-bold flex items-center gap-2"><User className="text-blue-600" size={20}/> Mühendislik Profili</h3>
        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Kuruluş / Şirket</label><input value={settings.orgName} onChange={e => setSettings({...settings, orgName: e.target.value})} className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 font-bold" /></div>
        <div><label className="text-[10px] font-bold text-gray-400 uppercase">Tercih Edilen Standart</label><select value={settings.preferredStandard} onChange={e => setSettings({...settings, preferredStandard: e.target.value})} className="w-full mt-1 px-4 py-3 bg-gray-50 rounded-xl outline-none focus:ring-2 font-bold"><option>TS 500</option><option>Eurocode 2</option><option>ACI 318</option></select></div>
        <button onClick={save} className="w-full py-4 bg-gray-900 text-white rounded-xl font-black flex items-center justify-center gap-2 hover:bg-black transition-all">{success ? <CheckCircle size={20} className="text-green-400"/> : <ShieldCheck size={20}/>} {t('saveSettings')}</button>
      </div>
      <div className="bg-red-50 p-8 rounded-3xl border border-red-100"><h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle size={20}/> {t('dangerZone')}</h3><p className="text-red-600/70 text-sm mb-6">Tüm projeler ve hakediş verileri kalıcı olarak silinecektir.</p><button onClick={onClear} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-red-600/20">{t('clearData')}</button></div>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color = "text-blue-600" }: any) => (
  <div className="bg-white p-6 rounded-2xl border shadow-sm"><div className={`p-3 w-fit bg-gray-50 rounded-xl mb-4 ${color}`}><Icon size={24} /></div><div className="text-3xl font-black">{value}</div><div className="text-xs text-gray-400 font-bold uppercase mt-1">{label}</div></div>
);

export default App;
