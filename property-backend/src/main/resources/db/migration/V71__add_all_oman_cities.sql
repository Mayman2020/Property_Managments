-- V71: Add all Oman cities across all governorates
INSERT INTO lookups (type, code, name_ar, name_en, parent_id, sort_order, is_active, is_locked)
SELECT 'CITY', v.code, v.name_ar, v.name_en, c.id, v.sort_order, TRUE, FALSE
FROM (VALUES
    -- Muscat Governorate
    ('SEE',  'السيب',                 'Seeb',                    10),
    ('BWS',  'بوشر',                 'Bawshar',                 11),
    ('AMR',  'العامرات',             'Al Amerat',               12),
    ('QRY',  'قريات',                'Qurayyat',                13),
    ('MTR',  'مطرح',                 'Mutrah',                  14),
    -- Dhofar Governorate
    ('THM',  'ثمريت',                'Thumrait',                20),
    ('MRB',  'مرباط',                'Mirbat',                  21),
    ('TQA',  'طاقة',                 'Taqa',                    22),
    ('SDH',  'صادة',                 'Sadah',                   23),
    ('TFT',  'طفيت',                 'Taqah',                   24),
    ('DLK',  'دلكوت',                'Dalkut',                  25),
    -- Al Batinah North Governorate
    ('SHN',  'شناص',                 'Shinas',                  30),
    ('SAH',  'صحم',                  'Saham',                   31),
    ('LIW',  'ليوا',                 'Liwa',                    32),
    ('KHR',  'الخابورة',             'Al Khaburah',             33),
    ('SWQ',  'الصويق',               'As Suwaiq',               34),
    ('MSN',  'المصنعة',              'Al Masnaah',              35),
    ('SHH',  'شهات',                 'Shihhat',                 36),
    -- Al Batinah South Governorate
    ('NKH',  'نخل',                  'Nakhal',                  40),
    ('RST',  'الرستاق',              'Rustaq',                  41),
    ('WML',  'وادي المعاول',         'Wadi Al Maawil',          42),
    ('AWB',  'عوابي',                'Awabi',                   43),
    ('MDD',  'المصدر',               'Al Musaddar',             44),
    -- Al Dakhiliyah Governorate
    ('BHL',  'بهلاء',                'Bahla',                   50),
    ('ADM',  'أدم',                  'Adam',                    51),
    ('IZK',  'إزكي',                 'Izki',                    52),
    ('SMI',  'سمائل',                'Samail',                  53),
    ('HAM',  'الحمراء',              'Al Hamra',                54),
    ('MNH',  'مناح',                 'Manah',                   55),
    ('ANK',  'أنقاء',                'Anqaa',                   56),
    -- Al Sharqiyah North Governorate
    ('IBR',  'إبراء',                'Ibra',                    60),
    ('MDH',  'المضيبي',              'Al Mudhaibi',             61),
    ('QPL',  'القابل',               'Al Qabil',                62),
    ('WFY',  'وادي الفلج',           'Wadi Al Falaj',           63),
    ('BDB',  'بدبد',                 'Bidibid',                 64),
    -- Al Sharqiyah South Governorate
    ('SUR',  'صور',                  'Sur',                     70),
    ('RHD',  'رأس الحد',             'Ras Al Hadd',             71),
    ('JBB',  'جعلان بني بو علي',     'Jalan Bani Bu Ali',       72),
    ('JBH',  'جعلان بني بو حسن',    'Jalan Bani Bu Hassan',    73),
    ('MSR',  'مصيرة',               'Masirah',                 74),
    -- Al Dhahirah Governorate
    ('IBG',  'عبري',                 'Ibri',                    80),
    ('YNQ',  'ينقل',                 'Yanqul',                  81),
    ('DNK',  'ضنك',                  'Dhank',                   82),
    -- Al Buraymi Governorate
    ('BRM',  'البريمي',              'Al Buraymi',              90),
    ('MHD',  'محضة',                 'Mahdah',                  91),
    ('SNY',  'السنينة',              'As Sinainah',             92),
    -- Musandam Governorate
    ('KHB',  'خصب',                  'Khasab',                  100),
    ('DBB',  'دبا',                  'Dibba',                   101),
    ('BKH',  'بخا',                  'Bukha',                   102),
    ('LMA',  'ليما',                 'Lima',                    103),
    -- Al Wusta Governorate
    ('HMA',  'هيماء',                'Haima',                   110),
    ('DQM',  'دقم',                  'Duqm',                    111),
    ('MHT',  'محوت',                 'Mahout',                  112),
    ('HBT',  'حيبوت',               'Haybout',                 113)
) AS v(code, name_ar, name_en, sort_order)
CROSS JOIN lookups c
WHERE c.type = 'COUNTRY' AND c.code = 'OM'
ON CONFLICT (type, code) DO UPDATE SET
    name_ar    = EXCLUDED.name_ar,
    name_en    = EXCLUDED.name_en,
    parent_id  = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    is_active  = TRUE;
