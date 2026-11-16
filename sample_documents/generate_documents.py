import os
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper
from bidi.algorithm import get_display

def ar(text: str) -> str:
    """Helper to reshape Arabic text for Pillow rendering."""
    if not text:
        return ""
    reshaped = arabic_reshaper.reshape(text)
    return get_display(reshaped)

# Fonts
FONT_REGULAR = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD = "C:/Windows/Fonts/arialbd.ttf"
FONT_TAHOMA = "C:/Windows/Fonts/tahoma.ttf"
FONT_TAHOMA_BOLD = "C:/Windows/Fonts/tahomabd.ttf"
FONT_MONO = "C:/Windows/Fonts/courbd.ttf"

def get_font(path, size):
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()

os.makedirs("sample_documents", exist_ok=True)

# -------------------------------------------------------------
# 1. National ID - Front
# -------------------------------------------------------------
def generate_id_front():
    width, height = 1000, 620
    img = Image.new("RGB", (width, height), color=(235, 243, 248))
    draw = ImageDraw.Draw(img)

    # Card border
    draw.rounded_rectangle([15, 15, width - 15, height - 15], radius=24, outline=(150, 185, 210), width=4)
    draw.rounded_rectangle([25, 25, width - 25, height - 25], radius=20, outline=(190, 215, 230), width=2)

    # Security wavy lines pattern
    for y in range(50, height - 50, 24):
        draw.line([(30, y), (width - 30, y)], fill=(220, 235, 244), width=1)
        draw.arc([100, y - 10, width - 100, y + 10], 0, 180, fill=(225, 238, 246), width=1)

    # Header
    font_h1 = get_font(FONT_BOLD, 28)
    font_h2 = get_font(FONT_BOLD, 20)
    font_h3 = get_font(FONT_REGULAR, 17)
    font_badge = get_font(FONT_BOLD, 22)

    # Right header (Arabic title)
    draw.text((950, 45), ar("جمهورية مصر العربية"), font=font_h1, fill=(20, 50, 85), anchor="rt")
    draw.text((950, 85), ar("وزارة الداخلية"), font=font_h2, fill=(35, 90, 140), anchor="rt")
    draw.text((950, 115), ar("قطاع مصلحة الأحوال المدنية"), font=font_h3, fill=(70, 95, 120), anchor="rt")

    # Center Badge
    draw.rounded_rectangle([360, 50, 640, 105], radius=16, fill=(255, 255, 255), outline=(35, 90, 140), width=2)
    draw.text((500, 77), ar("بطاقة تحقيق شخصية"), font=font_badge, fill=(20, 50, 85), anchor="mm")

    # Eagle Emblem placeholder (left top)
    draw.ellipse([60, 45, 140, 125], fill=(245, 240, 225), outline=(180, 130, 40), width=2)
    draw.text((100, 85), ar("شعار\nالجمهورية"), font=get_font(FONT_BOLD, 14), fill=(160, 110, 30), anchor="mm", align="center")

    # Header Divider
    draw.line([(35, 145), (width - 35, 145)], fill=(160, 195, 220), width=2)

    # Photo Box on the Left
    photo_x, photo_y, photo_w, photo_h = 60, 180, 220, 280
    draw.rectangle([photo_x, photo_y, photo_x + photo_w, photo_y + photo_h], fill=(255, 255, 255), outline=(20, 50, 85), width=3)
    draw.rectangle([photo_x + 5, photo_y + 5, photo_x + photo_w - 5, photo_y + photo_h - 5], fill=(210, 225, 235))
    
    # Head & Shoulders silhouette
    draw.ellipse([photo_x + 65, photo_y + 40, photo_x + 155, photo_y + 145], fill=(70, 85, 105))
    draw.ellipse([photo_x + 30, photo_y + 130, photo_x + 190, photo_y + 270], fill=(30, 40, 55))

    # Hologram seal on photo
    draw.ellipse([photo_x + photo_w - 60, photo_y + photo_h - 60, photo_x + photo_w - 10, photo_y + photo_h - 10], fill=(245, 215, 110), outline=(160, 110, 20), width=2)
    draw.text((photo_x + photo_w - 35, photo_y + photo_h - 35), ar("نسر"), font=get_font(FONT_BOLD, 13), fill=(120, 75, 10), anchor="mm")

    # Data Fields on the Right
    font_lbl = get_font(FONT_BOLD, 20)
    font_val_name = get_font(FONT_BOLD, 30)
    font_val = get_font(FONT_BOLD, 24)

    # Name
    draw.text((950, 200), ar("الاسم:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((950, 240), ar("أحمد محمد محمود علي"), font=font_val_name, fill=(10, 25, 45), anchor="rt")

    # Address
    draw.text((950, 310), ar("العنوان:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((950, 350), ar("١٥ شارع النصر، المعادي، القاهرة"), font=font_val, fill=(15, 30, 50), anchor="rt")

    # Bottom National ID Bar
    draw.rounded_rectangle([45, 490, width - 45, 575], radius=16, fill=(255, 255, 255), outline=(20, 50, 85), width=3)
    draw.text((920, 532), ar("الرقم القومي:"), font=get_font(FONT_BOLD, 24), fill=(20, 50, 85), anchor="rm")
    
    # 14 Digits in bold monospace
    font_id = get_font(FONT_BOLD, 38)
    draw.text((80, 532), "29810150101235", font=font_id, fill=(10, 20, 35), anchor="lm")

    path = "sample_documents/national_id_front.png"
    img.save(path, quality=95)
    print(f"Generated: {path}")

# -------------------------------------------------------------
# 2. National ID - Back
# -------------------------------------------------------------
def generate_id_back():
    width, height = 1000, 620
    img = Image.new("RGB", (width, height), color=(235, 243, 248))
    draw = ImageDraw.Draw(img)

    # Card border
    draw.rounded_rectangle([15, 15, width - 15, height - 15], radius=24, outline=(150, 185, 210), width=4)
    draw.rounded_rectangle([25, 25, width - 25, height - 25], radius=20, outline=(190, 215, 230), width=2)

    # Top Data Section
    font_lbl = get_font(FONT_BOLD, 20)
    font_val = get_font(FONT_BOLD, 24)

    # Right side (Job & Employer & Marital)
    draw.text((950, 55), ar("المهنة:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((860, 55), ar("مهندس برمجيات"), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((950, 110), ar("جهة العمل:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((830, 110), ar("شركة النيل لتكنولوجيا المعلومات"), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((950, 165), ar("الحالة الاجتماعية:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((750, 165), ar("أعزب"), font=font_val, fill=(10, 25, 45), anchor="rt")

    # Left side (Gender, Religion, Expiry)
    draw.text((450, 55), ar("النوع:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((370, 55), ar("ذكر"), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((450, 110), ar("الديانة:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((370, 110), ar("مسلم"), font=font_val, fill=(10, 25, 45), anchor="rt")

    # Expiry Date (Highlighted)
    draw.rounded_rectangle([50, 150, 460, 215], radius=12, fill=(254, 242, 242), outline=(220, 38, 38), width=2)
    draw.text((440, 182), ar("تاريخ الانتهاء:"), font=font_lbl, fill=(185, 28, 28), anchor="rm")
    draw.text((70, 182), "2031/10/14", font=get_font(FONT_BOLD, 26), fill=(185, 28, 28), anchor="lm")

    # Middle Barcode section
    draw.rounded_rectangle([45, 240, width - 45, 310], radius=10, fill=(255, 255, 255), outline=(190, 205, 220), width=2)
    # Draw simulated barcode lines
    import random
    random.seed(42)
    bx = 70
    while bx < 650:
        bw = random.choice([2, 4, 6])
        draw.rectangle([bx, 250, bx + bw, 300], fill=(15, 25, 40))
        bx += bw + random.choice([3, 5, 7])

    draw.text((930, 275), ar("تاريخ الإصدار: 2024/10/15"), font=get_font(FONT_BOLD, 18), fill=(60, 75, 95), anchor="rm")

    # Bottom MRZ Section
    draw.rounded_rectangle([45, 335, width - 45, 580], radius=16, fill=(15, 23, 42))
    
    font_mrz = get_font(FONT_MONO, 28)
    line1 = "ID<EGY29810150101235<<<<<<<<<<<<"
    line2 = "9810158M3110145EGY<<<<<<<<<<<8"
    line3 = "ALI<<AHMED<MOHAMED<MAHMOUD<<<<<"

    draw.text((80, 390), line1, font=font_mrz, fill=(56, 189, 248), anchor="lm")
    draw.text((80, 460), line2, font=font_mrz, fill=(56, 189, 248), anchor="lm")
    draw.text((80, 530), line3, font=font_mrz, fill=(56, 189, 248), anchor="lm")

    path = "sample_documents/national_id_back.png"
    img.save(path, quality=95)
    print(f"Generated: {path}")

# -------------------------------------------------------------
# 3. Proof of Residence (Electricity Bill)
# -------------------------------------------------------------
def generate_proof_of_residence():
    width, height = 900, 1150
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Document border
    draw.rectangle([20, 20, width - 20, height - 20], outline=(200, 215, 230), width=3)
    draw.rectangle([26, 26, width - 26, height - 26], outline=(225, 235, 245), width=1)

    # Header Band
    draw.rectangle([26, 26, width - 26, 160], fill=(2, 132, 199))
    draw.text((width - 50, 70), ar("الشركة القابضة لكهرباء مصر"), font=get_font(FONT_BOLD, 28), fill=(255, 255, 255), anchor="rm")
    draw.text((width - 50, 115), ar("شركة جنوب القاهرة لتوزيع الكهرباء"), font=get_font(FONT_BOLD, 22), fill=(224, 242, 254), anchor="rm")

    draw.text((50, 75), ar("فاتورة استهلاك كهرباء"), font=get_font(FONT_BOLD, 26), fill=(255, 255, 255), anchor="lm")
    draw.text((50, 115), ar("إيصال سداد رسمي - سكني"), font=get_font(FONT_REGULAR, 18), fill=(224, 242, 254), anchor="lm")

    # Subscriber Box
    draw.rounded_rectangle([45, 190, width - 45, 460], radius=14, fill=(248, 250, 252), outline=(203, 213, 225), width=2)
    draw.text((width - 70, 225), ar("بيانات المشترك ومحل السكن:"), font=get_font(FONT_BOLD, 22), fill=(3, 105, 161), anchor="rm")
    draw.line([(55, 250), (width - 55, 250)], fill=(226, 232, 240), width=2)

    # Name (Matching National ID)
    draw.text((width - 70, 290), ar("اسم المشترك:"), font=get_font(FONT_BOLD, 20), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 240, 290), ar("أحمد محمد محمود علي"), font=get_font(FONT_BOLD, 26), fill=(15, 23, 42), anchor="rm")

    # Address (Matching National ID)
    draw.text((width - 70, 350), ar("العنوان:"), font=get_font(FONT_BOLD, 20), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 180, 350), ar("١٥ شارع النصر، المعادي، القاهرة"), font=get_font(FONT_BOLD, 24), fill=(15, 23, 42), anchor="rm")

    # Account & Meter
    draw.text((width - 70, 410), ar("رقم الحساب: 01-4458-9921"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="rm")
    draw.text((450, 410), ar("رقم العداد: MTR-8820194"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="rm")
    draw.text((70, 410), ar("فترة الاستهلاك: أكتوبر ٢٠٢٦"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="lm")

    # Readings Table
    draw.rounded_rectangle([45, 490, width - 45, 680], radius=10, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw.rectangle([45, 490, width - 45, 540], fill=(241, 245, 249))
    draw.text((width - 100, 515), ar("القراءة الحالية"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="rm")
    draw.text((width - 300, 515), ar("القراءة السابقة"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="rm")
    draw.text((width - 500, 515), ar("الاستهلاك"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="rm")
    draw.text((150, 515), ar("قيمة الاستهلاك"), font=get_font(FONT_BOLD, 18), fill=(51, 65, 85), anchor="mm")

    draw.line([(45, 540), (width - 45, 540)], fill=(203, 213, 225), width=2)
    draw.text((width - 100, 600), "18450", font=get_font(FONT_BOLD, 22), fill=(15, 23, 42), anchor="rm")
    draw.text((width - 300, 600), "17990", font=get_font(FONT_BOLD, 22), fill=(15, 23, 42), anchor="rm")
    draw.text((width - 500, 600), ar("٤٦٠ ك.و.س"), font=get_font(FONT_BOLD, 22), fill=(15, 23, 42), anchor="rm")
    draw.text((150, 600), ar("٤٥٠.٠٠ ج.م"), font=get_font(FONT_BOLD, 22), fill=(15, 23, 42), anchor="mm")

    # Total Amount Due Banner
    draw.rounded_rectangle([45, 730, width - 45, 830], radius=16, fill=(240, 253, 244), outline=(34, 197, 94), width=3)
    draw.text((width - 80, 780), ar("المبلغ الإجمالي المسدد:"), font=get_font(FONT_BOLD, 24), fill=(22, 101, 52), anchor="rm")
    draw.text((80, 780), ar("٤٨٥.٥٠ جنيه مصري"), font=get_font(FONT_BOLD, 30), fill=(21, 128, 61), anchor="lm")

    # Stamp on bottom right
    stamp_cx, stamp_cy = 250, 970
    draw.ellipse([stamp_cx - 85, stamp_cy - 85, stamp_cx + 85, stamp_cy + 85], outline=(220, 38, 38), width=4)
    draw.ellipse([stamp_cx - 75, stamp_cy - 75, stamp_cx + 75, stamp_cy + 75], outline=(220, 38, 38), width=2)
    draw.text((stamp_cx, stamp_cy - 25), ar("شركة جنوب القاهرة"), font=get_font(FONT_BOLD, 15), fill=(220, 38, 38), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 5), ar("مدفوع بالكامل"), font=get_font(FONT_BOLD, 22), fill=(220, 38, 38), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 35), ar("خزينة المعادي ٢٠٢٦"), font=get_font(FONT_BOLD, 14), fill=(220, 38, 38), anchor="mm")

    # Barcode
    draw.text((width - 70, 940), ar("رقم الإيصال: REC-2026-1049281"), font=get_font(FONT_BOLD, 18), fill=(71, 85, 105), anchor="rm")
    # barcode lines
    for bx in range(550, width - 70, 10):
        draw.line([(bx, 970), (bx, 1040)], fill=(15, 23, 42), width=4)

    path = "sample_documents/proof_of_residence.png"
    img.save(path, quality=95)
    print(f"Generated: {path}")

# -------------------------------------------------------------
# 4. Proof of Income (Salary Certificate / HR Letter)
# -------------------------------------------------------------
def generate_proof_of_income():
    width, height = 900, 1200
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Elegant letterhead border
    draw.rectangle([25, 25, width - 25, height - 25], outline=(203, 213, 225), width=2)

    # Company Header
    draw.rectangle([25, 25, width - 25, 140], fill=(15, 118, 110))
    draw.text((width - 50, 65), ar("شركة النيل للحلول البرمجية المتطورة ش.م.م"), font=get_font(FONT_BOLD, 26), fill=(255, 255, 255), anchor="rm")
    draw.text((width - 50, 105), "Nile Advanced Software Solutions S.A.E", font=get_font(FONT_BOLD, 17), fill=(204, 251, 241), anchor="rm")

    draw.text((50, 70), "C.R: 489201 | Tax: 512-889-100", font=get_font(FONT_BOLD, 16), fill=(204, 251, 241), anchor="lm")
    draw.text((50, 105), ar("المعادي، القاهرة، مصر"), font=get_font(FONT_REGULAR, 15), fill=(255, 255, 255), anchor="lm")

    # Title
    draw.text((width // 2, 190), ar("شهادة مفردات مرتب وإثبات دخل"), font=get_font(FONT_BOLD, 28), fill=(15, 118, 110), anchor="mm")
    draw.line([(width // 2 - 190, 215), (width // 2 + 190, 215)], fill=(15, 118, 110), width=3)

    # Date
    draw.text((70, 240), ar("التاريخ: 2026/10/20"), font=get_font(FONT_BOLD, 17), fill=(71, 85, 105), anchor="lm")

    # Recipient
    draw.text((width - 70, 280), ar("السادة / إدارة العمليات المصرفية وفتح الحسابات - بنك نايل أوبس"), font=get_font(FONT_BOLD, 20), fill=(15, 23, 42), anchor="rm")
    draw.text((width - 70, 315), ar("تحية طيبة وبعد،،،"), font=get_font(FONT_BOLD, 18), fill=(71, 85, 105), anchor="rm")

    # Body statement
    p1 = "تشهد إدارة الموارد البشرية بشركة النيل للحلول البرمجية المتطورة بأن السيد /"
    draw.text((width - 70, 370), ar(p1), font=get_font(FONT_BOLD, 19), fill=(30, 41, 59), anchor="rm")

    # Employee Name Highlight
    draw.rounded_rectangle([width - 450, 400, width - 70, 450], radius=8, fill=(240, 253, 250))
    draw.text((width - 80, 425), ar("أحمد محمد محمود علي"), font=get_font(FONT_BOLD, 26), fill=(15, 118, 110), anchor="rm")

    p2 = "مصري الجنسية، ويحمل بطاقة رقم قومي رقم (29810150101235)،"
    draw.text((width - 70, 480), ar(p2), font=get_font(FONT_BOLD, 19), fill=(30, 41, 59), anchor="rm")

    p3 = "يعمل طرفنا بوظيفة: مهندس برمجيات أول (Senior Software Engineer)"
    draw.text((width - 70, 520), ar(p3), font=get_font(FONT_BOLD, 19), fill=(15, 23, 42), anchor="rm")

    p4 = "بعقد عمل دائم كامل المدة منذ تاريخ 01/03/2021 وحتى تاريخه، وبيان دخله الشهري:"
    draw.text((width - 70, 560), ar(p4), font=get_font(FONT_BOLD, 18), fill=(30, 41, 59), anchor="rm")

    # Table of Salary
    table_top = 610
    draw.rectangle([60, table_top, width - 60, table_top + 280], outline=(203, 213, 225), width=2)
    
    rows = [
        ("الراتب الأساسي", "25,000 ج.م"),
        ("بدلات وحوافز ثابتة", "10,000 ج.م"),
        ("إجمالي الدخل الشهري", "35,000 ج.م"),
        ("الاستقطاعات القانونية (تأمينات وضريبة كسب عمل)", "5,600 ج.م"),
        ("صافي الراتب الشهري المستحق الصرف", "29,400 ج.م")
    ]

    curr_y = table_top
    for idx, (label, val) in enumerate(rows):
        is_net = idx == 4
        is_gross = idx == 2
        bg = (240, 253, 244) if is_net else ((248, 250, 252) if is_gross else (255, 255, 255))
        draw.rectangle([60, curr_y, width - 60, curr_y + 56], fill=bg, outline=(203, 213, 225), width=1)
        
        lbl_font = get_font(FONT_BOLD, 21 if is_net else 19)
        val_font = get_font(FONT_BOLD, 23 if is_net else 20)
        lbl_col = (21, 128, 61) if is_net else (15, 23, 42)
        val_col = (21, 128, 61) if is_net else (15, 23, 42)
        
        draw.text((width - 90, curr_y + 28), ar(label), font=lbl_font, fill=lbl_col, anchor="rm")
        draw.text((90, curr_y + 28), ar(val), font=val_font, fill=val_col, anchor="lm")
        curr_y += 56

    draw.text((width - 70, 930), ar("* تسعة وعشرون ألف وأربعمائة جنيه مصري لا غير."), font=get_font(FONT_BOLD, 16), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 70, 960), ar("* أُعطيت هذه الشهادة للموظف بناءً على طلبه لتقديمها إلى مصرفكم الموقر."), font=get_font(FONT_REGULAR, 15), fill=(100, 116, 139), anchor="rm")

    # Closing & Signatures
    draw.text((width - 150, 1030), ar("مدير الموارد البشرية"), font=get_font(FONT_BOLD, 19), fill=(15, 23, 42), anchor="mm")
    draw.text((width - 150, 1080), ar("أ. تامر عبد الرحمن"), font=get_font(FONT_BOLD, 21), fill=(15, 118, 110), anchor="mm")

    # Blue Corporate Oval Stamp
    stamp_cx, stamp_cy = 280, 1070
    draw.ellipse([stamp_cx - 100, stamp_cy - 70, stamp_cx + 100, stamp_cy + 70], outline=(29, 78, 216), width=4)
    draw.ellipse([stamp_cx - 90, stamp_cy - 60, stamp_cx + 90, stamp_cy + 60], outline=(29, 78, 216), width=1)
    draw.text((stamp_cx, stamp_cy - 30), ar("شركة النيل للحلول البرمجية"), font=get_font(FONT_BOLD, 14), fill=(29, 78, 216), anchor="mm")
    draw.text((stamp_cx, stamp_cy), ar("الموارد البشرية - معتمد"), font=get_font(FONT_BOLD, 17), fill=(29, 78, 216), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 30), "C.R: 489201 CAIRO", font=get_font(FONT_BOLD, 13), fill=(29, 78, 216), anchor="mm")

    path = "sample_documents/proof_of_income.png"
    img.save(path, quality=95)
    print(f"Generated: {path}")

if __name__ == "__main__":
    generate_id_front()
    generate_id_back()
    generate_proof_of_residence()
    generate_proof_of_income()
    print("All 4 sample documents generated successfully!")
