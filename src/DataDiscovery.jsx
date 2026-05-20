// ─── Data Discovery — Field Mapping Flow ─────────────────────────────────────
// Helps PALO & RSTO map a new provider's draft data against canonical schemas.
// Steps: strategy → schema explorer → CSV upload → AI analysis → review → generate config

import React, { useState, useRef, useCallback, useEffect } from "react";

// ─── Design tokens (matches App.jsx palette) ──────────────────────────────────
const C = {
  bg: "#f5f2ed", bgPanel: "#ffffff", bgCard: "#ffffff", bgHover: "#f9f7f4", bgSubtle: "#f0ede8",
  border: "#e8e4de", borderMed: "#d4cfc8", borderStrong: "#b8b2aa",
  text: "#1a2332", textMuted: "#6b7280", textDim: "#9ca3af",
  brand: "#2D6B7A", brandDim: "#E8F2F4", brandBorder: "#9CC5CE", brandDark: "#1D4552",
  teal: "#3E90A3", tealDim: "#E8F2F4", tealBorder: "#7AB8C5",
  amber: "#A34E16", amberDim: "#FDF1E2", amberBorder: "#F0B174",
  green: "#475F34", greenDim: "#EDF0E5", greenBorder: "#A8B848",
  red: "#dc2626", redDim: "#fef2f2",
  navy: "#1D4552",
};

// ─── Chart type icons ─────────────────────────────────────────────────────────
const CHART_ICONS = {
  BarChart: "▐▌", BarChartGroup: "▐▌▌", LineChart: "∿", HorizontalBarChart: "▬▬", RadarChart: "⬡", HeatmapChart: "▦",
};

// ─── Chart details — snapshot paths + role-based field breakdown ──────────────
// Snapshots: drop jpeg files into public/chart-snapshots/ using the paths below.
// chartFields maps canonical fields to their visual role in the chart.
const CHART_DETAILS = {
  EcecQn1: { charts: [
    { snapshot: "/chart-snapshots/ecec-quantity-1-service-availability.png", chartTitle: "Availability of ECEC places", chartSubtitle: "Children 0–5 years old within catchment area", chartFields: [
      { role: "X-axis", description: "LGA / catchment area", fields: ["lga_name"], derived: [], source: "Population Data" },
      { role: "Y-axis", description: "Count of children and licensed places", fields: ["children_0_to_5_population", "approved_places", "children_enrolled"], derived: [], source: "Centre Record + Population Data" },
      { role: "Series / colour", description: "Total children / provider places / other ECEC places / children without places", fields: ["approved_places", "children_enrolled"], derived: ["available_places", "place_gap"], source: "Derived" },
      { role: "Filters", description: "None — community-level data", fields: [], derived: [], source: null },
    ]},
  ]},
  EcecP1: { charts: [
    { snapshot: "/chart-snapshots/ecec-participation-1-weekly-hours.png", chartTitle: "Weekly attendance hours", chartSubtitle: "Hours attended per child per week", chartFields: [
      { role: "X-axis", description: "Week", fields: ["attendance_date"], derived: [], source: "Attendance Record" },
      { role: "Y-axis", description: "Total hours attended that week", fields: ["hours_attended"], derived: [], source: "Attendance Record" },
      { role: "Filters", description: "Age group, centre/room, before-school status", fields: ["age_group", "centre_name", "room_name", "before_school_care"], derived: [], source: "Attendance Record" },
    ]},
    { snapshot: "/chart-snapshots/ecec-participation-2-600hr-target.png", chartTitle: "On track for 600+ hours", chartSubtitle: "% of children on track to attend 600 hours per year — actual vs projected", chartFields: [
      { role: "X-axis", description: "Month", fields: ["attendance_date", "reporting_period_id"], derived: [], source: "Attendance Record" },
      { role: "Y-axis", description: "Percentage of children on track (%)", fields: ["hours_attended"], derived: ["weekly_hours_average", "annualised_hours", "on_track_600hrs"], source: "Derived from Attendance" },
      { role: "Series / colour", description: "Projected vs actual on-track rate", fields: [], derived: ["projected_on_track", "actual_on_track"], source: "Derived" },
      { role: "Filters", description: "Age group, centre/room, before-school status", fields: ["age_group", "centre_name", "room_name", "before_school_care", "atsi_status"], derived: [], source: "Attendance Record" },
    ]},
  ]},
  EcecQl1: { charts: [
    { snapshot: "/chart-snapshots/ecec-quality-1-acecqa-ratings.png", chartTitle: "ACECQA Quality Areas", chartSubtitle: "Rating per quality area — centre vs RSTO Evidence Benchmark", chartFields: [
      { role: "Radar axes", description: "Quality areas QA1–QA7, each rated Exceeding / Meeting / Working Towards / Significant Improvement Required", fields: ["qa1_rating", "qa2_rating", "qa3_rating", "qa4_rating", "qa5_rating", "qa6_rating", "qa7_rating"], derived: [], source: "ACECQA Record" },
      { role: "Benchmark overlay", description: "RSTO Evidence Benchmark — Exceeding in QA1/3/4/5, at least Meeting in QA2/6/7", fields: ["qa1_rating", "qa2_rating", "qa3_rating", "qa4_rating", "qa5_rating", "qa6_rating", "qa7_rating"], derived: ["meets_rsto_benchmark"], source: "Derived" },
      { role: "Filters", description: "Centre (dropdown)", fields: ["centre_name"], derived: [], source: "Centre Record" },
    ]},
    { snapshot: "/chart-snapshots/ecec-quality-2-benchmark-geography.png", chartTitle: "Percentage of centres meeting RSTO evidence", chartSubtitle: "By geography — Australia / State / Greater Metro / Region / Centre", chartFields: [
      { role: "Y-axis", description: "Geography level — Australia, Victoria, Greater Melbourne, Region, Centre", fields: ["centre_name", "sa2_name"], derived: ["geography_level"], source: "Centre Record" },
      { role: "X-axis", description: "Percentage of centres meeting the RSTO Evidence Benchmark (0–100%)", fields: [], derived: ["pct_meeting_benchmark"], source: "Derived" },
      { role: "Series / colour", description: "Geography tier — darker = higher aggregation", fields: ["centre_name", "sa2_name"], derived: ["geography_tier"], source: "Derived" },
      { role: "RSTO benchmark", description: "100% benchmark line — all centres should meet the standard", fields: [], derived: [], source: null },
      { role: "Filters", description: "Centre, region (SA2)", fields: ["centre_name", "sa2_name"], derived: [], source: "Centre Record" },
    ]},
  ]},
  AncQn1: { charts: [
    { snapshot: "/chart-snapshots/anc-quantity-1-women-in-catchment.png", chartTitle: "Women of childbearing age in catchment", chartSubtitle: "By age group — ABS Census data", chartFields: [
      { role: "X-axis", description: "Age group (15–19 / 20–39 / 40–49)", fields: ["women_age_15_to_19", "women_age_20_to_39", "women_age_40_to_49"], derived: [], source: "Population Data" },
      { role: "Y-axis", description: "Count of women in catchment", fields: ["women_age_15_to_19", "women_age_20_to_39", "women_age_40_to_49"], derived: ["totalPopulation"], source: "Population Data" },
      { role: "Filters", description: "None — community-level ABS data, no provider filter", fields: [], derived: [], source: null },
    ]},
  ]},
  AncP1: { charts: [
    { snapshot: "/chart-snapshots/anc-participation-1-gestational-age.png", chartTitle: "Gestational age at first appointment", chartSubtitle: "By provider type and quarter", chartFields: [
      { role: "X-axis", description: "Provider type (GP-led / Midwife-led) per quarter", fields: ["provider_type", "reporting_period_id"], derived: [], source: "Appointment Record" },
      { role: "Y-axis", description: "Number of women", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Series / colour", description: "Gestational age band at first (booking) appointment", fields: ["gestational_age_weeks", "appointment_type"], derived: ["gestational_age_band"], source: "Derived from Appointment Record" },
      { role: "Filters", description: "Women group (priority / all)", fields: ["women_group"], derived: [], source: "Appointment Record" },
    ]},
  ]},
  AncP2: { charts: [
    { snapshot: "/chart-snapshots/anc-participation-2-appointment-patterns.png", chartTitle: "Appointments by gestational age and pregnancy type", chartSubtitle: "First vs subsequent pregnancies", chartFields: [
      { role: "X-axis", description: "Gestational age range", fields: ["gestational_age_weeks"], derived: [], source: "Appointment Record" },
      { role: "Y-axis", description: "Number of appointments", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Series / colour", description: "First vs subsequent pregnancy", fields: ["parity"], derived: ["pregnancy_type"], source: "Client Record" },
      { role: "Filters", description: "Women group, pregnancy type (first / subsequent / combined)", fields: ["women_group", "parity"], derived: [], source: "Appointment + Client Record" },
    ]},
  ]},
  AncQl1: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-1-continuity-of-midwife.png", chartTitle: "Women with continuity of midwife", chartSubtitle: "≥5 appointments, ≥80% with same midwife", chartFields: [
      { role: "X-axis", description: "Continuity status (had / partial / did not have)", fields: ["midwife_id", "client_id"], derived: ["continuity_status"], source: "Derived from Appointment" },
      { role: "Y-axis", description: "Number of women", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Filters", description: "Women group, appointment location", fields: ["women_group", "appointment_location"], derived: [], source: "Appointment Record" },
    ]},
  ]},
  AncQl2: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-2-blood-test-by-type.png", chartTitle: "Blood test completeness by type", chartSubtitle: "Count of women with complete results per test category", chartFields: [
      { role: "X-axis", description: "Test type — booking / 28-week / urine / haemoglobinopathy", fields: ["blood_group_tested", "hepatitis_tested", "hiv_tested", "rubella_tested", "syphilis_tested", "haemoglobin_tested", "antibodies_tested", "urine_tested", "haemoglobinopathy_tested"], derived: [], source: "Blood Test Record" },
      { role: "Y-axis", description: "Number of women with complete results", fields: ["client_id"], derived: [], source: "Blood Test Record" },
      { role: "Filters", description: "Women group, test type selector", fields: ["women_group"], derived: [], source: "Blood Test Record" },
    ]},
    { snapshot: "/chart-snapshots/anc-quality-2-blood-test-trend.png", chartTitle: "Blood test completeness trend", chartSubtitle: "Percentage with results over time — one line per test type", chartFields: [
      { role: "X-axis", description: "Reporting quarter", fields: ["test_date", "reporting_period_id"], derived: [], source: "Blood Test Record" },
      { role: "Y-axis", description: "Percentage of women with complete results", fields: ["client_id"], derived: [], source: "Blood Test Record" },
      { role: "Series / colour", description: "One line per test type", fields: ["blood_group_tested", "hepatitis_tested", "hiv_tested", "rubella_tested", "syphilis_tested", "haemoglobin_tested", "antibodies_tested", "urine_tested", "haemoglobinopathy_tested"], derived: [], source: "Blood Test Record" },
      { role: "Filters", description: "Women group, test type selector", fields: ["women_group"], derived: [], source: "Blood Test Record" },
    ]},
  ]},
  AncQl3: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-3-blood-pressure.png", chartTitle: "Blood pressure at each appointment", chartSubtitle: "Appointments with blood pressure recorded — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Appointment Record" },
      { role: "Y-axis", description: "Number of appointments / percentage with BP checked", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Series / colour", description: "Blood pressure checked vs not checked", fields: ["blood_pressure_checked"], derived: [], source: "Appointment Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Appointment Record" },
    ]},
  ]},
  AncQl4: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-4-bmi-recorded.png", chartTitle: "BMI calculated and recorded", chartSubtitle: "Women with BMI recorded at booking — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women with BMI recorded", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "BMI recorded vs not recorded", fields: ["bmi_recorded"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl5: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-5-smoking-status.png", chartTitle: "Smoking status asked", chartSubtitle: "Women asked about tobacco use — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women asked about smoking", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Smoking asked vs not asked", fields: ["smoking_asked"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl6: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-6-alcohol-asked.png", chartTitle: "Alcohol consumption asked", chartSubtitle: "Women asked about alcohol use — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women asked about alcohol", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Alcohol asked vs not asked", fields: ["alcohol_asked"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl7: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-7-family-violence.png", chartTitle: "Family violence screening", chartSubtitle: "Women screened for family violence — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women screened", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Screened vs not screened", fields: ["family_violence_screened"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl8: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-8-mental-health-history.png", chartTitle: "Mental health history recorded", chartSubtitle: "Women with mental health history recorded — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women with mental health history recorded", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Recorded vs not recorded", fields: ["mental_health_history_recorded"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl9: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-9-mental-health-screen.png", chartTitle: "Mental health screened", chartSubtitle: "Women with a complete mental health screen — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record" },
      { role: "Y-axis", description: "Number of women with mental health screen completed", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Screened vs not screened", fields: ["mental_health_screened"], derived: [], source: "Client Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl10: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-10-preeclampsia-completeness.png", chartTitle: "Preeclampsia risk — completeness by record type", chartSubtitle: "Women with complete data in each risk category", chartFields: [
      { role: "X-axis", description: "Record type — Complete Record / Pregnancy Screening / Maternal Characteristics / Pregnancy History", fields: ["pappa_check", "plurality_check", "dob_check", "parity_check", "bmi_check", "past_gest_check"], derived: [], source: "Preeclampsia Risk Record" },
      { role: "Y-axis", description: "Number of women with complete data in this category", fields: ["client_id"], derived: [], source: "Preeclampsia Risk Record" },
      { role: "Filters", description: "Women group, record type selector", fields: ["women_group"], derived: [], source: "Preeclampsia Risk Record" },
    ]},
    { snapshot: "/chart-snapshots/anc-quality-10-preeclampsia-completeness.png", chartTitle: "Preeclampsia risk — completeness trend", chartSubtitle: "Percentage with complete data over time — one line per record type", chartFields: [
      { role: "X-axis", description: "Reporting quarter", fields: ["reporting_period_id"], derived: [], source: "Preeclampsia Risk Record" },
      { role: "Y-axis", description: "Percentage of women with complete data (%)", fields: ["client_id"], derived: [], source: "Preeclampsia Risk Record" },
      { role: "Series / colour", description: "One line per record type category", fields: ["pappa_check", "plurality_check", "dob_check", "past_gest_check"], derived: [], source: "Preeclampsia Risk Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Preeclampsia Risk Record" },
    ]},
  ]},
  AncQl11: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-11-fundal-height.png", chartTitle: "Fundal height recorded after 24 weeks", chartSubtitle: "Appointments >24 weeks with fundal height recorded — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Appointment Record" },
      { role: "Y-axis", description: "Percentage of qualifying appointments with fundal height recorded", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Series / colour", description: "Fundal height recorded vs not (for appointments >24 weeks gestation)", fields: ["fundal_height_recorded", "gestational_age_weeks"], derived: [], source: "Appointment Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Appointment Record" },
    ]},
  ]},
  AncQl12: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-12-diabetes-testing.png", chartTitle: "Gestational diabetes testing (GTT)", chartSubtitle: "Women completing glucose tolerance test — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["reporting_period_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Y-axis", description: "Number of women who completed the GTT", fields: ["client_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Series / colour", description: "GTT completed vs not completed", fields: ["gtt_completed"], derived: [], source: "Screening & Procedure Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Screening & Procedure Record" },
    ]},
  ]},
  AncQl13: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-13-fetal-presentation.png", chartTitle: "Fetal presentation recorded at 34–36 weeks", chartSubtitle: "Women with fetal presentation recorded in the 34–36 week window", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Appointment Record" },
      { role: "Y-axis", description: "Number of women with fetal presentation recorded", fields: ["client_id"], derived: [], source: "Appointment Record" },
      { role: "Series / colour", description: "Recorded vs not recorded (for appointments at 34–36 weeks)", fields: ["fetal_presentation_recorded", "gestational_age_weeks"], derived: [], source: "Appointment Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Appointment Record" },
    ]},
  ]},
  AncQl15: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-15-smoking-cessation.png", chartTitle: "Smoking cessation referral and follow-up", chartSubtitle: "Smokers referred and followed up — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Client Record + Screening Record" },
      { role: "Y-axis", description: "Number of eligible women (smokers) referred and followed up", fields: ["client_id"], derived: [], source: "Client Record" },
      { role: "Series / colour", description: "Referred and followed up / referred only / not referred", fields: ["is_smoker", "smoking_cessation_referred", "smoking_cessation_follow_up"], derived: [], source: "Client + Screening & Procedure Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Client Record" },
    ]},
  ]},
  AncQl16: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-16-genetic-screening.png", chartTitle: "Genetic screening for chromosomal abnormalities", chartSubtitle: "By trimester — first / second / not recorded", chartFields: [
      { role: "X-axis", description: "Trimester — First trimester / Second trimester / Not recorded", fields: ["genetic_screening_first_trimester", "genetic_screening_second_trimester"], derived: [], source: "Screening & Procedure Record" },
      { role: "Y-axis", description: "Number of women in each category", fields: ["client_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Screening & Procedure Record" },
    ]},
  ]},
  AncQl17: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-17-ultrasound.png", chartTitle: "Ultrasound at 18–23 weeks with cervix length", chartSubtitle: "By timing category — ideal / late / too late", chartFields: [
      { role: "X-axis", description: "Timing — 18.0–23.6 wks (ideal) / 24.0–24.6 wks / 25.0+ wks", fields: ["ultrasound_date", "ultrasound_gestational_age_weeks"], derived: ["timing_category"], source: "Screening & Procedure Record" },
      { role: "Y-axis", description: "Number of women in each timing category", fields: ["client_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Series / colour", description: "Cervix length recorded vs not recorded within each timing category", fields: ["cervix_length_recorded"], derived: [], source: "Screening & Procedure Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Screening & Procedure Record" },
    ]},
  ]},
  AncQl21: { charts: [
    { snapshot: "/chart-snapshots/anc-quality-21-fetal-movement.png", chartTitle: "Fetal movement information provided", chartSubtitle: "Women given verbal and written fetal movement information — by quarter", chartFields: [
      { role: "X-axis", description: "Quarter", fields: ["appointment_date", "reporting_period_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Y-axis", description: "Number of women who received both verbal and written information", fields: ["client_id"], derived: [], source: "Screening & Procedure Record" },
      { role: "Series / colour", description: "Both provided / verbal only / written only / neither", fields: ["fetal_movement_verbal_provided", "fetal_movement_written_provided"], derived: [], source: "Screening & Procedure Record" },
      { role: "Filters", description: "Women group", fields: ["women_group"], derived: [], source: "Screening & Procedure Record" },
    ]},
  ]},
  PPQn1: { charts: [
    { snapshot: "/chart-snapshots/pp-quantity-1-capacity-vs-demand.png", chartTitle: "Capacity vs demand by region", chartSubtitle: "Enrolled / available / waitlisted families per region", chartFields: [
      { role: "X-axis", description: "Region", fields: ["region"], derived: [], source: "Capacity Record" },
      { role: "Y-axis", description: "Count of families", fields: ["enrolled_families", "available_places", "waitlisted_families"], derived: ["place_gap"], source: "Capacity Record" },
      { role: "Series / colour", description: "Enrolled / available places / waitlisted / not yet enrolled", fields: ["enrolled_families", "available_places", "waitlisted_families"], derived: ["place_gap"], source: "Derived" },
      { role: "Filters", description: "Region selector", fields: ["region"], derived: [], source: "Capacity Record" },
    ]},
    { snapshot: "/chart-snapshots/pp-quantity-2-places-by-program.png", chartTitle: "Availability of places by program", chartSubtitle: "Enrolled families vs target population — per program", chartFields: [
      { role: "X-axis", description: "Program name", fields: ["program_name"], derived: [], source: "Capacity Record" },
      { role: "Y-axis", description: "Families with children aged 2–8", fields: ["enrolled_families", "target_population"], derived: [], source: "Capacity Record" },
      { role: "Series / colour", description: "Enrolled vs target population", fields: ["enrolled_families", "target_population"], derived: [], source: "Capacity Record" },
      { role: "Filters", description: "Program selector", fields: ["program_name"], derived: [], source: "Capacity Record" },
    ]},
  ]},
  PpP1: { charts: [
    { snapshot: "/chart-snapshots/pp-participation-1-attendance-rates.png", chartTitle: "Attendees per session", chartSubtitle: "Families attending each session — by program and group", chartFields: [
      { role: "X-axis", description: "Session number / date", fields: ["session_date"], derived: [], source: "Attendance Record" },
      { role: "Y-axis", description: "Number of families attending", fields: ["family_id"], derived: [], source: "Attendance Record" },
      { role: "Filters", description: "Group selector, program selector", fields: ["group", "program_name"], derived: [], source: "Attendance Record" },
    ]},
    { snapshot: "/chart-snapshots/pp-participation-1-attendance-rates.png", chartTitle: "How often families attended", chartSubtitle: "Every session / Most / Some / None — by program", chartFields: [
      { role: "X-axis", description: "Attendance frequency — Every Session (100%) / Most / Some / None", fields: ["sessions_attended", "total_sessions_in_program"], derived: ["attendance_percentage", "attendance_category"], source: "Derived from Participation Summary" },
      { role: "Y-axis", description: "Number of families", fields: ["family_id"], derived: [], source: "Participation Summary" },
      { role: "Series / colour", description: "Program (session total varies: Bubanil = 18, HIPPY 4yr = 9, HIPPY 3yr = 4)", fields: ["program_name"], derived: [], source: "Participation Summary" },
      { role: "Filters", description: "Group selector, program selector", fields: ["group", "program_name"], derived: [], source: "Participation Summary" },
    ]},
  ]},
  PpQl1: { charts: [
    { snapshot: "/chart-snapshots/pp-quality-1-delivery-standards.png", chartTitle: "Program implementation standards", chartSubtitle: "Heatmap — actual delivery vs benchmark per program", chartFields: [
      { role: "Y-axis (rows)", description: "Implementation aspects — Session Format · Session Frequency · No. of Sessions · Session Length · Facilitator Qualification · Child Age", fields: ["session_format", "session_frequency", "total_sessions_planned", "session_length_minutes", "facilitator_qualification", "child_age_range"], derived: [], source: "Program Structure Record" },
      { role: "X-axis (columns)", description: "Performance rating — colour-coded cell per program per aspect", fields: ["program_name"], derived: ["session_format_rating", "session_frequency_rating", "total_sessions_rating", "session_length_rating", "facilitator_rating", "child_age_rating"], source: "Derived from Structure vs Benchmark" },
      { role: "RSTO benchmark", description: "Benchmark values per dimension — used to compute rating for each cell", fields: ["benchmark_session_format", "benchmark_session_frequency", "benchmark_total_sessions", "benchmark_session_length_minutes", "benchmark_facilitator_qualification", "benchmark_child_age_range"], derived: [], source: "Program Benchmark Record" },
      { role: "Filters", description: "Program selector (sorted alphabetically)", fields: ["program_name"], derived: [], source: "Structure Record" },
    ]},
  ]},
};

