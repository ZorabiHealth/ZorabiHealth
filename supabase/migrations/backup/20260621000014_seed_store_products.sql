-- Seed initial store products using existing static image paths.
-- These display on /zobraipharm via fetchStoreProducts() which reads store_products.
-- Vendors can later replace images via the product form (uploads to pharmacy_products bucket).
insert into store_products (name, generic_name, manufacturer, category, description, composition, dosage, usage, side_effects, safety, storage, price, mrp, image_url, is_pinned, in_stock) values
(
  'Dolo 650mg', 'Paracetamol', 'Micro Labs', 'Analgesic',
  'Dolo 650mg is a trusted analgesic and antipyretic used for relief of fever, headache, body aches, and mild to moderate pain.',
  'Each tablet contains Paracetamol IP 650mg',
  '1 tablet every 6 hours as needed. Max 4 tablets in 24 hours.',
  'Fever, Headache, Toothache, Menstrual cramps, Muscular aches, Cold & flu symptoms',
  'Nausea, rash, liver damage with overdose (>4000mg/day)',
  '["Do not exceed 4 tablets in 24 hours","Avoid alcohol while taking this medication","Consult doctor if symptoms persist beyond 3 days","Not recommended in severe hepatic impairment"]',
  'Store below 30°C, protect from light and moisture',
  32, 35, '/images/pharmacy/dolo-650mg.png', true, true
),
(
  'Metformin 500mg', 'Metformin Hydrochloride', 'USV', 'Antidiabetic',
  'Metformin 500mg is a first-line medication for type 2 diabetes that helps control blood sugar levels by improving insulin sensitivity.',
  'Each tablet contains Metformin Hydrochloride IP 500mg',
  '1 tablet twice daily with meals.',
  'Type 2 diabetes management, Blood sugar control, Insulin resistance',
  'Nausea, diarrhea, metallic taste, vitamin B12 deficiency with long-term use',
  '["Take with food to reduce stomach upset","Monitor blood sugar regularly","Avoid alcohol","Consult doctor if vomiting or dehydration occurs"]',
  'Store below 25°C, protect from moisture',
  18, 22, '/images/pharmacy/metformin-500mg.png', true, true
),
(
  'Atorvastatin 10mg', 'Atorvastatin Calcium', 'Zydus Cadila', 'Statin',
  'Atorvastatin 10mg is a cholesterol-lowering medication that reduces LDL cholesterol and triglycerides while increasing HDL cholesterol.',
  'Each tablet contains Atorvastatin Calcium IP 10mg',
  '1 tablet once daily, preferably at the same time each day.',
  'High cholesterol management, Cardiovascular disease prevention, LDL reduction',
  'Muscle pain, joint pain, headache, increased liver enzymes (rare)',
  '["Report unexplained muscle pain or weakness","Avoid grapefruit juice","Regular liver function monitoring required","Do not stop without consulting your doctor"]',
  'Store below 30°C, protect from light',
  45, 52, '/images/pharmacy/atorvastatin-10mg.png', true, true
),
(
  'Amlodipine 5mg', 'Amlodipine Besylate', 'Pfizer', 'Calcium Channel Blocker',
  'Amlodipine 5mg is a calcium channel blocker used for treating high blood pressure and coronary artery disease.',
  'Each tablet contains Amlodipine Besylate IP 5mg',
  '1 tablet once daily.',
  'Hypertension, Coronary artery disease, Angina prevention',
  'Swelling in ankles/feet, dizziness, flushing, palpitations',
  '["Avoid grapefruit juice","May cause dizziness — avoid driving initially","Do not stop suddenly","Monitor blood pressure regularly"]',
  'Store below 25°C, protect from light',
  28, 35, '/images/pharmacy/amlodipine-5mg.png', true, true
),
(
  'Omeprazole 20mg', 'Omeprazole', 'Dr. Reddys', 'Proton Pump Inhibitor',
  'Omeprazole 20mg reduces stomach acid production and is used for treating GERD, gastric ulcers, and acid reflux.',
  'Each capsule contains Omeprazole IP 20mg',
  '1 capsule once daily before a meal, preferably in the morning.',
  'GERD, Gastric ulcers, Acid reflux, Zollinger-Ellison syndrome, Heartburn',
  'Headache, nausea, abdominal pain, vitamin B12 deficiency with long-term use',
  '["Take before meals for best effect","Do not crush or chew the capsule","Long-term use may increase fracture risk","Consult doctor if symptoms persist after 2 weeks"]',
  'Store below 25°C, protect from moisture',
  24, 30, '/images/pharmacy/omeprazole-20mg.png', true, true
),
(
  'Vitamin D3 60K', 'Cholecalciferol', 'Abbott', 'Supplement',
  'Vitamin D3 60K is a high-potency vitamin D supplement for treating vitamin D deficiency and maintaining bone health.',
  'Each capsule contains Cholecalciferol IP 60000 IU',
  '1 capsule once weekly for 8 weeks, then once monthly as maintenance.',
  'Vitamin D deficiency, Osteoporosis, Bone health, Immune support',
  'Rare at recommended dosage. Overdose may cause hypercalcemia — nausea, weakness, kidney stones.',
  '["Do not exceed recommended dosage","Take with a meal containing fat for better absorption","Monitor calcium levels if on long-term therapy","Keep out of reach of children"]',
  'Store below 25°C, protect from light and moisture',
  80, 95, '/images/pharmacy/vitamin-d3-60k.png', true, true
),
(
  'Cetirizine 10mg', 'Cetirizine Hydrochloride', 'Cipla', 'Antihistamine',
  'Cetirizine 10mg is an antihistamine used for relief of allergic symptoms including hay fever, hives, and runny nose.',
  'Each tablet contains Cetirizine Hydrochloride IP 10mg',
  '1 tablet once daily in the evening.',
  'Allergic rhinitis, Hay fever, Hives, Allergic skin reactions, Itching',
  'Drowsiness, dry mouth, fatigue, headache',
  '["May cause drowsiness — avoid driving","Avoid alcohol","Do not exceed 1 tablet in 24 hours","Not recommended for children under 6 years"]',
  'Store below 25°C, protect from moisture',
  15, 18, '/images/pharmacy/cetirizine-10mg.png', true, true
),
(
  'Ibuprofen 400mg', 'Ibuprofen', 'GSK', 'NSAID',
  'Ibuprofen 400mg is a non-steroidal anti-inflammatory drug used for pain relief, fever reduction, and anti-inflammatory effects.',
  'Each tablet contains Ibuprofen IP 400mg',
  '1 tablet every 6-8 hours as needed. Max 3 tablets in 24 hours.',
  'Muscle pain, Joint pain, Dental pain, Menstrual cramps, Fever, Inflammation',
  'Stomach upset, heartburn, nausea, dizziness. Long-term use may cause gastric ulcers or kidney issues.',
  '["Take with food or milk","Avoid on an empty stomach","Do not exceed 1200mg in 24 hours","Avoid alcohol","Consult doctor before long-term use"]',
  'Store below 30°C, protect from light',
  22, 28, '/images/pharmacy/ibuprofen-400mg.png', true, true
),
(
  'Losartan 50mg', 'Losartan Potassium', 'Merck', 'ARB',
  'Losartan 50mg is an angiotensin receptor blocker used for treating hypertension and protecting kidney function in diabetic patients.',
  'Each tablet contains Losartan Potassium IP 50mg',
  '1 tablet once daily.',
  'Hypertension, Diabetic nephropathy, Stroke prevention, Heart failure',
  'Dizziness, fatigue, low blood pressure, hyperkalemia',
  '["Monitor blood pressure regularly","Avoid potassium supplements unless prescribed","May cause dizziness — avoid driving initially","Stay hydrated"]',
  'Store below 25°C, protect from moisture',
  35, 42, '/images/pharmacy/losartan-50mg.png', true, true
),
(
  'Lisinopril 5mg', 'Lisinopril', 'AstraZeneca', 'ACE Inhibitor',
  'Lisinopril 5mg is an ACE inhibitor used for treating hypertension, heart failure, and improving survival after heart attack.',
  'Each tablet contains Lisinopril IP 5mg',
  '1 tablet once daily.',
  'Hypertension, Heart failure, Post-myocardial infarction, Diabetic nephropathy',
  'Dry cough, dizziness, headache, hyperkalemia, angioedema (rare)',
  '["Monitor blood pressure and potassium levels","May cause persistent dry cough","Avoid pregnancy","Report swelling of face or lips immediately"]',
  'Store below 25°C, protect from moisture',
  30, 38, '/images/pharmacy/lisinopril-5mg.png', true, true
),
(
  'Azithromycin 500mg', 'Azithromycin', 'Sun Pharma', 'Antibiotic',
  'Azithromycin 500mg is a macrolide antibiotic used for treating respiratory, skin, and certain bacterial infections.',
  'Each tablet contains Azithromycin IP 500mg',
  '1 tablet once daily for 3 days, or as prescribed by physician.',
  'Respiratory tract infections, Skin infections, Ear infections, Sexually transmitted infections',
  'Nausea, abdominal pain, diarrhea, headache, taste disturbance',
  '["Complete the full course of treatment","Take on an empty stomach 1 hour before or 2 hours after food","Avoid alcohol","Do not share antibiotics"]',
  'Store below 25°C, protect from moisture',
  55, 65, '/images/pharmacy/azithromycin-500mg.png', true, true
),
(
  'Amoxicillin 500mg', 'Amoxicillin', 'Alkem', 'Antibiotic',
  'Amoxicillin 500mg is a penicillin-type antibiotic used for treating bacterial infections including respiratory, urinary, and skin infections.',
  'Each capsule contains Amoxicillin IP 500mg',
  '1 capsule three times daily for 7-14 days, or as prescribed.',
  'Respiratory infections, Urinary tract infections, Skin infections, Dental infections, Throat infections',
  'Nausea, vomiting, diarrhea, rash, allergic reactions in penicillin-sensitive individuals',
  '["Complete the full course","Report any skin rash or breathing difficulty immediately","May reduce oral contraceptive effectiveness","Avoid if allergic to penicillin"]',
  'Store below 25°C, protect from moisture',
  42, 50, '/images/pharmacy/amoxicillin-500mg.png', true, true
) on conflict do nothing;
