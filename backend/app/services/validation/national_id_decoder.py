from datetime import date
from typing import Optional
from pydantic import BaseModel


GOVERNORATES: dict[str, str] = {
    "01": "القاهرة",
    "02": "الإسكندرية",
    "03": "بورسعيد",
    "04": "السويس",
    "11": "دمياط",
    "12": "الدقهلية",
    "13": "الشرقية",
    "14": "القليوبية",
    "15": "كفر الشيخ",
    "16": "الغربية",
    "17": "المنوفية",
    "18": "البحيرة",
    "19": "الإسماعيلية",
    "21": "الجيزة",
    "22": "بني سويف",
    "23": "الفيوم",
    "24": "المنيا",
    "25": "أسيوط",
    "26": "سوهاج",
    "27": "قنا",
    "28": "أسوان",
    "29": "الأقصر",
    "31": "البحر الأحمر",
    "32": "الوادي الجديد",
    "33": "مطروح",
    "34": "شمال سيناء",
    "35": "جنوب سيناء",
    "88": "مركز كبار السن / مولود بالخارج",
}


class NationalIdInfo(BaseModel):
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    governorate: Optional[str] = None
    is_valid: bool = False
    error: Optional[str] = None


def decode_national_id(national_id: str) -> NationalIdInfo:
    """Decode and validate a 14-digit Egyptian National ID number.

    Structure:
    - Century (digit 0): '2' -> 1900-1999, '3' -> 2000-2099
    - Date of Birth (digits 1-6): YYMMDD
    - Governorate code (digits 7-8): 2-digit code mapping to Egyptian governorate
    - Serial sequence (digits 9-12): digit 12 determines gender (odd=male, even=female)
    - Check digit (digit 13)
    """
    if not national_id or not isinstance(national_id, str):
        return NationalIdInfo(
            is_valid=False,
            error="National ID must be a non-empty string",
        )

    national_id = national_id.strip().translate(str.maketrans("٠١٢٣٤٥٦٧٨٩", "0123456789"))

    if len(national_id) != 14 or not national_id.isdigit():
        return NationalIdInfo(
            is_valid=False,
            error="National ID must be exactly 14 digits",
        )

    # Validate century code
    century_code = national_id[0]
    if century_code == "2":
        century_year = 1900
    elif century_code == "3":
        century_year = 2000
    else:
        return NationalIdInfo(
            is_valid=False,
            error=f"Invalid century code: {century_code}",
        )

    # Validate date of birth
    yy = int(national_id[1:3])
    mm = int(national_id[3:5])
    dd = int(national_id[5:7])
    full_year = century_year + yy

    try:
        dob = date(full_year, mm, dd)
    except (ValueError, OverflowError):
        return NationalIdInfo(
            is_valid=False,
            error=f"Invalid birth date: year={full_year}, month={mm}, day={dd}",
        )

    if dob > date.today():
        return NationalIdInfo(
            is_valid=False,
            error="Birth date cannot be in the future",
        )

    # Validate governorate code
    gov_code = national_id[7:9]
    governorate = GOVERNORATES.get(gov_code)
    if not governorate:
        return NationalIdInfo(
            is_valid=False,
            error=f"Invalid governorate code: {gov_code}",
        )

    # Gender determination:
    # Digit 13 in 1-based counting (index 12, the last digit of the 4-digit serial digits 9..12)
    # determines gender: odd -> male, even -> female.
    gender_digit = int(national_id[12])
    gender = "male" if gender_digit % 2 != 0 else "female"

    return NationalIdInfo(
        date_of_birth=dob,
        gender=gender,
        governorate=governorate,
        is_valid=True,
        error=None,
    )
