#!/usr/bin/env python3
"""
generate_analytics_deck.py
Generates the complete 12-slide executive presentation for the PlateSight Analytics Tab
tailored for Dolphin Group / Ramoji Film City.
Strictly matches design tokens, colors, fonts, layout, badges, footers, and slide numbers
from '/home/gandhaar/platesight dolphin final.pptx'.
"""

import os
import sys
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE

# --- COLOR PALETTE & DESIGN TOKENS ---
C_DARK_PLUM = RGBColor(0x2B, 0x16, 0x1F)     # #2B161F Main dark plum for title/closing slides & titles
C_WARM_IVORY = RGBColor(0xF9, 0xF8, 0xF4)    # #F9F8F4 Slide background for content slides
C_WHITE = RGBColor(0xFF, 0xFF, 0xFF)         # #FFFFFF Card background
C_CARD_CREAM = RGBColor(0xF2, 0xEB, 0xDD)    # #F2EBDD Accent / highlight card fill
C_BORDER_GRAY = RGBColor(0xE6, 0xE0, 0xD8)   # #E6E0D8 Clean container borders
C_RUST = RGBColor(0xC3, 0x4F, 0x2A)          # #C34F2A Brand terracotta / category trackers / badges
C_GOLD = RGBColor(0xC7, 0x99, 0x43)          # #C79943 Accent gold for dark slides
C_TEXT_DARK = RGBColor(0x2B, 0x16, 0x1F)     # #2B161F Dark plum text for headings
C_TEXT_BODY = RGBColor(0x5E, 0x55, 0x50)     # #5E5550 Body text for clear contrast
C_TEXT_MUTED = RGBColor(0x8A, 0x7C, 0x74)    # #8A7C74 Footer & caption text
C_TEXT_LIGHT = RGBColor(0xD8, 0xC8, 0xCE)    # #D8C8CE Subtitles on dark slides
C_DARK_CARD = RGBColor(0x36, 0x1C, 0x27)     # #361C27 Card fill on dark slides
C_DARK_BORDER = RGBColor(0x52, 0x2C, 0x3E)   # #522C3E Border on dark slides

FONT_TITLE = "Georgia"
FONT_BODY = "Calibri"

SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)

LOGO_PATH = "extracted_assets/slide_1_pic_1.png"


def create_deck():
    prs = pptx.Presentation()
    prs.slide_width = SLIDE_WIDTH
    prs.slide_height = SLIDE_HEIGHT
    blank_layout = prs.slide_layouts[6]
    return prs, blank_layout


def set_slide_background(slide, color):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT)
    bg.fill.solid()
    bg.fill.fore_color.rgb = color
    bg.line.fill.background()
    return bg


def add_header(slide, tracker_text, title_text, subtitle_text):
    """Adds standardized header for content slides (Slides 2-11)."""
    # Tracker
    tb_track = slide.shapes.add_textbox(Inches(0.85), Inches(0.48), Inches(11.63), Inches(0.28))
    tf_track = tb_track.text_frame
    tf_track.word_wrap = True
    tf_track.margin_left = tf_track.margin_top = tf_track.margin_right = tf_track.margin_bottom = 0
    p_track = tf_track.paragraphs[0]
    p_track.text = tracker_text.upper()
    p_track.font.name = FONT_BODY
    p_track.font.size = Pt(10)
    p_track.font.bold = True
    p_track.font.color.rgb = C_RUST

    # Title
    tb_title = slide.shapes.add_textbox(Inches(0.85), Inches(0.76), Inches(11.63), Inches(0.65))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.name = FONT_TITLE
    p_title.font.size = Pt(25)
    p_title.font.bold = True
    p_title.font.color.rgb = C_TEXT_DARK

    # Subtitle
    tb_sub = slide.shapes.add_textbox(Inches(0.85), Inches(1.44), Inches(11.63), Inches(0.45))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = subtitle_text
    p_sub.font.name = FONT_BODY
    p_sub.font.size = Pt(12)
    p_sub.font.color.rgb = C_TEXT_BODY


def add_footer(slide, slide_num, total_slides=12, dark_theme=False):
    """Adds standardized footer matching platesight dolphin final.pptx."""
    # Divider line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.85), Inches(6.85), Inches(11.63), Inches(0.01))
    line.fill.solid()
    line.fill.fore_color.rgb = C_DARK_BORDER if dark_theme else C_BORDER_GRAY
    line.line.fill.background()

    # Left: Brand
    tb_left = slide.shapes.add_textbox(Inches(0.85), Inches(6.93), Inches(2.50), Inches(0.30))
    tf_left = tb_left.text_frame
    tf_left.margin_left = tf_left.margin_top = tf_left.margin_right = tf_left.margin_bottom = 0
    p_l = tf_left.paragraphs[0]
    p_l.text = "PlateSight"
    p_l.font.name = FONT_TITLE
    p_l.font.size = Pt(10)
    p_l.font.bold = True
    p_l.font.color.rgb = C_WHITE if dark_theme else C_TEXT_DARK

    # Center: Document Context
    tb_c = slide.shapes.add_textbox(Inches(3.50), Inches(6.93), Inches(6.33), Inches(0.30))
    tf_c = tb_c.text_frame
    tf_c.margin_left = tf_c.margin_top = tf_c.margin_right = tf_c.margin_bottom = 0
    p_c = tf_c.paragraphs[0]
    p_c.text = "AI-Powered Food Waste Monitoring — Prepared for Dolphin Group of Hotels"
    p_c.font.name = FONT_BODY
    p_c.font.size = Pt(9.5)
    p_c.font.color.rgb = C_TEXT_LIGHT if dark_theme else C_TEXT_MUTED

    # Right: Slide Number
    tb_r = slide.shapes.add_textbox(Inches(10.50), Inches(6.93), Inches(1.98), Inches(0.30))
    tf_r = tb_r.text_frame
    tf_r.margin_left = tf_r.margin_top = tf_r.margin_right = tf_r.margin_bottom = 0
    p_r = tf_r.paragraphs[0]
    p_r.alignment = PP_ALIGN.RIGHT
    p_r.text = f"{slide_num} / {total_slides}"
    p_r.font.name = FONT_BODY
    p_r.font.size = Pt(9.5)
    p_r.font.color.rgb = C_TEXT_LIGHT if dark_theme else C_TEXT_MUTED


def add_card(slide, left, top, width, height, fill_color=C_WHITE, border_color=C_BORDER_GRAY):
    """Draws a clean rounded rectangle container card."""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = fill_color
    if border_color:
        card.line.color.rgb = border_color
        card.line.width = Pt(1)
    else:
        card.line.fill.background()
    return card


def add_badge(slide, left, top, width, height, text, bg_color=C_CARD_CREAM, text_color=C_RUST):
    """Adds a small pill/badge shape for card categories."""
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    badge.fill.solid()
    badge.fill.fore_color.rgb = bg_color
    badge.line.fill.background()
    tf = badge.text_frame
    tf.word_wrap = False
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = text.upper()
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.bold = True
    p.font.color.rgb = text_color
    return badge


def set_notes(slide, notes_text):
    """Attaches detailed presenter notes to the slide."""
    ns = slide.notes_slide
    tf = ns.notes_text_frame
    tf.text = notes_text.strip()


# ==========================================
# SLIDE BUILDERS
# ==========================================

def build_slide_1(prs, blank_layout):
    """Slide 1: Executive Title Slide (Dark Plum Theme #2B161F)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_DARK_PLUM)

    # PlateSight Official Logo
    if os.path.exists(LOGO_PATH):
        slide.shapes.add_picture(LOGO_PATH, Inches(0.85), Inches(0.75), Inches(1.20), Inches(0.97))

    # Top Pill Badge
    add_badge(slide, Inches(0.85), Inches(2.05), Inches(3.60), Inches(0.32),
              "EXECUTIVE BRIEFING • ANALYTICS EXPERIENCE", bg_color=C_DARK_CARD, text_color=C_GOLD)

    # Title & Subtitle Box
    tb_title = slide.shapes.add_textbox(Inches(0.85), Inches(2.45), Inches(11.63), Inches(1.40))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0

    p1 = tf_title.paragraphs[0]
    p1.text = "From Food Waste Data to"
    p1.font.name = FONT_TITLE
    p1.font.size = Pt(38)
    p1.font.bold = True
    p1.font.color.rgb = C_WHITE

    p2 = tf_title.add_paragraph()
    p2.text = "Operational Intelligence"
    p2.font.name = FONT_TITLE
    p2.font.size = Pt(38)
    p2.font.bold = True
    p2.font.color.rgb = C_WHITE
    p2.space_before = Pt(4)

    # Subtitle
    tb_sub = slide.shapes.add_textbox(Inches(0.85), Inches(3.95), Inches(11.63), Inches(0.60))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "PlateSight Analytics Tab: Turning automated waste records into operational visibility, financial understanding, and actionable interventions."
    p_sub.font.name = FONT_BODY
    p_sub.font.size = Pt(14)
    p_sub.font.color.rgb = C_TEXT_LIGHT

    # Divider line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.85), Inches(4.75), Inches(11.63), Inches(0.01))
    line.fill.solid()
    line.fill.fore_color.rgb = C_DARK_BORDER
    line.line.fill.background()

    # 3-Column Metadata Grid
    # Col 1: Prepared For
    tb_c1 = slide.shapes.add_textbox(Inches(0.85), Inches(5.05), Inches(3.60), Inches(1.40))
    tf_c1 = tb_c1.text_frame
    tf_c1.word_wrap = True
    tf_c1.margin_left = tf_c1.margin_top = tf_c1.margin_right = tf_c1.margin_bottom = 0
    p = tf_c1.paragraphs[0]
    p.text = "PREPARED FOR"
    p.font.name = FONT_BODY
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = C_GOLD
    p = tf_c1.add_paragraph()
    p.text = "Dolphin Group of Hotels"
    p.font.name = FONT_TITLE
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_before = Pt(4)
    p = tf_c1.add_paragraph()
    p.text = "Ramoji Film City, Hyderabad\n(Sitara • Sahara • Tara • Eureka)"
    p.font.name = FONT_BODY
    p.font.size = Pt(11.5)
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(2)

    # Col 2: In Scope
    tb_c2 = slide.shapes.add_textbox(Inches(4.85), Inches(5.05), Inches(3.60), Inches(1.40))
    tf_c2 = tb_c2.text_frame
    tf_c2.word_wrap = True
    tf_c2.margin_left = tf_c2.margin_top = tf_c2.margin_right = tf_c2.margin_bottom = 0
    p = tf_c2.paragraphs[0]
    p.text = "SCOPE & FOCUS"
    p.font.name = FONT_BODY
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = C_GOLD
    p = tf_c2.add_paragraph()
    p.text = "Analytics Experience"
    p.font.name = FONT_TITLE
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_before = Pt(4)
    p = tf_c2.add_paragraph()
    p.text = "Centralized Web Management Portal\nai.platesight.in/analytics"
    p.font.name = FONT_BODY
    p.font.size = Pt(11.5)
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(2)

    # Col 3: Prepared By
    tb_c3 = slide.shapes.add_textbox(Inches(8.85), Inches(5.05), Inches(3.60), Inches(1.40))
    tf_c3 = tb_c3.text_frame
    tf_c3.word_wrap = True
    tf_c3.margin_left = tf_c3.margin_top = tf_c3.margin_right = tf_c3.margin_bottom = 0
    p = tf_c3.paragraphs[0]
    p.text = "PREPARED BY & DATE"
    p.font.name = FONT_BODY
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = C_GOLD
    p = tf_c3.add_paragraph()
    p.text = "PlateSight Intelligence"
    p.font.name = FONT_TITLE
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_WHITE
    p.space_before = Pt(4)
    p = tf_c3.add_paragraph()
    p.text = "Gandhaar Joshi, Co-Founder\nOctober 2026 Executive Review"
    p.font.name = FONT_BODY
    p.font.size = Pt(11.5)
    p.font.color.rgb = C_TEXT_LIGHT
    p.space_before = Pt(2)

    set_notes(slide, """