// Role colour mapping for chart view
const ROLE_COLORS = {
  "X-axis":           { bg: "#EDF0E5", color: "#475F34", border: "#A8B848" },
  "Y-axis":           { bg: "#E8F2F4", color: "#2D6B7A", border: "#9CC5CE" },
  "Series / colour":  { bg: "#FDF1E2", color: "#A34E16", border: "#F0B174" },
  "Series":           { bg: "#FDF1E2", color: "#A34E16", border: "#F0B174" },
  "Filters":          { bg: "#f5f2ed", color: "#6b7280", border: "#d4cfc8" },
  "RSTO benchmark":   { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  "Benchmark overlay":{ bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  "Radar axes":       { bg: "#E8F2F4", color: "#2D6B7A", border: "#9CC5CE" },
  "One chart per indicator": { bg: "#f5f2ed", color: "#6b7280", border: "#d4cfc8" },
};
function roleColor(role) {
  return ROLE_COLORS[role] || { bg: "#f5f2ed", color: "#6b7280", border: "#d4cfc8" };
}

// ─── Canonical schema data ────────────────────────────────────────────────────
// Embedded from rsto-context/docs/04-platform-architecture/backend/canonical-schema
const SCHEMA = {
  ecec: {
    key: "ecec",
    label: "ECEC",
    fullName: "Early Childhood Education and Care",
    description: "Childcare attendance, quality ratings, and facility capacity for children 0–5.",
    color: "#3E90A3",
    colorDim: "#E8F2F4",
    colorBorder: "#7AB8C5",
    stats: { recordTypes: 5, totalFields: 34, required: 28, optional: 6 },
    indicators: [
      {
        id: "EcecQn1", name: "Are there adequate childcare places?", type: "Quantity",
        chartTypes: ["BarChart"],
        description: "Compares approved childcare places against the population of children aged 0–5 in the catchment LGA. Shows whether supply meets estimated demand.",
        plainLanguage: "Shows whether there are enough childcare spots for the number of young children in the community.",
        logicHint: "place_gap = children_0_to_5_population − approved_places. A negative gap means places exceed demand; positive means unmet need.",
        requiredRecords: ["Centre Record", "Population Data"],
      },
      {
        id: "EcecP1", name: "Participation hours", type: "Participation",
        chartTypes: ["BarChart", "LineChart"],
        description: "Shows whether children are attending enough hours per year (target: 600 hrs/yr) to meet developmental benchmarks. Breaks down by age group and ATSI status.",
        plainLanguage: "Tracks whether kids are coming to childcare regularly enough to get the full benefit of the program.",
        logicHint: "annualised_hours = weekly_hours_average × 52. on_track_600hrs = annualised_hours ≥ 600. Requires a rolling 4-week average from attendance records.",
        requiredRecords: ["Attendance Record", "Child Record"],
      },
      {
        id: "EcecQl1", name: "Quality assessment ratings (ACECQA)", type: "Quality",
        chartTypes: ["BarChart", "HorizontalBarChart"],
        description: "Shows ACECQA national quality ratings across 7 quality areas. Highlights which centres meet the RSTO benchmark (Exceeding in QA1/3/4/5, at least Meeting in QA2/6/7).",
        plainLanguage: "Uses government inspection ratings to show how good the quality of care is at each centre.",
        logicHint: "meets_rsto_benchmark = (QA1 = Exceeding AND QA3 = Exceeding AND QA4 = Exceeding AND QA5 = Exceeding AND QA2 ≥ Meeting AND QA6 ≥ Meeting AND QA7 ≥ Meeting). ACECQA data is sourced externally — not provider-submitted.",
        requiredRecords: ["Centre Record", "ACECQA Quality Assessment Record"],
      },
    ],
    recordTypes: [
      {
        name: "Attendance Record",
        description: "One row per child per session. Primary record for EcecP1.",
        fields: [
          { field: "child_id", type: "string", required: true, usedBy: ["EcecP1"], plainLanguage: "A unique identifier for each child. This is hashed before storage — never store raw names.", example: "d4e5f6a1b2..." },
          { field: "attendance_date", type: "date", required: true, usedBy: ["EcecP1"], plainLanguage: "The date the child attended the centre.", example: "2025-03-15" },
          { field: "hours_attended", type: "decimal", required: true, usedBy: ["EcecP1"], plainLanguage: "How many hours the child was at the centre that day.", example: "6.5" },
          { field: "centre_name", type: "string", required: true, usedBy: ["EcecP1", "EcecQn1", "EcecQl1"], plainLanguage: "Name of the childcare centre. Spelling must be consistent — variant spellings are resolved in the mapping config.", example: "Sunshine Kids Childcare" },
          { field: "age_group", type: "string", required: true, usedBy: ["EcecP1"], plainLanguage: "Age group label for the child. Must normalise to RSTO standard labels.", example: "3, 4 & 5 year olds" },
          { field: "before_school_care", type: "boolean", required: true, usedBy: ["EcecP1"], plainLanguage: "Whether the session was before-school care. Affects how the child's age group is mapped.", example: "false" },
          { field: "atsi_status", type: "boolean", required: true, usedBy: ["EcecP1"], plainLanguage: "Whether the child identifies as Aboriginal or Torres Strait Islander. Used to drive the priority group filter.", example: "false" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["EcecP1"], plainLanguage: "Which reporting quarter this record belongs to.", example: "Q1-2025" },
        ],
      },
      {
        name: "Child Record",
        description: "One row per child. Demographic data recorded at enrolment.",
        fields: [
          { field: "child_id", type: "string", required: true, usedBy: ["EcecP1"], plainLanguage: "A unique identifier for each child. Links to attendance records.", example: "d4e5f6a1b2..." },
          { field: "child_dob", type: "date", required: true, usedBy: ["EcecP1"], plainLanguage: "Child's date of birth. Used to compute the age group when paired with attendance_date.", example: "2021-06-20" },
          { field: "atsi_status", type: "boolean", required: true, usedBy: ["EcecP1"], plainLanguage: "Whether the child identifies as Aboriginal or Torres Strait Islander.", example: "false" },
          { field: "centre_name", type: "string", required: true, usedBy: ["EcecP1"], plainLanguage: "The centre the child is enrolled at.", example: "Sunshine Kids Childcare" },
        ],
      },
      {
        name: "Centre Record",
        description: "One row per centre. Operational metadata.",
        fields: [
          { field: "centre_name", type: "string", required: true, usedBy: ["EcecQn1", "EcecQl1"], plainLanguage: "Name of the childcare centre. Must match the name used in attendance records.", example: "Sunshine Kids Childcare" },
          { field: "approved_places", type: "integer", required: true, usedBy: ["EcecQn1", "EcecQl1"], plainLanguage: "Licensed capacity — the maximum number of children the centre can take at any one time.", example: "80" },
          { field: "children_enrolled", type: "integer", required: true, usedBy: ["EcecQn1"], plainLanguage: "Current number of children enrolled at the centre.", example: "65" },
          { field: "sa2_name", type: "string", required: false, usedBy: ["EcecQl1"], plainLanguage: "Statistical Area 2 name — used to group centres geographically in the quality chart.", example: "Fitzroy" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["EcecQn1"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "ACECQA Quality Assessment Record",
        description: "One row per centre per assessment. Sourced from ACECQA — not provider-submitted.",
        fields: [
          { field: "centre_name", type: "string", required: true, usedBy: ["EcecQl1"], plainLanguage: "Centre name. Must match the centre records exactly.", example: "Sunshine Kids Childcare" },
          { field: "assessment_date", type: "date", required: true, usedBy: ["EcecQl1"], plainLanguage: "Date of the ACECQA assessment.", example: "2024-11-10" },
          { field: "qa1_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 1 rating: Educational Program and Practice.", example: "Exceeding" },
          { field: "qa2_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 2 rating: Children's Health and Safety.", example: "Meeting" },
          { field: "qa3_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 3 rating: Physical Environment.", example: "Exceeding" },
          { field: "qa4_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 4 rating: Staffing Arrangements.", example: "Exceeding" },
          { field: "qa5_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 5 rating: Relationships with Children.", example: "Exceeding" },
          { field: "qa6_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 6 rating: Collaborative Partnerships with Families and Communities.", example: "Meeting" },
          { field: "qa7_rating", type: "enum", required: true, usedBy: ["EcecQl1"], plainLanguage: "Quality Area 7 rating: Governance and Leadership.", example: "Meeting" },
        ],
      },
      {
        name: "Population Data",
        description: "Community-level reference data from ABS Census. Not provider-submitted.",
        fields: [
          { field: "lga_name", type: "string", required: true, usedBy: ["EcecQn1"], plainLanguage: "Local Government Area name.", example: "Yarra City Council" },
          { field: "children_0_to_5_population", type: "integer", required: true, usedBy: ["EcecQn1"], plainLanguage: "Count of children aged 0–5 in the catchment area.", example: "4200" },
          { field: "census_year", type: "integer", required: true, usedBy: ["EcecQn1"], plainLanguage: "The census year this data comes from.", example: "2021" },
        ],
      },
    ],
  },

  anc: {
    key: "anc",
    label: "ANC",
    fullName: "Antenatal Care",
    description: "Pregnancy care appointments, clinical screenings, and care quality for women and their babies.",
    color: "#2D6B7A",
    colorDim: "#E8F2F4",
    colorBorder: "#9CC5CE",
    stats: { recordTypes: 6, totalFields: 93, required: 76, optional: 17 },
    indicators: [
      {
        id: "AncQn1", name: "Are there adequate antenatal care facilities?", type: "Quantity",
        chartTypes: ["BarChart"],
        description: "Shows the number of women of childbearing age (15–49) in the catchment LGA, broken down by age group. Sourced from ABS Census — not provider data.",
        plainLanguage: "A snapshot of how many women in the community are of childbearing age — gives context for the scale of demand for antenatal services.",
        logicHint: "totalPopulation = womenAge15To19 + womenAge20To39 + womenAge40To49. Data comes from ABS Census, not from service provider records.",
        requiredRecords: ["Population Data"],
      },
      {
        id: "AncP1", name: "Gestational age at first appointment", type: "Participation",
        chartTypes: ["BarChartGroup"],
        description: "Shows how many weeks pregnant women were when they attended their first appointment (booking), broken down by provider type (GP-led vs Midwife-led) and quarter.",
        plainLanguage: "Tracks whether women are booking in early — ideally before 12 weeks. Late bookings can mean missed early care.",
        logicHint: "First appointment identified by appointment_type = 'booking'. Gestational age bands: <12wks, 13–14wks, 15–16wks, 17–27wks, 28+wks. Filtered by women_group.",
        requiredRecords: ["Appointment Record"],
      },
      {
        id: "AncP2", name: "Attendance patterns by pregnancy type", type: "Participation",
        chartTypes: ["BarChartGroup"],
        description: "Shows appointment counts by gestational age range, split by first vs subsequent pregnancies.",
        plainLanguage: "Helps understand whether women attend differently depending on whether it's their first or a later pregnancy.",
        logicHint: "parity = 0 → first pregnancy; parity > 0 → subsequent. Filtered by women_group and pregnancy_type.",
        requiredRecords: ["Appointment Record", "Client Record"],
      },
      {
        id: "AncQl1", name: "Continuity of midwife", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Shows women who had continuity of midwife care — defined as ≥5 appointments with ≥80% of appointments attended by the same midwife.",
        plainLanguage: "Continuity of care from the same midwife is linked to better outcomes. This tracks how many women had that consistency.",
        logicHint: "Continuity = at least 5 appointments AND ≥80% with same midwife_id. Hashed midwife_id must be stable across submissions.",
        requiredRecords: ["Appointment Record"],
      },
      {
        id: "AncQl2", name: "Blood test completeness", type: "Quality",
        chartTypes: ["BarChart", "LineChart"],
        description: "Tracks whether all required blood tests were completed — booking tests, 28-week tests, urine tests, and haemoglobinopathy screening.",
        plainLanguage: "Checks that women had all the standard blood tests they need during pregnancy.",
        logicHint: "Complete = all required test boolean fields = true for the client. Each test type is a separate boolean field.",
        requiredRecords: ["Blood Test Record"],
      },
      { id: "AncQl3", name: "Blood pressure at each appointment", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women with blood pressure recorded at every routine appointment.",
        plainLanguage: "Checks that blood pressure is being measured at every appointment — high BP during pregnancy can cause serious complications.",
        logicHint: "blood_pressure_checked = boolean per appointment row. Numerator = appointments where checked = true. Denominator = all appointments.",
        requiredRecords: ["Appointment Record"] },
      { id: "AncQl4", name: "BMI calculated and recorded", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women whose BMI is calculated and recorded at the booking appointment.",
        plainLanguage: "A woman's BMI at the start of pregnancy affects risk of complications — recording it helps plan appropriate care.",
        logicHint: "bmi_recorded = boolean on Client Record. Numerator = women with bmi_recorded = true.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl5", name: "Smoking status asked", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women whose smoking status is asked and documented during pregnancy.",
        plainLanguage: "Smoking is harmful in pregnancy — asking about it is the first step to offering support to quit.",
        logicHint: "smoking_asked = boolean on Client Record. is_smoker is used for AncQl15 eligibility.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl6", name: "Alcohol consumption asked", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women whose alcohol use is asked and documented during pregnancy.",
        plainLanguage: "Alcohol use during pregnancy can cause serious harm — asking about it is a required step in safe antenatal care.",
        logicHint: "alcohol_asked = boolean on Client Record.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl7", name: "Family violence screening", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women screened for family violence during their pregnancy care.",
        plainLanguage: "Pregnancy can be a time of increased risk of violence — routine screening helps identify and support women at risk.",
        logicHint: "family_violence_screened = boolean on Client Record.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl8", name: "Mental health history recorded", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women whose mental health history is recorded during antenatal care.",
        plainLanguage: "Understanding a woman's mental health history helps providers plan appropriate support during and after pregnancy.",
        logicHint: "mental_health_history_recorded = boolean on Client Record.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl9", name: "Mental health screened", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women who receive a mental health screen during pregnancy.",
        plainLanguage: "Pregnancy is a time of heightened vulnerability to depression and anxiety — routine screening helps catch issues early.",
        logicHint: "mental_health_screened = boolean on Client Record.",
        requiredRecords: ["Client Record"] },
      { id: "AncQl10", name: "Preeclampsia risk recorded", type: "Quality",
        chartTypes: ["BarChart", "LineChart"],
        description: "Percentage of women with a complete preeclampsia risk assessment at their booking appointment — covering pregnancy screening, maternal characteristics, and pregnancy history.",
        plainLanguage: "Pre-eclampsia is a serious pregnancy condition. Recording risk factors at the start of care is the first step to identifying and managing it.",
        logicHint: "Multiple boolean _check fields on Preeclampsia Risk Record. Complete = all required fields populated. Chart 1: completeness by record type. Chart 2: trend over time.",
        requiredRecords: ["Preeclampsia Risk Record"] },
      { id: "AncQl11", name: "Fundal height recorded after 24 weeks", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of appointments after 24 weeks where fundal height was recorded.",
        plainLanguage: "Measuring fundal height after 24 weeks tracks fetal growth — missing measurements can miss growth problems.",
        logicHint: "fundal_height_recorded = boolean per appointment. Only applies to appointments where gestational_age_weeks > 24.",
        requiredRecords: ["Appointment Record"] },
      { id: "AncQl12", name: "Gestational diabetes testing", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women who completed a glucose tolerance test (GTT) for gestational diabetes.",
        plainLanguage: "Gestational diabetes is common and manageable if caught early. This tracks whether women got the test they needed.",
        logicHint: "gtt_completed = boolean on Screening & Procedure Record.",
        requiredRecords: ["Screening & Procedure Record"] },
      { id: "AncQl13", name: "Fetal presentation recorded at 34–36 weeks", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women with fetal presentation recorded during the 34–36 week window.",
        plainLanguage: "Checking how the baby is positioned at 34–36 weeks helps plan for a safe birth — a breech baby may need a different birth plan.",
        logicHint: "fetal_presentation_recorded = boolean per appointment. Only applies where gestational_age_weeks is 34–36.",
        requiredRecords: ["Appointment Record"] },
      { id: "AncQl15", name: "Smoking cessation referral and follow-up", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women who smoke who were referred to quit smoking services and followed up.",
        plainLanguage: "Women who smoke during pregnancy need support to quit — this tracks whether they received a referral and whether it was followed up.",
        logicHint: "Numerator = is_smoker = true AND smoking_cessation_referred = true AND smoking_cessation_follow_up = true. Denominator = all smokers.",
        requiredRecords: ["Client Record", "Screening & Procedure Record"] },
      { id: "AncQl16", name: "Genetic screening for chromosomal abnormalities", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women who completed genetic screening — in the first trimester, second trimester, or not recorded.",
        plainLanguage: "Genetic screening helps detect chromosomal conditions early. This tracks whether women had screening and at what stage.",
        logicHint: "genetic_screening_first_trimester and genetic_screening_second_trimester = booleans on Screening & Procedure Record.",
        requiredRecords: ["Screening & Procedure Record"] },
      { id: "AncQl17", name: "Ultrasound at 18–23 weeks with cervix length", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women who received an ultrasound in the optimal 18–23 week window, with cervix length recorded.",
        plainLanguage: "The mid-pregnancy morphology scan is the key opportunity to check fetal development. Timing matters — too early or too late reduces value.",
        logicHint: "Timing: 18.0–23.6 wks (ideal), 24.0–24.6 wks (late), 25+ wks (too late). cervix_length_recorded = boolean on Screening & Procedure Record.",
        requiredRecords: ["Screening & Procedure Record"] },
      { id: "AncQl21", name: "Fetal movement information provided", type: "Quality",
        chartTypes: ["BarChart"],
        description: "Percentage of women provided with both verbal and written information on fetal movement.",
        plainLanguage: "Knowing what to look for with fetal movement can help women detect problems early. This tracks whether they received both verbal and written guidance.",
        logicHint: "fetal_movement_verbal_provided AND fetal_movement_written_provided = booleans on Screening & Procedure Record.",
        requiredRecords: ["Screening & Procedure Record"] },
    ],
    recordTypes: [
      {
        name: "Appointment Record",
        description: "One row per appointment. Primary record for all ANC indicators.",
        fields: [
          { field: "client_id", type: "string", required: true, usedBy: ["All indicators"], plainLanguage: "A unique identifier for each woman. Hashed for privacy.", example: "a1b2c3d4..." },
          { field: "appointment_date", type: "date", required: true, usedBy: ["All indicators"], plainLanguage: "The date of the appointment.", example: "2025-04-10" },
          { field: "appointment_type", type: "enum", required: true, usedBy: ["AncP1", "AncP2"], plainLanguage: "Whether this is the first booking appointment or a subsequent one. Values: booking | subsequent.", example: "booking" },
          { field: "gestational_age_weeks", type: "decimal", required: true, usedBy: ["AncP1", "AncP2"], plainLanguage: "How many weeks pregnant the woman was at this appointment.", example: "10.5" },
          { field: "provider_type", type: "enum", required: true, usedBy: ["AncP1"], plainLanguage: "Whether care is led by a GP or a midwife. Values: gp_led | midwife_led.", example: "midwife_led" },
          { field: "midwife_id", type: "string", required: true, usedBy: ["AncQl1"], plainLanguage: "A hashed identifier for the midwife who attended. Must be stable across submissions to calculate continuity.", example: "m7n8p9..." },
          { field: "appointment_location", type: "enum", required: true, usedBy: ["AncQl1"], plainLanguage: "Whether the appointment was at the service provider or elsewhere. Values: at_service_provider | not_at_service_provider.", example: "at_service_provider" },
          { field: "blood_pressure_checked", type: "boolean", required: true, usedBy: ["AncQl3"], plainLanguage: "Was blood pressure checked at this appointment?", example: "true" },
          { field: "fundal_height_recorded", type: "boolean", required: true, usedBy: ["AncQl11"], plainLanguage: "Was fundal height measured? Only required for appointments after 24 weeks.", example: "true" },
          { field: "fetal_presentation_recorded", type: "boolean", required: true, usedBy: ["AncQl13"], plainLanguage: "Was fetal presentation recorded? Only relevant at 34–36 weeks.", example: "false" },
          { field: "women_group", type: "enum", required: true, usedBy: ["All indicators"], plainLanguage: "Whether the woman is in the priority group or the general cohort. Values: priority_group | all_women.", example: "priority_group" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["All indicators"], plainLanguage: "Which reporting quarter this record belongs to.", example: "Q1-2025" },
        ],
      },
      {
        name: "Client Record",
        description: "One row per client per pregnancy episode. Recorded at booking.",
        fields: [
          { field: "client_id", type: "string", required: true, usedBy: ["All indicators"], plainLanguage: "Hashed unique identifier. Links to appointment records.", example: "a1b2c3d4..." },
          { field: "date_of_birth", type: "date", required: true, usedBy: ["AncQl10"], plainLanguage: "The woman's date of birth. Used for preeclampsia risk assessment.", example: "1990-07-14" },
          { field: "parity", type: "integer", required: true, usedBy: ["AncP2", "AncQl10"], plainLanguage: "Number of previous pregnancies. 0 = first pregnancy.", example: "1" },
          { field: "bmi_recorded", type: "boolean", required: true, usedBy: ["AncQl4"], plainLanguage: "Was the woman's BMI recorded at the booking appointment?", example: "true" },
          { field: "bmi_value", type: "decimal", required: false, usedBy: ["AncQl10"], plainLanguage: "The BMI value, if recorded.", example: "24.5" },
          { field: "smoking_asked", type: "boolean", required: true, usedBy: ["AncQl5"], plainLanguage: "Was the woman asked about her smoking history?", example: "true" },
          { field: "is_smoker", type: "boolean", required: true, usedBy: ["AncQl5", "AncQl15"], plainLanguage: "Is the woman a current smoker?", example: "false" },
          { field: "alcohol_asked", type: "boolean", required: true, usedBy: ["AncQl6"], plainLanguage: "Was the woman asked about alcohol consumption?", example: "true" },
          { field: "family_violence_screened", type: "boolean", required: true, usedBy: ["AncQl7"], plainLanguage: "Was the woman screened for family violence?", example: "true" },
          { field: "mental_health_history_recorded", type: "boolean", required: true, usedBy: ["AncQl8"], plainLanguage: "Was the woman's mental health history recorded?", example: "true" },
          { field: "mental_health_screened", type: "boolean", required: true, usedBy: ["AncQl9"], plainLanguage: "Was the woman screened for current mental health issues?", example: "true" },
          { field: "women_group", type: "enum", required: true, usedBy: ["All indicators"], plainLanguage: "Priority group or all women classification.", example: "all_women" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["All indicators"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Blood Test Record",
        description: "One row per client per test episode. Typically at booking and at 28 weeks.",
        fields: [
          { field: "client_id", type: "string", required: true, usedBy: ["AncQl2"], plainLanguage: "Hashed client identifier.", example: "a1b2c3d4..." },
          { field: "test_date", type: "date", required: true, usedBy: ["AncQl2"], plainLanguage: "Date the tests were taken.", example: "2025-04-15" },
          { field: "blood_group_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was blood group tested?", example: "true" },
          { field: "hepatitis_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was hepatitis screened?", example: "true" },
          { field: "hiv_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was HIV screened?", example: "true" },
          { field: "rubella_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was rubella immunity tested?", example: "true" },
          { field: "syphilis_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was syphilis screened?", example: "true" },
          { field: "haemoglobin_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was haemoglobin (anaemia) tested?", example: "true" },
          { field: "antibodies_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Were antibodies tested?", example: "true" },
          { field: "urine_tested", type: "boolean", required: true, usedBy: ["AncQl2"], plainLanguage: "Was urine tested?", example: "true" },
          { field: "haemoglobinopathy_tested", type: "boolean", required: false, usedBy: ["AncQl2"], plainLanguage: "Was haemoglobinopathy screening done? Optional.", example: "false" },
          { field: "women_group", type: "enum", required: true, usedBy: ["AncQl2"], plainLanguage: "Priority group or all women.", example: "all_women" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["AncQl2"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Preeclampsia Risk Record",
        description: "One row per client. Completeness flags for preeclampsia risk assessment at booking. Drives AncQl10.",
        fields: [
          { field: "client_id", type: "string", required: true, usedBy: ["AncQl10"], plainLanguage: "Hashed client identifier.", example: "a1b2c3d4..." },
          { field: "pappa_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was PAPP-A pregnancy screening done? (The only currently implemented test.)", example: "true" },
          { field: "plurality_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was the number of fetuses (plurality) recorded?", example: "true" },
          { field: "dob_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was the woman's date of birth recorded?", example: "true" },
          { field: "parity_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was the woman's parity (previous pregnancies) recorded?", example: "true" },
          { field: "bmi_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was BMI recorded for preeclampsia risk?", example: "true" },
          { field: "ethnicity_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was ethnicity recorded?", example: "true" },
          { field: "event_smoking_status_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was smoking status recorded? (At least one of three smoking fields must be true.)", example: "true" },
          { field: "vaping_before_20_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was vaping before 20 weeks recorded? (At least one of two vaping fields must be true.)", example: "false" },
          { field: "ante_medications_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Were antenatal medications recorded?", example: "true" },
          { field: "art_this_preg_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was assisted reproduction technology (ART) use recorded?", example: "false" },
          { field: "fam_hist_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was family history of preeclampsia recorded?", example: "false" },
          { field: "personal_hist_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was personal history of preeclampsia recorded?", example: "false" },
          { field: "past_gest_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was gestational age at last birth recorded?", example: "true" },
          { field: "past_outcome_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was outcome of previous pregnancy recorded?", example: "true" },
          { field: "past_birth_type_check", type: "boolean", required: true, usedBy: ["AncQl10"], plainLanguage: "Was birth type of previous pregnancy recorded?", example: "true" },
          { field: "women_group", type: "enum", required: true, usedBy: ["AncQl10"], plainLanguage: "Priority group or all women.", example: "all_women" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["AncQl10"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Screening & Procedure Record",
        description: "One row per client. Clinical procedures and screenings done once or at specific gestational windows. Drives AncQl12, Ql15, Ql16, Ql17, Ql21.",
        fields: [
          { field: "client_id", type: "string", required: true, usedBy: ["AncQl12", "AncQl15", "AncQl16", "AncQl17", "AncQl21"], plainLanguage: "Hashed client identifier.", example: "a1b2c3d4..." },
          { field: "gtt_completed", type: "boolean", required: true, usedBy: ["AncQl12"], plainLanguage: "Did the woman complete a glucose tolerance test (GTT) for gestational diabetes?", example: "true" },
          { field: "ultrasound_date", type: "date", required: true, usedBy: ["AncQl17"], plainLanguage: "Date of the morphology scan.", example: "2025-05-20" },
          { field: "ultrasound_gestational_age_weeks", type: "decimal", required: true, usedBy: ["AncQl17"], plainLanguage: "Gestational age at the time of the ultrasound. Used to classify into 18–23.6 wks (ideal), 24–24.6 wks, or 25+ wks.", example: "20.3" },
          { field: "cervix_length_recorded", type: "boolean", required: true, usedBy: ["AncQl17"], plainLanguage: "Was cervix length measured and recorded at the ultrasound?", example: "true" },
          { field: "genetic_screening_first_trimester", type: "boolean", required: true, usedBy: ["AncQl16"], plainLanguage: "Did the woman complete first trimester genetic screening?", example: "true" },
          { field: "genetic_screening_second_trimester", type: "boolean", required: true, usedBy: ["AncQl16"], plainLanguage: "Did the woman complete second trimester genetic screening?", example: "false" },
          { field: "fetal_movement_verbal_provided", type: "boolean", required: true, usedBy: ["AncQl21"], plainLanguage: "Was the woman given verbal information about fetal movement?", example: "true" },
          { field: "fetal_movement_written_provided", type: "boolean", required: true, usedBy: ["AncQl21"], plainLanguage: "Was the woman given written information about fetal movement?", example: "true" },
          { field: "smoking_cessation_referred", type: "boolean", required: true, usedBy: ["AncQl15"], plainLanguage: "Was the woman (if a smoker) referred to a quit smoking service?", example: "true" },
          { field: "smoking_cessation_follow_up", type: "boolean", required: true, usedBy: ["AncQl15"], plainLanguage: "Was the smoking cessation referral followed up?", example: "true" },
          { field: "women_group", type: "enum", required: true, usedBy: ["AncQl12", "AncQl15", "AncQl16", "AncQl17", "AncQl21"], plainLanguage: "Priority group or all women.", example: "all_women" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["AncQl12", "AncQl15", "AncQl16", "AncQl17", "AncQl21"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Population Data",
        description: "Community-level reference data from ABS Census. Not provider-submitted.",
        fields: [
          { field: "lga_name", type: "string", required: true, usedBy: ["AncQn1"], plainLanguage: "Local Government Area name.", example: "Yarra City Council" },
          { field: "women_age_15_to_19", type: "integer", required: true, usedBy: ["AncQn1"], plainLanguage: "Count of women aged 15–19 in the catchment.", example: "840" },
          { field: "women_age_20_to_39", type: "integer", required: true, usedBy: ["AncQn1"], plainLanguage: "Count of women aged 20–39 in the catchment.", example: "5200" },
          { field: "women_age_40_to_49", type: "integer", required: true, usedBy: ["AncQn1"], plainLanguage: "Count of women aged 40–49 in the catchment.", example: "2100" },
          { field: "census_year", type: "integer", required: true, usedBy: ["AncQn1"], plainLanguage: "The census year this data comes from.", example: "2021" },
        ],
      },
    ],
  },

  pp: {
    key: "pp",
    label: "PP",
    fullName: "Parenting Programs",
    description: "Family attendance, program participation rates, and delivery quality for parenting support programs.",
    color: "#475F34",
    colorDim: "#EDF0E5",
    colorBorder: "#A8B848",
    stats: { recordTypes: 5, totalFields: 36, required: 32, optional: 4 },
    indicators: [
      {
        id: "PPQn1", name: "Are there adequate program places?", type: "Quantity",
        chartTypes: ["BarChart"],
        description: "Shows enrolled families, available places, waitlisted families, and the gap between target population and current enrolment — by program and region.",
        plainLanguage: "Shows whether there are enough program spots for the families who need them in each region.",
        logicHint: "place_gap = target_population − enrolled_families − available_places. target_population = families with children aged 2–8 in the catchment.",
        requiredRecords: ["Program Capacity Record"],
      },
      {
        id: "PpP1", name: "Program participation rates", type: "Participation",
        chartTypes: ["BarChart", "BarChartGroup"],
        description: "Shows what proportion of families attended all sessions, most sessions, some, or none — broken down by program and region.",
        plainLanguage: "Tracks whether families are coming consistently to the program. Consistent attendance is linked to better outcomes.",
        logicHint: "attendance_percentage = sessions_attended / total_sessions_in_program × 100. Buckets: 100% (every session), 75–99% (most), 1–74% (some), 0% (none). Program session totals are reference values (e.g. Bubanil = 18, HIPPY 4yr = 9).",
        requiredRecords: ["Attendance Record", "Program Participation Summary"],
      },
      {
        id: "PpQl1", name: "Program delivery quality", type: "Quality",
        chartTypes: ["HeatmapChart"],
        description: "Compares actual program delivery (format, frequency, session length, facilitator qualification) against the recommended benchmark for each program type.",
        plainLanguage: "Checks whether programs are being delivered to the standard that the evidence says works best.",
        logicHint: "Each dimension rated as meeting/not meeting benchmark. Radar chart shows all dimensions at once. Benchmark values are defined per program type.",
        requiredRecords: ["Program Structure Record", "Program Benchmark Record"],
      },
    ],
    recordTypes: [
      {
        name: "Attendance Record",
        description: "One row per family per session. Primary record for PpP1.",
        fields: [
          { field: "family_id", type: "string", required: true, usedBy: ["PpP1"], plainLanguage: "A unique identifier for each family. Hashed for privacy.", example: "f1a2b3c4..." },
          { field: "session_date", type: "date", required: true, usedBy: ["PpP1"], plainLanguage: "The date of the program session.", example: "2025-03-12" },
          { field: "program_name", type: "string", required: true, usedBy: ["PpP1", "PpQl1", "PPQn1"], plainLanguage: "Name of the program. Must match program reference records exactly.", example: "Bubanil Playgroup" },
          { field: "region", type: "string", required: true, usedBy: ["PPQn1", "PpP1"], plainLanguage: "Region classification for this session. Must be consistent across records.", example: "Fitzroy Crossing" },
          { field: "group", type: "string", required: false, usedBy: ["PpP1"], plainLanguage: "Optional group classification for filtering within a program.", example: "Group A" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["PpP1"], plainLanguage: "Which reporting quarter this record belongs to.", example: "Q1-2025" },
        ],
      },
      {
        name: "Program Participation Summary",
        description: "One row per family per program per reporting period.",
        fields: [
          { field: "family_id", type: "string", required: true, usedBy: ["PpP1"], plainLanguage: "Hashed family identifier.", example: "f1a2b3c4..." },
          { field: "program_name", type: "string", required: true, usedBy: ["PpP1"], plainLanguage: "Program name. Must match reference data.", example: "HIPPY (4-year-old)" },
          { field: "sessions_attended", type: "integer", required: true, usedBy: ["PpP1"], plainLanguage: "How many sessions the family attended in this reporting period.", example: "7" },
          { field: "total_sessions_in_program", type: "integer", required: true, usedBy: ["PpP1"], plainLanguage: "Total sessions scheduled for the full program (e.g. HIPPY 4yr = 9). Used to calculate attendance percentage.", example: "9" },
          { field: "region", type: "string", required: true, usedBy: ["PpP1", "PPQn1"], plainLanguage: "Region this family's participation is recorded against.", example: "Fitzroy Crossing" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["PpP1"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Program Capacity Record",
        description: "One row per program per region per reporting period. Drives PPQn1.",
        fields: [
          { field: "program_name", type: "string", required: true, usedBy: ["PPQn1"], plainLanguage: "Program name.", example: "Bubanil Playgroup" },
          { field: "region", type: "string", required: true, usedBy: ["PPQn1"], plainLanguage: "Region.", example: "Fitzroy Crossing" },
          { field: "enrolled_families", type: "integer", required: true, usedBy: ["PPQn1"], plainLanguage: "Number of families currently enrolled.", example: "14" },
          { field: "available_places", type: "integer", required: true, usedBy: ["PPQn1"], plainLanguage: "Remaining spots in the program.", example: "4" },
          { field: "waitlisted_families", type: "integer", required: true, usedBy: ["PPQn1"], plainLanguage: "Families on the waiting list.", example: "3" },
          { field: "target_population", type: "integer", required: true, usedBy: ["PPQn1"], plainLanguage: "Estimated number of eligible families in the catchment (children aged 2–8).", example: "120" },
          { field: "reporting_period_id", type: "uuid", required: true, usedBy: ["PPQn1"], plainLanguage: "Which reporting quarter.", example: "Q1-2025" },
        ],
      },
      {
        name: "Program Structure Record",
        description: "One row per program. Describes how the program is delivered. Drives PpQl1.",
        fields: [
          { field: "program_name", type: "string", required: true, usedBy: ["PpQl1"], plainLanguage: "Program name. Primary key for program reference data.", example: "HIPPY (3-year-old)" },
          { field: "session_format", type: "string", required: true, usedBy: ["PpQl1"], plainLanguage: "How sessions are run. Values: group | individual | hybrid.", example: "individual" },
          { field: "session_frequency", type: "string", required: true, usedBy: ["PpQl1"], plainLanguage: "How often sessions are held. Values: weekly | fortnightly | monthly.", example: "fortnightly" },
          { field: "total_sessions_planned", type: "integer", required: true, usedBy: ["PpQl1", "PpP1"], plainLanguage: "Total sessions planned for the program cycle.", example: "4" },
          { field: "session_length_minutes", type: "integer", required: true, usedBy: ["PpQl1"], plainLanguage: "Duration of each session in minutes.", example: "60" },
          { field: "facilitator_qualification", type: "string", required: true, usedBy: ["PpQl1"], plainLanguage: "The qualification of the facilitator running the program.", example: "Cert IV" },
          { field: "child_age_range", type: "string", required: true, usedBy: ["PpQl1"], plainLanguage: "The target age range for children in this program.", example: "3–4 years" },
          { field: "region", type: "string", required: true, usedBy: ["PPQn1", "PpQl1"], plainLanguage: "Region this program operates in.", example: "Fitzroy Crossing" },
        ],
      },
    ],
  },
};

// ─── AI field mapping system prompt ──────────────────────────────────────────
const MAPPING_SYSTEM = `You are a data field mapping assistant for the RSTO platform — an Australian system that tracks outcomes for early childhood and community service providers.

You will receive:
1. A strategy name (ECEC, ANC, or PP)
2. A list of canonical field names with their record types, data types, and plain-language descriptions
3. The column headers extracted from one or more CSV files uploaded by a new provider

Your job: suggest which CSV columns map to which canonical fields.

Rules:
- Be specific — cite the exact CSV column name from the input
- confidence "high": name or meaning is an obvious match (e.g. "Child ID" → child_id, "Date" when context is attendance)
- confidence "medium": plausible match but some ambiguity (e.g. "Name" could be child or centre)
- confidence "low": tentative — possible match but significant uncertainty
- Mark a field as derived if it can be computed from other matched fields (e.g. age_group from child_dob + attendance_date)
- If a canonical field cannot be matched and cannot be derived, list it in unmatched_canonical_fields
- For each indicator (chart), assess status: "enabled" (all required fields matched or derivable), "partial" (some fields matched, some missing), "blocked" (critical fields missing)
- IMPORTANT: reporting_period_id is always assumed to be assignable — do not flag it as unmatched

Return ONLY valid JSON in this exact structure:
{
  "mappings": [
    {
      "canonical_field": "child_id",
      "record_type": "Attendance Record",
      "csv_file": "File 1",
      "csv_column": "ChildID",
      "confidence": "high",
      "confidence_reason": "Column name clearly matches the canonical field",
      "transform_hint": "hash"
    }
  ],
  "derived_fields": [
    {
      "canonical_field": "age_group",
      "record_type": "Attendance Record",
      "derivation": "Can be derived from child_dob + attendance_date",
      "requires": ["child_dob", "attendance_date"],
      "feasible": true
    }
  ],
  "unmatched_canonical_fields": [
    {
      "canonical_field": "atsi_status",
      "record_type": "Attendance Record",
      "issue": "No matching column found in uploaded files",
      "suggestion": "This field may need to be added to the provider export or sourced from a separate file",
      "blocks_charts": ["EcecP1"]
    }
  ],
  "chart_coverage": [
    {
      "chart_id": "EcecP1",
      "chart_name": "Participation hours",
      "status": "enabled",
      "matched_fields": ["child_id", "attendance_date", "hours_attended"],
      "missing_fields": [],
      "notes": "All required fields matched or derivable"
    }
  ],
  "summary": "2–3 sentence summary of the mapping result — what looks good, what needs attention"
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseCSVHeaders(text) {
  const firstLine = text.split(/\r?\n/)[0] || "";
  // Handle quoted CSV
  const headers = [];
  let current = "", inQuotes = false;
  for (const ch of firstLine) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { headers.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  headers.push(current.trim());
  return headers.filter(Boolean);
}

function confidenceBadge(level) {
  const map = {
    high:   { bg: "#EDF0E5", color: "#475F34", border: "#A8B848" },
    medium: { bg: "#FDF1E2", color: "#A34E16", border: "#F0B174" },
    low:    { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5" },
  };
  const s = map[level] || map.medium;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase",
      padding: "2px 7px", borderRadius: 4,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{level}</span>
  );
}

function statusBadge(status) {
  const map = {
    enabled:  { bg: "#EDF0E5", color: "#475F34", border: "#A8B848", label: "Enabled" },
    partial:  { bg: "#FDF1E2", color: "#A34E16", border: "#F0B174", label: "Partial" },
    blocked:  { bg: "#fef2f2", color: "#dc2626", border: "#fca5a5", label: "Blocked" },
  };
  const s = map[status] || map.partial;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 4,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

// ─── Step 1: Strategy selection ───────────────────────────────────────────────
function StrategySelect({ onSelect }) {
  const strategies = [SCHEMA.ecec, SCHEMA.anc, SCHEMA.pp];
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: 36 }}>
        <div style={{ color: C.textDim, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
          Data discovery · Step 1 of 6
        </div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
          Which strategy are we onboarding data for?
        </h1>
        <p style={{ color: C.textMuted, fontSize: 14, marginTop: 10, lineHeight: 1.6 }}>
          Select the strategy that matches the service provider you are onboarding. This determines which canonical fields and charts the draft data will be mapped against.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
        {strategies.map(s => (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            onMouseEnter={() => setHovered(s.key)}
            onMouseLeave={() => setHovered(null)}
            style={{
              background: hovered === s.key ? s.colorDim : C.bgCard,
              border: `2px solid ${hovered === s.key ? s.color : C.border}`,
              borderRadius: 12, padding: "24px 20px", cursor: "pointer",
              textAlign: "left", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10,
            }}
          >
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: s.colorDim, border: `1px solid ${s.colorBorder}`,
              borderRadius: 6, padding: "4px 10px", width: "fit-content",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
              <span style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.label}</span>
            </div>
            <div style={{ color: C.navy, fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{s.fullName}</div>
            <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{s.description}</div>
            <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
              <span style={{ color: C.textDim, fontSize: 11 }}>{s.stats.required} required fields</span>
              <span style={{ color: C.textDim, fontSize: 11 }}>{s.indicators.length} indicators</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2: Schema explorer ──────────────────────────────────────────────────
// ─── Chart snapshot image with fallback ──────────────────────────────────────
function ChartSnapshot({ src, title, subtitle, color }) {
  const [state, setState] = useState("loading"); // loading | loaded | missing
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10,
      overflow: "hidden", marginBottom: 20,
    }}>
      {/* Header bar */}
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <div>
          <div style={{ color: C.navy, fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ color: C.textDim, fontSize: 11, marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>

      {/* Image area */}
      {state === "missing" ? (
        <div style={{
          height: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: C.bgSubtle, gap: 8,
        }}>
          <div style={{ fontSize: 28, color: C.borderMed }}>⊞</div>
          <div style={{ color: C.textDim, fontSize: 12, textAlign: "center", lineHeight: 1.5, maxWidth: 260 }}>
            No snapshot yet<br />
            <span style={{ fontSize: 11 }}>Drop <code style={{ fontFamily: "monospace", background: C.bgCard, padding: "1px 5px", borderRadius: 3 }}>{src?.split("/").pop()}</code> into <code style={{ fontFamily: "monospace", background: C.bgCard, padding: "1px 5px", borderRadius: 3 }}>public/chart-snapshots/</code></span>
          </div>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {state === "loading" && (
            <div style={{ height: 200, background: C.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color: C.textDim, fontSize: 12 }}>Loading…</div>
            </div>
          )}
          <img
            src={src}
            alt={title}
            onLoad={() => setState("loaded")}
            onError={() => setState("missing")}
            style={{
              width: "100%", display: state === "loaded" ? "block" : "none",
              borderRadius: "0 0 10px 10px",
            }}
          />
        </div>
      )}
    </div>
  );
}

function SchemaExplorer({ strategyKey, onNext, onBack }) {
  const s = SCHEMA[strategyKey];
  const [selectedIndicator, setSelectedIndicator] = useState(s.indicators[0]);
  const [activeTab, setActiveTab] = useState("chart"); // chart | logic
  const [showSchemaRef, setShowSchemaRef] = useState(false);

  const chartDetail = CHART_DETAILS[selectedIndicator.id] || null;

  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", height: "100%", overflow: "hidden" }}>
      {/* Right — indicator list */}
      <div style={{
        width: 280, flexShrink: 0, background: C.bgPanel, borderLeft: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
            ← Back
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
            <span style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.label} — {s.fullName}</span>
          </div>
          <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>Gate 1 — RSTO · Schema explorer</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
          {["Quantity", "Participation", "Quality"].map(type => {
            const items = s.indicators.filter(i => i.type === type);
            if (!items.length) return null;
            return (
              <div key={type} style={{ marginBottom: 8 }}>
                <div style={{ color: C.textDim, fontSize: 10, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", padding: "4px 8px" }}>
                  {type}
                </div>
                {items.map(ind => {
                  const hasSnapshot = !!CHART_DETAILS[ind.id]?.charts?.length;
                  return (
                    <button
                      key={ind.id}
                      onClick={() => { setSelectedIndicator(ind); setActiveTab("chart"); setShowSchemaRef(false); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "10px 10px",
                        background: selectedIndicator.id === ind.id ? s.colorDim : "transparent",
                        border: `1px solid ${selectedIndicator.id === ind.id ? s.colorBorder : "transparent"}`,
                        borderRadius: 7, cursor: "pointer", marginBottom: 2,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ color: C.textDim, fontSize: 10, fontWeight: 600 }}>{ind.id}</div>
                        {hasSnapshot && <div style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, flexShrink: 0 }} title="Chart snapshot available" />}
                      </div>
                      <div style={{ color: selectedIndicator.id === ind.id ? s.color : C.text, fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginTop: 2 }}>{ind.name}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                        {ind.chartTypes.map(ct => (
                          <span key={ct} style={{ fontSize: 10, color: C.textMuted, background: C.bgSubtle, padding: "1px 6px", borderRadius: 3 }}>
                            {CHART_ICONS[ct] || "▐"} {ct}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }}>
          {/* Schema reference toggle */}
          <button
            onClick={() => setShowSchemaRef(v => !v)}
            style={{
              width: "100%", textAlign: "left", background: showSchemaRef ? s.colorDim : "transparent",
              border: "none", borderBottom: `1px solid ${C.border}`,
              padding: "10px 14px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 13, color: showSchemaRef ? s.color : C.textMuted }}>⊞</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: showSchemaRef ? s.color : C.textMuted }}>Schema reference</div>
              <div style={{ fontSize: 10, color: C.textDim, marginTop: 1 }}>All canonical fields</div>
            </div>
          </button>
          <div style={{ padding: 12 }}>
            <button onClick={onNext} style={{
              width: "100%", background: s.color, color: "#fff", border: "none",
              borderRadius: 7, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>
              Continue to upload →
            </button>
          </div>
        </div>
      </div>

      {/* Right — indicator detail or schema reference */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {/* ── Schema reference view ─────────────────────────────────────────── */}
        {showSchemaRef && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>Schema reference</h2>
              <div style={{ color: C.textDim, fontSize: 13, marginTop: 4 }}>All canonical fields for the <strong>{s.fullName}</strong> strategy</div>
            </div>
            {s.recordTypes.map(rt => (
              <div key={rt.name} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />
                  <span style={{ color: C.navy, fontWeight: 600, fontSize: 13 }}>{rt.name}</span>
                  <span style={{ color: C.textDim, fontSize: 11 }}>— {rt.description}</span>
                </div>
                <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: C.bgSubtle }}>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600, width: "30%" }}>Canonical field</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600, width: "10%" }}>Type</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600, width: "10%" }}>Required</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600 }}>Plain language</th>
                        <th style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 600, width: "18%" }}>Example</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rt.fields.map((f, i) => (
                        <tr key={f.field} style={{ borderTop: `1px solid ${C.border}`, background: i % 2 === 0 ? C.bgCard : C.bgSubtle }}>
                          <td style={{ padding: "9px 12px" }}>
                            <code style={{ fontSize: 11, background: C.bgSubtle, padding: "2px 6px", borderRadius: 3, color: C.navy, fontFamily: "monospace" }}>{f.field}</code>
                          </td>
                          <td style={{ padding: "9px 12px", color: C.textMuted }}>{f.type}</td>
                          <td style={{ padding: "9px 12px" }}>
                            {f.required
                              ? <span style={{ color: C.brand, fontWeight: 700, fontSize: 11 }}>Yes</span>
                              : <span style={{ color: C.textDim, fontSize: 11 }}>Optional</span>}
                          </td>
                          <td style={{ padding: "9px 12px", color: C.text, lineHeight: 1.5 }}>{f.plainLanguage}</td>
                          <td style={{ padding: "9px 12px" }}>
                            <code style={{ fontSize: 10, color: C.textMuted, fontFamily: "monospace" }}>{f.example}</code>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {!showSchemaRef && (<>
        {/* Indicator header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 4,
              background: s.colorDim, color: s.color, border: `1px solid ${s.colorBorder}`,
            }}>{selectedIndicator.type}</span>
            <span style={{ color: C.textDim, fontSize: 12 }}>{selectedIndicator.id}</span>
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy, lineHeight: 1.2 }}>
            {selectedIndicator.name}
          </h2>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            {selectedIndicator.chartTypes.map(ct => (
              <div key={ct} style={{
                background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6,
                padding: "6px 12px", display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 14, color: C.textMuted }}>{CHART_ICONS[ct] || "▐"}</span>
                <span style={{ color: C.text, fontSize: 12, fontWeight: 500 }}>{ct}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {[
            { key: "chart", label: "Chart view" },
            { key: "logic", label: "Logic & derivations" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? s.color : C.textMuted,
              borderBottom: `2px solid ${activeTab === tab.key ? s.color : "transparent"}`,
              marginBottom: -1,
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Chart view tab ────────────────────────────────────────────────── */}
        {activeTab === "chart" && (
          <div>
            {chartDetail ? (
              <>
                {chartDetail.charts.map((chart, chartIdx) => {
                  const isMulti = chartDetail.charts.length > 1;
                  return (
                    <div key={chartIdx} style={{ marginBottom: isMulti ? 32 : 0 }}>
                      {/* Multi-chart label */}
                      {isMulti && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <div style={{ width: 18, height: 18, borderRadius: "50%", background: s.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{chartIdx + 1}</span>
                          </div>
                          <span style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                            Chart {chartIdx + 1} of {chartDetail.charts.length}
                          </span>
                        </div>
                      )}

                      <ChartSnapshot
                        src={chart.snapshot}
                        title={chart.chartTitle}
                        subtitle={chart.chartSubtitle}
                        color={s.color}
                      />

                      {/* Role breakdown */}
                      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
                          <div style={{ color: C.navy, fontWeight: 600, fontSize: 13 }}>Field roles in this chart</div>
                          <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>How canonical schema fields map to chart visual roles</div>
                        </div>
                        {chart.chartFields.map((row, i) => {
                          const rc = roleColor(row.role);
                          return (
                            <div key={i} style={{
                              padding: "14px 16px",
                              borderBottom: i < chart.chartFields.length - 1 ? `1px solid ${C.border}` : "none",
                              display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, alignItems: "start",
                            }}>
                              <div>
                                <span style={{
                                  display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 5,
                                  background: rc.bg, color: rc.color, border: `1px solid ${rc.border}`,
                                }}>
                                  {row.role}
                                </span>
                                {row.source && (
                                  <div style={{ color: C.textMuted, fontSize: 10, marginTop: 4, lineHeight: 1.3 }}>
                                    from {row.source}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div style={{ color: C.text, fontSize: 13, marginBottom: 6, lineHeight: 1.4 }}>{row.description}</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                  {row.fields.map(f => (
                                    <code key={f} style={{
                                      fontSize: 11, padding: "2px 7px", borderRadius: 4,
                                      background: s.colorDim, color: s.color, border: `1px solid ${s.colorBorder}`,
                                      fontFamily: "monospace",
                                    }}>{f}</code>
                                  ))}
                                  {row.derived.map(f => (
                                    <code key={f} style={{
                                      fontSize: 11, padding: "2px 7px", borderRadius: 4,
                                      background: "#f5f2ed", color: "#78716c", border: "1px solid #d4cfc8",
                                      fontFamily: "monospace", fontStyle: "italic",
                                    }} title="Derived field">{f} ∗</code>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 10, color: C.textMuted, fontSize: 11 }}>
                  ∗ Derived fields — calculated from canonical fields, not sourced directly from provider data
                </div>
              </>
            ) : (
              <div style={{
                background: C.bgSubtle, border: `1px dashed ${C.borderMed}`, borderRadius: 10,
                padding: 32, textAlign: "center",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⊞</div>
                <div style={{ color: C.text, fontWeight: 600, fontSize: 14, marginBottom: 4 }}>No chart detail defined yet</div>
                <div style={{ color: C.textDim, fontSize: 12 }}>
                  Chart view details for <strong>{selectedIndicator.id}</strong> haven't been added to CHART_DETAILS.
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "logic" && (
          <div style={{ background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 8, padding: 20 }}>
            <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
              Derivation logic
            </div>
            <div style={{ color: C.text, fontSize: 13, lineHeight: 1.8, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
              {selectedIndicator.logicHint}
            </div>
          </div>
        )}
        </>) /* end !showSchemaRef */}
      </div>
    </div>
  );
}

// ─── Step 3: CSV upload ───────────────────────────────────────────────────────
function CSVUpload({ strategyKey, onNext, onBack, files, setFiles }) {
  const s = SCHEMA[strategyKey];
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = useCallback((rawFiles) => {
    Array.from(rawFiles).forEach(file => {
      if (!file.name.match(/\.(csv|xls|xlsx)$/i)) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const headers = parseCSVHeaders(text);
        setFiles(prev => {
          if (prev.some(f => f.name === file.name)) return prev;
          return [...prev, { id: `file-${Date.now()}-${Math.random()}`, name: file.name, headers, preview: text.slice(0, 500) }];
        });
      };
      reader.readAsText(file);
    });
  }, [setFiles]);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
        ← Back to schema
      </button>

      <div style={{ marginBottom: 28 }}>
        <div style={{ color: C.textDim, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Step 3 of 6 · Upload provider data
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.navy }}>Upload draft data files</h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
          Upload one or more CSV files from the new provider. Only column headers are used for the analysis — raw data is read locally in your browser and is not sent to any server.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? s.color : C.borderMed}`,
          borderRadius: 12, padding: "36px 24px", textAlign: "center", cursor: "pointer",
          background: dragging ? s.colorDim : C.bgCard,
          transition: "all 0.15s", marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 10 }}>⊕</div>
        <div style={{ color: C.text, fontWeight: 600, fontSize: 14 }}>Drop files here or click to browse</div>
        <div style={{ color: C.textMuted, fontSize: 12, marginTop: 4 }}>CSV, XLS, or XLSX — multiple files supported</div>
        <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" multiple style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files)} />
      </div>

      {/* Uploaded files */}
      {files.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            {files.length} file{files.length !== 1 ? "s" : ""} loaded
          </div>
          {files.map(f => (
            <div key={f.id} style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "12px 14px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>📄 {f.name}</span>
                  <span style={{ fontSize: 11, color: C.textDim }}>{f.headers.length} columns detected</span>
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {f.headers.map(h => (
                    <code key={h} style={{
                      fontSize: 10, background: C.bgSubtle, padding: "2px 7px", borderRadius: 3,
                      color: C.textMuted, border: `1px solid ${C.border}`, fontFamily: "monospace",
                    }}>{h}</code>
                  ))}
                </div>
              </div>
              <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))} style={{
                background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0,
              }}>×</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onNext}
          disabled={files.length === 0}
          style={{
            background: files.length ? s.color : C.borderMed,
            color: files.length ? "#fff" : C.textDim,
            border: "none", borderRadius: 7, padding: "11px 24px",
            fontWeight: 600, fontSize: 13, cursor: files.length ? "pointer" : "not-allowed",
          }}
        >
          Run field mapping analysis →
        </button>
        {files.length === 0 && (
          <span style={{ color: C.textDim, fontSize: 12 }}>Upload at least one file to continue</span>
        )}
      </div>
    </div>
  );
}

// ─── Step 4: Analysis loading ──────────────────────────────────────────────────
function AnalysisLoading({ strategyKey }) {
  const s = SCHEMA[strategyKey];
  const steps = [
    "Extracting column headers from uploaded files…",
    "Loading canonical field definitions…",
    "Matching field names and semantics…",
    "Identifying derived fields…",
    "Assessing chart coverage…",
    "Preparing review…",
  ];
  const [activeStep, setActiveStep] = useState(0);

  useState(() => {
    const interval = setInterval(() => setActiveStep(p => Math.min(p + 1, steps.length - 1)), 1200);
    return () => clearInterval(interval);
  });

  return (
    <div style={{ maxWidth: 560, margin: "80px auto", padding: "0 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 20 }}>⊙</div>
      <h2 style={{ color: C.navy, fontWeight: 700, fontSize: 20, margin: "0 0 8px" }}>Analysing field mappings</h2>
      <p style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.6, marginBottom: 32 }}>
        Comparing your provider's column headers against the {s.label} canonical schema. This takes about 15–20 seconds.
      </p>
      <div style={{ textAlign: "left", display: "inline-block" }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, opacity: i <= activeStep ? 1 : 0.3, transition: "opacity 0.4s" }}>
            <div style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0, border: "2px solid",
              borderColor: i < activeStep ? s.color : i === activeStep ? s.color : C.borderMed,
              background: i < activeStep ? s.color : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {i < activeStep && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
              {i === activeStep && <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, animation: "pulse 1s ease-in-out infinite" }} />}
            </div>
            <span style={{ color: i <= activeStep ? C.text : C.textDim, fontSize: 13 }}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 5: Review ────────────────────────────────────────────────────────────
function MappingReview({ strategyKey, analysis, files, confirmedMappings, setConfirmedMappings, onNext, onBack }) {
  const s = SCHEMA[strategyKey];
  const [activeSection, setActiveSection] = useState("matched");
  const [acceptedIds, setAcceptedIds] = useState(new Set());
  const [rejectedIds, setRejectedIds] = useState(new Set());

  const allMappings = analysis?.mappings || [];
  const derived = analysis?.derived_fields || [];
  const unmatched = analysis?.unmatched_canonical_fields || [];

  // Explicitly accept or reject a mapping (toggling off if already set)
  const setStatus = (idx, status) => {
    const toggle = (prev, addIf) => {
      const next = new Set(prev);
      if (addIf) next.add(idx); else next.delete(idx);
      return next;
    };
    setAcceptedIds(prev => toggle(prev, status === "accepted" && !acceptedIds.has(idx)));
    setRejectedIds(prev => toggle(prev, status === "rejected" && !rejectedIds.has(idx)));
  };

  const accepted = allMappings.filter((_, i) => !rejectedIds.has(i));
  const reviewedCount = acceptedIds.size + rejectedIds.size;

  const confirmedCanonicalFields = new Set([
    ...accepted.map(m => m.canonical_field),
    ...derived.filter(d => d.feasible).map(d => d.canonical_field),
  ]);

  // One card per unique chart snapshot — so PPQn1 (2 images) becomes 2 cards, not 1
  const computedCoverage = s.indicators.flatMap(ind => {
    const chartDetail = CHART_DETAILS[ind.id];
    const requiredFields = [...new Set(
      s.recordTypes.flatMap(rt =>
        rt.fields.filter(f => f.usedBy.includes(ind.id) && f.required).map(f => f.field)
      )
    )];
    const coveredCount = requiredFields.filter(f => confirmedCanonicalFields.has(f)).length;
    const total = requiredFields.length;
    const status = total === 0 || coveredCount === total ? "enabled"
      : coveredCount === 0 ? "blocked" : "partial";
    const missingFields = requiredFields.filter(f => !confirmedCanonicalFields.has(f));
    if (!chartDetail) {
      return [{ indicatorId: ind.id, chartTitle: ind.name, status, coveredCount, total, missingFields }];
    }
    // Deduplicate by snapshot — one card per distinct image file
    const seen = new Set();
    return chartDetail.charts
      .filter(c => { if (seen.has(c.snapshot)) return false; seen.add(c.snapshot); return true; })
      .map(c => ({ indicatorId: ind.id, chartTitle: c.chartTitle, status, coveredCount, total,
        coveredFields: requiredFields.filter(f => confirmedCanonicalFields.has(f)),
        missingFields }));
  });

  return (
    <div style={{ display: "flex", flexDirection: "row-reverse", height: "100%", overflow: "hidden" }}>
      {/* Right sidebar — chart coverage */}
      <div style={{ width: 260, flexShrink: 0, background: C.bgPanel, borderLeft: `1px solid ${C.border}`, overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 10 }}>
            ← Back
          </button>
          <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>Step 5 of 6 · Review</div>
          <div style={{ color: C.navy, fontWeight: 700, fontSize: 14 }}>Chart coverage</div>
          <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>Based on your confirmed mappings</div>
        </div>

        <div style={{ flex: 1, padding: "12px 10px" }}>
          {computedCoverage.map((chart, idx) => (
            <div key={`${chart.indicatorId}-${idx}`} style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "12px 12px", marginBottom: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ color: C.textDim, fontSize: 10, fontWeight: 600, fontFamily: "monospace" }}>{chart.indicatorId}</span>
                {statusBadge(chart.status)}
              </div>
              <div style={{ color: C.text, fontSize: 12, fontWeight: 500, lineHeight: 1.3, marginBottom: 4 }}>{chart.chartTitle}</div>
              <div style={{ color: C.textDim, fontSize: 10, marginBottom: 4 }}>
                {chart.coveredCount}/{chart.total} fields covered
              </div>
              {chart.coveredFields?.length > 0 && (
                <div style={{ marginBottom: chart.missingFields.length > 0 ? 6 : 0 }}>
                  <div style={{ color: C.green, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Found:</div>
                  {chart.coveredFields.map(f => (
                    <code key={f} style={{ display: "block", fontSize: 10, color: C.green, fontFamily: "monospace" }}>{f}</code>
                  ))}
                </div>
              )}
              {chart.missingFields.length > 0 && (
                <div>
                  <div style={{ color: C.amber, fontSize: 10, fontWeight: 600, marginBottom: 2 }}>Missing:</div>
                  {chart.missingFields.map(f => (
                    <code key={f} style={{ display: "block", fontSize: 10, color: C.amber, fontFamily: "monospace" }}>{f}</code>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ padding: 12, borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => onNext(accepted)} style={{
            width: "100%", background: s.color, color: "#fff", border: "none",
            borderRadius: 7, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            Generate config →
          </button>
          <div style={{ color: C.textDim, fontSize: 11, marginTop: 6, textAlign: "center" }}>
            {reviewedCount}/{allMappings.length} reviewed · {rejectedIds.size} rejected
          </div>
        </div>
      </div>

      {/* Right — mappings */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
        {/* Summary banner */}
        {analysis?.summary && (
          <div style={{ background: s.colorDim, border: `1px solid ${s.colorBorder}`, borderRadius: 8, padding: "14px 16px", marginBottom: 20 }}>
            <div style={{ color: s.color, fontWeight: 600, fontSize: 12, marginBottom: 4 }}>AI analysis summary</div>
            <div style={{ color: C.text, fontSize: 13, lineHeight: 1.6 }}>{analysis.summary}</div>
          </div>
        )}

        {/* Section tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {[
            { key: "matched", label: `Matched (${allMappings.length})` },
            { key: "derived", label: `Derived (${derived.length})` },
            { key: "unmatched", label: `Unmatched (${unmatched.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveSection(tab.key)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 13, fontWeight: activeSection === tab.key ? 600 : 400,
              color: activeSection === tab.key ? s.color : C.textMuted,
              borderBottom: `2px solid ${activeSection === tab.key ? s.color : "transparent"}`,
              marginBottom: -1,
            }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Matched fields */}
        {activeSection === "matched" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              Review each suggested mapping. Accept ones you're happy with, reject any that don't look right — only rejected fields are excluded from the transformation config.
            </p>
            {allMappings.length === 0 && (
              <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No mappings found.</div>
            )}
            {allMappings.map((m, i) => {
              const usedByIndicators = [...new Set(
                s.recordTypes.flatMap(rt =>
                  rt.fields.filter(f => f.field === m.canonical_field).flatMap(f => f.usedBy)
                )
              )];
              return (
              <div key={i} style={{
                background: rejectedIds.has(i) ? C.bgSubtle : acceptedIds.has(i) ? C.greenDim : C.bgCard,
                border: `1px solid ${rejectedIds.has(i) ? C.borderMed : acceptedIds.has(i) ? "#A8B848" : C.border}`,
                borderRadius: 8, padding: "14px 16px", marginBottom: 8,
                opacity: rejectedIds.has(i) ? 0.45 : 1,
                display: "flex", gap: 14, alignItems: "flex-start",
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    {confidenceBadge(m.confidence)}
                    <span style={{ color: C.textDim, fontSize: 11 }}>{m.record_type}</span>
                    {m.transform_hint && (
                      <span style={{ fontSize: 10, background: C.amberDim, color: C.amber, border: `1px solid ${C.amberBorder}`, padding: "1px 6px", borderRadius: 3, fontWeight: 600 }}>
                        transform: {m.transform_hint}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ background: C.bgSubtle, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 10px", flex: 1 }}>
                      <div style={{ color: C.textDim, fontSize: 10, marginBottom: 2 }}>{m.csv_file}</div>
                      <code style={{ fontSize: 12, color: C.text, fontFamily: "monospace", fontWeight: 600 }}>{m.csv_column}</code>
                    </div>
                    <div style={{ color: C.textDim, fontSize: 16 }}>→</div>
                    <div style={{ background: s.colorDim, border: `1px solid ${s.colorBorder}`, borderRadius: 6, padding: "6px 10px", flex: 1 }}>
                      <div style={{ color: C.textDim, fontSize: 10, marginBottom: 2 }}>canonical field</div>
                      <code style={{ fontSize: 12, color: s.color, fontFamily: "monospace", fontWeight: 600 }}>{m.canonical_field}</code>
                    </div>
                  </div>
                  {m.confidence_reason && (
                    <div style={{ color: C.textDim, fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>{m.confidence_reason}</div>
                  )}
                  {usedByIndicators.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      <span style={{ color: C.textDim, fontSize: 10 }}>Used by:</span>
                      {usedByIndicators.map(id => (
                        <span key={id} style={{ fontSize: 10, background: s.colorDim, color: s.color, border: `1px solid ${s.colorBorder}`, padding: "1px 6px", borderRadius: 3, fontFamily: "monospace", fontWeight: 600 }}>{id}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, flexShrink: 0 }}>
                  <button
                    onClick={() => setStatus(i, "accepted")}
                    style={{
                      background: acceptedIds.has(i) ? C.green : "none",
                      border: `1px solid ${acceptedIds.has(i) ? C.green : C.borderMed}`,
                      borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11,
                      color: acceptedIds.has(i) ? "#fff" : C.textMuted, fontWeight: 600,
                    }}
                  >
                    {acceptedIds.has(i) ? "✓ Accepted" : "✓ Accept"}
                  </button>
                  <button
                    onClick={() => setStatus(i, "rejected")}
                    style={{
                      background: rejectedIds.has(i) ? "#fef2f2" : "none",
                      border: `1px solid ${rejectedIds.has(i) ? "#fca5a5" : C.borderMed}`,
                      borderRadius: 6, padding: "5px 10px", cursor: "pointer", fontSize: 11,
                      color: rejectedIds.has(i) ? C.red : C.textMuted, fontWeight: 600,
                    }}
                  >
                    {rejectedIds.has(i) ? "✕ Rejected" : "✕ Reject"}
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* Derived fields */}
        {activeSection === "derived" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              These fields can be computed from the matched source columns rather than being supplied directly.
            </p>
            {derived.length === 0 && <div style={{ color: C.textMuted, fontSize: 13, textAlign: "center", padding: "40px 0" }}>No derived fields identified.</div>}
            {derived.map((d, i) => (
              <div key={i} style={{
                background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "14px 16px", marginBottom: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 3,
                    background: d.feasible ? "#EDF0E5" : "#fef2f2",
                    color: d.feasible ? "#475F34" : "#dc2626",
                    border: `1px solid ${d.feasible ? "#A8B848" : "#fca5a5"}`,
                  }}>
                    {d.feasible ? "Derivable" : "Not feasible"}
                  </span>
                  <span style={{ color: C.textDim, fontSize: 11 }}>{d.record_type}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <code style={{ fontSize: 13, color: s.color, fontFamily: "monospace", fontWeight: 600 }}>{d.canonical_field}</code>
                </div>
                <div style={{ color: C.textMuted, fontSize: 12, lineHeight: 1.5 }}>{d.derivation}</div>
                {d.requires?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ color: C.textDim, fontSize: 11 }}>Requires:</span>
                    {d.requires.map(r => (
                      <code key={r} style={{ fontSize: 10, background: C.bgSubtle, padding: "2px 6px", borderRadius: 3, color: C.textMuted, fontFamily: "monospace" }}>{r}</code>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Unmatched fields */}
        {activeSection === "unmatched" && (
          <div>
            <p style={{ color: C.textMuted, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
              These canonical fields have no match in the uploaded files and cannot be derived. They will need further investigation before the affected charts can be enabled.
            </p>
            {unmatched.length === 0 && <div style={{ fontSize: 13, textAlign: "center", padding: "40px 0", color: C.green, fontWeight: 600 }}>All canonical fields matched or derived. 🎉</div>}
            {unmatched.map((u, i) => (
              <div key={i} style={{
                background: C.bgCard, border: `1px solid ${C.amberBorder}`, borderRadius: 8,
                padding: "14px 16px", marginBottom: 8, borderLeft: `4px solid ${C.amber}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <code style={{ fontSize: 13, color: C.amber, fontFamily: "monospace", fontWeight: 600 }}>{u.canonical_field}</code>
                  <span style={{ color: C.textDim, fontSize: 11, flexShrink: 0, marginLeft: 12 }}>{u.record_type}</span>
                </div>
                <div style={{ color: C.text, fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>{u.issue}</div>
                {u.suggestion && (
                  <div style={{ color: C.textMuted, fontSize: 11, lineHeight: 1.5, fontStyle: "italic" }}>{u.suggestion}</div>
                )}
                {u.blocks_charts?.length > 0 && (
                  <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    <span style={{ color: C.amber, fontSize: 11, fontWeight: 600 }}>Blocks:</span>
                    {u.blocks_charts.map(c => (
                      <span key={c} style={{ fontSize: 11, background: C.amberDim, color: C.amber, border: `1px solid ${C.amberBorder}`, padding: "1px 7px", borderRadius: 3 }}>{c}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 6: Generate config ──────────────────────────────────────────────────
function GenerateConfig({ strategyKey, analysis, confirmedMappings, files, onBack, onReset }) {
  const s = SCHEMA[strategyKey];
  const [copied, setCopied] = useState(false);
  const [providerName, setProviderName] = useState("");

  const enabledCharts = (analysis?.chart_coverage || []).filter(c => c.status === "enabled").map(c => c.chart_id);
  const partialCharts = (analysis?.chart_coverage || []).filter(c => c.status === "partial").map(c => c.chart_id);

  const config = {
    _meta: {
      generated: new Date().toISOString().split("T")[0],
      tool: "RSTO Data Discovery",
      strategy: s.label,
      provider: providerName || "PROVIDER_NAME",
      status: "draft — requires PALO / RSTO review before use",
    },
    source_files: files.map((f, i) => ({
      file_index: i + 1,
      file_name: f.name,
      detected_columns: f.headers,
    })),
    field_mappings: confirmedMappings.map(m => ({
      source_file: m.csv_file,
      source_column: m.csv_column,
      canonical_field: m.canonical_field,
      record_type: m.record_type,
      confidence: m.confidence,
      ...(m.transform_hint ? { transform: m.transform_hint } : {}),
    })),
    derived_fields: (analysis?.derived_fields || []).filter(d => d.feasible).map(d => ({
      canonical_field: d.canonical_field,
      derivation: d.derivation,
      requires: d.requires,
    })),
    charts_enabled: enabledCharts,
    charts_partial: partialCharts,
    open_issues: (analysis?.unmatched_canonical_fields || []).map(u => ({
      missing_field: u.canonical_field,
      issue: u.issue,
      blocks: u.blocks_charts || [],
    })),
  };

  const configJson = JSON.stringify(config, null, 2);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(configJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadConfig = () => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(providerName || "provider").toLowerCase().replace(/\s+/g, "-")}-${s.key}-mapping-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "40px 24px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: C.textMuted, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 20, display: "flex", alignItems: "center", gap: 4 }}>
        ← Back to review
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ color: C.textDim, fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
          Step 6 of 6 · Generate config
        </div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: C.navy }}>Transformation config — draft</h2>
        <p style={{ color: C.textMuted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
          This is a first-draft mapping configuration based on the AI analysis and your review. It must be reviewed and approved by PALO and RSTO before being used in the ingestion pipeline.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Fields mapped", value: confirmedMappings.length, color: C.green },
          { label: "Charts enabled", value: enabledCharts.length, color: s.color },
          { label: "Charts partial", value: partialCharts.length, color: C.amber },
          { label: "Open issues", value: (analysis?.unmatched_canonical_fields || []).length, color: C.red },
        ].map(stat => (
          <div key={stat.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ color: C.textMuted, fontSize: 11, marginTop: 4 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Provider name input */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: C.textMuted, fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>
          Provider name (for the config filename)
        </label>
        <input
          value={providerName}
          onChange={e => setProviderName(e.target.value)}
          placeholder="e.g. Gowrie Victoria"
          style={{
            width: "100%", background: C.bgCard, color: C.text, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "9px 12px", fontSize: 13, fontFamily: "inherit", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Config preview */}
      <div style={{ background: "#1a2332", borderRadius: 10, padding: "0", marginBottom: 16, overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #2a3a4a" }}>
          <span style={{ color: "#9CC5CE", fontSize: 12, fontFamily: "monospace" }}>
            {providerName ? `${providerName.toLowerCase().replace(/\s+/g, "-")}-${s.key}-mapping-config.json` : `provider-${s.key}-mapping-config.json`}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={copyToClipboard} style={{
              background: "#2D6B7A22", color: "#9CC5CE", border: "1px solid #9CC5CE44",
              borderRadius: 5, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontWeight: 600,
            }}>
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <pre style={{
          color: "#E8F2F4", fontSize: 11, lineHeight: 1.6, padding: "16px",
          margin: 0, overflowX: "auto", maxHeight: 400, fontFamily: "monospace",
        }}>
          {configJson}
        </pre>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={downloadConfig} style={{
          background: s.color, color: "#fff", border: "none",
          borderRadius: 7, padding: "11px 22px", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>
          ↓ Download config
        </button>
        <button onClick={onReset} style={{
          background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`,
          borderRadius: 7, padding: "11px 22px", fontWeight: 500, fontSize: 13, cursor: "pointer",
        }}>
          Start new discovery
        </button>
      </div>

      <div style={{
        marginTop: 20, background: C.amberDim, border: `1px solid ${C.amberBorder}`,
        borderRadius: 8, padding: "12px 16px",
      }}>
        <span style={{ color: C.amber, fontWeight: 600, fontSize: 12 }}>Review required — </span>
        <span style={{ color: C.text, fontSize: 12, lineHeight: 1.5 }}>
          This config is a draft. Before using it in the ingestion pipeline, PALO and RSTO must review all field mappings, confirm the transform rules, and resolve any open issues above.
        </span>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
const SAVE_KEY = "rsto-po-discovery";

function timeAgo(iso) {
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.round(mins / 60)}h ago`;
}

export default function DataDiscovery() {
  const [step, setStep] = useState("strategy");
  const [strategyKey, setStrategyKey] = useState(null);
  const [files, setFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [confirmedMappings, setConfirmedMappings] = useState([]);
  const [savedAt, setSavedAt] = useState(null);
  const [resumeSession, setResumeSession] = useState(null);

  // Load saved session on first mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (saved?.strategyKey) setResumeSession(saved);
    } catch {}
  }, []);

  // Auto-save whenever key state changes
  useEffect(() => {
    if (!strategyKey) return;
    const timer = setTimeout(() => {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        strategyKey,
        step: step === "analysis" ? "upload" : step,
        analysis,
        confirmedMappings,
        savedAt: new Date().toISOString(),
      }));
      setSavedAt(new Date().toISOString());
    }, 800);
    return () => clearTimeout(timer);
  }, [strategyKey, step, analysis, confirmedMappings]);

  function resumeSaved() {
    const s = resumeSession;
    setStrategyKey(s.strategyKey);
    setAnalysis(s.analysis || null);
    setConfirmedMappings(s.confirmedMappings || []);
    setStep(s.step || "strategy");
    setResumeSession(null);
  }

  function reset() {
    localStorage.removeItem(SAVE_KEY);
    setSavedAt(null);
    setResumeSession(null);
    setStep("strategy");
    setStrategyKey(null);
    setFiles([]);
    setAnalysis(null);
    setAnalysisError(null);
    setConfirmedMappings([]);
  }

  async function runAnalysis() {
    setStep("analysis");
    setAnalysisError(null);

    const s = SCHEMA[strategyKey];

    // Build canonical field list for the prompt
    const fieldsList = s.recordTypes.flatMap(rt =>
      rt.fields.map(f => `${rt.name} | ${f.field} | ${f.type} | required:${f.required} | ${f.plainLanguage}`)
    ).join("\n");

    // Build CSV headers summary
    const headersDesc = files.map((f, i) =>
      `File ${i + 1} ("${f.name}"): ${f.headers.join(", ")}`
    ).join("\n");

    const userMessage = `Strategy: ${s.label} (${s.fullName})

CANONICAL FIELDS:
${fieldsList}

UPLOADED CSV COLUMN HEADERS:
${headersDesc}

Analyse the CSV column headers and suggest field mappings against the canonical schema.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: MAPPING_SYSTEM,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      let parsed;
      try { parsed = JSON.parse(clean); }
      catch { const m = clean.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error("Could not parse AI response"); }

      setAnalysis(parsed);
      setConfirmedMappings(parsed.mappings || []);
      setStep("review");
    } catch (err) {
      setAnalysisError(err.message || "Analysis failed");
      setStep("upload");
    }
  }

  const containerStyle = {
    display: "flex", flexDirection: "column", height: "100%",
    background: C.bg,
    fontFamily: "'Inter', system-ui, sans-serif", color: C.text,
    overflow: "hidden",
  };

  const PIPELINE_STEPS = [
    { label: "Strategy",  internal: ["strategy"] },
    { label: "Schema",    internal: ["schema"] },
    { label: "Upload",    internal: ["upload", "analysis"] },
    { label: "Review",    internal: ["review"] },
    { label: "Export",    internal: ["generate"] },
  ];
  const activePipelineIdx = PIPELINE_STEPS.findIndex(ps => ps.internal.includes(step));

  return (
    <div style={containerStyle}>
      {/* ── Pipeline stepper ───────────────────────────────────────────────── */}
      <div style={{
        background: C.bgPanel, borderBottom: `1px solid ${C.border}`,
        padding: "16px 28px 0", flexShrink: 0,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ color: C.textDim, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Data discovery
            {strategyKey && (
              <span style={{ marginLeft: 8, color: SCHEMA[strategyKey]?.color, letterSpacing: 0, fontWeight: 600, textTransform: "none" }}>
                · {SCHEMA[strategyKey]?.label}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {savedAt && (
              <span style={{ color: C.textDim, fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.teal, display: "inline-block" }} />
                Saved {timeAgo(savedAt)}
              </span>
            )}
            {strategyKey && (
              <button onClick={reset} style={{ background: "none", border: `1px solid ${C.borderMed}`, borderRadius: 5, padding: "3px 9px", fontSize: 11, color: C.textMuted, cursor: "pointer" }}>
                Start over
              </button>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", overflowX: "auto" }}>
          {PIPELINE_STEPS.map((ps, i) => {
            const isActive = i === activePipelineIdx;
            const isDone = i < activePipelineIdx;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "0 4px 12px",
                  borderBottom: isActive ? `2px solid ${C.brand}` : isDone ? `2px solid ${C.teal}` : "2px solid transparent",
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700,
                    background: isActive ? C.brand : isDone ? C.teal : C.bgSubtle,
                    color: isActive || isDone ? "#fff" : C.textDim,
                    border: `1.5px solid ${isActive ? C.brand : isDone ? C.teal : C.border}`,
                  }}>{isDone ? "✓" : i + 1}</div>
                  <span style={{
                    fontSize: 12, whiteSpace: "nowrap",
                    color: isActive ? C.brand : isDone ? C.teal : C.textDim,
                    fontWeight: isActive || isDone ? 600 : 400,
                  }}>{ps.label}</span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <div style={{ width: 20, height: 1, background: C.border, margin: "0 4px", flexShrink: 0, marginBottom: 12 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error banner */}
      {analysisError && (
        <div style={{ background: "#fef2f2", borderBottom: `1px solid #fca5a5`, padding: "10px 24px", flexShrink: 0 }}>
          <span style={{ color: C.red, fontWeight: 600, fontSize: 12 }}>Analysis failed — </span>
          <span style={{ color: C.text, fontSize: 12 }}>{analysisError}. Please check your API key and try again.</span>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {step === "strategy" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <StrategySelect onSelect={key => { setStrategyKey(key); setResumeSession(null); setStep("schema"); }} />
            {resumeSession && (
              <div style={{ maxWidth: 780, margin: "0 auto", padding: "0 24px 40px" }}>
                <div style={{ color: C.textDim, fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
                  History
                </div>
                <div style={{
                  background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 10,
                  padding: "16px 20px", display: "flex", alignItems: "center", gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: C.text, marginBottom: 4 }}>
                      {SCHEMA[resumeSession.strategyKey]?.label} — {SCHEMA[resumeSession.strategyKey]?.fullName}
                    </div>
                    <div style={{ color: C.textDim, fontSize: 12 }}>
                      {resumeSession.step} step
                      {resumeSession.savedAt && ` · saved ${timeAgo(resumeSession.savedAt)}`}
                    </div>
                  </div>
                  <button onClick={resumeSaved} style={{
                    background: SCHEMA[resumeSession.strategyKey]?.color, color: "#fff",
                    border: "none", borderRadius: 7, padding: "8px 16px",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>Resume →</button>
                  <button onClick={() => setResumeSession(null)} style={{
                    background: "none", border: `1px solid ${C.borderMed}`,
                    borderRadius: 7, padding: "8px 12px", fontSize: 12,
                    color: C.textMuted, cursor: "pointer",
                  }}>Dismiss</button>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "schema" && strategyKey && (
          <SchemaExplorer
            strategyKey={strategyKey}
            onNext={() => setStep("upload")}
            onBack={() => setStep("strategy")}
          />
        )}

        {step === "upload" && strategyKey && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <CSVUpload
              strategyKey={strategyKey}
              files={files}
              setFiles={setFiles}
              onNext={runAnalysis}
              onBack={() => setStep("schema")}
            />
          </div>
        )}

        {step === "analysis" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <AnalysisLoading strategyKey={strategyKey} />
          </div>
        )}

        {step === "review" && analysis && (
          <MappingReview
            strategyKey={strategyKey}
            analysis={analysis}
            files={files}
            confirmedMappings={confirmedMappings}
            setConfirmedMappings={setConfirmedMappings}
            onNext={(accepted) => { setConfirmedMappings(accepted); setStep("generate"); }}
            onBack={() => setStep("upload")}
          />
        )}

        {step === "generate" && (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <GenerateConfig
              strategyKey={strategyKey}
              analysis={analysis}
              confirmedMappings={confirmedMappings}
              files={files}
              onBack={() => setStep("review")}
              onReset={reset}
            />
          </div>
        )}
      </div>
    </div>
  );
}
