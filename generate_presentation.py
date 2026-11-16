import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def create_deck():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    
    # Color Palette - Modern Weather Theme (Deep Navy, Slate Blue, Teal/Cyan Accent, Clean White/Light Gray)
    BG_DARK = RGBColor(15, 23, 42)        # Slate 900
    BG_CARD = RGBColor(30, 41, 59)        # Slate 800
    BG_CARD_LIGHT = RGBColor(241, 245, 249) # Slate 100
    PRIMARY = RGBColor(14, 116, 144)      # Cyan 700
    PRIMARY_LIGHT = RGBColor(6, 182, 212) # Cyan 500
    ACCENT = RGBColor(56, 189, 248)       # Sky 400
    TEXT_LIGHT = RGBColor(248, 250, 252)  # Slate 50
    TEXT_MUTED = RGBColor(148, 163, 184)  # Slate 400
    TEXT_DARK = RGBColor(15, 23, 42)
    TEXT_BODY_DARK = RGBColor(51, 65, 85)
    CARD_BORDER = RGBColor(51, 65, 85)
    CARD_BG_WHITE = RGBColor(255, 255, 255)
    
    blank_layout = prs.slide_layouts[6] # blank layout
    
    def set_slide_background(slide, color):
        bg = slide.background
        fill = bg.fill
        fill.solid()
        fill.fore_color.rgb = color
        
    def add_header(slide, title_text, category_text="WEATHER DETECTION SYSTEM"):
        # Header container
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.7), Inches(1.1))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_sub = tf.paragraphs[0]
        p_sub.text = category_text.upper()
        p_sub.font.name = "Calibri"
        p_sub.font.size = Pt(11)
        p_sub.font.bold = True
        p_sub.font.color.rgb = PRIMARY_LIGHT
        p_sub.space_after = Pt(4)
        
        p_main = tf.add_paragraph()
        p_main.text = title_text
        p_main.font.name = "Calibri"
        p_main.font.size = Pt(28)
        p_main.font.bold = True
        p_main.font.color.rgb = TEXT_LIGHT

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide (Dark modern premium gradient look)
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide1, BG_DARK)
    
    # Decorative subtle accent line / card
    accent_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.4), Inches(0.12), Inches(3.2))
    accent_bar.fill.solid()
    accent_bar.fill.fore_color.rgb = PRIMARY_LIGHT
    accent_bar.line.fill.background()
    
    # Title & Subtitle box
    t_box = slide1.shapes.add_textbox(Inches(1.2), Inches(1.3), Inches(11.3), Inches(3.4))
    tf1 = t_box.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0
    
    p0 = tf1.paragraphs[0]
    p0.text = "MAJOR PROJECT PRESENTATION"
    p0.font.name = "Calibri"
    p0.font.size = Pt(13)
    p0.font.bold = True
    p0.font.color.rgb = ACCENT
    p0.space_after = Pt(10)
    
    p1 = tf1.add_paragraph()
    p1.text = "WEATHER DETECTION SYSTEM"
    p1.font.name = "Calibri"
    p1.font.size = Pt(44)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_LIGHT
    p1.space_after = Pt(12)
    
    p2 = tf1.add_paragraph()
    p2.text = "A Responsive Web Application Powered by React.js & OpenWeatherMap API"
    p2.font.name = "Calibri"
    p2.font.size = Pt(18)
    p2.font.color.rgb = TEXT_MUTED
    
    # Student Details Card
    card1 = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.8), Inches(11.733), Inches(1.9))
    card1.fill.solid()
    card1.fill.fore_color.rgb = BG_CARD
    card1.line.color.rgb = CARD_BORDER
    card1.line.width = Pt(1.5)
    
    # Left column details
    c_box = slide1.shapes.add_textbox(Inches(1.2), Inches(5.0), Inches(5.5), Inches(1.5))
    ctf = c_box.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0
    
    cp1 = ctf.paragraphs[0]
    cp1.text = "SUBMITTED BY: "
    cp1.font.name = "Calibri"
    cp1.font.size = Pt(15)
    cp1.font.bold = True
    cp1.font.color.rgb = PRIMARY_LIGHT
    run1 = cp1.add_run()
    run1.text = "Sumant Kumar Sahoo"
    run1.font.bold = True
    run1.font.color.rgb = TEXT_LIGHT
    
    cp2 = ctf.add_paragraph()
    cp2.text = "ROLL NO: "
    cp2.font.name = "Calibri"
    cp2.font.size = Pt(14)
    cp2.font.bold = True
    cp2.font.color.rgb = TEXT_MUTED
    run2 = cp2.add_run()
    run2.text = "69"
    run2.font.bold = True
    run2.font.color.rgb = TEXT_LIGHT
    cp2.space_before = Pt(6)

    # Right column details
    c_box2 = slide1.shapes.add_textbox(Inches(6.8), Inches(5.0), Inches(5.5), Inches(1.5))
    ctf2 = c_box2.text_frame
    ctf2.word_wrap = True
    ctf2.margin_left = ctf2.margin_top = ctf2.margin_right = ctf2.margin_bottom = 0
    
    rcp1 = ctf2.paragraphs[0]
    rcp1.text = "BRANCH & SECTION: "
    rcp1.font.name = "Calibri"
    rcp1.font.size = Pt(14)
    rcp1.font.bold = True
    rcp1.font.color.rgb = TEXT_MUTED
    rrun1 = rcp1.add_run()
    rrun1.text = "CSE (AI) | CSE AI Genius"
    rrun1.font.bold = True
    rrun1.font.color.rgb = TEXT_LIGHT
    
    rcp2 = ctf2.add_paragraph()
    rcp2.text = "ORGANIZATION: "
    rcp2.font.name = "Calibri"
    rcp2.font.size = Pt(14)
    rcp2.font.bold = True
    rcp2.font.color.rgb = TEXT_MUTED
    rrun2 = rcp2.add_run()
    rrun2.text = "GIFT Autonomous College"
    rrun2.font.bold = True
    rrun2.font.color.rgb = ACCENT
    rcp2.space_before = Pt(6)

    # -------------------------------------------------------------
    # SLIDE 2: Contents
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide2, BG_DARK)
    add_header(slide2, "Table of Contents", "AGENDA")
    
    contents = [
        "1. Introduction",
        "2. Project Overview",
        "3. Objectives",
        "4. Results and Findings",
        "5. Analysis and Discussion",
        "6. Summary of Development",
        "7. Conclusion",
        "8. Recommendations",
        "9. Future Directions",
        "10. Project Photos, Short Clips & Hyperlinks"
    ]
    
    # 2 columns of 5 cards
    col_w = Inches(5.6)
    card_h = Inches(0.85)
    gap_y = Inches(0.2)
    start_y = Inches(1.8)
    
    for i, item in enumerate(contents):
        col = 0 if i < 5 else 1
        row = i if i < 5 else i - 5
        left = Inches(0.8) if col == 0 else Inches(6.9)
        top = start_y + row * (card_h + gap_y)
        
        card = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, col_w, card_h)
        card.fill.solid()
        card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1)
        
        tb = slide2.shapes.add_textbox(left + Inches(0.25), top + Inches(0.18), col_w - Inches(0.5), Inches(0.5))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = item
        p.font.name = "Calibri"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = TEXT_LIGHT

    # Helper function for 3-card or list layouts
    def add_info_card(slide, left, top, width, height, title, body, icon_tag=""):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = BG_CARD
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.2)
        
        tb = slide.shapes.add_textbox(left + Inches(0.35), top + Inches(0.35), width - Inches(0.7), height - Inches(0.7))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        
        p_title = tf.paragraphs[0]
        p_title.text = title
        p_title.font.name = "Calibri"
        p_title.font.size = Pt(20)
        p_title.font.bold = True
        p_title.font.color.rgb = ACCENT
        p_title.space_after = Pt(14)
        
        p_body = tf.add_paragraph()
        p_body.text = body
        p_body.font.name = "Calibri"
        p_body.font.size = Pt(15)
        p_body.font.color.rgb = TEXT_MUTED
        p_body.line_spacing = 1.3
        return card

    # -------------------------------------------------------------
    # SLIDE 3: Introduction
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide3, BG_DARK)
    add_header(slide3, "1. Introduction", "BACKGROUND & CONTEXT")
    
    intro_cards = [
        ("Web-Based Architecture", 
         "The Weather Detection System is a responsive, client-side web application developed using the modern React.js framework and real-time OpenWeatherMap API services."),
        ("City-Centric Search", 
         "Enables users to seamlessly search any global city and instantly view its up-to-date meteorological metrics and current weather state."),
        ("External API Integration", 
         "Retrieves structured JSON weather data from third-party endpoints and presents temperature, humidity, and conditions through an intuitive user interface.")
    ]
    
    card_w = Inches(3.64)
    card_h = Inches(4.6)
    gap = Inches(0.38)
    for i, (ctitle, cbody) in enumerate(intro_cards):
        left = Inches(0.8) + i * (card_w + gap)
        add_info_card(slide3, left, Inches(1.8), card_w, card_h, ctitle, cbody)

    # -------------------------------------------------------------
    # SLIDE 4: Project Overview
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide4, BG_DARK)
    add_header(slide4, "2. Project Overview", "TECH STACK & ARCHITECTURE")
    
    # Left Grid: Key specs
    specs = [
        ("Project Name", "Weather Detection System"),
        ("Frontend Technology", "React.js (Single Page Application)"),
        ("UI Library", "Material UI (MUI Components & Icons)"),
        ("External Service", "OpenWeatherMap REST API"),
        ("Programming Language", "JavaScript (ES6+)"),
        ("Core Functionality", "Search real-time weather by city name")
    ]
    
    left_w = Inches(6.8)
    for i, (label, val) in enumerate(specs):
        sy = Inches(1.8) + i * Inches(0.8)
        row_bg = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), sy, left_w, Inches(0.68))
        row_bg.fill.solid()
        row_bg.fill.fore_color.rgb = BG_CARD
        row_bg.line.color.rgb = CARD_BORDER
        row_bg.line.width = Pt(1)
        
        rtb = slide4.shapes.add_textbox(Inches(1.05), sy + Inches(0.12), left_w - Inches(0.5), Inches(0.45))
        rtf = rtb.text_frame
        rtf.word_wrap = True
        rtf.margin_left = rtf.margin_top = rtf.margin_right = rtf.margin_bottom = 0
        rp = rtf.paragraphs[0]
        rp.text = f"{label}: "
        rp.font.name = "Calibri"
        rp.font.size = Pt(14)
        rp.font.bold = True
        rp.font.color.rgb = PRIMARY_LIGHT
        
        rv = rp.add_run()
        rv.text = val
        rv.font.bold = False
        rv.font.color.rgb = TEXT_LIGHT

    # Right Card: Data Flow Summary
    r_card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.9), Inches(1.8), Inches(4.6), Inches(4.68))
    r_card.fill.solid()
    r_card.fill.fore_color.rgb = BG_CARD
    r_card.line.color.rgb = PRIMARY
    r_card.line.width = Pt(1.5)
    
    rtb2 = slide4.shapes.add_textbox(Inches(8.2), Inches(2.1), Inches(4.0), Inches(4.1))
    rtf2 = rtb2.text_frame
    rtf2.word_wrap = True
    rtf2.margin_left = rtf2.margin_top = rtf2.margin_right = rtf2.margin_bottom = 0
    
    rp_head = rtf2.paragraphs[0]
    rp_head.text = "How It Operates"
    rp_head.font.name = "Calibri"
    rp_head.font.size = Pt(22)
    rp_head.font.bold = True
    rp_head.font.color.rgb = ACCENT
    rp_head.space_after = Pt(16)
    
    rp_desc1 = rtf2.add_paragraph()
    rp_desc1.text = "The application sends an asynchronous HTTP request to the OpenWeatherMap API whenever a user submits a city query."
    rp_desc1.font.name = "Calibri"
    rp_desc1.font.size = Pt(15)
    rp_desc1.font.color.rgb = TEXT_LIGHT
    rp_desc1.space_after = Pt(14)
    
    rp_desc2 = rtf2.add_paragraph()
    rp_desc2.text = "It receives structured meteorological payload in JSON format, parses current temperature, humidity, wind, and conditions, and dynamically binds it to Material UI cards."
    rp_desc2.font.name = "Calibri"
    rp_desc2.font.size = Pt(15)
    rp_desc2.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 5: Objectives
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide5, BG_DARK)
    add_header(slide5, "3. Project Objectives", "TARGET GOALS")
    
    objs = [
        ("User-Friendly Interface", "To develop an accessible, intuitive weather detection web application with clean navigation."),
        ("React.js Mastery", "To learn and implement core React.js concepts including component hierarchy, hooks, and state management."),
        ("Third-Party API Integration", "To connect and securely integrate the OpenWeatherMap REST API with a React single-page frontend."),
        ("Real-Time Data Fetching", "To fetch and display real-time weather information based dynamically on user-submitted city queries."),
        ("Comprehensive Metrics", "To present temperature, feels-like temperature, humidity percentage, and descriptive weather conditions."),
        ("Understanding JSON Lifecycle", "To master handling asynchronous API calls, error handling, and parsing JSON response structures.")
    ]
    
    # 2x3 Grid
    cw = Inches(5.6)
    ch = Inches(1.35)
    for i, (otitle, odesc) in enumerate(objs):
        col = i % 2
        row = i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.8) + row * Inches(1.6)
        
        ocard = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, cw, ch)
        ocard.fill.solid()
        ocard.fill.fore_color.rgb = BG_CARD
        ocard.line.color.rgb = CARD_BORDER
        ocard.line.width = Pt(1)
        
        otb = slide5.shapes.add_textbox(left + Inches(0.25), top + Inches(0.18), cw - Inches(0.5), ch - Inches(0.3))
        otf = otb.text_frame
        otf.word_wrap = True
        otf.margin_left = otf.margin_top = otf.margin_right = otf.margin_bottom = 0
        
        op = otf.paragraphs[0]
        op.text = f"{i+1}. {otitle}"
        op.font.name = "Calibri"
        op.font.size = Pt(16)
        op.font.bold = True
        op.font.color.rgb = ACCENT
        op.space_after = Pt(4)
        
        op2 = otf.add_paragraph()
        op2.text = odesc
        op2.font.name = "Calibri"
        op2.font.size = Pt(13)
        op2.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 6: Results and Findings
    # -------------------------------------------------------------
    slide6 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide6, BG_DARK)
    add_header(slide6, "4. Results and Findings", "OUTCOMES & INSIGHTS")
    
    results = [
        ("Successful React Deployment", "Successfully built and deployed an operational React-based weather application with reactive UI updates."),
        ("Dynamic Search Functionality", "Users can type any valid global city name to initiate an instant weather query with minimal latency."),
        ("Live API Connectivity", "Established robust real-time communication pipeline with the OpenWeatherMap REST service."),
        ("Seamless JSON Handling", "Structured responses received in JSON format are mapped cleanly to corresponding React state variables."),
        ("Clear Information Display", "Accurate weather conditions, temperatures, and icons are rendered prominently on responsive cards."),
        ("Enhanced Web Development Skills", "Gained deep understanding of component-driven design, asynchronous JavaScript, and REST principles.")
    ]
    
    for i, (rtitle, rdesc) in enumerate(results):
        col = i % 2
        row = i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.8) + row * Inches(1.6)
        
        rcard = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, cw, ch)
        rcard.fill.solid()
        rcard.fill.fore_color.rgb = BG_CARD
        rcard.line.color.rgb = CARD_BORDER
        rcard.line.width = Pt(1)
        
        rtb = slide6.shapes.add_textbox(left + Inches(0.25), top + Inches(0.18), cw - Inches(0.5), ch - Inches(0.3))
        rtf = rtb.text_frame
        rtf.word_wrap = True
        rtf.margin_left = rtf.margin_top = rtf.margin_right = rtf.margin_bottom = 0
        
        rp = rtf.paragraphs[0]
        rp.text = f"[OK]  {rtitle}"
        rp.font.name = "Calibri"
        rp.font.size = Pt(16)
        rp.font.bold = True
        rp.font.color.rgb = PRIMARY_LIGHT
        rp.space_after = Pt(4)
        
        rp2 = rtf.add_paragraph()
        rp2.text = rdesc
        rp2.font.name = "Calibri"
        rp2.font.size = Pt(13)
        rp2.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 7: Analysis and Discussion
    # -------------------------------------------------------------
    slide7 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide7, BG_DARK)
    add_header(slide7, "5. Analysis and Discussion", "TECHNICAL EVALUATION")
    
    analysis_points = [
        ("Modular Component Architecture", "React.js facilitates modular, declarative UI design where search bars, weather info boxes, and cards function independently."),
        ("Streamlined Material UI Styling", "Material UI eliminates boilerplate CSS, delivering pre-styled input fields, cards, and elevation effects natively."),
        ("REST Query Optimization", "City names are passed as sanitized query parameters (?q={city}&appid={key}), retrieving tailored weather payloads."),
        ("Parsing & State Synchronization", "State variables update automatically upon JSON arrival, triggering efficient Virtual DOM re-rendering without page refreshes."),
        ("Error Boundary & Edge Cases", "Implementing HTTP error checks (e.g., 404 for nonexistent cities) is crucial for smooth UX and error resilience.")
    ]
    
    for i, (atitle, adesc) in enumerate(analysis_points):
        sy = Inches(1.75) + i * Inches(0.98)
        acard = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), sy, Inches(11.733), Inches(0.85))
        acard.fill.solid()
        acard.fill.fore_color.rgb = BG_CARD
        acard.line.color.rgb = CARD_BORDER
        acard.line.width = Pt(1)
        
        atb = slide7.shapes.add_textbox(Inches(1.1), sy + Inches(0.12), Inches(11.1), Inches(0.6))
        atf = atb.text_frame
        atf.word_wrap = True
        atf.margin_left = atf.margin_top = atf.margin_right = atf.margin_bottom = 0
        
        ap = atf.paragraphs[0]
        ap.text = f"*  {atitle}: "
        ap.font.name = "Calibri"
        ap.font.size = Pt(15)
        ap.font.bold = True
        ap.font.color.rgb = ACCENT
        
        arun = ap.add_run()
        arun.text = adesc
        arun.font.bold = False
        arun.font.color.rgb = TEXT_LIGHT

    # -------------------------------------------------------------
    # SLIDE 8: Summary of Development
    # -------------------------------------------------------------
    slide8 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide8, BG_DARK)
    add_header(slide8, "6. Summary of Development", "DEVELOPMENT LIFECYCLE")
    
    steps = [
        ("Phase 1: Planning", "Identified core project requirements, functional scope, target user base, and required weather metrics."),
        ("Phase 2: Designing", "Constructed intuitive user interface wireframes and clean components leveraging React.js and Material UI."),
        ("Phase 3: API Integration", "Established secure connectivity with the OpenWeatherMap API endpoints using fetch/axios routines."),
        ("Phase 4: Data Fetching", "Implemented asynchronous query execution, JSON payload parsing, and dynamic component data binding."),
        ("Phase 5: Testing & Verification", "Conducted extensive testing across international cities, verifying accurate temperature readouts and edge cases.")
    ]
    
    card_w = Inches(2.18)
    card_h = Inches(4.7)
    gap = Inches(0.2)
    for i, (stitle, sdesc) in enumerate(steps):
        left = Inches(0.8) + i * (card_w + gap)
        scard = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, Inches(1.8), card_w, card_h)
        scard.fill.solid()
        scard.fill.fore_color.rgb = BG_CARD
        scard.line.color.rgb = CARD_BORDER
        scard.line.width = Pt(1)
        
        # Step number badge
        badge = slide8.shapes.add_shape(MSO_SHAPE.OVAL, left + Inches(0.74), Inches(2.1), Inches(0.7), Inches(0.7))
        badge.fill.solid()
        badge.fill.fore_color.rgb = PRIMARY
        badge.line.fill.background()
        btb = badge.text_frame
        btb.paragraphs[0].text = str(i+1)
        btb.paragraphs[0].font.name = "Calibri"
        btb.paragraphs[0].font.size = Pt(16)
        btb.paragraphs[0].font.bold = True
        btb.paragraphs[0].font.color.rgb = TEXT_LIGHT
        btb.paragraphs[0].alignment = PP_ALIGN.CENTER
        
        stb = slide8.shapes.add_textbox(left + Inches(0.15), Inches(3.0), card_w - Inches(0.3), Inches(3.2))
        stf = stb.text_frame
        stf.word_wrap = True
        stf.margin_left = stf.margin_top = stf.margin_right = stf.margin_bottom = 0
        
        sp = stf.paragraphs[0]
        sp.text = stitle.split(": ")[1]
        sp.font.name = "Calibri"
        sp.font.size = Pt(17)
        sp.font.bold = True
        sp.font.color.rgb = ACCENT
        sp.alignment = PP_ALIGN.CENTER
        sp.space_after = Pt(12)
        
        sp2 = stf.add_paragraph()
        sp2.text = sdesc
        sp2.font.name = "Calibri"
        sp2.font.size = Pt(13)
        sp2.font.color.rgb = TEXT_MUTED
        sp2.alignment = PP_ALIGN.CENTER

    # -------------------------------------------------------------
    # SLIDE 9: Conclusion
    # -------------------------------------------------------------
    slide9 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide9, BG_DARK)
    add_header(slide9, "7. Conclusion", "PROJECT SUMMARY & TAKEAWAYS")
    
    concl_card = slide9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.8), Inches(11.733), Inches(4.7))
    concl_card.fill.solid()
    concl_card.fill.fore_color.rgb = BG_CARD
    concl_card.line.color.rgb = CARD_BORDER
    concl_card.line.width = Pt(1.5)
    
    ctb = slide9.shapes.add_textbox(Inches(1.2), Inches(2.2), Inches(10.9), Inches(3.9))
    ctf = ctb.text_frame
    ctf.word_wrap = True
    ctf.margin_left = ctf.margin_top = ctf.margin_right = ctf.margin_bottom = 0
    
    points = [
        ("Validation of React & API Synergy", "The Weather Detection System successfully demonstrates how React.js and third-party REST APIs integrate seamlessly to build interactive, production-ready frontend solutions."),
        ("Instant City-Based Meteorological Lookups", "It empowers end users to quickly query weather data for any global city and view vital information such as temperature, feels-like temperature, and humidity."),
        ("Substantial Practical Skill Acquisition", "Through hands-on development, I acquired comprehensive expertise in React functional components, state management (useState/useEffect), asynchronous promises, JSON serialization, and Material UI design."),
        ("Solid Foundation for Modern Web Development", "This project significantly reinforced my full-stack and frontend development capabilities, establishing a robust framework for building scalable future applications.")
    ]
    
    for i, (title, body) in enumerate(points):
        p = ctf.paragraphs[0] if i == 0 else ctf.add_paragraph()
        p.text = f"[+]  {title}: "
        p.font.name = "Calibri"
        p.font.size = Pt(16)
        p.font.bold = True
        p.font.color.rgb = PRIMARY_LIGHT
        if i > 0:
            p.space_before = Pt(14)
            
        r = p.add_run()
        r.text = body
        r.font.bold = False
        r.font.color.rgb = TEXT_LIGHT

    # -------------------------------------------------------------
    # SLIDE 10: Recommendations
    # -------------------------------------------------------------
    slide10 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide10, BG_DARK)
    add_header(slide10, "8. Recommendations", "AREAS FOR ENHANCEMENT")
    
    recomms = [
        ("Enhanced Visual UI", "Upgrade typography, smooth transitions, and dynamic weather backgrounds (e.g., rain animations or sunny gradients)."),
        ("Robust Error Handling", "Display clean, descriptive user alerts and toast notifications when an invalid city name or network failure occurs."),
        ("Optimized Loading Experience", "Introduce skeleton loaders and sleek spinning indicators while fetching API responses to enrich perceived speed."),
        ("Complete Device Responsiveness", "Fine-tune UI layouts across mobile screens, tablets, and ultra-wide desktop monitors for seamless access."),
        ("Extended Metric Cards", "Incorporate wind speed, atmospheric pressure, visibility distance, and UV index cards for deeper insights.")
    ]
    
    for i, (rtitle, rdesc) in enumerate(recomms):
        sy = Inches(1.75) + i * Inches(0.98)
        rcard = slide10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), sy, Inches(11.733), Inches(0.85))
        rcard.fill.solid()
        rcard.fill.fore_color.rgb = BG_CARD
        rcard.line.color.rgb = CARD_BORDER
        rcard.line.width = Pt(1)
        
        rtb = slide10.shapes.add_textbox(Inches(1.1), sy + Inches(0.12), Inches(11.1), Inches(0.6))
        rtf = rtb.text_frame
        rtf.word_wrap = True
        rtf.margin_left = rtf.margin_top = rtf.margin_right = rtf.margin_bottom = 0
        
        rp = rtf.paragraphs[0]
        rp.text = f"[>]  {rtitle}: "
        rp.font.name = "Calibri"
        rp.font.size = Pt(15)
        rp.font.bold = True
        rp.font.color.rgb = ACCENT
        
        rrun = rp.add_run()
        rrun.text = rdesc
        rrun.font.bold = False
        rrun.font.color.rgb = TEXT_LIGHT

    # -------------------------------------------------------------
    # SLIDE 11: Future Directions
    # -------------------------------------------------------------
    slide11 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide11, BG_DARK)
    add_header(slide11, "9. Future Directions", "ROADMAP & EXTENSIONS")
    
    future = [
        ("5-Day Weather Forecast", "Integrate extended forecast APIs to present a multi-day timeline with daily high/low temperatures."),
        ("GPS Geolocation Detection", "Implement browser Geolocation API to automatically detect and display the user's local weather upon landing."),
        ("Animated Weather Icons", "Implement high-definition animated SVGs and condition-based icon packs reflecting real-time atmosphere."),
        ("Solar Schedule Tracking", "Display calculated sunrise and sunset times along with a visual solar trajectory widget."),
        ("Multi-City Comparison Hub", "Allow users to pin multiple favorite cities side-by-side for quick global temperature comparisons."),
        ("Interactive Radar & Charts", "Embed interactive temperature graph curves and live meteorological radar maps.")
    ]
    
    for i, (ftitle, fdesc) in enumerate(future):
        col = i % 2
        row = i // 2
        left = Inches(0.8) + col * Inches(6.1)
        top = Inches(1.8) + row * Inches(1.6)
        
        fcard = slide11.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, cw, ch)
        fcard.fill.solid()
        fcard.fill.fore_color.rgb = BG_CARD
        fcard.line.color.rgb = CARD_BORDER
        fcard.line.width = Pt(1)
        
        ftb = slide11.shapes.add_textbox(left + Inches(0.25), top + Inches(0.18), cw - Inches(0.5), ch - Inches(0.3))
        ftf = ftb.text_frame
        ftf.word_wrap = True
        ftf.margin_left = ftf.margin_top = ftf.margin_right = ftf.margin_bottom = 0
        
        fp = ftf.paragraphs[0]
        fp.text = f"{i+1}. {ftitle}"
        fp.font.name = "Calibri"
        fp.font.size = Pt(16)
        fp.font.bold = True
        fp.font.color.rgb = PRIMARY_LIGHT
        fp.space_after = Pt(4)
        
        fp2 = ftf.add_paragraph()
        fp2.text = fdesc
        fp2.font.name = "Calibri"
        fp2.font.size = Pt(13)
        fp2.font.color.rgb = TEXT_MUTED

    # -------------------------------------------------------------
    # SLIDE 12: Project Photos, Short Clips & Hyperlinks
    # -------------------------------------------------------------
    slide12 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide12, BG_DARK)
    add_header(slide12, "10. Project Photos, Short Clips & Hyperlinks", "DEMONSTRATION & REPOSITORIES")
    
    # 3 Placeholder Screenshot Boxes
    shots = [
        ("Screenshot 1", "Home Page Interface", "[ Insert Home Page Screenshot Here ]"),
        ("Screenshot 2", "City Search Feature", "[ Insert Search Functionality Screenshot ]"),
        ("Screenshot 3", "Weather Results View", "[ Insert Weather Details Card Screenshot ]")
    ]
    
    sw = Inches(3.64)
    sh = Inches(2.6)
    for i, (slabel, ssub, pholder) in enumerate(shots):
        left = Inches(0.8) + i * (sw + Inches(0.38))
        top = Inches(1.75)
        
        box = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, sw, sh)
        box.fill.solid()
        box.fill.fore_color.rgb = BG_CARD
        box.line.color.rgb = PRIMARY
        box.line.dash_style = 2  # dashed line indicator
        box.line.width = Pt(1.5)
        
        btb = slide12.shapes.add_textbox(left + Inches(0.2), top + Inches(0.4), sw - Inches(0.4), sh - Inches(0.8))
        btf = btb.text_frame
        btf.word_wrap = True
        btf.margin_left = btf.margin_top = btf.margin_right = btf.margin_bottom = 0
        
        bp = btf.paragraphs[0]
        bp.text = slabel.upper()
        bp.font.name = "Calibri"
        bp.font.size = Pt(13)
        bp.font.bold = True
        bp.font.color.rgb = ACCENT
        bp.alignment = PP_ALIGN.CENTER
        
        bp2 = btf.add_paragraph()
        bp2.text = ssub
        bp2.font.name = "Calibri"
        bp2.font.size = Pt(15)
        bp2.font.bold = True
        bp2.font.color.rgb = TEXT_LIGHT
        bp2.alignment = PP_ALIGN.CENTER
        bp2.space_before = Pt(4)
        bp2.space_after = Pt(14)
        
        bp3 = btf.add_paragraph()
        bp3.text = pholder
        bp3.font.name = "Calibri"
        bp3.font.size = Pt(12)
        bp3.font.color.rgb = TEXT_MUTED
        bp3.alignment = PP_ALIGN.CENTER

    # Hyperlinks & Note Container
    link_card = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.55), Inches(11.733), Inches(2.3))
    link_card.fill.solid()
    link_card.fill.fore_color.rgb = BG_CARD
    link_card.line.color.rgb = CARD_BORDER
    link_card.line.width = Pt(1)
    
    ltb = slide12.shapes.add_textbox(Inches(1.1), Inches(4.7), Inches(11.1), Inches(2.0))
    ltf = ltb.text_frame
    ltf.word_wrap = True
    ltf.margin_left = ltf.margin_top = ltf.margin_right = ltf.margin_bottom = 0
    
    lp0 = ltf.paragraphs[0]
    lp0.text = "PROJECT LINKS & REPOSITORIES"
    lp0.font.name = "Calibri"
    lp0.font.size = Pt(15)
    lp0.font.bold = True
    lp0.font.color.rgb = ACCENT
    lp0.space_after = Pt(6)
    
    links = [
        ("GitHub Repository", "https://github.com/your-username/weather-detection-system (Replace with actual repository URL)"),
        ("Live Web Application", "https://weather-detection-system.vercel.app (Replace with actual deployment URL)"),
        ("Project Demo Video", "https://youtu.be/your-demo-video-id (Replace with actual video/clip URL)")
    ]
    for label, url in links:
        lp = ltf.add_paragraph()
        lp.text = f"*  {label}: "
        lp.font.name = "Calibri"
        lp.font.size = Pt(13)
        lp.font.bold = True
        lp.font.color.rgb = TEXT_LIGHT
        
        lpr = lp.add_run()
        lpr.text = url
        lpr.font.bold = False
        lpr.font.color.rgb = PRIMARY_LIGHT
        lp.space_before = Pt(3)
        
    lp_warn = ltf.add_paragraph()
    lp_warn.text = "Note: Insert your actual project screenshots in the designated placeholders above. Do not use sample screenshots."
    lp_warn.font.name = "Calibri"
    lp_warn.font.size = Pt(12)
    lp_warn.font.italic = True
    lp_warn.font.color.rgb = RGBColor(251, 146, 60) # Orange accent
    lp_warn.space_before = Pt(8)

    # -------------------------------------------------------------
    # SLIDE 13: Thank You Slide
    # -------------------------------------------------------------
    slide13 = prs.slides.add_slide(blank_layout)
    set_slide_background(slide13, BG_DARK)
    
    ty_card = slide13.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(2.0), Inches(1.5), Inches(9.333), Inches(4.5))
    ty_card.fill.solid()
    ty_card.fill.fore_color.rgb = BG_CARD
    ty_card.line.color.rgb = PRIMARY
    ty_card.line.width = Pt(2)
    
    ty_tb = slide13.shapes.add_textbox(Inches(2.5), Inches(2.2), Inches(8.333), Inches(3.2))
    ty_tf = ty_tb.text_frame
    ty_tf.word_wrap = True
    ty_tf.margin_left = ty_tf.margin_top = ty_tf.margin_right = ty_tf.margin_bottom = 0
    
    tp1 = ty_tf.paragraphs[0]
    tp1.text = "THANK YOU"
    tp1.font.name = "Calibri"
    tp1.font.size = Pt(48)
    tp1.font.bold = True
    tp1.font.color.rgb = ACCENT
    tp1.alignment = PP_ALIGN.CENTER
    tp1.space_after = Pt(16)
    
    tp2 = ty_tf.add_paragraph()
    tp2.text = "Thank you for your valuable time and attention."
    tp2.font.name = "Calibri"
    tp2.font.size = Pt(20)
    tp2.font.color.rgb = TEXT_LIGHT
    tp2.alignment = PP_ALIGN.CENTER
    tp2.space_after = Pt(24)
    
    tp3 = ty_tf.add_paragraph()
    tp3.text = "Questions & Answers | Discussion"
    tp3.font.name = "Calibri"
    tp3.font.size = Pt(16)
    tp3.font.color.rgb = TEXT_MUTED
    tp3.alignment = PP_ALIGN.CENTER

    output_path = "Weather_Detection_System_Presentation.pptx"
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    create_deck()
