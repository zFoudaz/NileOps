import type { AccountType, AutoDecision, DocumentType, RequestStatus } from '@/types';

export const ACCOUNT_TYPES_INFO: Record<
  AccountType,
  {
    title: string;
    badge: string;
    ageRange: string;
    description: string;
    requiredDocs: DocumentType[];
  }
> = {
  individual: {
    title: 'حساب أفراد',
    badge: 'أفراد',
    ageRange: '21 سنة فأكثر',
    description: 'الحساب المصرفي القياسي للأفراد البالغين من سن 21 سنة فأكثر مع إمكانية الوصول لكافة الخدمات والبطاقات المصرفية.',
    requiredDocs: [
      'national_id_front',
      'national_id_back',
      'proof_of_residence',
      'proof_of_income',
    ],
  },
  youth: {
    title: 'حساب شباب',
    badge: 'شباب',
    ageRange: 'من 15 إلى 21 سنة',
    description: 'حساب بنكي مميز مخصص للشباب والطلاب بدون مصاريف فتح حساب ودون اشتراط إثبات دخل.',
    requiredDocs: [
      'national_id_front',
      'national_id_back',
    ],
  },
  minor: {
    title: 'حساب قصّر',
    badge: 'قصّر',
    ageRange: 'أقل من 15 سنة',
    description: 'حساب توفير مخصص للأطفال والقصر تحت ولاية الأب أو الوصي الشرعي لادخار واستثمار أموالهم بأمان.',
    requiredDocs: [
      'birth_certificate',
      'guardian_national_id_front',
      'guardian_national_id_back',
    ],
  },
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  national_id_front: 'بطاقة الرقم القومي (الوجه الأمامي)',
  national_id_back: 'بطاقة الرقم القومي (الوجه الخلفي)',
  proof_of_residence: 'إثبات محل الإقامة (إيصال مرافق / عقد إيجار)',
  proof_of_income: 'إثبات الدخل (مفردات مرتب / كشف حساب)',
  birth_certificate: 'شهادة ميلاد مميكنة للطفل',
  guardian_national_id_front: 'بطاقة الرقم القومي لولي الأمر (الوجه الأمامي)',
  guardian_national_id_back: 'بطاقة الرقم القومي لولي الأمر (الوجه الخلفي)',
};

export const DOCUMENT_TYPE_DESCRIPTIONS: Record<DocumentType, string> = {
  national_id_front: 'صورة واضحة لبطاقة الرقم القومي من الأمام (تظهر الصورة والاسم والرقم القومي)',
  national_id_back: 'صورة واضحة لبطاقة الرقم القومي من الخلف (تظهر تاريخ الانتهاء والمهنة والحالة)',
  proof_of_residence: 'إيصال مرافق حديث (كهرباء، ماء، غاز) باسم العميل أو عقد إيجار موثق',
  proof_of_income: 'مفردات مرتب حديثة معتمدة من جهة العمل أو كشف حساب بنكي لآخر 3 أشهر',
  birth_certificate: 'شهادة ميلاد مميكنة (كمبيوتر) يظهر بها اسم الطفل واسم الأب ورقمه القومي',
  guardian_national_id_front: 'صورة واضحة للوجه الأمامي لبطاقة الرقم القومي للأب أو الوصي الشرعي',
  guardian_national_id_back: 'صورة واضحة للوجه الخلفي لبطاقة الرقم القومي للأب أو الوصي الشرعي',
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_upload: 'بانتظار رفع المستندات',
  processing: 'جاري المعالجة الآلية',
  pending_correction: 'مطلوب مراجعة البيانات',
  pending_review: 'قيد مراجعة الموظف',
  approved: 'تم القبول وتفعيل الحساب',
  rejected: 'تم رفض الطلب',
};

export const STATUS_VARIANTS: Record<
  RequestStatus,
  'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
> = {
  pending_upload: 'warning',
  processing: 'info',
  pending_correction: 'secondary',
  pending_review: 'default',
  approved: 'success',
  rejected: 'destructive',
};

export const REQUEST_TYPE_LABELS: Record<string, string> = {
  account_opening: 'فتح حساب بنكي',
};

export const AUTO_DECISION_LABELS: Record<AutoDecision, string> = {
  auto_approved: 'مقبول مبدئياً بالفحص الآلي',
  auto_rejected: 'مرفوض مبدئياً بالفحص الآلي',
};

export const RULE_LABELS: Record<string, { title: string; description: string }> = {
  id_expiry: {
    title: 'صلاحية بطاقة الرقم القومي',
    description: 'التحقق من أن بطاقة الرقم القومي سارية المفعول وغير منتهية',
  },
  age_check: {
    title: 'فحص مطابقة السن',
    description: 'التحقق من مطابقة سن صاحب الطلب للشروط المحددة لنوع الحساب',
  },
  guardian_id_match: {
    title: 'مطابقة الرقم القومي للولي',
    description: 'التحقق من تطابق الرقم القومي للولي مع الرقم المسجل بشهادة الميلاد',
  },
};

export const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم بالكامل',
  national_id: 'الرقم القومي (14 رقم)',
  address: 'محل الإقامة / العنوان',
  expiry_date: 'تاريخ انتهاء البطاقة (غير قابل للتعديل)',
  job: 'المهنة / الوظيفة',
  marital_status: 'الحالة الاجتماعية',
  holder_name: 'اسم صاحب الإيصال / العقد',
  child_name: 'اسم القاصر / الطفل بالكامل',
  date_of_birth: 'تاريخ الميلاد',
  dob: 'تاريخ الميلاد',
  father_name: 'اسم الأب بالكامل',
  mother_name: 'اسم الأم بالكامل',
  father_national_id: 'الرقم القومي للأب',
  income_amount: 'قيمة الدخل الشهري',
};
