import math
import os
import random
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


def get_font(path: str, size: int):
    if os.path.exists(path):
        return ImageFont.truetype(path, size)
    return ImageFont.load_default()


os.makedirs("sample_documents", exist_ok=True)


# -------------------------------------------------------------
# Drawing Helpers: Eagle Crest, Watermark & Hologram Seal
# -------------------------------------------------------------

def draw_egyptian_eagle(draw: ImageDraw.Draw, cx: int, cy: int, scale: float = 1.0, is_gold: bool = True):
    """Draw a detailed stylized Eagle of Saladin (Egyptian National Crest)."""
    if is_gold:
        gold_main = (190, 145, 35)
        gold_dark = (140, 95, 20)
        gold_light = (240, 200, 75)
    else:
        # Subtle watermark colors: pale cyan-grey
        gold_main = (212, 230, 240)
        gold_dark = (195, 218, 232)
        gold_light = (222, 238, 246)

    s = scale

    # Symmetrical wings
    wing_left = [
        (cx - int(38 * s), cy - int(25 * s)),
        (cx - int(22 * s), cy - int(45 * s)),
        (cx - int(8 * s), cy - int(35 * s)),
        (cx - int(12 * s), cy - int(10 * s)),
        (cx - int(28 * s), cy + int(15 * s)),
        (cx - int(34 * s), cy + int(5 * s)),
    ]
    wing_right = [
        (cx + int(38 * s), cy - int(25 * s)),
        (cx + int(22 * s), cy - int(45 * s)),
        (cx + int(8 * s), cy - int(35 * s)),
        (cx + int(12 * s), cy - int(10 * s)),
        (cx + int(28 * s), cy + int(15 * s)),
        (cx + int(34 * s), cy + int(5 * s)),
    ]
    draw.polygon(wing_left, fill=gold_main, outline=gold_dark)
    draw.polygon(wing_right, fill=gold_main, outline=gold_dark)

    # Feathers detail
    for offset in range(3):
        dx = int((14 + offset * 7) * s)
        draw.line(
            [(cx - dx, cy - int(20 * s)), (cx - dx - int(6 * s), cy - int(5 * s))],
            fill=gold_light,
            width=max(1, int(2 * s)),
        )
        draw.line(
            [(cx + dx, cy - int(20 * s)), (cx + dx + int(6 * s), cy - int(5 * s))],
            fill=gold_light,
            width=max(1, int(2 * s)),
        )

    # Tail feathers
    tail = [
        (cx - int(14 * s), cy + int(18 * s)),
        (cx - int(10 * s), cy + int(38 * s)),
        (cx + int(10 * s), cy + int(38 * s)),
        (cx + int(14 * s), cy + int(18 * s)),
    ]
    draw.polygon(tail, fill=gold_main, outline=gold_dark)

    # Head looking right (official Egyptian crest heraldry)
    head = [
        (cx - int(4 * s), cy - int(40 * s)),
        (cx + int(5 * s), cy - int(48 * s)),
        (cx + int(14 * s), cy - int(45 * s)),  # Beak tip
        (cx + int(9 * s), cy - int(39 * s)),
        (cx + int(4 * s), cy - int(34 * s)),
        (cx - int(4 * s), cy - int(35 * s)),
    ]
    draw.polygon(head, fill=gold_light, outline=gold_dark)

    # Chest / Egyptian Shield
    sw = int(18 * s)
    sh = int(24 * s)
    sx = cx - sw // 2
    sy = cy - sh // 2 + int(3 * s)

    if is_gold:
        draw.rectangle([sx - 1, sy - 1, sx + sw + 1, sy + sh + 1], fill=gold_dark)
        stripe_h = sh // 3
        draw.rectangle([sx, sy, sx + sw, sy + stripe_h], fill=(206, 17, 38))
        draw.rectangle([sx, sy + stripe_h, sx + sw, sy + 2 * stripe_h], fill=(255, 255, 255))
        draw.rectangle([sx, sy + 2 * stripe_h, sx + sw, sy + sh], fill=(15, 23, 42))
    else:
        # Subtle watermark shield
        draw.rectangle([sx, sy, sx + sw, sy + sh], fill=(218, 234, 244), outline=gold_dark, width=1)

    # Base Scroll
    scroll = [
        (cx - int(26 * s), cy + int(37 * s)),
        (cx + int(26 * s), cy + int(37 * s)),
        (cx + int(22 * s), cy + int(43 * s)),
        (cx - int(22 * s), cy + int(43 * s)),
    ]
    draw.polygon(scroll, fill=gold_light, outline=gold_dark)