SPEAKER NARRATIVE:
Good morning, leadership team of Dolphin Group of Hotels and Ramoji Film City. In our previous demonstrations, we walked through the physical monitoring station—our edge cameras, certified weighing load cells, and kitchen-facing touchscreen. 

Today, we are setting physical hardware aside to focus exclusively on the management layer: the PlateSight Analytics Tab. Our core conviction is that food waste data only becomes valuable when it delivers operational visibility, financial understanding, and measurable opportunities for kitchen intervention.

TRANSITION:
Let us examine how data flows from hotel operations into this central platform, and how multiple input streams combine into a single authoritative management workflow.

CAVEAT & CONTEXT:
The views and screenshots presented today reflect the live implementation at ai.platesight.in/analytics as captured on 9 October 2026. The interface is actively evolving as part of our pilot engagement to align perfectly with Dolphin Group's specific operational workflows.
""")


def build_slide_2(prs, blank_layout):
    """Slide 2: Multi-Source Ingestion & Workflow (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "02 / WORKFLOW & INGESTION",
               "One Analytical Workflow Can Bring Multiple Sources Together",
               "PlateSight consolidates automated hardware logging, existing kitchen spreadsheets, and manual audits into a single pipeline.")

    # Left Container: Three Ingestion Pillars
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(5.60), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(2.40), Inches(1.80), Inches(0.28), "THREE DATA PILLARS", C_CARD_CREAM, C_RUST)

    tb_lh = slide.shapes.add_textbox(Inches(1.15), Inches(2.78), Inches(5.00), Inches(0.40))
    tf_lh = tb_lh.text_frame
    tf_lh.margin_left = tf_lh.margin_top = tf_lh.margin_right = tf_lh.margin_bottom = 0
    p = tf_lh.paragraphs[0]
    p.text = "Multi-Stream Data Harmonization"
    p.font.name = FONT_TITLE
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_lb = slide.shapes.add_textbox(Inches(1.15), Inches(3.22), Inches(5.00), Inches(3.20))
    tf_lb = tb_lb.text_frame
    tf_lb.word_wrap = True
    tf_lb.margin_left = tf_lb.margin_top = tf_lb.margin_right = tf_lb.margin_bottom = 0

    pillars = [
        ("01", "AI Vision & Load-Cell Stations", "Edge-computed plate and tray logs provide instant food segmentation and certified kilogram weights without manual kitchen logging."),
        ("02", "Kitchen Excel Sheets & ERP", "Automated ingestion of daily kitchen production, pickup, and wastage reports (e.g. Sahara & Sitara daily logs) to establish historical baselines."),
        ("03", "Managerial & Audit Overrides", "Authorized supervisor portal to input guaranteed banquet Pax, menu metadata, and food-safety disposition flags.")
    ]

    for i, (num, heading, desc) in enumerate(pillars):
        p_h = tf_lb.paragraphs[0] if i == 0 else tf_lb.add_paragraph()
        p_h.text = f"{num} • {heading}"
        p_h.font.name = FONT_TITLE
        p_h.font.size = Pt(13)
        p_h.font.bold = True
        p_h.font.color.rgb = C_TEXT_DARK
        if i > 0:
            p_h.space_before = Pt(12)

        p_d = tf_lb.add_paragraph()
        p_d.text = desc
        p_d.font.name = FONT_BODY
        p_d.font.size = Pt(10.5)
        p_d.font.color.rgb = C_TEXT_BODY
        p_d.space_before = Pt(2)

    # Right Container: Central Data Pipeline
    card_r = add_card(slide, Inches(6.75), Inches(2.15), Inches(5.73), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.05), Inches(2.40), Inches(2.10), Inches(0.28), "THE CENTRAL DATA PIPELINE", C_CARD_CREAM, C_RUST)

    tb_rh = slide.shapes.add_textbox(Inches(7.05), Inches(2.78), Inches(5.15), Inches(0.40))
    tf_rh = tb_rh.text_frame
    tf_rh.margin_left = tf_rh.margin_top = tf_rh.margin_right = tf_rh.margin_bottom = 0
    p = tf_rh.paragraphs[0]
    p.text = "From Raw Logs to Executive Action"
    p.font.name = FONT_TITLE
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    steps = [
        ("Step 1", "Standardization & Unit Normalization", "Normalizes diverse kitchen units (kg, portions, pans) and maps raw food labels to standardized hotel master recipes."),
        ("Step 2", "Relational Aggregation", "Organizes records by property (Sitara, Sahara), meal shift (Lunch, Dinner), and service format (Buffet, Banquet)."),
        ("Step 3", "Rules Engine & Variance Triggers", "Compares prepared vs consumed vs discarded against historical benchmarks to detect waste anomalies."),
        ("Step 4", "Executive Dashboards & Action Cards", "Surfaces instant financial valuation and actionable batch-size adjustment recommendations.")
    ]

    for idx, (s_num, s_title, s_desc) in enumerate(steps):
        s_box = add_card(slide, Inches(7.05), Inches(3.22 + idx * 0.72), Inches(5.15), Inches(0.64), C_CARD_CREAM, C_BORDER_GRAY)
        tb_step = slide.shapes.add_textbox(Inches(7.15), Inches(3.24 + idx * 0.72), Inches(4.95), Inches(0.58))
        tf_step = tb_step.text_frame
        tf_step.word_wrap = True
        tf_step.margin_left = tf_step.margin_top = tf_step.margin_right = tf_step.margin_bottom = 0
        p1 = tf_step.paragraphs[0]
        p1.text = f"{s_num}: {s_title}"
        p1.font.name = FONT_BODY
        p1.font.size = Pt(11)
        p1.font.bold = True
        p1.font.color.rgb = C_TEXT_DARK
        p2 = tf_step.add_paragraph()
        p2.text = s_desc
        p2.font.name = FONT_BODY
        p2.font.size = Pt(9.5)
        p2.font.color.rgb = C_TEXT_BODY

    # Callout Box at bottom of Right Card
    callout = add_card(slide, Inches(7.05), Inches(6.12), Inches(5.15), Inches(0.38), C_WARM_IVORY, C_BORDER_GRAY)
    tb_co = slide.shapes.add_textbox(Inches(7.15), Inches(6.14), Inches(4.95), Inches(0.32))
    tf_co = tb_co.text_frame
    tf_co.word_wrap = True
    tf_co.margin_left = tf_co.margin_top = tf_co.margin_right = tf_co.margin_bottom = 0
    p = tf_co.paragraphs[0]
    p.text = "Data Governance: Historical spreadsheets bootstrap intelligence immediately, ensuring baseline visibility prior to physical station rollout."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_RUST

    add_footer(slide, 2)
    set_notes(slide, """
SPEAKER NARRATIVE:
A common misconception in food waste initiatives is that everything must wait for 20 physical scanning machines to be installed across all banquet kitchens. That is not how PlateSight works.

PlateSight is built on a hybrid data ingestion model. We recognize that Dolphin Hotels already maintains valuable kitchen logs—such as the Sahara and Sitara daily production, pickup, and wastage Excel sheets. Our platform ingests these historical records directly, applies standardized recipe mapping, and aggregates them into our central intelligence engine.

TRANSITION:
Now let us see what leadership actually sees once this data is processed. Let us move to the executive overview and top-level KPI ribbon.

CAVEAT:
While spreadsheet ingestion bootstraps immediate baseline visibility, real-time edge hardware provides higher granularity and image-verified audit trails. Both feed the same unified data schema.
""")


