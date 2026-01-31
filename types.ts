
export enum Severity {
  CRITICAL = 'CRITICAL',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export type Language = 'TR' | 'EN';

export interface MetrajItem {
  id: string;
  pozNumber: string;
  description: string;
  unit: string;
  multiplier: number;
  x: number; // Boyut X
  y: number; // Boyut Y
  z: number; // Boyut Z
  area: number; // Alan (m2)
  volume: number; // Hacim (m3)
  unitWeight: number; // Birim Ağırlık (kg/m2 veya kg/m3)
  count: number; // Adet
  totalQuantity: number; // Manuel Miktar
  calculatedQuantity: number; // Hesaplanan Miktar
  category: 'Concrete' | 'Formwork' | 'Reinforcement' | 'Finishing';
  notes?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  items: MetrajItem[];
}

export interface AuditRecord {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  analysis: AIAnalysis;
  itemCount: number;
  riskScore: number;
}

export interface ValidationResult {
  itemId: string;
  severity: Severity;
  message: string;
  standardReference: string;
  suggestedAction: string;
}

export interface AIAnalysis {
  riskScore: number;
  summary: string;
  findings: Array<{
    title: string;
    explanation: string;
    standard: string;
    severity: Severity;
  }>;
}

export type AppScreen = 
  | 'ONBOARDING' 
  | 'DASHBOARD' 
  | 'INPUT' 
  | 'VALIDATION' 
  | 'AI_PANEL' 
  | 'REPORTS' 
  | 'SETTINGS' 
  | 'HISTORY'
  | 'VIEW_AUDIT';