def create_clipped_portrait(pw: int, ph: int) -> Image.Image:
    """Create a cardholder portrait image cleanly clipped to photo boundaries."""
    photo = Image.new("RGB", (pw, ph), color=(225, 235, 244))
    draw = ImageDraw.Draw(photo)

    # Studio background gradient
    for y in range(ph):
        ratio = y / ph
        r = int(218 + (180 - 218) * ratio)
        g = int(230 + (195 - 230) * ratio)
        b = int(242 + (212 - 242) * ratio)
        draw.line([(0, y), (pw, y)], fill=(r, g, b))

    cx = pw // 2

    # Suit shoulders
    draw.ellipse([cx - 95, ph - 110, cx + 95, ph + 80], fill=(25, 33, 48))
    # Suit collar / lapels
    draw.polygon([(cx - 30, ph - 80), (cx - 50, ph - 30), (cx - 15, ph - 10)], fill=(18, 24, 38))
    draw.polygon([(cx + 30, ph - 80), (cx + 50, ph - 30), (cx + 15, ph - 10)], fill=(18, 24, 38))

    # White shirt
    draw.polygon([(cx - 24, ph - 85), (cx + 24, ph - 85), (cx, ph - 25)], fill=(250, 250, 252))

    # Burgundy Tie
    draw.polygon([
        (cx - 7, ph - 68),
        (cx + 7, ph - 68),
        (cx + 10, ph - 15),
        (cx, ph),
        (cx - 10, ph - 15),
    ], fill=(150, 25, 35))

    # Neck
    draw.rectangle([cx - 18, 120, cx + 18, 165], fill=(215, 170, 135))
    draw.rectangle([cx - 18, 145, cx + 18, 165], fill=(195, 150, 115))

    # Ears
    draw.ellipse([cx - 48, 75, cx - 36, 115], fill=(225, 180, 145))
    draw.ellipse([cx + 36, 75, cx + 48, 115], fill=(225, 180, 145))

    # Head shape
    draw.ellipse([cx - 40, 35, cx + 40, 140], fill=(232, 188, 152))

    # Hair (neat parted dark hair)
    draw.ellipse([cx - 42, 22, cx + 42, 70], fill=(30, 25, 25))
    draw.polygon([(cx - 42, 50), (cx - 45, 95), (cx - 38, 80)], fill=(30, 25, 25))
    draw.polygon([(cx + 42, 50), (cx + 45, 95), (cx + 38, 80)], fill=(30, 25, 25))

    # Eyebrows
    draw.line([(cx - 28, 72), (cx - 10, 70)], fill=(40, 30, 30), width=3)
    draw.line([(cx + 10, 70), (cx + 28, 72)], fill=(40, 30, 30), width=3)

    # Eyes
    draw.ellipse([cx - 26, 78, cx - 12, 88], fill=(255, 255, 255))
    draw.ellipse([cx - 21, 80, cx - 15, 86], fill=(45, 35, 30))
    draw.ellipse([cx + 12, 78, cx + 26, 88], fill=(255, 255, 255))
    draw.ellipse([cx + 15, 80, cx + 21, 86], fill=(45, 35, 30))

    # Nose
    draw.line([(cx, 78), (cx - 3, 102)], fill=(195, 150, 120), width=2)
    draw.arc([cx - 8, 98, cx + 8, 106], 0, 180, fill=(185, 140, 110), width=2)

    # Mouth
    draw.line([(cx - 14, 118), (cx + 14, 118)], fill=(175, 110, 95), width=3)

    return photo


def draw_hologram_seal(draw: ImageDraw.Draw, hx: int, hy: int, radius: int = 44):
    """Draw circular golden holographic security seal with eagle."""
    draw.ellipse([hx - radius, hy - radius, hx + radius, hy + radius], fill=(245, 205, 75), outline=(175, 125, 20), width=3)
    draw.ellipse([hx - radius + 4, hy - radius + 4, hx + radius - 4, hy + radius - 4], outline=(255, 235, 140), width=1)
    draw.ellipse([hx - radius + 8, hy - radius + 8, hx + radius - 8, hy + radius - 8], fill=(230, 180, 50), outline=(180, 130, 25), width=1)

    for angle_deg in range(0, 360, 30):
        rad = math.radians(angle_deg)
        sx = hx + int((radius - 12) * math.cos(rad))
        sy = hy + int((radius - 12) * math.sin(rad))
        draw.ellipse([sx - 2, sy - 2, sx + 2, sy + 2], fill=(255, 250, 205))

    draw_egyptian_eagle(draw, hx, hy + 2, scale=0.45, is_gold=True)