def build_slide_3(prs, blank_layout):
    """Slide 3: Executive Overview & Top-Level KPI Cards (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "03 / EXECUTIVE KPIS",
               "Start With the Full Food-Waste Picture",
               "Top-level KPI cards establish executive visibility across total preparation, consumption, waste, cost, and guest volume.")

    # UI Screenshot Container Card (Top Half)
    card_ui = add_card(slide, Inches(0.85), Inches(2.05), Inches(11.63), Inches(2.28), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_kpi_cards.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(0.95), Inches(2.15), Inches(11.43), Inches(2.00))

    tb_cap = slide.shapes.add_textbox(Inches(0.95), Inches(4.16), Inches(11.43), Inches(0.18))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Top-level operational KPI cards (ai.platesight.in/analytics) • Values shown represent current platform demonstration data."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Bottom Half: 3 Analytical Metric Breakdown Cards
    cols = [
        ("VOLUME & INTAKE", "Prepared vs. Consumed", [
            ("Total Food Prepared", "Establishes total kitchen production volume entering service."),
            ("Consumption Rate", "Measures true guest intake (e.g. 74.8% intake, 546g/guest)."),
            ("Waste % & g/PAX", "Normalizes discard volume against changing banquet group sizes.")
        ], C_WHITE),
        ("COST & BUFFER DRIFT", "Financial Valuation & Drift", [
            ("Total Waste Cost", "Maps discard kilograms directly to hotel ingredient cost sheets."),
            ("Waste Cost / Guest", "Isolates per-cover margin erosion for banquet pricing review."),
            ("Prepared vs Planned", "Quantifies kitchen buffer inflation against contracted pax.")
        ], C_WHITE),
        ("RESOURCE RECOVERY", "Leftover Segregation", [
            ("Kitchen vs Buffet Split", "Differentiates unserved pan holding from buffet table returns."),
            ("Diverted / Reused Food", "Tracks safe culinary repurposing under hotel food-safety SOPs."),
            ("Clean Separation", "Strictly avoids counting clean leftovers as unrecoverable waste.")
        ], C_CARD_CREAM)
    ]

    for i, (badge_text, card_title, bullets, fill_bg) in enumerate(cols):
        left_pos = Inches(0.85 + i * 3.99)
        c = add_card(slide, left_pos, Inches(4.42), Inches(3.65), Inches(2.28), fill_bg, C_BORDER_GRAY)
        add_badge(slide, left_pos + Inches(0.20), Inches(4.55), Inches(1.80), Inches(0.26), badge_text,
                  C_WHITE if fill_bg == C_CARD_CREAM else C_CARD_CREAM, C_RUST)

        tb_h = slide.shapes.add_textbox(left_pos + Inches(0.20), Inches(4.85), Inches(3.25), Inches(0.35))
        tf_h = tb_h.text_frame
        tf_h.margin_left = tf_h.margin_top = tf_h.margin_right = tf_h.margin_bottom = 0
        p = tf_h.paragraphs[0]
        p.text = card_title
        p.font.name = FONT_TITLE
        p.font.size = Pt(14)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK

        tb_b = slide.shapes.add_textbox(left_pos + Inches(0.20), Inches(5.22), Inches(3.25), Inches(1.35))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True
        tf_b.margin_left = tf_b.margin_top = tf_b.margin_right = tf_b.margin_bottom = 0

        for j, (b_bold, b_text) in enumerate(bullets):
            p_bullet = tf_b.paragraphs[0] if j == 0 else tf_b.add_paragraph()
            p_bullet.text = f"• {b_bold}: {b_text}"
            p_bullet.font.name = FONT_BODY
            p_bullet.font.size = Pt(9.5)
            p_bullet.font.color.rgb = C_TEXT_BODY
            if j > 0:
                p_bullet.space_before = Pt(4)

    add_footer(slide, 3)
    set_notes(slide, """
SPEAKER NARRATIVE:
When an executive chef or general manager opens PlateSight, the first view they encounter is this top-level KPI ribbon. It answers six fundamental operational questions in five seconds:

1. How much food entered the operation? (Total Food Prepared)
2. How much was actually eaten by guests? (Consumption Rate and grams per guest)
3. How much was discarded, and what percentage of production did that represent?
4. What did that discard cost the hotel in rupee ingredient value?
5. How much clean surplus was held, and how much was safely repurposed?
6. Did the kitchen over-buffer preparation relative to planned banquet attendance?

TRANSITION:
Notice that we distinguish between leftovers, safe reuse, and true waste. Let us examine the exact culinary lifecycle flow in Slide 4 to understand why this distinction is critical for chef credibility.

