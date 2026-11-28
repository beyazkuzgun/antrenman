/* PROGRAM — yeni hareket, gün ya da ekipman eklemek için sadece bu dosyayı düzenle.
   EQUIP : ekipman listesi (Ayarlar'da açılıp kapanır)
   FLAGS : izin anahtarları (ör. doktor onayı)
   POSES : animasyon pozları. Nokta harfleri: H baş, N omuz, M sırt ortası (isteğe bağlı), P kalça,
           E/W yakın dirsek/el, e/w uzak dirsek/el, K/F yakın diz/ayak bileği, k/f uzak, T/t ayak ucu, B kettlebell.
           Çizim alanı 200x140, zemin y=128.
   EX    : hareketler. eq = gereken ekipman, flag = gereken izin, alt = o ekipman varsa yerine geçecek hareket.
   DAYS  : günler. blocks içinde circuit (devre), emom, rounds (raund) ve list (sıralı) blokları kullanılır.
   Sayılar haftaya göre değişebilir: byWeek({1:5,3:6}) = 1-2. hafta 5, 3. haftadan sonra 6. */
window.PROGRAM = (() => {
const byWeek = t => w => { let v; for (const k of Object.keys(t).map(Number).sort((a, b) => a - b)) if (w >= k) v = t[k]; return v };

const EQUIP = {
  bar: { name: 'Barfiks demiri', on: true },
  mat: { name: 'Yoga matı', on: true },
  kb:  { name: 'Kettlebell', on: false, weights: [8, 12, 16, 20, 24], weight: 16 },
  bag: { name: 'Boks torbası', on: false },
  bench: { name: 'Bench sehpası', on: true },
  db:  { name: 'Dambıl (ayarlanabilir)', on: false },
  band: { name: 'Direnç bandı', on: false },
  rings: { name: 'Jimnastik halkası', on: false },
  dip: { name: 'Dips istasyonu', on: false }
};
const FLAGS = {
  cleared: { name: 'Doktor onayı: swing ve goblet squat serbest', on: false }
};

const HD = 'H100,46 N100,58 P100,96 E90,40 W86,22 e110,40 w114,22 K96,114 F98,132 k104,114 f102,132';
const HU = 'H100,12 N100,28 P100,66 E78,32 W86,22 e122,32 w114,22 K96,84 F98,102 k104,84 f102,102';
const PU = 'H143,92 N130,98 P86,112 E131,113 W132,128 K63,119 F40,126';
const PD = 'H143,112 N130,118 P86,122 E117,118 W132,128 K63,124 F40,127';
const ST = 'H100,30 N100,44 P100,84 K95,106 F93,128 k105,106 f107,128 ';
const SS = 'H104,30 N100,42 P98,82 K99,106 F100,126 T110,128 ';
const BG = 'H101,38 N98,50 P95,88 E108,66 W114,52 e104,68 w110,56 K90,108 F84,128 k106,108 f112,128';
const JAB = 'H103,38 N100,50 P95,88 E128,52 W150,50 e104,68 w110,56 K90,108 F84,128 k106,108 f112,128';
const CRS = 'H104,38 N102,50 P96,88 E108,66 W114,52 e128,54 w150,52 K90,108 F84,128 k106,108 f113,128';
const LIE = 'H152,121 N140,123 P100,124 ';
const CAT = 'N140,98 P82,98 E140,113 W140,128 K82,127 F57,127 ';
const SEAT = 'H94,70 N92,82 P88,124 E80,104 W72,125 K120,117 F150,112 k118,124 f146,126 ';
const CHAIR = 'H94,40 N92,52 P90,92 E100,74 W112,88 K116,94 F116,124 ';
const HINGE = 'H138,58 N127,63 P92,80 K100,104 F100,126 T110,128 ';

const POSES = {
  pull:   { p: [HD, HU], d: 1.2, pr: 'bar' },
  scap:   { p: [HD, 'H100,43 N100,55 P100,93 E90,38 W86,22 e110,38 w114,22 K96,111 F98,129 k104,111 f102,129'], d: 1.5, pr: 'bar' },
  knee:   { p: ['H108,46 N100,58 P100,96 E100,40 W100,22 K100,114 F100,132', 'H108,48 N100,60 P98,94 E100,41 W100,22 K118,82 F114,102'], d: 1.2, pr: 'bar' },
  push:   { p: [PU, PD], d: 1.1, pr: 'floor' },
  dia:    { p: [PU, PD], d: 1.5, pr: 'floor' },
  pike:   { p: ['H134,108 N124,98 P95,68 E130,113 W134,128 K78,97 F60,126', 'H136,121 N122,110 P95,72 E118,118 W134,128 K78,99 F60,126'], d: 1.3, pr: 'floor' },
  touch:  { p: [PU, 'H143,92 N130,98 P86,112 E120,108 W127,99 e133,113 w135,128 K63,119 F40,126'], d: .8, pr: 'floor' },
  hollow: { p: ['H142,106 N130,113 P100,123 E146,104 W164,99 K75,118 F50,110', 'H142,104 N130,112 P100,123 E146,102 W164,96 K75,117 F50,107'], d: 2, pr: 'floor' },
  box:    { p: [BG, JAB, BG, CRS], d: .4, pr: 'floor' },
  bag:    { p: [BG, JAB, BG, CRS], d: .35, pr: 'bag' },
  bridge: { p: [LIE + 'E126,126 W112,127 K80,104 F66,127 k82,108 f60,98', 'H152,121 N140,121 P100,104 E126,126 W112,127 K79,99 F66,127 k78,96 f56,88'], d: 1.3, pr: 'floor' },
  legr:   { p: [LIE + 'E122,126 W104,127 K75,123 F50,122', LIE + 'E122,126 W104,127 K99,100 F98,76'], d: 1.6, pr: 'floor' },
  sup:    { p: ['H153,120 N140,122 P100,124 E158,123 W176,123 K75,125 F50,125', 'H154,115 N140,119 P100,124 E160,115 W178,108 K75,121 F51,113'], d: 1.6, pr: 'floor' },
  side:   { p: ['H146,100 N136,108 P90,122 E136,127 W156,127 e114,108 w98,116 K67,125 F44,127', 'H146,99 N136,108 P90,106 E136,127 W156,127 e114,98 w96,104 K67,117 F44,127'], d: 1.3, pr: 'floor' },
  bug:    { p: [LIE + 'E140,107 W140,91 e142,107 w142,91 K100,102 F80,102 k102,102 f82,102', LIE + 'E156,113 W172,110 e142,107 w142,91 K100,102 F80,102 k80,114 f56,118', LIE + 'E140,107 W140,91 e142,107 w142,91 K100,102 F80,102 k102,102 f82,102', LIE + 'E142,107 W142,91 e156,113 w172,110 K78,114 F55,118 k102,102 f82,102'], d: 1.1, pr: 'floor' },
  circ:   { p: [ST + 'E95,26 W91,8 e105,26 w109,8', ST + 'E82,44 W64,44 e118,44 w136,44', ST + 'E93,62 W89,80 e107,62 w111,80', ST + 'E82,44 W64,44 e118,44 w136,44'], d: .55, pr: 'floor' },
  cat:    { p: [CAT + 'M111,82 H151,110', CAT + 'M111,108 H153,90'], d: 1.8, pr: 'floor' },
  alpha:  { p: [SEAT + 'T156,101', SEAT + 'T162,111', SEAT + 'T156,121', SEAT + 'T162,111'], d: .7, pr: 'floor' },
  towel:  { p: [CHAIR + 'T127,127', CHAIR + 'T123,123'], d: .8, pr: 'chair' },
  calf:   { p: ['H104,34 N100,46 P100,82 E112,60 W126,62 K100,104 F100,124 T110,128', 'H105,26 N101,38 P101,74 E112,52 W126,54 K101,96 F103,116 T110,128'], d: 1.2, pr: 'wall' },
  /* kettlebell */
  kbdl:   { p: [SS + 'E102,62 W104,82 B104,90', HINGE + 'E128,82 W128,100 B128,108'], d: 1.3, pr: 'floor' },
  kbrow:  { p: ['H141,70 N130,72 P92,82 K100,104 F100,126 T110,128 E130,90 W130,108 B130,116 e118,86 w104,98', 'H141,70 N130,72 P92,82 K100,104 F100,126 T110,128 E114,64 W122,82 B122,90 e118,86 w104,98'], d: 1.2, pr: 'floor' },
  kbpress:{ p: [ST + 'E86,58 W92,44 B92,38 e112,66 w106,82', ST + 'E94,26 W90,8 B90,2 e112,66 w106,82'], d: 1.3, pr: 'floor' },
  kbbridge:{ p: [LIE + 'E118,116 W104,112 B100,116 K80,104 F66,127', 'H152,121 N140,121 P100,104 E118,106 W104,96 B100,98 K79,99 F66,127'], d: 1.3, pr: 'floor' },
  kbhold: { p: [ST + 'E88,64 W86,84 B86,92 e112,64 w114,84', 'H101,30 N100,44 P100,84 K95,106 F93,128 k105,106 f107,128 E88,64 W86,85 B86,93 e112,63 w114,83'], d: 2, pr: 'floor' },
  kbswing:{ p: ['H134,58 N124,62 P90,82 K100,104 F100,126 T110,128 E112,84 W100,100 B98,108', 'H104,34 N100,46 P100,84 K100,106 F100,126 T110,128 E118,48 W138,48 B146,48'], d: .9, pr: 'floor' },
  goblet: { p: [SS + 'E108,58 W110,50 B114,52', 'H100,54 N94,66 P80,106 K108,106 F100,126 T110,128 E108,80 W112,72 B116,74'], d: 1.6, pr: 'floor' },
  /* soğuma */
  dbbench:{ p: ['H160,86 N146,90 P104,90 K82,98 F78,128 T88,128 E134,100 W140,80 D140,78', 'H160,86 N146,90 P104,90 K82,98 F78,128 T88,128 E144,70 W143,50 D143,48'], d: 1.4, pr: 'bench' },
  dbrow:  { p: ['H150,64 N138,70 P96,72 K90,100 F88,128 T98,128 k96,94 f74,94 e140,84 w142,94 E138,90 W138,108 D138,110', 'H150,64 N138,70 P96,72 K90,100 F88,128 T98,128 k96,94 f74,94 e140,84 w142,94 E120,62 W126,80 D126,82'], d: 1.3, pr: 'bench' },
  dbpress:{ p: ['H100,38 N100,52 P100,90 K128,92 F130,128 T140,128 E86,58 W90,40 D90,38 e114,58 w110,40 d110,38', 'H100,38 N100,52 P100,90 K128,92 F130,128 T140,128 E94,32 W94,12 D94,10 e106,32 w106,12 d106,10'], d: 1.4, pr: 'bench' },
  dbrear: { p: [HINGE + 'E128,80 W128,98 D128,100', HINGE + 'E118,62 W106,56 D106,54'], d: 1.3, pr: 'floor' },
  dbcurl: { p: [ST + 'E100,66 W102,86 D102,88', ST + 'E100,66 W114,52 D114,50'], d: 1.3, pr: 'floor' },
  dbtri:  { p: [ST + 'E104,22 W104,4 D104,2 e106,22 w105,5', ST + 'E106,22 W92,36 D92,38 e108,22 w94,36'], d: 1.4, pr: 'floor' },
  facepull:{ p: [ST + 'E116,46 W130,44', ST + 'E86,40 W104,34'], d: 1.3, pr: 'wall' },
  ringrow:{ p: ['H138,96 N126,100 P88,114 K69,121 F50,127 T56,128 E128,84 W130,68', 'H131,70 N120,80 P86,104 K68,116 F50,127 T56,128 E106,82 W130,68'], d: 1.3, pr: 'rings' },
  dip:    { p: ['H100,16 N100,30 P100,70 E98,46 W100,64 K96,94 F80,104', 'H103,34 N100,48 P98,86 E82,48 W100,64 K94,110 F78,118'], d: 1.4, pr: 'dip' },
  thrust: { p: ['H170,90 N158,92 P126,94 K102,96 F100,128 T110,128 E146,98 W132,96', 'H170,90 N158,92 P124,116 K102,104 F100,128 T110,128 E146,104 W130,112'], d: 1.4, pr: 'bench' },
  dbthrust:{ p: ['H170,90 N158,92 P126,94 K102,96 F100,128 T110,128 E142,98 W128,90 D126,88', 'H170,90 N158,92 P124,116 K102,104 F100,128 T110,128 E142,110 W128,110 D126,108'], d: 1.4, pr: 'bench' },
  dbrdl:  { p: [SS + 'E102,62 W104,82 D104,84', HINGE + 'E128,82 W128,100 D128,102'], d: 1.5, pr: 'floor' },
  legcurl:{ p: [LIE + 'E126,126 W112,127 K75,124 F50,124 T44,126', 'H152,121 N140,121 P100,110 E126,126 W112,127 K78,96 F84,124 T78,126'], d: 1.5, pr: 'floor' },
  child:  { p: ['H128,121 N118,118 P72,112 E140,124 W158,126 K90,127 F66,128', 'H128,120 N118,116 P74,110 E140,123 W158,126 K90,127 F66,128'], d: 2.5, pr: 'floor' },
  chest:  { p: [SS + 'E86,44 W72,42', 'H108,30 N103,42 P99,82 K99,106 F100,126 T110,128 E88,44 W72,42'], d: 2.5, pr: 'wallL' },
  cross:  { p: [ST + 'E116,48 W132,48 e110,60 w114,48', ST + 'E118,46 W134,44 e110,58 w115,46'], d: 2.5, pr: 'floor' },
  ham:    { p: [LIE + 'E128,108 W104,84 K99,100 F98,76 k75,123 f50,122', LIE + 'E128,106 W108,86 K104,101 F110,78 k75,123 f50,122'], d: 2.5, pr: 'floor' },
  fig4:   { p: [LIE + 'E124,112 W104,104 K98,100 F78,104 k108,104 f96,96', LIE + 'E124,110 W108,100 K106,98 F86,100 k114,100 f102,92'], d: 2.5, pr: 'floor' },
  /* vücut ağırlığı (mat) */
  squat:  { p: [SS + 'E116,46 W132,46', 'H104,54 N100,66 P80,104 K108,104 F100,126 T110,128 E118,68 W134,66'], d: 1.4, pr: 'floor' },
  revlunge:{ p: [SS + 'E110,62 W100,80', 'H103,48 N100,60 P98,98 E110,76 W100,94 K118,104 F116,126 T126,128 k84,122 f62,126 t52,128'], d: 1.4, pr: 'floor' },
  kneepush:{ p: ['H143,92 N130,98 P92,114 E131,113 W132,128 K70,127 F48,118', 'H143,112 N130,118 P92,122 E117,118 W132,128 K70,127 F48,118'], d: 1.2, pr: 'floor' },
  kneetouch:{ p: ['H143,92 N130,98 P92,114 E131,113 W132,128 K70,127 F48,118', 'H143,92 N130,98 P92,114 E120,108 W127,99 e133,113 w135,128 K70,127 F48,118'], d: .9, pr: 'floor' },
  birddog:{ p: ['N140,98 P82,98 H151,94 E140,113 W140,128 K82,127 F57,127', 'N140,98 P82,98 H152,93 E160,96 W178,94 e142,113 w142,128 K82,127 F57,127 k60,98 f36,98', 'N140,98 P82,98 H151,94 E140,113 W140,128 K82,127 F57,127', 'N140,98 P82,98 H152,93 E140,113 W140,128 e160,96 w178,94 K60,98 F36,98 k84,127 f59,127'], d: 1.3, pr: 'floor' },
  bridge2:{ p: [LIE + 'E126,126 W112,127 K80,104 F66,127', 'H152,121 N140,121 P100,104 E126,126 W112,127 K79,99 F66,127'], d: 1.3, pr: 'floor' },
  plank:  { p: ['H146,104 N134,110 P88,116 E134,127 W152,127 K64,121 F40,126', 'H146,103 N134,109 P88,114 E134,127 W152,127 K64,120 F40,126'], d: 2, pr: 'floor' },
  dog:    { p: ['H128,112 N122,100 P95,66 E130,114 W136,128 K78,96 F62,126', 'H127,114 N121,102 P94,63 E129,115 W136,128 K78,95 F62,126'], d: 2.2, pr: 'floor' },
  cobra:  { p: ['H153,120 N140,122 P100,124 E146,126 W148,127 K75,125 F50,125', 'H152,96 N140,104 P100,124 E146,116 W150,127 K75,125 F50,125'], d: 2, pr: 'floor' },
  march:  { p: ['H100,30 N100,44 P100,84 E92,62 W90,80 e108,62 w110,80 K95,106 F93,128 k105,106 f107,128', 'H100,30 N100,44 P100,84 E92,62 W90,80 e108,58 w112,48 K94,92 F94,112 k105,106 f107,128', 'H100,30 N100,44 P100,84 E92,62 W90,80 e108,62 w110,80 K95,106 F93,128 k105,106 f107,128', 'H100,30 N100,44 P100,84 E92,58 W88,48 e108,62 w110,80 K95,106 F93,128 k106,92 f106,112'], d: .5, pr: 'floor' }
};

const EX = {
  circ:   { name: 'Kol ve omuz çevirme', tip: 'Öne ve geriye, büyük daireler', anim: 'circ' },
  cat:    { name: 'Kedi-deve', tip: 'Dört ayak üstünde, sırtı yavaşça yukarı-aşağı', anim: 'cat', eq: 'mat' },
  shadow: { name: 'Gölge boksu', tip: 'Ayaklar sabit, pivot yok', anim: 'box' },
  hang:   { name: 'Barda asılı kal', tip: 'Omuzları hafifçe aşağı çek, inerken sandalyeye bas', anim: 'scap', eq: 'bar' },
  pull:   { name: 'Barfiks', tip: 'Tam tekrarlar bitince kalanı negatif yap: sandalyeyle çık, 3–5 sn\'de in', anim: 'pull', eq: 'bar', track: 'pull' },
  push:   { name: 'Şınav', tip: 'Gövde dümdüz, göğüs yere yakın', anim: 'push' },
  knee:   { name: 'Asılı diz çekme', tip: 'Sallanmadan, dizler göğse', anim: 'knee', eq: 'bar' },
  pike:   { name: 'Pike şınav', tip: 'Kalça yukarıda, baş ellerin arasına iner', anim: 'pike' },
  touch:  { name: 'Plank omuza dokunma', tip: 'Kalça sallanmasın', anim: 'touch' },
  dia:    { name: 'Elmas şınav', tip: 'Eller göğüs altında, baklava şekli', anim: 'dia' },
  hollow: { name: 'Hollow hold', tip: 'Bel yere yapışık, kollar ve bacaklar uzakta', anim: 'hollow', eq: 'mat' },
  bridge1:{ name: 'Tek bacak glute bridge', tip: 'Kalçayı sık, beli zorlama', anim: 'bridge', eq: 'mat' },
  legr:   { name: 'Sırtüstü bacak kaldırma', tip: 'Bel yerden kalkmasın', anim: 'legr', eq: 'mat' },
  sup:    { name: 'Superman tutma', tip: 'Kollar ve bacaklar yerden hafif kalkık', anim: 'sup', eq: 'mat' },
  side:   { name: 'Yan plank + kalça kaldırma', tip: 'Omuz dirseğin üstünde', anim: 'side', eq: 'mat' },
  bug:    { name: 'Dead bug', tip: 'Karşı kol ve bacak, yavaş', anim: 'bug', eq: 'mat' },
  alpha:  { name: 'Ayakla alfabe', tip: 'Sadece ağrısız aralıkta', anim: 'alpha' },
  towel:  { name: 'Havlu kıvırma', tip: 'Parmaklarla havluyu kendine çek', anim: 'towel' },
  calf:   { name: 'Parmak ucuna kalkma', tip: 'Duvara tutunarak, iki ayakla, yavaş', anim: 'calf' },
  kbdl:   { name: 'Kettlebell deadlift', tip: 'Kalçadan menteşe, sırt düz, dizler hafif bükük', anim: 'kbdl', eq: 'kb' },
  kbrow:  { name: 'Tek kol kettlebell row', tip: 'Dirsek geriye, gövde sabit, boştaki el dizde', anim: 'kbrow', eq: 'kb' },
  kbpress:{ name: 'Tek kol omuz press', tip: 'Karın sıkı, bel boşluğu yapma', anim: 'kbpress', eq: 'kb' },
  kbbridge:{ name: 'Kettlebell\'li glute bridge', tip: 'Kettlebell kalça üstünde, iki elle tut', anim: 'kbbridge', eq: 'kb' },
  kbhold: { name: 'Tek el kettlebell tutma', tip: 'Dik dur, gövde yana eğilmesin', anim: 'kbhold', eq: 'kb' },
  kbswing:{ name: 'Kettlebell swing', tip: 'Güç kalçadan gelir, kollar sadece taşır', anim: 'kbswing', eq: 'kb', flag: 'cleared' },
  goblet: { name: 'Goblet squat', tip: 'Topuklar yerde, ağrısız derinliğe kadar', anim: 'goblet', eq: 'kb', flag: 'cleared' },
  dbbench:{ name: 'Dambıl bench press', tip: 'Kürek kemikleri sehpaya yapışık, dambılları göğüs hizasına indir', anim: 'dbbench', eq: ['db', 'bench'] },
  dbrow:  { name: 'Sehpada tek kol dambıl row', tip: 'Bir el ve diz sehpada, dirseği kalçaya doğru çek', anim: 'dbrow', eq: ['db', 'bench'] },
  dbpress:{ name: 'Oturarak dambıl omuz press', tip: 'Sırt dik, karın sıkı, dambılları başın üstünde birleştir', anim: 'dbpress', eq: ['db', 'bench'] },
  dbrear: { name: 'Arka omuz açışı', tip: 'Öne eğil, sırt düz, hafif ağırlıkla kolları yana aç', anim: 'dbrear', eq: 'db' },
  dbcurl: { name: 'Dambıl biceps curl', tip: 'Dirsekler gövdede sabit, sallanmadan', anim: 'dbcurl', eq: 'db' },
  dbtri:  { name: 'Baş üstü triceps uzatma', tip: 'Tek dambılı iki elle tut, dirsekler öne bakar', anim: 'dbtri', eq: 'db' },
  bandpull:{ name: 'Bantlı barfiks', tip: 'Bandı bara bağla, dizini ya da ayağını banda koy; tepede çene barın üstünde', anim: 'pull', eq: ['bar', 'band'] },
  facepull:{ name: 'Bantlı face pull', tip: 'Bandı göz hizasına bağla, ipi yüzüne çek, dirsekler yukarıda', anim: 'facepull', eq: 'band' },
  ringrow:{ name: 'Halkada row', tip: 'Gövde dümdüz, göğsü halkalara çek; ayakları ileri aldıkça zorlaşır', anim: 'ringrow', eq: 'rings' },
  dip:    { name: 'Dips', tip: 'Omuzlar aşağıda, dirsek 90 dereceye kadar in; gövde hafif öne', anim: 'dip', eq: 'dip' },
  dbsquat:{ name: 'Dambıl goblet squat', tip: 'Tek dambılı göğüste dik tut, topuklar yerde, kalça geriye', anim: 'goblet', eq: 'db' },
  thrust: { name: 'Sehpada hip thrust', tip: 'Kürek kemikleri sehpa kenarında, kalçayı sık, tepede 1 sn bekle', anim: 'thrust', eq: 'bench' },
  dbthrust:{ name: 'Dambıllı hip thrust', tip: 'Dambıl kalçanın üstünde, iki elle tut; tepede kalçayı sık', anim: 'dbthrust', eq: ['db', 'bench'] },
  dbrdl:  { name: 'Dambıl Romanian deadlift', tip: 'Dizler hafif bükük, kalçayı geriye it, dambıllar bacağa yakın', anim: 'dbrdl', eq: 'db' },
  legcurl:{ name: 'Havluyla bacak bükme', tip: 'Topuklar havluda, kalça havada, havluyu kendine çek', anim: 'legcurl', eq: 'mat' },
  bag:    { name: 'Torba', tip: 'Ayaklar sabit, pivot yok', anim: 'bag', eq: 'bag' },
  child:  { name: 'Çocuk pozu', tip: 'Kalça topuklara, kollar ileri, derin nefes', anim: 'child', eq: 'mat' },
  chest:  { name: 'Göğüs esnetme', tip: 'Kol duvarda omuz hizasında, gövdeyi hafif öne çevir', anim: 'chest' },
  cross:  { name: 'Omuz çapraz esnetme', tip: 'Kolu göğsün önünden karşıya çek', anim: 'cross' },
  ham:    { name: 'Arka bacak esnetme', tip: 'Sırtüstü, havluyla bacağı yukarı çek, diz düz', anim: 'ham', eq: 'mat' },
  fig4:   { name: 'Kalça esnetme (4 figürü)', tip: 'Ayak bileği karşı dizin üstünde, bacağı göğse çek', anim: 'fig4', eq: 'mat' },
  squat:  { name: 'Squat', tip: 'Topuklar yerde, kalça geriye, dizler ayak uçları yönünde', anim: 'squat' },
  revlunge:{ name: 'Geriye hamle (lunge)', tip: 'Arka diz yere yaklaşır, ön diz ayak bileğinin üstünde', anim: 'revlunge', eq: 'mat' },
  kneepush:{ name: 'Diz üstü şınav', tip: 'Dizlerden başa düz çizgi, göğüs yere yaklaşır', anim: 'kneepush', eq: 'mat' },
  kneetouch:{ name: 'Diz üstü plank omuza dokunma', tip: 'Kalça sallanmasın, yavaş', anim: 'kneetouch', eq: 'mat' },
  birddog:{ name: 'Bird dog', tip: 'Karşı kol ve bacak uzanır, bel sabit', anim: 'birddog', eq: 'mat' },
  plank:  { name: 'Dirsek plank', tip: 'Karın ve kalça sıkı, bel çökmesin', anim: 'plank', eq: 'mat' },
  dog:    { name: 'Aşağı bakan köpek', tip: 'Kalça yukarıda, topuklar yere doğru, sırt uzun', anim: 'dog', eq: 'mat' },
  cobra:  { name: 'Kobra', tip: 'Kalça yerde, göğsü yavaşça kaldır, omuzlar aşağıda', anim: 'cobra', eq: 'mat' },
  march:  { name: 'Yerinde yürüyüş', tip: 'Dizleri kaldır, kolları salla', anim: 'march' },
  hollowk:{ name: 'Hollow (dizler bükük)', tip: 'Bel yere yapışık, zorlanırsan kolları yanda tut', anim: 'hollow', eq: 'mat' },
  negpull:{ name: 'Negatif barfiks', tip: 'Sandalyeyle tepeye çık, 4–5 sn\'de yavaşça in, altta kollar tam açılsın', anim: 'pull', eq: 'bar' },
  scappull:{ name: 'Kürek kemiği çekişi', tip: 'Kollar düz asılı, sadece omuzları aşağı-geri çek, 1 sn tut', anim: 'scap', eq: 'bar' },
  bridge2:{ name: 'Glute bridge', tip: 'İki ayak yerde, kalçayı sık, tepede 1 sn bekle', anim: 'bridge2', eq: 'mat' }
};

/* KOLAY VERSİYON: antrenman sırasında "Kolaylaştır"a basınca o hareket, o antrenman boyunca bununla değişir.
   Sadece programda zaten olan, daha hafif ve ayak bileğini zorlamayan hareketler. */
const EASY = { push: 'kneepush', dia: 'kneepush', pike: 'kneepush', touch: 'kneetouch', hollow: 'hollowk', knee: 'legr', legr: 'bug', sup: 'birddog',
  side: 'plank', bridge1: 'bridge2', squat: 'bridge2', revlunge: 'bridge2', kbswing: 'kbdl', goblet: 'kbdl', kbpress: 'kbhold', negpull: 'scappull', dbbench: 'push', dbpress: 'pike', bandpull: 'scappull', dip: 'push', dbthrust: 'thrust', thrust: 'bridge2' };
for (const k in EASY) EX[k].easy = EASY[k];

const WARM  = [{ ex: 'circ', sec: 40 }, { ex: 'cat', sec: 40 }, { ex: 'shadow', sec: 30 }, { ex: 'hang', sec: 20 }];
const ANKLE = [{ ex: 'alpha', sec: 60 }, { ex: 'towel', sec: 60 }, { ex: 'calf', reps: '15 tekrar' }, { rest: 30 }, { ex: 'calf', reps: '15 tekrar' }, { rest: 30 }, { ex: 'calf', reps: '15 tekrar' }];
const COOL  = [{ ex: 'child', sec: 40 }, { ex: 'chest', sec: 30, side: 'sağ' }, { ex: 'chest', sec: 30, side: 'sol' }, { ex: 'cross', sec: 30, side: 'sağ' }, { ex: 'cross', sec: 30, side: 'sol' }, { ex: 'ham', sec: 30, side: 'sağ' }, { ex: 'ham', sec: 30, side: 'sol' }, { ex: 'fig4', sec: 30, side: 'sağ' }, { ex: 'fig4', sec: 30, side: 'sol' }];
const COMBOS = ['Jab-cross', 'Jab-cross-hook', 'Gövdeye 2, kafaya 1', 'Jab-jab-cross', 'Serbest, tempo yüksek'];

const DAYS = {
  A: { title: 'Üst vücut devresi', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 5, 3: 6, 5: 7 }), rest: byWeek({ 1: 90, 2: 75, 4: 60 }), items: [
      { ex: 'pull', reps: '5 tekrar' }, { ex: 'push', reps: '12–15 tekrar' }, { ex: 'knee', reps: '10 tekrar' }, { ex: 'pike', reps: '8 tekrar' }, { ex: 'touch', reps: '20 dokunuş' }] }] },
  B: { title: 'EMOM', blocks: [
    { type: 'emom', minutes: byWeek({ 1: 20, 3: 24, 5: 28 }), items: [
      { ex: 'pull', reps: '4–6 tekrar' }, { ex: 'dia', reps: '10–12 tekrar' }, { ex: 'hollow', reps: '30 sn tut' }, { ex: 'shadow', alt: 'bag', reps: '40 sn tam gaz, kalan 20 sn dinlen' }] }] },
  C: { title: 'Kalça + karın', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4 }), rest: () => 45, restLast: true, items: [
      { ex: 'bridge1', reps: '12 + 12' }, { ex: 'legr', reps: '15 tekrar' }, { ex: 'sup', sec: 30 }, { ex: 'side', reps: '10 + 10' }, { ex: 'bug', reps: '12 + 12' }] },
    { type: 'circuit', name: 'Bitiriş', rounds: () => 3, rest: () => 30, items: [{ ex: 'shadow', alt: 'bag', sec: 60, note: 'jab-cross-hook' }] }] },
  D: { title: 'Kettlebell', needs: 'kb', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4, 5: 5 }), rest: byWeek({ 1: 90, 3: 75 }), items: [
      { ex: 'kbdl', reps: '10 tekrar' }, { ex: 'kbrow', reps: '10 + 10' }, { ex: 'kbpress', reps: '8 + 8' }, { ex: 'kbbridge', reps: '15 tekrar' }, { ex: 'kbswing', reps: '15 tekrar' }, { ex: 'goblet', reps: '10 tekrar' }, { ex: 'kbhold', sec: 60, note: '30 sn sağ, 30 sn sol' }] }] },
  H: { title: 'Kas: sırt, omuz, göğüs', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4, 5: 5 }), rest: byWeek({ 1: 90, 4: 75 }), items: [
      { ex: 'negpull', alt: 'bandpull', reps: '4 tekrar' }, { ex: 'push', alt: 'dbbench', reps: '10–12 tekrar, 3 sn\'de in' }, { ex: 'kbrow', alt: 'dbrow', reps: '10 + 10' }, { ex: 'pike', alt: 'dbpress', reps: '8–10 tekrar' },
      { ex: 'scappull', alt: 'ringrow', reps: '10 tekrar' }, { ex: 'kbpress', reps: '8 + 8' }, { ex: 'facepull', reps: '15 tekrar' }, { ex: 'dbrear', reps: '12–15 tekrar' }, { ex: 'dbcurl', reps: '10–12 tekrar' }, { ex: 'dbtri', reps: '10–12 tekrar' },
      { ex: 'dia', alt: 'dip', reps: 'Bitene kadar, formu bozmadan' }] }] },
  L: { title: 'Bacak, kalça + karın', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4 }), rest: byWeek({ 1: 75, 3: 60 }), items: [
      { ex: 'thrust', alt: 'dbthrust', reps: '12 tekrar' }, { ex: 'kbdl', alt: 'dbrdl', reps: '10–12 tekrar' }, { ex: 'legcurl', reps: '10 tekrar' },
      { ex: 'bridge1', reps: '10 + 10' }, { ex: 'side', reps: '10 + 10' }, { ex: 'bug', reps: '10 + 10' }] }] },
  T: { title: 'Torba raundu', needs: 'bag', extra: true, blocks: [
    { type: 'rounds', ex: 'bag', rounds: byWeek({ 1: 3, 3: 4, 5: 5 }), work: 180, rest: 60, combos: COMBOS }] },
  K: { title: 'Ayak bileği', extra: true, noWarm: true, noCool: true, blocks: [] },
  /* Nur — sadece yoga matı */
  N1: { title: 'Alt vücut + karın', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4 }), rest: byWeek({ 1: 60, 3: 45 }), items: [
      { ex: 'squat', alt: 'dbsquat', reps: '12 tekrar' }, { ex: 'revlunge', reps: '10 + 10' }, { ex: 'bridge2', alt: 'thrust', reps: '15 tekrar' }, { ex: 'dbrdl', reps: '10–12 tekrar' }, { ex: 'bug', reps: '10 + 10' }, { ex: 'plank', sec: 30 }] }] },
  N2: { title: 'Üst vücut + karın', blocks: [
    { type: 'circuit', rounds: byWeek({ 1: 3, 3: 4 }), rest: byWeek({ 1: 60, 3: 45 }), items: [
      { ex: 'kneepush', reps: '8–10 tekrar' }, { ex: 'sup', alt: 'ringrow', sec: 30 }, { ex: 'dbrow', reps: '10 + 10' }, { ex: 'kneetouch', reps: '16 dokunuş' }, { ex: 'facepull', reps: '12–15 tekrar' }, { ex: 'birddog', reps: '10 + 10' }, { ex: 'side', reps: '8 + 8' }] }] },
  N3: { title: 'Akış + kondisyon', blocks: [
    { type: 'circuit', name: 'Akış', rounds: () => 2, rest: () => 30, items: [
      { ex: 'cat', sec: 40 }, { ex: 'dog', sec: 30 }, { ex: 'cobra', sec: 30 }, { ex: 'child', sec: 30 }] },
    { type: 'emom', minutes: byWeek({ 1: 12, 3: 16, 5: 20 }), items: [
      { ex: 'squat', reps: '12 tekrar' }, { ex: 'kneepush', reps: '8 tekrar' }, { ex: 'bridge2', reps: '15 tekrar' }, { ex: 'hollowk', reps: '25 sn tut' }] }] }
};