# -------------------------------------------------------------
# 1. National ID - Front (Egyptian National ID Card)
# -------------------------------------------------------------
def generate_id_front(
    output_path: str = "sample_documents/national_id_front.png",
    first_name: str = "محمد",
    rest_name: str = "محمد أحمد حسنين",
    address_line1: str = "١٥ شارع النصر - المعادي",
    address_line2: str = "قسم المعادي - محافظة القاهرة",
    national_id: str = "29810150101235",
    serial: str = "مسلسل: س / ٩١٨٢٤٠١٥",
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 1000, 630

    # Base card with soft pastel Egyptian ID gradient (cool cyan to pale sand)
    img = Image.new("RGB", (width, height), color=(226, 240, 246))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(220 + 16 * ratio)
        g = int(238 + 6 * ratio)
        b = int(246 + 2 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Outer security border
    draw.rounded_rectangle([15, 15, width - 15, height - 15], radius=26, outline=(140, 178, 200), width=3)
    draw.rounded_rectangle([22, 22, width - 22, height - 22], radius=22, outline=(185, 215, 230), width=1)

    # Procedural Guilloche Security Waves
    for curve_idx in range(14):
        pts = []
        for x in range(30, width - 30, 6):
            y = 120 + curve_idx * 32 + math.sin(x * 0.018 + curve_idx * 0.6) * 16 + math.cos(x * 0.009) * 8
            pts.append((x, int(y)))
        draw.line(pts, fill=(205, 228, 240), width=1)

    # Repeating micro-print watermark lines
    micro_text = ar("جمهورية مصر العربية  *  قطاع مصلحة الأحوال المدنية  *  بطاقة تحقيق شخصية  *  " * 4)
    font_micro = get_font(FONT_REGULAR, 10)
    for my in range(165, 485, 48):
        draw.text((width - 40, my), micro_text, font=font_micro, fill=(208, 228, 238), anchor="rt")

    # Central soft Eagle Watermark (delicate watermark behind text)
    draw_egyptian_eagle(draw, cx=530, cy=330, scale=3.0, is_gold=False)

    # ---------------------------------------------------------
    # Header Section
    # ---------------------------------------------------------
    font_h1 = get_font(FONT_BOLD, 26)
    font_h2 = get_font(FONT_BOLD, 18)
    font_h3 = get_font(FONT_REGULAR, 15)
    font_badge = get_font(FONT_BOLD, 22)

    # Right side: Official Ministry of Interior Titles
    draw.text((955, 40), ar("جمهورية مصر العربية"), font=font_h1, fill=(16, 46, 78), anchor="rt")
    draw.text((955, 80), ar("وزارة الداخلية"), font=font_h2, fill=(28, 72, 115), anchor="rt")
    draw.text((955, 110), ar("قطاع مصلحة الأحوال المدنية"), font=font_h3, fill=(60, 95, 125), anchor="rt")

    # Center: "بطاقة تحقيق شخصية" Badge with ornamental double border
    badge_rect = [340, 48, 640, 105]
    draw.rounded_rectangle(badge_rect, radius=18, fill=(255, 255, 255), outline=(28, 72, 115), width=2)
    draw.rounded_rectangle([badge_rect[0] + 3, badge_rect[1] + 3, badge_rect[2] - 3, badge_rect[3] - 3], radius=15, outline=(180, 210, 230), width=1)
    draw.text((490, 76), ar("بطاقة تحقيق شخصية"), font=font_badge, fill=(16, 46, 78), anchor="mm")

    # Left: Official Golden Eagle of Egypt (National Emblem)
    draw.ellipse([50, 40, 135, 125], fill=(252, 248, 235), outline=(190, 145, 35), width=2)
    draw_egyptian_eagle(draw, cx=92, cy=82, scale=1.1, is_gold=True)

    # Header Divider Line
    draw.line([(35, 145), (width - 35, 145)], fill=(160, 195, 220), width=2)

    # ---------------------------------------------------------
    # Left Side: Cardholder Photo (Cleanly Clipped) & Hologram
    # ---------------------------------------------------------
    photo_x, photo_y, photo_w, photo_h = 60, 175, 220, 280
    portrait_img = create_clipped_portrait(photo_w, photo_h)
    img.paste(portrait_img, (photo_x, photo_y))

    # Outer photo frame border
    draw.rectangle([photo_x - 1, photo_y - 1, photo_x + photo_w + 1, photo_y + photo_h + 1], outline=(25, 55, 90), width=2)

    # Hologram seal overlapping bottom-right corner of the photo
    draw_hologram_seal(draw, hx=photo_x + photo_w - 28, hy=photo_y + photo_h - 28, radius=46)

    # ---------------------------------------------------------
    # Right Side: Cardholder Data (Real Egyptian ID Layout)
    # ---------------------------------------------------------
    # Row 1: First Name: "محمد"
    # Row 2: Father + Grandfather + Surname: "محمد أحمد حسنين"
    # -> Father's name is "محمد", identical to son's name "محمد"!
    font_first_name = get_font(FONT_TAHOMA_BOLD, 38)
    font_rest_name = get_font(FONT_TAHOMA_BOLD, 32)
    font_addr_label = get_font(FONT_BOLD, 15)
    font_address = get_font(FONT_BOLD, 23)

    # Row 1: First Name
    draw.text((955, 185), ar(first_name), font=font_first_name, fill=(10, 22, 40), anchor="rt")

    # Row 2: Rest of Name
    draw.text((955, 248), ar(rest_name), font=font_rest_name, fill=(10, 22, 40), anchor="rt")

    # Subtle separator / Address Section
    draw.line([(310, 315), (955, 315)], fill=(195, 218, 232), width=1)
    draw.text((955, 326), ar("محل الإقامة:"), font=font_addr_label, fill=(70, 95, 120), anchor="rt")

    # Address Lines
    draw.text((955, 355), ar(address_line1), font=font_address, fill=(15, 30, 50), anchor="rt")
    draw.text((955, 395), ar(address_line2), font=font_address, fill=(15, 30, 50), anchor="rt")

    # Serial Number in small official font above bottom bar
    font_serial = get_font(FONT_BOLD, 14)
    draw.text((955, 475), ar(serial), font=font_serial, fill=(70, 95, 120), anchor="rt")
    draw.text((310, 475), "CODE: 01-EGY-CAI", font=get_font(FONT_MONO, 13), fill=(100, 125, 150), anchor="lt")

    # ---------------------------------------------------------
    # Bottom Section: 14-Digit National ID White Box
    # ---------------------------------------------------------
    box_rect = [45, 505, width - 45, 585]
    draw.rounded_rectangle(box_rect, radius=14, fill=(255, 255, 255), outline=(20, 50, 85), width=3)
    draw.rounded_rectangle([box_rect[0] + 2, box_rect[1] + 2, box_rect[2] - 2, box_rect[3] - 2], radius=12, outline=(210, 225, 235), width=1)

    # "الرقم القومي:" label on right
    draw.text((925, 545), ar("الرقم القومي:"), font=get_font(FONT_BOLD, 24), fill=(20, 50, 85), anchor="rm")

    # 14 Digits in bold, high-contrast monospace OCR font
    font_id = get_font(FONT_MONO, 40)
    draw.text((75, 545), national_id, font=font_id, fill=(10, 20, 35), anchor="lm")

    img.save(output_path, quality=95)
    print(f"Generated: {output_path}")


# -------------------------------------------------------------
# 2. National ID - Back
# -------------------------------------------------------------
def generate_id_back(
    output_path: str = "sample_documents/national_id_back.png",
    job: str = "مهندس برمجيات",
    employer: str = "شركة النيل لتكنولوجيا المعلومات",
    marital_status: str = "أعزب",
    gender: str = "ذكر",
    religion: str = "مسلم",
    expiry_date: str = "2031/10/14",
    issue_date: str = "2024/10/15",
    national_id: str = "29810150101235",
    mrz_line2: str = "9810158M3110145EGY<<<<<<<<<<<8",
    mrz_line3: str = "HASSANEIN<<MOHAMED<MOHAMED<AHMED",
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 1000, 630
    img = Image.new("RGB", (width, height), color=(230, 242, 248))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        ratio = y / height
        r = int(225 + 12 * ratio)
        g = int(238 + 6 * ratio)
        b = int(246 + 2 * ratio)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    # Card border
    draw.rounded_rectangle([15, 15, width - 15, height - 15], radius=26, outline=(140, 178, 200), width=3)
    draw.rounded_rectangle([22, 22, width - 22, height - 22], radius=22, outline=(185, 215, 230), width=1)

    # Background waves
    for curve_idx in range(8):
        pts = []
        for x in range(30, width - 30, 8):
            y = 50 + curve_idx * 30 + math.sin(x * 0.02) * 12
            pts.append((x, int(y)))
        draw.line(pts, fill=(210, 230, 242), width=1)

    # Top Data Section
    font_lbl = get_font(FONT_BOLD, 20)
    font_val = get_font(FONT_BOLD, 24)

    # Right side (Job & Employer & Marital)
    draw.text((950, 55), ar("المهنة:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((860, 55), ar(job), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((950, 110), ar("جهة العمل:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((830, 110), ar(employer), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((950, 165), ar("الحالة الاجتماعية:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((750, 165), ar(marital_status), font=font_val, fill=(10, 25, 45), anchor="rt")

    # Left side (Gender, Religion, Expiry)
    draw.text((450, 55), ar("النوع:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((370, 55), ar(gender), font=font_val, fill=(10, 25, 45), anchor="rt")

    draw.text((450, 110), ar("الديانة:"), font=font_lbl, fill=(70, 85, 105), anchor="rt")
    draw.text((370, 110), ar(religion), font=font_val, fill=(10, 25, 45), anchor="rt")

    # Expiry Date (Highlighted)
    draw.rounded_rectangle([50, 150, 460, 215], radius=12, fill=(254, 242, 242), outline=(220, 38, 38), width=2)
    draw.text((440, 182), ar("تاريخ الانتهاء:"), font=font_lbl, fill=(185, 28, 28), anchor="rm")
    draw.text((70, 182), expiry_date, font=get_font(FONT_BOLD, 26), fill=(185, 28, 28), anchor="lm")

    # Middle Barcode section
    draw.rounded_rectangle([45, 240, width - 45, 310], radius=10, fill=(255, 255, 255), outline=(190, 205, 220), width=2)
    random.seed(42)
    bx = 70
    while bx < 650:
        bw = random.choice([2, 4, 6])
        draw.rectangle([bx, 250, bx + bw, 300], fill=(15, 25, 40))
        bx += bw + random.choice([3, 5, 7])

    draw.text((930, 275), ar(f"تاريخ الإصدار: {issue_date}"), font=get_font(FONT_BOLD, 18), fill=(60, 75, 95), anchor="rm")

    # Bottom MRZ Section
    draw.rounded_rectangle([45, 335, width - 45, 585], radius=16, fill=(15, 23, 42))

    font_mrz = get_font(FONT_MONO, 28)
    line1 = f"ID<EGY{national_id}<<<<<<<<<<<<"
    line2 = mrz_line2
    line3 = mrz_line3

    draw.text((80, 395), line1, font=font_mrz, fill=(56, 189, 248), anchor="lm")
    draw.text((80, 465), line2, font=font_mrz, fill=(56, 189, 248), anchor="lm")
    draw.text((80, 535), line3, font=font_mrz, fill=(56, 189, 248), anchor="lm")

    img.save(output_path, quality=95)
    print(f"Generated: {output_path}")


# -------------------------------------------------------------
# 3. Proof of Residence (Electricity Bill)
# -------------------------------------------------------------
def generate_proof_of_residence(
    output_path: str = "sample_documents/proof_of_residence.png",
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
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

    # Name (Matching National ID: محمد محمد أحمد حسنين)
    draw.text((width - 70, 290), ar("اسم المشترك:"), font=get_font(FONT_BOLD, 20), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 240, 290), ar("محمد محمد أحمد حسنين"), font=get_font(FONT_BOLD, 26), fill=(15, 23, 42), anchor="rm")

    # Address (Matching National ID)
    draw.text((width - 70, 350), ar("العنوان بالتفصيل:"), font=get_font(FONT_BOLD, 20), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 240, 350), ar("١٥ شارع النصر، المعادي، القاهرة"), font=get_font(FONT_BOLD, 24), fill=(15, 23, 42), anchor="rm")

    # Customer & Meter Number
    draw.text((width - 70, 410), ar("رقم السداد الإلكتروني:"), font=get_font(FONT_BOLD, 18), fill=(71, 85, 105), anchor="rm")
    draw.text((width - 270, 410), "9012489210", font=get_font(FONT_BOLD, 20), fill=(15, 23, 42), anchor="rm")

    draw.text((420, 410), ar("رقم العداد:"), font=get_font(FONT_BOLD, 18), fill=(71, 85, 105), anchor="rm")
    draw.text((320, 410), "EGY-781920", font=get_font(FONT_BOLD, 20), fill=(15, 23, 42), anchor="rm")

    # Invoice Details Table
    draw.rounded_rectangle([45, 490, width - 45, 870], radius=14, fill=(255, 255, 255), outline=(203, 213, 225), width=2)
    draw.rectangle([45, 490, width - 45, 545], fill=(241, 245, 249))
    draw.text((width - 70, 517), ar("بيان المحاسبة والاستهلاك الشهري"), font=get_font(FONT_BOLD, 20), fill=(30, 41, 59), anchor="rm")

    items = [
        ("فترة الاستهلاك", "من 01/09/2026 إلى 30/09/2026"),
        ("القراءة السابقة للعداد", "14,250 ك.و.س"),
        ("القراءة الحالية للعداد", "14,680 ك.و.س"),
        ("كمية الاستهلاك الفعلي", "430 ك.و.س"),
        ("قيمة مقابل الاستهلاك", "485.50 ج.م"),
        ("رسوم النظافة وخدمة العملاء", "25.00 ج.م"),
    ]

    ty = 565
    for label, val in items:
        draw.text((width - 80, ty), ar(label), font=get_font(FONT_REGULAR, 19), fill=(51, 65, 85), anchor="rm")
        draw.text((80, ty), ar(val), font=get_font(FONT_BOLD, 20), fill=(15, 23, 42), anchor="lm")
        draw.line([(55, ty + 28), (width - 55, ty + 28)], fill=(241, 245, 249), width=1)
        ty += 48

    # Total Amount Paid
    draw.rounded_rectangle([45, 895, width - 45, 985], radius=12, fill=(240, 253, 244), outline=(34, 197, 94), width=2)
    draw.text((width - 80, 940), ar("إجمالي المبلغ المسدد بالكامل:"), font=get_font(FONT_BOLD, 22), fill=(21, 128, 61), anchor="rm")
    draw.text((80, 940), "510.50 EGP", font=get_font(FONT_BOLD, 28), fill=(21, 128, 61), anchor="lm")

    # Payment Confirmation Stamp
    stamp_cx, stamp_cy = width // 2, 1055
    draw.rounded_rectangle([stamp_cx - 160, stamp_cy - 40, stamp_cx + 160, stamp_cy + 40], radius=16, fill=(254, 242, 242), outline=(220, 38, 38), width=3)
    draw.text((stamp_cx, stamp_cy - 12), ar("تم السداد إلكترونياً - فوري"), font=get_font(FONT_BOLD, 20), fill=(185, 28, 28), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 16), "PAID * AUTH: 9812401 * 2026-10-05", font=get_font(FONT_BOLD, 13), fill=(185, 28, 28), anchor="mm")

    img.save(output_path, quality=95)
    print(f"Generated: {output_path}")


# -------------------------------------------------------------
# 4. Proof of Income (Salary Certificate)
# -------------------------------------------------------------
def generate_proof_of_income(
    output_path: str = "sample_documents/proof_of_income.png",
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 900, 1200
    img = Image.new("RGB", (width, height), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Document border
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

    # Employee Name Highlight (Matching National ID: محمد محمد أحمد حسنين)
    draw.rounded_rectangle([width - 450, 400, width - 70, 450], radius=8, fill=(240, 253, 250))
    draw.text((width - 80, 425), ar("محمد محمد أحمد حسنين"), font=get_font(FONT_BOLD, 26), fill=(15, 118, 110), anchor="rm")

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
        ("صافي الراتب الشهري المستحق الصرف", "29,400 ج.م"),
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

    img.save(output_path, quality=95)
    print(f"Generated: {output_path}")


# -------------------------------------------------------------
# 5. Birth Certificate (Computerized Egyptian Birth Certificate)
# -------------------------------------------------------------
def generate_birth_certificate(
    output_path: str = "sample_documents/account_opening/minor/birth_certificate.png",
    child_name: str = "عمر طارق حسن إبراهيم",
    child_national_id: str = "31603100102351",
    date_of_birth: str = "2016/03/10",
    gender: str = "ذكر",
    birth_place: str = "المعادي - القاهرة",
    father_name: str = "طارق حسن إبراهيم علي",
    father_national_id: str = "28507200101235",
    mother_name: str = "سارة محمود عبد الله",
):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    width, height = 920, 1180
    img = Image.new("RGB", (width, height), color=(248, 252, 249))
    draw = ImageDraw.Draw(img)

    # Outer ornamental double border (official green civil registry style)
    draw.rectangle([20, 20, width - 20, height - 20], outline=(22, 101, 52), width=4)
    draw.rectangle([30, 30, width - 30, height - 30], outline=(134, 239, 172), width=2)

    # Soft central eagle watermark
    draw_egyptian_eagle(draw, cx=width // 2, cy=height // 2 + 40, scale=3.2, is_gold=False)

    # Header
    draw.text((width - 55, 60), ar("جمهورية مصر العربية"), font=get_font(FONT_BOLD, 24), fill=(20, 83, 45), anchor="rt")
    draw.text((width - 55, 96), ar("وزارة الداخلية"), font=get_font(FONT_BOLD, 18), fill=(22, 101, 52), anchor="rt")
    draw.text((width - 55, 126), ar("قطاع مصلحة الأحوال المدنية"), font=get_font(FONT_REGULAR, 16), fill=(51, 65, 85), anchor="rt")

    # Golden Eagle on left
    draw.ellipse([55, 50, 145, 140], fill=(252, 248, 235), outline=(190, 145, 35), width=2)
    draw_egyptian_eagle(draw, cx=100, cy=95, scale=1.1, is_gold=True)

    # Main Title Banner
    draw.rounded_rectangle([240, 165, width - 240, 225], radius=14, fill=(22, 101, 52))
    draw.text((width // 2, 195), ar("صورة قيد ميلاد مميكنة"), font=get_font(FONT_BOLD, 28), fill=(255, 255, 255), anchor="mm")

    # Child National ID Box
    draw.rounded_rectangle([60, 255, width - 60, 325], radius=12, fill=(255, 255, 255), outline=(22, 101, 52), width=2)
    draw.text((width - 85, 290), ar("الرقم القومي للمولود:"), font=get_font(FONT_BOLD, 20), fill=(20, 83, 45), anchor="rm")
    draw.text((90, 290), child_national_id, font=get_font(FONT_MONO, 30), fill=(15, 23, 42), anchor="lm")

    # Section 1: Child Data
    draw.rounded_rectangle([60, 355, width - 60, 620], radius=12, fill=(255, 255, 255), outline=(187, 247, 208), width=2)
    draw.rectangle([60, 355, width - 60, 405], fill=(220, 252, 231))
    draw.text((width - 85, 380), ar("بيانات المولود"), font=get_font(FONT_BOLD, 22), fill=(20, 83, 45), anchor="rm")

    child_rows = [
        ("اسم المولود بالكامل:", child_name),
        ("تاريخ الميلاد:", date_of_birth),
        ("النوع:", gender),
        ("محل الميلاد:", birth_place),
    ]
    ry = 440
    for lbl, val in child_rows:
        draw.text((width - 85, ry), ar(lbl), font=get_font(FONT_BOLD, 19), fill=(71, 85, 105), anchor="rm")
        is_ascii = all(ord(c) < 128 for c in val)
        draw.text(
            (width - 310, ry),
            val if is_ascii else ar(val),
            font=get_font(FONT_BOLD, 23),
            fill=(15, 23, 42),
            anchor="rm",
        )
        ry += 48

    # Section 2: Parents Data
    draw.rounded_rectangle([60, 650, width - 60, 940], radius=12, fill=(255, 255, 255), outline=(187, 247, 208), width=2)
    draw.rectangle([60, 650, width - 60, 700], fill=(220, 252, 231))
    draw.text((width - 85, 675), ar("بيانات الوالدين"), font=get_font(FONT_BOLD, 22), fill=(20, 83, 45), anchor="rm")

    parent_rows = [
        ("اسم الأب بالكامل:", father_name),
        ("الرقم القومي للأب:", father_national_id),
        ("اسم الأم بالكامل:", mother_name),
        ("الجنسية:", "مصري"),
    ]
    ry = 735
    for lbl, val in parent_rows:
        draw.text((width - 85, ry), ar(lbl), font=get_font(FONT_BOLD, 19), fill=(71, 85, 105), anchor="rm")
        is_ascii = all(ord(c) < 128 for c in val)
        draw.text(
            (width - 310, ry),
            val if is_ascii else ar(val),
            font=get_font(FONT_MONO if is_ascii else FONT_BOLD, 24 if is_ascii else 22),
            fill=(15, 23, 42),
            anchor="rm",
        )
        ry += 52

    # Official Stamp & Footer
    draw.text((width - 85, 1005), ar("مكتب السجل المدني: سجل مدني المعادي - القاهرة"), font=get_font(FONT_BOLD, 17), fill=(51, 65, 85), anchor="rm")
    draw.text((width - 85, 1040), ar("تاريخ الإصدار: 2026/10/10"), font=get_font(FONT_REGULAR, 16), fill=(71, 85, 105), anchor="rm")

    stamp_cx, stamp_cy = 200, 1035
    draw.ellipse([stamp_cx - 85, stamp_cy - 55, stamp_cx + 85, stamp_cy + 55], outline=(22, 101, 52), width=3)
    draw.text((stamp_cx, stamp_cy - 15), ar("مصلحة الأحوال المدنية"), font=get_font(FONT_BOLD, 14), fill=(22, 101, 52), anchor="mm")
    draw.text((stamp_cx, stamp_cy + 15), ar("ختم شعار الجمهورية"), font=get_font(FONT_BOLD, 15), fill=(22, 101, 52), anchor="mm")

    img.save(output_path, quality=95)
    print(f"Generated: {output_path}")


if __name__ == "__main__":
    # 1. Legacy root sample documents (kept for integration tests)
    generate_id_front("sample_documents/national_id_front.png")
    generate_id_back("sample_documents/national_id_back.png")
    generate_proof_of_residence("sample_documents/proof_of_residence.png")
    generate_proof_of_income("sample_documents/proof_of_income.png")

    # 2. Account Opening -> Individual (Age 21+: DOB 1998-10-15 -> Age 28)
    ind_dir = "sample_documents/account_opening/individual"
    generate_id_front(f"{ind_dir}/national_id_front.png")
    generate_id_back(f"{ind_dir}/national_id_back.png")
    generate_proof_of_residence(f"{ind_dir}/proof_of_residence.png")
    generate_proof_of_income(f"{ind_dir}/proof_of_income.png")

    # 3. Account Opening -> Youth (Age 15-21: DOB 2008-05-12 -> Age 18)
    youth_dir = "sample_documents/account_opening/youth"
    generate_id_front(
        output_path=f"{youth_dir}/national_id_front.png",
        first_name="يوسف",
        rest_name="خالد محمود علي",
        address_line1="٢٢ شارع التحرير - الدقي",
        address_line2="قسم الدقي - محافظة الجيزة",
        national_id="30805120101451",
        serial="مسلسل: ش / ٥٤٢١٠٨٩٣",
    )
    generate_id_back(
        output_path=f"{youth_dir}/national_id_back.png",
        job="طالب",
        employer="جامعة القاهرة",
        marital_status="أعزب",
        gender="ذكر",
        religion="مسلم",
        expiry_date="2032/05/11",
        issue_date="2025/05/12",
        national_id="30805120101451",
        mrz_line2="0805124M3205112EGY<<<<<<<<<<<6",
        mrz_line3="ALI<<YOUSSEF<KHALED<MAHMOUD<<<<<",
    )

    # 4. Account Opening -> Minor (Age < 15: DOB 2016-03-10 -> Age 10, Guardian NID matches father NID)
    minor_dir = "sample_documents/account_opening/minor"
    generate_birth_certificate(
        output_path=f"{minor_dir}/birth_certificate.png",
        child_name="عمر طارق حسن إبراهيم",
        child_national_id="31603100102351",
        date_of_birth="2016/03/10",
        father_name="طارق حسن إبراهيم علي",
        father_national_id="28507200101235",
        mother_name="سارة محمود عبد الله",
    )
    generate_id_front(
        output_path=f"{minor_dir}/guardian_national_id_front.png",
        first_name="طارق",
        rest_name="حسن إبراهيم علي",
        address_line1="٨ شارع ٩ - المعادي",
        address_line2="قسم المعادي - محافظة القاهرة",
        national_id="28507200101235",
        serial="مسلسل: ع / ٧٣١٠٩٤٢٦",
    )
    generate_id_back(
        output_path=f"{minor_dir}/guardian_national_id_back.png",
        job="محاسب قانوني",
        employer="مكتب النيل للمحاسبة والمراجعة",
        marital_status="متزوج",
        gender="ذكر",
        religion="مسلم",
        expiry_date="2031/07/19",
        issue_date="2024/07/20",
        national_id="28507200101235",
        mrz_line2="8507203M3107197EGY<<<<<<<<<<<4",
        mrz_line3="ALI<<TAREK<HASSAN<IBRAHIM<<<<<<<",
    )

    print("All sample documents generated successfully!")
