from datetime import date
from app.services.validation.national_id_decoder import decode_national_id


def test_decode_valid_male_1900s():
    # Century=2, known DOB, odd digit 12 → male
    result = decode_national_id("29001011234571")
    assert result.date_of_birth == date(1990, 1, 1)
    assert result.gender == "male"
    assert result.is_valid is True


def test_decode_valid_female_2000s():
    # Century=3, known DOB, even digit 12 → female
    result = decode_national_id("30506152345682")
    assert result.date_of_birth == date(2005, 6, 15)
    assert result.gender == "female"


def test_decode_invalid_length():
    result = decode_national_id("123")
    assert result.is_valid is False


def test_decode_invalid_date():
    # Month=13 is impossible
    result = decode_national_id("29013011234567")
    assert result.is_valid is False


def test_decode_invalid_governorate():
    result = decode_national_id("29001019934567")
    assert result.is_valid is False


def test_decode_extracts_governorate():
    # Governorate code 01 = Cairo
    result = decode_national_id("29001010112345")
    assert result.governorate == "القاهرة"


def test_decode_2000s_century():
    # Review Focus #1: century=3 must produce 2000s date, not 1900s
    result = decode_national_id("30506150112345")
    assert result.date_of_birth.year == 2005  # not 1905


def test_decode_impossible_date_valid_format():
    # Review Focus #5: 14 digits, valid governorate, but Feb 30 → invalid
    result = decode_national_id("29002300112345")
    assert result.is_valid is False


def test_decode_arabic_indic_numerals():
    # Arabic-Indic digits should be normalized to standard digits
    result = decode_national_id("٢٩٠٠١٠١١٢٣٤٥٧١")
    assert result.is_valid is True
    assert result.date_of_birth == date(1990, 1, 1)
    assert result.gender == "male"
    assert result.governorate == "الدقهلية"


def test_decode_future_birth_date():
    # Birth date in the future (e.g., year 2050) is invalid
    result = decode_national_id("35001010112345")
    assert result.is_valid is False
    assert result.error == "Birth date cannot be in the future"