/* ŞABLONLAR — bir profil bir şablonu kullanır: günleri, sırası, ekipmanı ve kuralları buradan gelir.
   rotation: haftalık sıra (uzunluğu = haftada kaç antrenman). ankle: ayak bileği rutini eklensin mi.
   Profiller (kişiler) uygulamanın içinden eklenir; DEFAULT_PROFILES ilk açılışta gelenler. */
const TEMPLATES = {
  ekipman: {
    name: 'Ekipmanlı: barfiks, kettlebell, torba + ayak bileği', days: ['A', 'B', 'C', 'D', 'H', 'L', 'T', 'K'], equip: ['bar', 'mat', 'kb', 'bag', 'bench', 'db', 'band', 'rings', 'dip'], flags: ['cleared'], warm: WARM, ankle: true, pull: true,
    rotation: eq => eq.kb ? ['A', 'H', 'D', 'L'] : ['A', 'H', 'B', 'L'],
    notes: ['Ayak bileği sakatlığından dönerken zıplama, derin çömelme ve hamle (lunge) yok. Barfiksten atlayarak inme, sandalyeye bas.',
      'Keskin ağrı ya da bir gecede inmeyen şişlik olursa ayak bileği hareketlerini bırak ve doktora sor.',
      'H günü kas için: hareketleri yavaş yap, son 1–2 tekrar zor gelmeli. Dambılda 10–12 tekrarı zor bitirebildiğin ağırlığı seç; hepsi kolaylaşınca ağırlığı artır. Kas gelişimi için günde yeterli protein al ve iyi uyu.',
      'Barfiks: A gününde her setten sonra kaç tekrar yaptığını gir. Bütün setlerde hedefi tutarsan seviye yükselir, iki antrenman üst üste tutmazsa bir iner.']
  },
  mat: {
    name: 'Yoga matı + isteğe bağlı ekipman', days: ['N1', 'N2', 'N3'], equip: ['mat', 'bench', 'db', 'band', 'rings'], eqOn: ['mat'], flags: [], warm: [{ ex: 'march', sec: 60 }, { ex: 'circ', sec: 40 }, { ex: 'cat', sec: 40 }], ankle: false, pull: false,
    rotation: () => ['N1', 'N2', 'N3'],
    notes: ['Haftada 3 gün, aralarda bir gün dinlen. Sıra: N1 – N2 – N3.',
      'Zorlanırsan tekrar sayısını azalt ya da dinlenmeyi uzat; formu bozmadan yapmak sayıdan önemli.',
      'Eklemde ya da belde keskin ağrı olursa o hareketi atla.',
      'Ekipmanı Ayarlar\'dan açıp kapatabilirsin: sehpa, dambıl, direnç bandı, halka. Açınca ilgili hareketler programa kendiliğinden girer.',
      'Dambılda 10–12 tekrarı zorlanarak bitirebildiğin ağırlığı seç.']
  }
};

const DEFAULT_PROFILES = [{ id: 'baran', name: 'Baran', tpl: 'ekipman' }, { id: 'nur', name: 'Nur', tpl: 'mat' }];

return { byWeek, EQUIP, FLAGS, POSES, EX, WARM, ANKLE, COOL, DAYS, TEMPLATES, DEFAULT_PROFILES };
})();