CAVEAT:
The figures shown on this card represent the live demonstration snapshot. In live deployment, these metrics update continuously based on verified weighments and uploaded shift reports.
""")


def build_slide_4(prs, blank_layout):
    """Slide 4: Culinary Food Flow & Waste Composition (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "04 / CULINARY LIFECYCLE",
               "Understand Where Food Goes Before Calling It Waste",
               "Tracking food through distinct operational stages prevents misattributing kitchen holding, buffet returns, or safe reuse as landfill waste.")

    # Left Container: UI Screenshot & Mass-Balance Callout (width=6.40")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(6.40), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_culinary_flow.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(1.00), Inches(2.28), Inches(6.10), Inches(2.54))

    tb_cap = slide.shapes.add_textbox(Inches(1.00), Inches(4.86), Inches(6.10), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Culinary Food Flow & Waste Composition panel."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(1.00), Inches(5.12), Inches(6.10), Inches(1.38), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(5.24), Inches(2.10), Inches(0.24), "CULINARY MASS BALANCE", C_WHITE, C_RUST)

    tb_cb = slide.shapes.add_textbox(Inches(1.15), Inches(5.52), Inches(5.80), Inches(0.90))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    c_points = [
        "Mass-Balance Ledger: Total Prepared = Consumed + Cold-Chain Leftovers + Final Discard.",
        "Cold-Chain Preservation: Safe unserved holding is tracked separately under HACCP temp logs.",
        "Culinary Credibility: Sous chefs audit disposition before final service sign-off."
    ]
    for idx, cp in enumerate(c_points):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {cp}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(2)

    # Right Containers: Analytical Cards
    card_r1 = add_card(slide, Inches(7.50), Inches(2.15), Inches(4.98), Inches(2.35), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(2.35), Inches(2.00), Inches(0.26), "LIFECYCLE MASS-BALANCE", C_CARD_CREAM, C_RUST)

    tb_r1h = slide.shapes.add_textbox(Inches(7.75), Inches(2.68), Inches(4.45), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "End-to-End Kitchen Journey"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r1b = slide.shapes.add_textbox(Inches(7.75), Inches(3.05), Inches(4.45), Inches(1.35))
    tf_r1b = tb_r1b.text_frame
    tf_r1b.word_wrap = True
    tf_r1b.margin_left = tf_r1b.margin_top = tf_r1b.margin_right = tf_r1b.margin_bottom = 0

    flow_points = [
        ("Estimated Requirement", "Forecasted volume based on banquet PAX & per-head specs."),
        ("Kitchen Production", "Actual cooked food output dispatched from central hot kitchens."),
        ("Service Intake", "Food picked up and consumed by banquet and restaurant guests."),
        ("Surplus Disposition", "Separation into unserved leftovers vs plate scrapings.")
    ]
    for idx, (f_title, f_desc) in enumerate(flow_points):
        p_pt = tf_r1b.paragraphs[0] if idx == 0 else tf_r1b.add_paragraph()
        p_pt.text = f"• {f_title}: {f_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(3)

    # Right Lower Card: Waste Composition
    card_r2 = add_card(slide, Inches(7.50), Inches(4.65), Inches(4.98), Inches(2.00), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(4.85), Inches(2.00), Inches(0.26), "WASTE COMPOSITION", C_WHITE, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(7.75), Inches(5.18), Inches(4.45), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Crucial Operational Categorization"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(7.75), Inches(5.55), Inches(4.45), Inches(1.00))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    comp_points = [
        "Buffet Returns: Unserved hot/cold chafing dishes under temperature control.",
        "Safely Reused: Rapid-chilled items repurposed under hotel food-safety SOPs.",
        "Final Discard: Contaminated plate scrapings and post-service spoilage.",
        "Rigorous Rule: Reused food is strictly separated and NEVER double-counted as waste."
    ]
    for idx, c_text in enumerate(comp_points):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = f"• {c_text}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_DARK if idx == 3 else C_TEXT_BODY
        p_pt.font.bold = (idx == 3)
        if idx > 0:
            p_pt.space_before = Pt(2)

    add_footer(slide, 4)
    set_notes(slide, """
SPEAKER NARRATIVE:
In commercial kitchens, nothing creates resistance faster than accusing a culinary team of 'wasting food' when they have simply prepared food that was held cleanly and safely repurposed.

PlateSight solves this through strict mass-balance accounting. As shown in this panel, we follow food from Estimated Requirement to Cooked Production, through Service Pickup, into Consumption. Unconsumed food splits into two distinct operational categories:
1. Safe Leftovers (unserved pans held under temperature control in the kitchen).
2. Final Discarded Waste (table plate scrapings and contaminated returns).

TRANSITION:
Once this lifecycle data is captured, how do we alert the kitchen to take action? Slide 5 presents the Operational Intelligence and AI Action Plan.

CAVEAT:
Safely reused items require logging under hotel temperature-control SOPs. The current interface reflects these categories, supporting verifiable separation between reuse and waste.
""")


def build_slide_5(prs, blank_layout):
    """Slide 5: Operational Intelligence & AI Action Plan (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "05 / OPERATIONAL INTELLIGENCE",
               "A Signal Is the Start of an Investigation",
               "Rules-driven intelligence translates operational anomalies into targeted kitchen inquiries, not unverified root-cause accusations.")

    # Left Container: UI Screenshot & Live Action Samples (width=6.40")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(6.40), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_action_cards.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(1.00), Inches(2.28), Inches(6.10), Inches(1.65))

    tb_cap = slide.shapes.add_textbox(Inches(1.00), Inches(3.97), Inches(6.10), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Operational Intelligence & Action Plan cards with priority filters."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(1.00), Inches(4.25), Inches(6.10), Inches(2.25), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(4.38), Inches(2.20), Inches(0.24), "LIVE ACTION CARD SAMPLES", C_WHITE, C_RUST)

    tb_ch = slide.shapes.add_textbox(Inches(1.15), Inches(4.68), Inches(5.80), Inches(0.28))
    tf_ch = tb_ch.text_frame
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    p = tf_ch.paragraphs[0]
    p.text = "Direct Recommendations Generated in Dashboard"
    p.font.name = FONT_TITLE
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_cb = slide.shapes.add_textbox(Inches(1.15), Inches(4.98), Inches(5.80), Inches(1.42))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    action_samples = [
        "[CRITICAL] Plain Rice Batch Size: Cut dinner buffet primary batch by 25% (Sahara Kitchen). Estimated impact: -14 kg/day.",
        "[ATTENTION] Sambar Replenishment: Switch to 2-stage half-pan holding in final 45 mins. Estimated impact: -8 kg/day.",
        "[PERFORMING WELL] Bread & Bakery Station: Waste index < 3.2% across last 7 consecutive services."
    ]
    for idx, act in enumerate(action_samples):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {act}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_DARK if idx == 0 else C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(3)

    # Right Containers: Analytical Cards
    card_r1 = add_card(slide, Inches(7.50), Inches(2.15), Inches(4.98), Inches(2.65), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(2.35), Inches(2.10), Inches(0.26), "THE 5-STEP ACTION FRAMEWORK", C_CARD_CREAM, C_RUST)

    tb_r1h = slide.shapes.add_textbox(Inches(7.75), Inches(2.68), Inches(4.45), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "How Observations Become Results"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r1b = slide.shapes.add_textbox(Inches(7.75), Inches(3.05), Inches(4.45), Inches(1.65))
    tf_r1b = tb_r1b.text_frame
    tf_r1b.word_wrap = True
    tf_r1b.margin_left = tf_r1b.margin_top = tf_r1b.margin_right = tf_r1b.margin_bottom = 0

    steps = [
        ("1. Metric Signal", "Identifies anomaly (e.g. Dinner buffet waste >30%)."),
        ("2. Data Indication", "Isolates specific recipe drift (e.g. Plain Rice over-batching)."),
        ("3. Investigation", "Sous chef inspects pan replenishment timing & headcounts."),
        ("4. Kitchen Action", "Implement staged batch cooking (50% base + 25% + 25%)."),
        ("5. Verification", "Measure waste reduction across next 5 comparable dinner services.")
    ]
    for idx, (st_name, st_desc) in enumerate(steps):
        p_pt = tf_r1b.paragraphs[0] if idx == 0 else tf_r1b.add_paragraph()
        p_pt.text = f"• {st_name}: {st_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(3)

    # Right Lower Card: Triage & Transparency
    card_r2 = add_card(slide, Inches(7.50), Inches(4.95), Inches(4.98), Inches(1.70), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(5.15), Inches(1.80), Inches(0.26), "TRIAGE & TRANSPARENCY", C_WHITE, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(7.75), Inches(5.48), Inches(4.45), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Rules-Driven, Not Black-Box"
    p.font.name = FONT_TITLE
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(7.75), Inches(5.82), Inches(4.45), Inches(0.75))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    points = [
        "Priority Triage: Filter by Critical, Attention, Performing Well, and Information.",
        "Deterministic Logic: Actions are based on hotel-configured rules, not hallucinated AI claims."
    ]
    for idx, pt_text in enumerate(points):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = f"• {pt_text}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(2)

    add_footer(slide, 5)
    set_notes(slide, """
SPEAKER NARRATIVE:
Data without action is overhead. Slide 5 shows the 'Operational Intelligence & AI Action Plan' section. Notice how action cards are organized by status filters: Critical, Attention, Performing Well, and Information.

Each card follows a rigorous 5-step operational framework:
1. Signal: Identifies the trigger condition.
2. Indication: Pinpoints what the data shows.
3. Investigation: Guides the sous chef where to look.
4. Action: Recommends an immediate kitchen adjustment.
5. Verification: Defines how success will be measured in upcoming services.

TRANSITION:
Next, how do we track whether these interventions work over time? Slide 6 examines Daily Operational Trends.

CAVEAT:
We explicitly clarify that these recommendations are rules-driven observations based on deterministic hotel parameters. We do not claim an autonomous AI robot is running the kitchen; rather, it is an executive decision-support system.
""")


def build_slide_6(prs, blank_layout):
    """Slide 6: Daily Operational Trends (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "06 / TREND ANALYSIS",
               "Separate Total Volume From Performance Rates",
               "Day-over-day tracking reveals whether rising waste stems from operational inefficiency or simply higher guest volume.")

    # Left Container: UI Screenshot & Normalization Callout (width=6.40")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(6.40), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_daily_trends.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(1.00), Inches(2.28), Inches(6.10), Inches(2.24))

    tb_cap = slide.shapes.add_textbox(Inches(1.00), Inches(4.56), Inches(6.10), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Daily Operational Trends (Volume, Waste %, Waste/Guest)."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(1.00), Inches(4.84), Inches(6.10), Inches(1.66), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(4.96), Inches(2.20), Inches(0.24), "NORMALIZED BENCHMARKING", C_WHITE, C_RUST)

    tb_ch = slide.shapes.add_textbox(Inches(1.15), Inches(5.24), Inches(5.80), Inches(0.28))
    tf_ch = tb_ch.text_frame
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    p = tf_ch.paragraphs[0]
    p.text = "Grams-Per-Guest (g/PAX) Target Metrics"
    p.font.name = FONT_TITLE
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_cb = slide.shapes.add_textbox(Inches(1.15), Inches(5.52), Inches(5.80), Inches(0.90))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    trend_points = [
        "Gross Volume vs True Rate: 100kg waste with 2,000 PAX (50g/guest) is far more efficient than 30kg waste with 100 PAX (300g/guest).",
        "Target Hospitality Benchmark: <80g/PAX for multi-dish banquet buffets; <45g/PAX for business luncheons."
    ]
    for idx, tp in enumerate(trend_points):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {tp}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(3)

    # Right Containers: Analytical Cards
    card_r1 = add_card(slide, Inches(7.50), Inches(2.15), Inches(4.98), Inches(2.35), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(2.35), Inches(1.80), Inches(0.26), "DUAL-AXIS EVALUATION", C_CARD_CREAM, C_RUST)

    tb_r1h = slide.shapes.add_textbox(Inches(7.75), Inches(2.68), Inches(4.45), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "Why Normalization Matters"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r1b = slide.shapes.add_textbox(Inches(7.75), Inches(3.05), Inches(4.45), Inches(1.35))
    tf_r1b = tb_r1b.text_frame
    tf_r1b.word_wrap = True
    tf_r1b.margin_left = tf_r1b.margin_top = tf_r1b.margin_right = tf_r1b.margin_bottom = 0

    points_norm = [
        ("Gross Kilograms (kg)", "Indicates total handling volume and physical disposal load."),
        ("Waste Percentage (%)", "Measures kitchen batch accuracy relative to total cooked volume."),
        ("Grams per Guest (g/PAX)", "The gold standard hospitality benchmark. Evaluates whether 50kg waste came from 200 guests (crisis) or 2,000 guests (highly efficient).")
    ]
    for idx, (p_title, p_desc) in enumerate(points_norm):
        p_pt = tf_r1b.paragraphs[0] if idx == 0 else tf_r1b.add_paragraph()
        p_pt.text = f"• {p_title}: {p_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(3)

    # Right Lower Card: Multi-Stream Toggles
    card_r2 = add_card(slide, Inches(7.50), Inches(4.65), Inches(4.98), Inches(2.00), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(4.85), Inches(1.80), Inches(0.26), "MULTI-STREAM TOGGLES", C_WHITE, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(7.75), Inches(5.18), Inches(4.45), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Tracking Cross-Stream Dynamics"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(7.75), Inches(5.55), Inches(4.45), Inches(1.00))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    points_toggle = [
        "Metric Toggles: Seamlessly switch views between Production, Consumption, Final Waste, Leftover, and Reused.",
        "Management Insight: Verifies whether waste reduction is driven by leaner cooking batches or improved leftover recovery.",
        "Rolling Averages: Computes daily average production and grams per guest to smooth out weekend banquet fluctuations."
    ]
    for idx, t_text in enumerate(points_toggle):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = f"• {t_text}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(2)

    add_footer(slide, 6)
    set_notes(slide, """
SPEAKER NARRATIVE:
In hospitality analytics, gross numbers can deceive. Consider a wedding banquet at Sahara with 1,500 guests that generates 100 kilograms of food waste. That sounds alarming—until you calculate the per-guest rate: only 66 grams per person, which is exceptionally lean.

Conversely, a small executive conference of 80 guests generating 30 kilograms represents an unacceptable 375 grams per guest.

Slide 6 shows how PlateSight's Daily Trends view allows leadership to toggle between gross kilograms, waste percentage, and normalized grams per guest (g/PAX).

TRANSITION:
Now let us break this down further: where does this waste actually happen? Slide 7 examines Meal Shifts and Service Types.

CAVEAT:
Accurate guest count (PAX) data is essential for reliable per-guest calculations. Our system syncs PAX from banquet event orders or supervisor inputs.
""")


def build_slide_7(prs, blank_layout):
    """Slide 7: Meal Shifts & Service Types (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "07 / OPERATING CONTEXT",
               "Find Out Which Operating Context Needs Attention",
               "Grouping performance by meal shift and service format pinpoints structural operational differences across banquet and outlet operations.")

    # Left Container: UI Screenshot & Shift Audit Callout (width=6.40")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(6.40), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_session_service.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(1.00), Inches(2.28), Inches(6.10), Inches(2.31))

    tb_cap = slide.shapes.add_textbox(Inches(1.00), Inches(4.63), Inches(6.10), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Session-wise Breakdown & Service Type Operational Yield."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(1.00), Inches(4.90), Inches(6.10), Inches(1.60), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(5.02), Inches(2.10), Inches(0.24), "OPERATIONAL SHIFT AUDIT", C_WHITE, C_RUST)

    tb_ch = slide.shapes.add_textbox(Inches(1.15), Inches(5.30), Inches(5.80), Inches(0.28))
    tf_ch = tb_ch.text_frame
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    p = tf_ch.paragraphs[0]
    p.text = "Key Session Yield Observations"
    p.font.name = FONT_TITLE
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_cb = slide.shapes.add_textbox(Inches(1.15), Inches(5.58), Inches(5.80), Inches(0.85))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    yield_points = [
        "Dinner Shift Disproportion: Dinner accounts for over 58% of aggregate daily waste due to late-buffet presentation requirements.",
        "Buffet Pan Tapering SOP: Implementing half-pan replenishment in the final 45 minutes saves ~15–20% without impacting guest satisfaction."
    ]
    for idx, yp in enumerate(yield_points):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {yp}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(3)

    # Right Containers: Analytical Cards
    card_r1 = add_card(slide, Inches(7.50), Inches(2.15), Inches(4.98), Inches(2.35), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(2.35), Inches(1.60), Inches(0.26), "SHIFT PROFILES", C_CARD_CREAM, C_RUST)

    tb_r1h = slide.shapes.add_textbox(Inches(7.75), Inches(2.68), Inches(4.45), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "Session-Wise Dynamics"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r1b = slide.shapes.add_textbox(Inches(7.75), Inches(3.05), Inches(4.45), Inches(1.35))
    tf_r1b = tb_r1b.text_frame
    tf_r1b.word_wrap = True
    tf_r1b.margin_left = tf_r1b.margin_top = tf_r1b.margin_right = tf_r1b.margin_bottom = 0

    shifts = [
        ("Breakfast", "Standardized pickups, high predictability, low waste intensity."),
        ("Lunch", "High turnover, compact service window, moderate buffet recovery."),
        ("Dinner", "Consistently highest waste intensity due to prolonged service holding and late-buffet presentation requirements."),
        ("Snacks / Hi-Tea", "Variable pickup; sensitive to precise conference timing.")
    ]
    for idx, (sh_name, sh_desc) in enumerate(shifts):
        p_pt = tf_r1b.paragraphs[0] if idx == 0 else tf_r1b.add_paragraph()
        p_pt.text = f"• {sh_name}: {sh_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_RUST if sh_name == "Dinner" else C_TEXT_BODY
        p_pt.font.bold = (sh_name == "Dinner")
        if idx > 0:
            p_pt.space_before = Pt(2)

    # Right Lower Card: Service Types
    card_r2 = add_card(slide, Inches(7.50), Inches(4.65), Inches(4.98), Inches(2.00), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(4.85), Inches(1.60), Inches(0.26), "SERVICE YIELD", C_WHITE, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(7.75), Inches(5.18), Inches(4.45), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Buffet vs Banquet vs À la Carte"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(7.75), Inches(5.55), Inches(4.45), Inches(1.00))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    services = [
        "Buffets: Suffer from 'full pan' visual presentation pressure until closing.",
        "Banquets: High volume, fixed menus, contractual over-buffering against guarantees.",
        "À la Carte: On-demand preparation delivers tightest margins and lowest waste (~3–5%).",
        "Targeted Action: Interventions focus specifically where 85%+ of waste occurs: Buffets & Banquets."
    ]
    for idx, s_desc in enumerate(services):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = f"• {s_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_DARK if idx == 3 else C_TEXT_BODY
        p_pt.font.bold = (idx == 3)
        if idx > 0:
            p_pt.space_before = Pt(2)

    add_footer(slide, 7)
    set_notes(slide, """
SPEAKER NARRATIVE:
Telling an executive chef to 'cut waste by 10%' across all kitchens is ineffective and demoralizing. Kitchen teams need surgical operational targets.

Slide 7 breaks down performance by Meal Shift and Service Format. Across commercial hotel data—including Dolphin's own properties—Dinner Buffet consistently exhibits the highest waste intensity. Why? Because hotel hospitality standards demand that chafing dishes look full and inviting even for late-arriving guests at 10:30 PM.

By contrasting Buffets, Banquets, and À la Carte, PlateSight helps management focus batch-reduction playbooks precisely where the waste is concentrated: the final 45 minutes of dinner buffet replenishment.

TRANSITION:
How does this manifest in specific functions? Slide 8 explores Banquet & Event Performance.

CAVEAT:
Service type classifications must be tagged consistently in kitchen event orders (BEOs) to ensure clear attribution between banquet functions and restaurant buffets.
""")


def build_slide_8(prs, blank_layout):
    """Slide 8: Banquet & Event Performance (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "08 / BANQUET & EVENT INTELLIGENCE",
               "Review One Event, Then Compare Like-for-Like Events",
               "Granular function records enable event-by-event post-mortems while building historical benchmarks across event categories.")

    # Left Container: UI Screenshot & Function Audit Callout (width=6.40")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(6.40), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_banquet_events.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(1.00), Inches(2.28), Inches(6.10), Inches(2.39))

    tb_cap = slide.shapes.add_textbox(Inches(1.00), Inches(4.71), Inches(6.10), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Banquet Event Performance Table with configurable thresholds."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(1.00), Inches(4.98), Inches(6.10), Inches(1.52), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.15), Inches(5.10), Inches(2.10), Inches(0.24), "FUNCTION AUDIT CRITERIA", C_WHITE, C_RUST)

    tb_ch = slide.shapes.add_textbox(Inches(1.15), Inches(5.38), Inches(5.80), Inches(0.28))
    tf_ch = tb_ch.text_frame
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    p = tf_ch.paragraphs[0]
    p.text = "Automated BEO Threshold Triggers"
    p.font.name = FONT_TITLE
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_cb = slide.shapes.add_textbox(Inches(1.15), Inches(5.66), Inches(5.80), Inches(0.78))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    beo_points = [
        "Guaranteed vs Actual Variance: Instantly flags events where guest turnout deviated by >15% from contract guarantee.",
        "Margin Protection: Prevents unfair attribution of client no-shows to kitchen overproduction."
    ]
    for idx, bp in enumerate(beo_points):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {bp}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(3)

    # Right Containers: Analytical Cards
    card_r1 = add_card(slide, Inches(7.50), Inches(2.15), Inches(4.98), Inches(2.45), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(2.35), Inches(1.80), Inches(0.26), "EVENT AUDIT MATRIX", C_CARD_CREAM, C_RUST)

    tb_r1h = slide.shapes.add_textbox(Inches(7.75), Inches(2.68), Inches(4.45), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "Comprehensive Function Auditing"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r1b = slide.shapes.add_textbox(Inches(7.75), Inches(3.05), Inches(4.45), Inches(1.45))
    tf_r1b = tb_r1b.text_frame
    tf_r1b.word_wrap = True
    tf_r1b.margin_left = tf_r1b.margin_top = tf_r1b.margin_right = tf_r1b.margin_bottom = 0

    cols_captured = [
        ("Event Metadata", "Function Name, Hall (Sitara, Sahara), Date, and Guaranteed PAX."),
        ("Volume Reconciliation", "Estimated Requirement vs Actual Cooked vs Consumed kilograms."),
        ("Disposition Tracking", "Leftovers recovered, safely reused, and final discarded kilograms."),
        ("Financial Impact", "Total Waste Cost (₹) and Cost per PAX."),
        ("Compliance Status", "Automated status pill (Compliant, Review, Critical) via configurable thresholds.")
    ]
    for idx, (c_name, c_desc) in enumerate(cols_captured):
        p_pt = tf_r1b.paragraphs[0] if idx == 0 else tf_r1b.add_paragraph()
        p_pt.text = f"• {c_name}: {c_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(2.5)

    # Right Lower Card: Like-for-Like Benchmarking
    card_r2 = add_card(slide, Inches(7.50), Inches(4.75), Inches(4.98), Inches(1.90), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(7.75), Inches(4.95), Inches(1.90), Inches(0.26), "EVENT BENCHMARKING", C_WHITE, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(7.75), Inches(5.28), Inches(4.45), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Like-for-Like Event Analysis"
    p.font.name = FONT_TITLE
    p.font.size = Pt(15)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(7.75), Inches(5.62), Inches(4.45), Inches(0.95))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    points_bench = [
        "Event Type Segmentation: Compare lavish wedding banquets against corporate seminars of identical PAX.",
        "Menu Complexity Impact: Evaluate whether 10-course buffets generate 40% more waste than 6-course formats.",
        "Sales Feedback Loop: Feeds actual PAX eating patterns directly back into banquet sales contracts."
    ]
    for idx, b_desc in enumerate(points_bench):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = f"• {b_desc}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(2)

    add_footer(slide, 8)
    set_notes(slide, """
SPEAKER NARRATIVE:
Banquets represent the highest-margin and highest-risk sector of hotel F&B. When an event experiences heavy food waste, who is responsible? Is it kitchen over-preparation, or did the client guarantee 500 PAX while only 320 showed up?

Slide 8 demonstrates our Banquet Event Performance table. For every single function, we capture the guaranteed PAX, estimated requirements, cooked kilograms, actual consumed volume, leftovers, and final waste cost.

Furthermore, management can click 'Configure Thresholds' to set acceptable waste tolerances based on event scale. This creates an objective, data-backed bridge between banquet sales coordinators and executive chefs.

TRANSITION:
Now let us zoom into the culinary specifics. Which dishes generate this waste, and when does it spike? Slide 9 presents Dish Rankings and Shift Heatmaps.

CAVEAT:
Event records require matching Banquet Event Order (BEO) numbers with kitchen production sheets to achieve full automated reconciliation.
""")


def build_slide_9(prs, blank_layout):
    """Slide 9: Dish-Level Rankings & Shift Heatmaps (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "09 / DISH & TIME INTELLIGENCE",
               "Move From Total Waste to the Specific Dishes and Periods Behind It",
               "Combining item-level Pareto rankings with temporal heatmaps directs culinary focus to the high-impact recipes and recurring shift windows.")

    # Top Half: 2 Paired UI Screenshot Cards Side-by-Side
    # Left UI: Dish Ranking
    card_ul = add_card(slide, Inches(0.85), Inches(2.15), Inches(5.65), Inches(2.50), C_WHITE, C_BORDER_GRAY)
    crop_dish = "key_crops/ui_dish_ranking.png"
    if os.path.exists(crop_dish):
        slide.shapes.add_picture(crop_dish, Inches(0.95), Inches(2.25), Inches(5.45), Inches(2.15))

    tb_cap_l = slide.shapes.add_textbox(Inches(0.95), Inches(4.42), Inches(5.45), Inches(0.20))
    tf_cap_l = tb_cap_l.text_frame
    tf_cap_l.margin_left = tf_cap_l.margin_top = tf_cap_l.margin_right = tf_cap_l.margin_bottom = 0
    p = tf_cap_l.paragraphs[0]
    p.text = "Current UI: Dish-level waste ranking & Pareto distribution."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Right UI: Heatmap
    card_ur = add_card(slide, Inches(6.70), Inches(2.15), Inches(5.78), Inches(2.50), C_WHITE, C_BORDER_GRAY)
    crop_heat = "key_crops/ui_heatmap.png"
    if os.path.exists(crop_heat):
        slide.shapes.add_picture(crop_heat, Inches(6.80), Inches(2.25), Inches(5.58), Inches(2.15))

    tb_cap_r = slide.shapes.add_textbox(Inches(6.80), Inches(4.42), Inches(5.58), Inches(0.20))
    tf_cap_r = tb_cap_r.text_frame
    tf_cap_r.margin_left = tf_cap_r.margin_top = tf_cap_r.margin_right = tf_cap_r.margin_bottom = 0
    p = tf_cap_r.paragraphs[0]
    p.text = "Current UI: Shift waste intensity heatmap by day-of-week."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Bottom Half: 2 Structured Analytical Cards
    card_bl = add_card(slide, Inches(0.85), Inches(4.78), Inches(5.65), Inches(1.88), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(1.05), Inches(4.95), Inches(1.80), Inches(0.26), "PARETO DISTRIBUTION", C_CARD_CREAM, C_RUST)

    tb_blh = slide.shapes.add_textbox(Inches(1.05), Inches(5.25), Inches(5.25), Inches(0.35))
    tf_blh = tb_blh.text_frame
    tf_blh.margin_left = tf_blh.margin_top = tf_blh.margin_right = tf_blh.margin_bottom = 0
    p = tf_blh.paragraphs[0]
    p.text = "Top-Waste Dish Concentration"
    p.font.name = FONT_TITLE
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_blb = slide.shapes.add_textbox(Inches(1.05), Inches(5.58), Inches(5.25), Inches(1.00))
    tf_blb = tb_blb.text_frame
    tf_blb.word_wrap = True
    tf_blb.margin_left = tf_blb.margin_top = tf_blb.margin_right = tf_blb.margin_bottom = 0

    points_pareto = [
        "The 80/20 Rule: In Indian hotel banquets, 4–5 core staple recipes consistently generate over 70% of total discarded weight (Plain Rice, Sambar, Rasam, Dal, Biryani).",
        "Actionable Priority: Eliminating overproduction on just these 4 items solves the vast majority of volume and disposal expense."
    ]
    for idx, p_text in enumerate(points_pareto):
        p_pt = tf_blb.paragraphs[0] if idx == 0 else tf_blb.add_paragraph()
        p_pt.text = f"• {p_text}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(3)

    # Bottom Right Card: Heatmap
    card_br = add_card(slide, Inches(6.70), Inches(4.78), Inches(5.78), Inches(1.88), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(6.90), Inches(4.95), Inches(1.80), Inches(0.26), "TEMPORAL CLUSTERING", C_WHITE, C_RUST)

    tb_brh = slide.shapes.add_textbox(Inches(6.90), Inches(5.25), Inches(5.38), Inches(0.35))
    tf_brh = tb_brh.text_frame
    tf_brh.margin_left = tf_brh.margin_top = tf_brh.margin_right = tf_brh.margin_bottom = 0
    p = tf_brh.paragraphs[0]
    p.text = "Heatmap Shift Intensity"
    p.font.name = FONT_TITLE
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_brb = slide.shapes.add_textbox(Inches(6.90), Inches(5.58), Inches(5.38), Inches(1.00))
    tf_brb = tb_brb.text_frame
    tf_brb.word_wrap = True
    tf_brb.margin_left = tf_brb.margin_top = tf_brb.margin_right = tf_brb.margin_bottom = 0

    points_heat = [
        "Visual Shift Intensity: Color gradient maps high-loss hotspots across Date × Meal Session (Waste kg, %, Cost ₹).",
        "Day-of-Week Recurring Patterns: Immediately highlights structural variances—such as heavy Sunday night banquet spikes versus compliant Tuesday lunch services."
    ]
    for idx, h_text in enumerate(points_heat):
        p_pt = tf_brb.paragraphs[0] if idx == 0 else tf_brb.add_paragraph()
        p_pt.text = f"• {h_text}"
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(3)

    add_footer(slide, 9)
    set_notes(slide, """
SPEAKER NARRATIVE:
Slide 9 answers the two most actionable questions in culinary operations: 'WHAT is being wasted?' and 'WHEN is it being wasted?'

On the left, the Dish Ranking view applies Pareto analysis. Across hundreds of hotel buffet records, we find that chefs do not have a 50-dish waste problem. They have a 4-dish waste problem: Plain Rice, Sambar, Rasam, and Dal. Because these items are inexpensive per kilogram, kitchen prep teams batch cook them in massive 50kg pots without disciplined pacing.

On the right, the Shift Intensity Heatmap cross-references meal sessions against days of the week. Management instantly sees whether waste clusters around Sunday night wedding buffets or Friday conference luncheons.

TRANSITION:
What does this waste actually mean in rupees and profit margins? Slide 10 presents our Financial Valuation and Savings Simulator.

CAVEAT:
Ranking accuracy depends on consistent dish categorization. Recipes with minor naming variations (e.g., 'Plain Rice' vs 'Steamed Rice') are unified during data standardization.
""")


def build_slide_10(prs, blank_layout):
    """Slide 10: Financial Valuation & Savings Simulator (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "10 / FINANCIAL IMPACT",
               "Turn a Recorded Quantity Into a Transparent Financial Scenario",
               "Distinguishing verified ingredient cost records from hypothetical reduction scenarios provides finance with a disciplined business case.")

    # Left Container: UI Screenshot & Methodology Callout (width=5.50")
    card_l = add_card(slide, Inches(0.85), Inches(2.15), Inches(5.50), Inches(4.50), C_WHITE, C_BORDER_GRAY)
    crop_path = "key_crops/ui_savings_simulator.png"
    if os.path.exists(crop_path):
        slide.shapes.add_picture(crop_path, Inches(0.95), Inches(2.28), Inches(5.30), Inches(2.17))

    tb_cap = slide.shapes.add_textbox(Inches(0.95), Inches(4.49), Inches(5.30), Inches(0.20))
    tf_cap = tb_cap.text_frame
    tf_cap.margin_left = tf_cap.margin_top = tf_cap.margin_right = tf_cap.margin_bottom = 0
    p = tf_cap.paragraphs[0]
    p.text = "Current interface snapshot: Savings Simulator & Financial Impact Engine."
    p.font.name = FONT_BODY
    p.font.size = Pt(8.5)
    p.font.color.rgb = C_TEXT_MUTED

    # Lower callout card inside card_l
    callout_l = add_card(slide, Inches(0.95), Inches(4.76), Inches(5.30), Inches(1.74), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(1.10), Inches(4.88), Inches(2.30), Inches(0.24), "SIMULATOR METHODOLOGY", C_WHITE, C_RUST)

    tb_ch = slide.shapes.add_textbox(Inches(1.10), Inches(5.16), Inches(5.00), Inches(0.28))
    tf_ch = tb_ch.text_frame
    tf_ch.margin_left = tf_ch.margin_top = tf_ch.margin_right = tf_ch.margin_bottom = 0
    p = tf_ch.paragraphs[0]
    p.text = "Scenario Modeling Principles"
    p.font.name = FONT_TITLE
    p.font.size = Pt(12)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_cb = slide.shapes.add_textbox(Inches(1.10), Inches(5.44), Inches(5.00), Inches(0.98))
    tf_cb = tb_cb.text_frame
    tf_cb.word_wrap = True
    tf_cb.margin_left = tf_cb.margin_top = tf_cb.margin_right = tf_cb.margin_bottom = 0

    sim_points = [
        "Dynamic Target Sensitivity: Interactive slider tests 5% to 50% waste curtailment scenarios in real time.",
        "ERP Cost Integration: Cost per kg automatically derives from master storeroom ingredient rate contracts.",
        "Direct EBITDA Impact: 100% of avoided food waste expense flows directly to hotel net margin."
    ]
    for idx, sp in enumerate(sim_points):
        p_c = tf_cb.paragraphs[0] if idx == 0 else tf_cb.add_paragraph()
        p_c.text = f"• {sp}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(9.5)
        p_c.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_c.space_before = Pt(2)

    # Right Containers: Verified Case Study & Calculation Cards (width=5.98")
    card_r1 = add_card(slide, Inches(6.50), Inches(2.15), Inches(5.98), Inches(2.70), C_CARD_CREAM, C_BORDER_GRAY)
    add_badge(slide, Inches(6.75), Inches(2.35), Inches(2.90), Inches(0.28), "VERIFIED SAHARA BASELINE (24 AUG 2026)", C_RUST, C_WHITE)

    tb_r1h = slide.shapes.add_textbox(Inches(6.75), Inches(2.70), Inches(5.50), Inches(0.35))
    tf_r1h = tb_r1h.text_frame
    tf_r1h.margin_left = tf_r1h.margin_top = tf_r1h.margin_right = tf_r1h.margin_bottom = 0
    p = tf_r1h.paragraphs[0]
    p.text = "Single-Dish Case Study: Plain Rice"
    p.font.name = FONT_TITLE
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    # 2 Sub-blocks inside Card R1 (Side-by-side or distinct sections)
    tb_rec = slide.shapes.add_textbox(Inches(6.75), Inches(3.10), Inches(2.65), Inches(1.65))
    tf_rec = tb_rec.text_frame
    tf_rec.word_wrap = True
    tf_rec.margin_left = tf_rec.margin_top = tf_rec.margin_right = tf_rec.margin_bottom = 0
    p = tf_rec.paragraphs[0]
    p.text = "Recorded Source Log (24.08.26):"
    p.font.name = FONT_BODY
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = C_RUST

    rec_lines = [
        "• Lunch Discarded: 26.2 kg (1,722 PAX)",
        "• Dinner Discarded: 29.2 kg (752 PAX)",
        "• Combined Daily Waste: 55.4 kg",
        "• Source Sheet Rate: ~₹20/kg (raw base)",
        "• Recorded Daily Cost: ₹1,108 / day"
    ]
    for r_line in rec_lines:
        p_pt = tf_rec.add_paragraph()
        p_pt.text = r_line
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        p_pt.space_before = Pt(2)

    tb_calc = slide.shapes.add_textbox(Inches(9.50), Inches(3.10), Inches(2.80), Inches(1.65))
    tf_calc = tb_calc.text_frame
    tf_calc.word_wrap = True
    tf_calc.margin_left = tf_calc.margin_top = tf_calc.margin_right = tf_calc.margin_bottom = 0
    p = tf_calc.paragraphs[0]
    p.text = "Illustrative Fully Loaded Cost (₹40/kg):"
    p.font.name = FONT_BODY
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    calc_lines = [
        "• Full Cooked Cost: ₹40/kg (ingredients + labor + gas)",
        "• Daily Baseline Cost: 55.4kg × ₹40 = ₹2,216 / day",
        "• 50% Reduction Target: 27.7kg = ₹1,108 / day saved",
        "• 30-Day Potential Savings: ₹33,240 / month",
        "  (On Plain Rice alone at a single property!)"
    ]
    for c_line in calc_lines:
        p_pt = tf_calc.add_paragraph()
        p_pt.text = c_line
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_RUST if "₹33,240" in c_line else C_TEXT_BODY
        p_pt.font.bold = ("₹33,240" in c_line)
        p_pt.space_before = Pt(2)

    # Right Lower Card: What-If Simulator
    card_r2 = add_card(slide, Inches(6.50), Inches(4.95), Inches(5.98), Inches(1.70), C_WHITE, C_BORDER_GRAY)
    add_badge(slide, Inches(6.75), Inches(5.15), Inches(2.20), Inches(0.26), "WHAT-IF REDUCTION SIMULATOR", C_CARD_CREAM, C_RUST)

    tb_r2h = slide.shapes.add_textbox(Inches(6.75), Inches(5.48), Inches(5.50), Inches(0.35))
    tf_r2h = tb_r2h.text_frame
    tf_r2h.margin_left = tf_r2h.margin_top = tf_r2h.margin_right = tf_r2h.margin_bottom = 0
    p = tf_r2h.paragraphs[0]
    p.text = "Interactive Management Scenarios (Monthly Impact)"
    p.font.name = FONT_TITLE
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = C_TEXT_DARK

    tb_r2b = slide.shapes.add_textbox(Inches(6.75), Inches(5.82), Inches(5.50), Inches(0.75))
    tf_r2b = tb_r2b.text_frame
    tf_r2b.word_wrap = True
    tf_r2b.margin_left = tf_r2b.margin_top = tf_r2b.margin_right = tf_r2b.margin_bottom = 0

    scenarios = [
        "• -10% Reduction: ₹6,648 / mo potential savings (Conservative batch re-timing).",
        "• -20% Reduction: ₹13,296 / mo potential savings (Moderate, 2-stage pan replenishments).",
        "• -30% Reduction: ₹19,944 / mo potential savings (Optimized, live sensor-triggered refills).",
        "• Note: Illustrative potential savings based on ₹40/kg fully loaded cost model to guide executive targets."
    ]
    for idx, sc_text in enumerate(scenarios):
        p_pt = tf_r2b.paragraphs[0] if idx == 0 else tf_r2b.add_paragraph()
        p_pt.text = sc_text
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(9.5)
        p_pt.font.color.rgb = C_TEXT_BODY
        if idx > 0:
            p_pt.space_before = Pt(1.5)

    add_footer(slide, 10)
    set_notes(slide, """
SPEAKER NARRATIVE:
Let us now examine the real financial opportunity using Dolphin's own audited operational data.

In the Sahara daily production report for 24 August 2026, lunch recorded 26.2 kg of Plain Rice waste across 1,722 guests. Dinner recorded 29.2 kg across 752 guests. Combined, that is 55.4 kilograms of Plain Rice discarded in a single 24-hour period.

In the hotel's raw spreadsheet, this is booked at ~₹20/kg raw rice base rate, yielding ₹1,108 in recorded cost. 

However, as every F&B director knows, cooked rice does not cost ₹20/kg. When you factor in RO water, cooking gas, kitchen labor, and preparation overhead, fully loaded cooked rice costs approximately ₹40/kg.

At ₹40/kg:
• 55.4 kg × ₹40 = ₹2,216 per day in cooked food loss.
• A realistic 50% waste reduction saves 27.7 kg per day = ₹1,108 saved every day.
• Over 30 days, that represents ₹33,240 in recovered margin every month—on a single staple dish at a single property!

TRANSITION:
How does executive leadership verify that these figures are real and tamper-resistant? Slide 11 explores Trust, Audit Controls, and Multi-Property Rollout.

CAVEAT:
We distinguish recorded source spreadsheet costs (~₹20/kg raw ingredient base) from illustrative fully loaded operational costs (assumed ₹40/kg). The simulator models potential savings to guide hotel operational target-setting.
""")


def build_slide_11(prs, blank_layout):
    """Slide 11: Data Governance, Audit Controls & Multi-Property Rollout (Light Theme)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_WARM_IVORY)
    add_header(slide, "11 / GOVERNANCE & INTEGRATION",
               "Reliable Decisions Depend on Consistent Records",
               "Centralized analytics require strict data hygiene, transparent calculation definitions, and unified multi-property controls.")

    # 3 Structured Vertical Cards
    cards_data = [
        ("AUDIT INTEGRITY", "Human-in-the-Loop Controls", [
            ("Photo Evidence", "Every hardware scan captures a high-resolution image record for verification and chef dispute resolution."),
            ("Manager Override", "Authorized supervisors can review and adjust dish classifications, PAX counts, or waste reasons via secure modal."),
            ("Immutable Log", "Every weight transaction is timestamped and secured against unauthorized alteration or retroactive editing."),
            ("Tamper Resistance", "Eliminates adversarial gaming and ensures finance can rely on data integrity.")
        ], C_WHITE),
        ("MULTI-PROPERTY ROLLOUT", "Dolphin Property Portfolio", [
            ("Unified Data Schema", "Single dashboard filters effortlessly across Sitara Luxury, Sahara Banquets, Tara, and Eureka."),
            ("Cross-Kitchen Benchmarking", "Compares grams-per-guest efficiency across kitchen brigades cooking identical menu specifications."),
            ("Centralized Oversight", "Headquarters view for Ramoji Film City executive leadership to monitor portfolio-wide trends."),
            ("Scalable Architecture", "Start with a pilot station at Sahara and scale seamlessly to Sitara and Tara.")
        ], C_WHITE),
        ("ROLE-BASED GOVERNANCE", "Tailored Stakeholder Views", [
            ("Executive / GM", "High-level monthly savings, sustainability metrics, and property scorecards."),
            ("F&B Controller / Finance", "Recipe variance, ingredient wastage costs, inventory drift, and procurement alignment."),
            ("Executive & Sous Chefs", "Shift action cards, batch timing recommendations, and item-level waste rankings."),
            ("Kitchen Stewards", "Simple, language-agnostic color-coded station confirmations.")
        ], C_CARD_CREAM)
    ]

    for i, (badge_text, card_title, bullets, fill_bg) in enumerate(cards_data):
        left_pos = Inches(0.85 + i * 3.99)
        card = add_card(slide, left_pos, Inches(2.15), Inches(3.65), Inches(4.50), fill_bg, C_BORDER_GRAY)
        add_badge(slide, left_pos + Inches(0.20), Inches(2.40), Inches(1.80), Inches(0.28), badge_text,
                  C_WHITE if fill_bg == C_CARD_CREAM else C_CARD_CREAM, C_RUST)

        tb_h = slide.shapes.add_textbox(left_pos + Inches(0.20), Inches(2.78), Inches(3.25), Inches(0.40))
        tf_h = tb_h.text_frame
        tf_h.margin_left = tf_h.margin_top = tf_h.margin_right = tf_h.margin_bottom = 0
        p = tf_h.paragraphs[0]
        p.text = card_title
        p.font.name = FONT_TITLE
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = C_TEXT_DARK

        tb_b = slide.shapes.add_textbox(left_pos + Inches(0.20), Inches(3.25), Inches(3.25), Inches(3.20))
        tf_b = tb_b.text_frame
        tf_b.word_wrap = True
        tf_b.margin_left = tf_b.margin_top = tf_b.margin_right = tf_b.margin_bottom = 0

        for j, (b_bold, b_desc) in enumerate(bullets):
            p_bullet = tf_b.paragraphs[0] if j == 0 else tf_b.add_paragraph()
            p_bullet.text = f"• {b_bold}: {b_desc}"
            p_bullet.font.name = FONT_BODY
            p_bullet.font.size = Pt(10)
            p_bullet.font.color.rgb = C_TEXT_BODY
            if j > 0:
                p_bullet.space_before = Pt(8)

    add_footer(slide, 11)
    set_notes(slide, """
SPEAKER NARRATIVE:
For an analytics platform to succeed in enterprise hospitality, two stakeholder groups must trust it completely: the finance controller and the culinary team.

If chefs feel the system is an inaccurate surveillance tool, they will bypass it. If finance suspects the numbers are unverified, they will not use it for costing.

Slide 11 addresses governance directly:
1. Audit Integrity: Every scan stores high-resolution image evidence. Sous chefs have full rights to audit and override dish tags with recorded rationale.
2. Multi-Property Rollout: The architecture is built for Ramoji Film City's full portfolio—Sitara Luxury Hotel, Sahara Banquets, Tara, and Eureka. Management can benchmark kitchen efficiency under identical menu standards.
3. Role-Based Views: The GM sees executive margin impact; the F&B controller audits ingredient variance; the head chef receives actionable batch timing recommendations.

TRANSITION:
Let us conclude with the continuous improvement loop and our structured pilot roadmap. Slide 12.

CAVEAT:
Role-based permissions and multi-property user access controls are configured during pilot onboarding in collaboration with Dolphin IT and F&B leadership.
""")


def build_slide_12(prs, blank_layout):
    """Slide 12: Continuous Improvement Loop & Pilot Next Steps (Dark Plum Theme #2B161F)"""
    slide = prs.slides.add_slide(blank_layout)
    set_slide_background(slide, C_DARK_PLUM)

    # Top Pill Badge
    add_badge(slide, Inches(0.85), Inches(0.65), Inches(3.40), Inches(0.32),
              "CONTINUOUS IMPROVEMENT • PILOT NEXT STEPS", bg_color=C_DARK_CARD, text_color=C_GOLD)

    # Main Title
    tb_title = slide.shapes.add_textbox(Inches(0.85), Inches(1.05), Inches(11.63), Inches(0.70))
    tf_title = tb_title.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p = tf_title.paragraphs[0]
    p.text = "Measure. Investigate. Adjust. Measure Again."
    p.font.name = FONT_TITLE
    p.font.size = Pt(32)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    # Subtitle
    tb_sub = slide.shapes.add_textbox(Inches(0.85), Inches(1.75), Inches(11.63), Inches(0.40))
    tf_sub = tb_sub.text_frame
    tf_sub.word_wrap = True
    tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
    p = tf_sub.paragraphs[0]
    p.text = "The PlateSight analytics continuous improvement loop for Dolphin Group of Hotels."
    p.font.name = FONT_BODY
    p.font.size = Pt(13.5)
    p.font.color.rgb = C_TEXT_LIGHT

    # Divider line
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.85), Inches(2.30), Inches(11.63), Inches(0.01))
    line.fill.solid()
    line.fill.fore_color.rgb = C_DARK_BORDER
    line.line.fill.background()

    # Left Container: Structured 4-Stage Pilot Engagement (width=6.60")
    card_l = add_card(slide, Inches(0.85), Inches(2.55), Inches(6.60), Inches(4.15), C_DARK_CARD, C_DARK_BORDER)
    add_badge(slide, Inches(1.10), Inches(2.75), Inches(2.20), Inches(0.28), "THE 4-STAGE PILOT ROADMAP", C_DARK_BORDER, C_GOLD)

    tb_lh = slide.shapes.add_textbox(Inches(1.10), Inches(3.12), Inches(6.10), Inches(0.35))
    tf_lh = tb_lh.text_frame
    tf_lh.margin_left = tf_lh.margin_top = tf_lh.margin_right = tf_lh.margin_bottom = 0
    p = tf_lh.paragraphs[0]
    p.text = "Structured 60-Day Pilot Milestones"
    p.font.name = FONT_TITLE
    p.font.size = Pt(17)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    tb_lb = slide.shapes.add_textbox(Inches(1.10), Inches(3.52), Inches(6.10), Inches(3.00))
    tf_lb = tb_lb.text_frame
    tf_lb.word_wrap = True
    tf_lb.margin_left = tf_lb.margin_top = tf_lb.margin_right = tf_lb.margin_bottom = 0

    phases = [
        ("Phase 1: Baseline Recording (Weeks 1–2)", "Deploy automated monitoring & ingest daily Excel logs. Capture true, unadjusted operational baseline across lunch and dinner buffets."),
        ("Phase 2: Recipe & Cost Mapping (Weeks 3–4)", "Map Dolphin Group ingredient master rate sheets into the costing engine to establish authoritative rupee valuations."),
        ("Phase 3: Targeted Batch Interventions (Weeks 5–6)", "Implement action card recommendations on top 3 high-waste items (Plain Rice, Sambar) with staged pan replenishment."),
        ("Phase 4: Financial Validation & Review (Weeks 7–8)", "Measure post-intervention waste reduction and audit validated rupee savings with hotel GM and finance leadership.")
    ]

    for idx, (p_title, p_desc) in enumerate(phases):
        p_pt = tf_lb.paragraphs[0] if idx == 0 else tf_lb.add_paragraph()
        p_pt.text = p_title
        p_pt.font.name = FONT_BODY
        p_pt.font.size = Pt(11)
        p_pt.font.bold = True
        p_pt.font.color.rgb = C_GOLD
        if idx > 0:
            p_pt.space_before = Pt(8)

        p_desc_p = tf_lb.add_paragraph()
        p_desc_p.text = p_desc
        p_desc_p.font.name = FONT_BODY
        p_desc_p.font.size = Pt(9.5)
        p_desc_p.font.color.rgb = C_TEXT_LIGHT
        p_desc_p.space_before = Pt(1.5)

    # Right Container: Contact & Closing Card (width=4.78")
    card_r = add_card(slide, Inches(7.70), Inches(2.55), Inches(4.78), Inches(4.15), C_DARK_CARD, C_DARK_BORDER)

    # Official Logo in Right Card
    if os.path.exists(LOGO_PATH):
        slide.shapes.add_picture(LOGO_PATH, Inches(8.00), Inches(2.80), Inches(1.20), Inches(0.97))

    tb_rh = slide.shapes.add_textbox(Inches(8.00), Inches(3.90), Inches(4.20), Inches(0.40))
    tf_rh = tb_rh.text_frame
    tf_rh.margin_left = tf_rh.margin_top = tf_rh.margin_right = tf_rh.margin_bottom = 0
    p = tf_rh.paragraphs[0]
    p.text = "PlateSight Intelligence"
    p.font.name = FONT_TITLE
    p.font.size = Pt(20)
    p.font.bold = True
    p.font.color.rgb = C_WHITE

    tb_rb = slide.shapes.add_textbox(Inches(8.00), Inches(4.35), Inches(4.20), Inches(2.20))
    tf_rb = tb_rb.text_frame
    tf_rb.word_wrap = True
    tf_rb.margin_left = tf_rb.margin_top = tf_rb.margin_right = tf_rb.margin_bottom = 0

    p = tf_rb.paragraphs[0]
    p.text = "Building a smarter, more measurable approach to banquet food waste."
    p.font.name = FONT_BODY
    p.font.size = Pt(11.5)
    p.font.color.rgb = C_TEXT_LIGHT

    contact_info = [
        ("Web Portal", "ai.platesight.in/analytics"),
        ("Email Contact", "gandhaar.joshi@platesight.in"),
        ("Presenter", "Gandhaar Joshi, Co-Founder"),
        ("Partner Property", "Dolphin Group of Hotels • Ramoji Film City")
    ]

    for idx, (label, val) in enumerate(contact_info):
        p_c = tf_rb.add_paragraph()
        p_c.text = f"{label}: {val}"
        p_c.font.name = FONT_BODY
        p_c.font.size = Pt(10)
        p_c.font.color.rgb = C_GOLD if "Gandhaar" in val or "platesight.in" in val else C_WHITE
        p_c.space_before = Pt(5)

    add_footer(slide, 12, dark_theme=True)
    set_notes(slide, """
SPEAKER NARRATIVE:
Food waste in hospitality operations has historically been treated as an unavoidable cost of doing business. With PlateSight, it becomes a controlled, measurable operational variable.

Our philosophy is simple: Measure. Investigate. Adjust. Measure Again.

We propose a structured, 60-day pilot engagement with Dolphin Group of Hotels:
• In Weeks 1 and 2, we establish an unadjusted baseline without interfering with kitchen operations.
• In Weeks 3 and 4, we integrate Dolphin's exact ingredient costs and master recipe rates.
• In Weeks 5 and 6, we implement simple staged batch interventions on the top 3 high-waste items (Plain Rice, Sambar).
• In Weeks 7 and 8, we audit the verified rupee savings together with executive leadership and finance.

Thank you for your partnership and vision in making hospitality operations smarter and more sustainable.

TRANSITION:
We now invite Mr. Ramoji Rao's leadership team, General Managers, and the Executive Culinary Directors to discuss pilot venue selection (Sahara vs Sitara), baseline scheduling, and opening the floor for questions.

CAVEAT:
Implementation timeline assumes timely access to daily banquet event orders (BEOs), daily store requisition rate cards, and kitchen cooperation during initial baseline logging. Physical edge stations require standard single-phase 230V power and local Wi-Fi / 4G coverage at the stewarding wash-up area.
""")


def main():
    prs, blank_layout = create_deck()
    print("Building 12-slide executive presentation...")

    build_slide_1(prs, blank_layout)
    print("Slide 1 built.")

    build_slide_2(prs, blank_layout)
    print("Slide 2 built.")

    build_slide_3(prs, blank_layout)
    print("Slide 3 built.")

    build_slide_4(prs, blank_layout)
    print("Slide 4 built.")

    build_slide_5(prs, blank_layout)
    print("Slide 5 built.")

    build_slide_6(prs, blank_layout)
    print("Slide 6 built.")

    build_slide_7(prs, blank_layout)
    print("Slide 7 built.")

    build_slide_8(prs, blank_layout)
    print("Slide 8 built.")

    build_slide_9(prs, blank_layout)
    print("Slide 9 built.")

    build_slide_10(prs, blank_layout)
    print("Slide 10 built.")

    build_slide_11(prs, blank_layout)
    print("Slide 11 built.")

    build_slide_12(prs, blank_layout)
    print("Slide 12 built.")

    out_file = "platesight_analytics_executive_presentation.pptx"
    prs.save(out_file)
    print(f"Presentation saved successfully to '{out_file}'!")

    # Check slide count
    prs_check = pptx.Presentation(out_file)
    print(f"Verification: Presentation contains {len(prs_check.slides)} slides.")


if __name__ == "__main__":
    main()
