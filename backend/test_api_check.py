import urllib.request
import json

def run_checks():
    # Login
    login_data = json.dumps({'email': 'gandhaar.joshi@platesight.in', 'password': 'pass1234'}).encode()
    req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=login_data,
        headers={'Content-Type': 'application/json'}
    )
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    print(">>> 1. OVERVIEW AUDIT")
    req_ov = urllib.request.Request('http://127.0.0.1:8000/api/analytics/overview', headers=headers)
    ov = json.loads(urllib.request.urlopen(req_ov).read())
    mb = ov.get('mass_balance_audit', {})
    dc = ov.get('date_coverage', {})
    dq = ov.get('data_quality', {})
    print(f"  * Mass Balance Reconciled: {mb.get('is_reconciled')}")
    print(f"  * Leftover Reconciliation Variance: {mb.get('leftover_variance_kg')} kg (Discrepancy count: {len(mb.get('unaccounted_discrepancy_records', []))})")
    print(f"  * Date Coverage: {dc.get('recorded_days_count')} recorded out of {dc.get('calendar_days_count')} calendar days ({dc.get('calendar_start')} to {dc.get('calendar_end')})")
    print(f"  * Data Quality Score: {dq.get('overall_score_pct')}% ({dq.get('rating')})")

    # Session currency reconciliation check (Example 2)
    sessions = ov.get('session_comparison', [])
    reconciled_sum = sum(s.get('waste_cost_reconciled', 0) for s in sessions)
    headline_int = int(round(ov['kpis']['total_waste_cost']['current']))
    print(f"  * Currency Largest Remainder Match: Sum({reconciled_sum}) == Headline({headline_int}) -> {reconciled_sum == headline_int}")

    print("\n>>> 2. HOTELS AUDIT")
    req_h = urllib.request.Request('http://127.0.0.1:8000/api/analytics/hotels', headers=headers)
    h = json.loads(urllib.request.urlopen(req_h).read())
    for hotel in h.get('hotels', []):
        print(f"  * {hotel['hotel_name']}: {hotel['total_records']} recs, {hotel['waste_rate_pct']:.1f}% waste, {hotel['waste_per_guest_g']:.0f}g/guest, INR {hotel['total_waste_cost']:,.0f}")

    print("\n>>> 3. EVENT TYPES AUDIT")
    req_et = urllib.request.Request('http://127.0.0.1:8000/api/analytics/event-types', headers=headers)
    et = json.loads(urllib.request.urlopen(req_et).read())
    for c in et.get('categories', []):
        print(f"  * {c['category']}: {c['event_count']} events (Sample N>=3 adequate: {c['sample_size_adequate']})")

    print("\n>>> 4. END-OF-DAY HOSPITALITY REPORT AUDIT")
    req_eod = urllib.request.Request('http://127.0.0.1:8000/api/analytics/eod-report', headers=headers)
    eod = json.loads(urllib.request.urlopen(req_eod).read())
    print(f"  * Report Date: {eod.get('report_date')}, Has Data: {eod.get('has_data')}, Guests: {eod.get('total_guests')}")

    print("\n>>> 5. DATA QUALITY CENTER AUDIT")
    req_dq = urllib.request.Request('http://127.0.0.1:8000/api/analytics/data-quality', headers=headers)
    dq_res = json.loads(urllib.request.urlopen(req_dq).read())
    print(f"  * Total issues identified: {dq_res.get('total_issues_found')}")
    print(f"  * Quality score: {dq_res.get('overall_score_pct')}%")
    for iss in dq_res.get('issues_feed', [])[:3]:
        print(f"    - [{iss['severity']}] {iss['issue_type']} in {iss['dish_name']}: {iss['description']}")

if __name__ == '__main__':
    run_checks()
