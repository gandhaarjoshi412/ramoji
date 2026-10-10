import pytest
import calendar
from datetime import date, datetime
from app.services.intelligent_report_parser import parse_date_flexible, derive_weekday


def test_required_validation_dates_from_master_prompt():
    """
    Test the exact 4 validation dates from Phase 6 of the Master Prompt:
    - 2026-09-08 = Tuesday
    - 2026-09-09 = Wednesday
    - 2026-09-10 = Thursday
    - 2026-10-08 = Thursday
    """
    d1 = parse_date_flexible("2026-09-08")
    assert d1 == date(2026, 9, 8)
    assert derive_weekday(d1) == "Tuesday"

    d2 = parse_date_flexible("2026-09-09")
    assert d2 == date(2026, 9, 9)
    assert derive_weekday(d2) == "Wednesday"

    d3 = parse_date_flexible("2026-09-10")
    assert d3 == date(2026, 9, 10)
    assert derive_weekday(d3) == "Thursday"

    d4 = parse_date_flexible("2026-10-08")
    assert d4 == date(2026, 10, 8)
    assert derive_weekday(d4) == "Thursday"


def test_every_weekday_derivation():
    """Verify that every day of the week is derived deterministically from the calendar date."""
    # A full consecutive week in September 2026:
    # 2026-09-07 (Mon) to 2026-09-13 (Sun)
    expected_weekdays = [
        ("2026-09-07", "Monday"),
        ("2026-09-08", "Tuesday"),
        ("2026-09-09", "Wednesday"),
        ("2026-09-10", "Thursday"),
        ("2026-09-11", "Friday"),
        ("2026-09-12", "Saturday"),
        ("2026-09-13", "Sunday"),
    ]
    for d_str, expected_dow in expected_weekdays:
        dt = parse_date_flexible(d_str)
        assert dt is not None
        assert derive_weekday(dt) == expected_dow
        assert calendar.day_name[dt.weekday()] == expected_dow


def test_month_boundaries():
    """Verify transitions across month boundaries."""
    end_aug = parse_date_flexible("2026-08-31")
    start_sep = parse_date_flexible("2026-09-01")
    assert end_aug == date(2026, 8, 31)
    assert start_sep == date(2026, 9, 1)
    assert derive_weekday(end_aug) == "Monday"
    assert derive_weekday(start_sep) == "Tuesday"

    end_feb_non_leap = parse_date_flexible("2026-02-28")
    start_mar = parse_date_flexible("2026-03-01")
    assert end_feb_non_leap == date(2026, 2, 28)
    assert derive_weekday(end_feb_non_leap) == "Saturday"
    assert start_mar == date(2026, 3, 1)
    assert derive_weekday(start_mar) == "Sunday"


def test_year_boundaries():
    """Verify transitions across year boundaries."""
    ny_eve = parse_date_flexible("2026-12-31")
    ny_day = parse_date_flexible("2027-01-01")
    assert ny_eve == date(2026, 12, 31)
    assert derive_weekday(ny_eve) == "Thursday"
    assert ny_day == date(2027, 1, 1)
    assert derive_weekday(ny_day) == "Friday"


def test_leap_years():
    """Verify leap year handling (2024 and 2028 leap years)."""
    leap_2024 = parse_date_flexible("2024-02-29")
    assert leap_2024 == date(2024, 2, 29)
    assert derive_weekday(leap_2024) == "Thursday"

    leap_2028 = parse_date_flexible("2028-02-29")
    assert leap_2028 == date(2028, 2, 29)
    assert derive_weekday(leap_2028) == "Tuesday"

    # Non-leap year February 29th should be rejected
    invalid_leap = parse_date_flexible("2026-02-29")
    assert invalid_leap is None


def test_excel_serial_dates():
    """
    Verify Excel serial dates conversion.
    46273 -> 2026-09-08 (Tuesday)
    46303 -> 2026-10-08 (Thursday)
    """
    d_serial_1 = parse_date_flexible(46273)
    assert d_serial_1 == date(2026, 9, 8)
    assert derive_weekday(d_serial_1) == "Tuesday"

    d_serial_2 = parse_date_flexible(46303)
    assert d_serial_2 == date(2026, 10, 8)
    assert derive_weekday(d_serial_2) == "Thursday"


def test_supported_textual_formats():
    """Verify various textual date formats commonly found in hospitality logs."""
    # DD/MM/YYYY
    assert parse_date_flexible("08/09/2026") == date(2026, 9, 8)
    # DD-MM-YYYY
    assert parse_date_flexible("08-09-2026") == date(2026, 9, 8)
    # DD.MM.YYYY
    assert parse_date_flexible("08.09.2026") == date(2026, 9, 8)
    # DD.MM.YY (2-digit year)
    assert parse_date_flexible("08.09.26") == date(2026, 9, 8)
    assert parse_date_flexible("08.10.26") == date(2026, 10, 8)
    # Trailing punctuation from operational sheets (e.g. 08.10.26,,,)
    assert parse_date_flexible("08.10.26,,,") == date(2026, 10, 8)
    assert parse_date_flexible("05.08.26.") == date(2026, 8, 5)
    # Textual month
    assert parse_date_flexible("08-Sep-2026") == date(2026, 9, 8)
    assert parse_date_flexible("08 September 2026") == date(2026, 9, 8)
    assert parse_date_flexible("October 08, 2026") == date(2026, 10, 8)


def test_ambiguous_date_convention():
    """
    Ambiguous date like 04/05/2026:
    Under Indian hospitality standards, DD/MM/YYYY is standard -> 4th May 2026 (Monday).
    Must not silently randomize or switch between formats.
    """
    d = parse_date_flexible("04/05/2026")
    assert d == date(2026, 5, 4)
    assert derive_weekday(d) == "Monday"


def test_invalid_and_missing_dates():
    """Invalid dates must be rejected (return None); missing dates must remain None."""
    assert parse_date_flexible(None) is None
    assert parse_date_flexible("") is None
    assert parse_date_flexible("   ") is None
    assert parse_date_flexible("invalid-text-string") is None
    assert parse_date_flexible("2026-13-45") is None
    assert parse_date_flexible("2026-04-31") is None  # April only has 30 days
    assert parse_date_flexible(999999) is None  # Out of reasonable serial range
