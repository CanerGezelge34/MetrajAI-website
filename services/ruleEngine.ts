
import { MetrajItem, ValidationResult, Severity } from '../types';

/**
 * DETERMINISTIC CALCULATION ENGINE
 * İnşaat metraj standartlarına göre X*Y=Alan, X*Y*Z=Hacim ve Birim hiyerarşisine göre hesaplama yapar.
 */
export const calculateQuantity = (item: Partial<MetrajItem>): number => {
  const x = item.x || 0;
  const y = item.y || 0;
  const z = item.z || 0;
  const multiplier = item.multiplier || 1;
  const count = item.count || 1;
  const unitWeight = item.unitWeight || 0;
  const unit = (item.unit || '').toLowerCase();

  // Ara hesaplamalar
  const area = x * y;
  const volume = x * y * z;

  let result = 0;

  if (unit === 'm3') {
    result = volume;
  } else if (unit === 'm2') {
    result = area;
  } else if (unit === 'kg' || unit === 'ton') {
    // Hasır çelik vb. için Alan * Birim Ağırlık veya Hacim * Birim Ağırlık
    // Eğer Z varsa Hacim üzerinden, yoksa Alan üzerinden ağırlık hesabı
    const base = z > 0 ? volume : area;
    result = base * unitWeight;
    if (unit === 'ton') result = result / 1000;
  } else {
    // m veya adet gibi doğrusal/sayısal birimler
    result = x || y || z || 1;
  }

  return Number((result * multiplier * count).toFixed(3));
};

export const runStructuralRules = (items: MetrajItem[]): ValidationResult[] => {
  const results: ValidationResult[] = [];

  items.forEach(item => {
    if (item.category === 'Concrete' && item.unit === 'm3') {
      if (!item.x || !item.y || !item.z) {
        results.push({
          itemId: item.id,
          severity: Severity.CRITICAL,
          message: `Beton metrajında (m3) boyutlardan biri eksik (X, Y veya Z). Poz: ${item.pozNumber}`,
          standardReference: 'TS 500',
          suggestedAction: 'Projedeki tüm geometrik boyutları kontrol edin.'
        });
      }
    }

    const computed = calculateQuantity(item);
    if (Math.abs(computed - item.totalQuantity) > 0.01) {
      results.push({
        itemId: item.id,
        severity: Severity.CRITICAL,
        message: `Hesaplama Uyuşmazlığı. Manuel: ${item.totalQuantity}, Sistem: ${computed}. Poz: ${item.pozNumber}`,
        standardReference: 'Matematiksel Doğrulama',
        suggestedAction: 'Manuel girilen toplam miktarı sistem hesaplamasıyla eşitleyin.'
      });
    }
  });

  return results;
};
