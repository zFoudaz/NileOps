export interface DecodedNationalId {
  isValid: boolean;
  dateOfBirth?: string;
  birthDate?: Date;
  age?: number;
  gender?: 'ذكر' | 'أنثى';
  governorate?: string;
  governorateCode?: string;
  error?: string;
}

export const EGYPT_GOVERNORATES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'مركز كبار السن / مولود بالخارج',
};

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function normalizeDigits(input: string): string {
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(ARABIC_INDIC_DIGITS[i], i.toString());
  }
  return result;
}

export function decodeEgyptianNationalId(rawNationalId?: unknown): DecodedNationalId {
  if (!rawNationalId || typeof rawNationalId !== 'string') {
    return { isValid: false, error: 'الرقم القومي غير متوفر' };
  }

  const clean = normalizeDigits(rawNationalId.trim());

  if (clean.length !== 14 || !/^\d{14}$/.test(clean)) {
    return {
      isValid: false,
      error: 'الرقم القومي يجب أن يتكون من 14 رقماً',
    };
  }

  const centuryChar = clean[0];
  let centuryYear = 0;
  if (centuryChar === '2') {
    centuryYear = 1900;
  } else if (centuryChar === '3') {
    centuryYear = 2000;
  } else {
    return {
      isValid: false,
      error: 'رمز القرن غير صالح (يجب أن يبدأ بـ 2 أو 3)',
    };
  }

  const yy = parseInt(clean.substring(1, 3), 10);
  const mm = parseInt(clean.substring(3, 5), 10);
  const dd = parseInt(clean.substring(5, 7), 10);
  const fullYear = centuryYear + yy;

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return {
      isValid: false,
      error: 'تاريخ الميلاد غير صالح في الرقم القومي',
    };
  }

  const birthDate = new Date(fullYear, mm - 1, dd);
  if (
    birthDate.getFullYear() !== fullYear ||
    birthDate.getMonth() !== mm - 1 ||
    birthDate.getDate() !== dd
  ) {
    return {
      isValid: false,
      error: 'تاريخ الميلاد غير صالح في الرقم القومي',
    };
  }

  const today = new Date();
  if (birthDate > today) {
    return {
      isValid: false,
      error: 'تاريخ الميلاد لا يمكن أن يكون في المستقبل',
    };
  }

  // Age calculation
  let age = today.getFullYear() - birthDate.getFullYear();
  const mDiff = today.getMonth() - birthDate.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  // Governorate
  const govCode = clean.substring(7, 9);
  const governorate = EGYPT_GOVERNORATES[govCode] || 'غير محدد';

  // Gender: digit 12 (0-indexed) odd = male, even = female
  const genderDigit = parseInt(clean[12], 10);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const dateOfBirth = `${fullYear}-${pad(mm)}-${pad(dd)}`;

  return {
    isValid: true,
    birthDate,
    dateOfBirth,
    age,
    gender,
    governorate,
    governorateCode: govCode,
  };
}
