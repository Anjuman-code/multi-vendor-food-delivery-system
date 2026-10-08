/**
 * Normalization utilities for food item names.
 *
 * Shared across:
 * - Data analysis & clustering scripts (scripts/analyze-menu-items.ts)
 * - Image processing and manifest building (scripts/build-food-images.ts)
 * - Runtime image resolver (frontend/src/utils/foodImage.ts)
 */

// Bengali script to standard transliterated Latin tokens
const BENGALI_TOKEN_MAP: Record<string, string> = {
  'ফুচকা': 'fuchka',
  'চটপটি': 'chotpoti',
  'সিঙ্গারা': 'shingara',
  'শিঙাড়া': 'shingara',
  'সমুচা': 'samosa',
  'সোমুচা': 'samosa',
  'খিচুড়ি': 'khichuri',
  'খিচুড়ি': 'khichuri',
  'বিরিয়ানি': 'biryani',
  'বিরিয়ানি': 'biryani',
  'কাচ্চি': 'kacchi',
  'তেহারি': 'tehari',
  'তেহারী': 'tehari',
  'পোলাও': 'polao',
  'চিকেন': 'chicken',
  'বিফ': 'beef',
  'মাটন': 'mutton',
  'বার্গার': 'burger',
  'পিজ্জা': 'pizza',
  'পিজা': 'pizza',
  'ফ্রাই': 'fry',
  'ফ্রাইড': 'fried',
  'ভুনা': 'bhuna',
  'ভুনাটি': 'bhuna',
  'রোস্ট': 'roast',
  'ডাল': 'daal',
  'দাল': 'daal',
  'আলু': 'aloo',
  'ভর্তা': 'bhorta',
  'বেগুন': 'begun',
  'ভাজা': 'fry',
  'শুঁটকি': 'shutki',
  'শুটকি': 'shutki',
  'বোরহানি': 'borhani',
  'বোরহানী': 'borhani',
  'নান': 'naan',
  'মোমো': 'momo',
  'নুডুলস': 'noodles',
  'চাউমিন': 'chowmein',
  'ঝাল': 'jhal',
  'মুড়ি': 'muri',
  'মুড়ি': 'muri',
  'পাকোড়া': 'pakora',
  'পাকোড়া': 'pakora',
  'ফ্রেঞ্চ': 'french',
  'ফ্রেন্স': 'french',
  'ফ্রাইস': 'fries',
  'স্যান্ডউইচ': 'sandwich',
  'স্যান্ডউইচস': 'sandwich',
  'হটডগ': 'hot dog',
  'কাবাব': 'kebab',
  'কাবাবের': 'kebab',
  'শিক': 'seekh',
  'টিক্কা': 'tikka',
  'বাটার': 'butter',
  'তন্দুরি': 'tandoori',
  'ব্রাউনি': 'brownie',
  'কেক': 'cake',
  'ওয়াফেল': 'waffle',
  'প্যানকেক': 'pancake',
  'আইসক্রিম': 'ice cream',
  'সালাদ': 'salad',
  'স্যুপ': 'soup',
  'সুপ': 'soup',
};

// Common English transliterations & phonetic variations to canonical form
const TRANSLITERATION_MAP: Record<string, string> = {
  // Kachchi / Kacchi
  'kachchi': 'kacchi',
  'kacci': 'kacchi',
  'kachi': 'kacchi',

  // Chotpoti / Chatpati
  'chotpotti': 'chotpoti',
  'chot-poti': 'chotpoti',
  'chatpati': 'chotpoti',
  'chotputi': 'chotpoti',

  // Fuchka / Phuchka / Puchka
  'phuchka': 'fuchka',
  'puchka': 'fuchka',
  'fuska': 'fuchka',
  'phoska': 'fuchka',
  'golgappa': 'fuchka',
  'panipuri': 'fuchka',

  // Shingara / Singara
  'singara': 'shingara',
  'singhada': 'shingara',
  'singra': 'shingara',

  // Bhuna / Vuna
  'vuna': 'bhuna',
  'voona': 'bhuna',

  // Tehari / Teheri / Tahari
  'teheri': 'tehari',
  'tahari': 'tehari',

  // Polao / Pulao / Pilau
  'pulao': 'polao',
  'pilau': 'polao',
  'pilaf': 'polao',

  // Khichuri / Khichri
  'khichri': 'khichuri',
  'khicuri': 'khichuri',

  // Borhani / Burhani
  'burhani': 'borhani',

  // Daal / Dal
  'dal': 'daal',
  'dhal': 'daal',

  // Naan
  'nan': 'naan',

  // Paratha / Porota
  'porota': 'paratha',
  'parota': 'paratha',

  // Momos
  'momos': 'momo',

  // Chowmein
  'chow mein': 'chowmein',
  'chow-mein': 'chowmein',

  // Paneer
  'panir': 'paneer',

  // Kebabs
  'kabab': 'kebab',
  'kababs': 'kebab',
  'kebabs': 'kebab',

  // Fries
  'french fries': 'fries',
  'french fry': 'fries',
};

// Words to strip (quantities, sizes, combos, portions, plates)
const STRIP_WORDS_REGEX = /\b(?:half|full|regular|large|small|medium|mini|quarter|1:1|1:2|1:3|1:4|combo|set\s+menu|set|deluxe|special|platter|plate|meal|portion|servings?|pcs?|pieces?|box|gm|kg|ml|ltr?)\b/gi;

/**
 * Normalizes a menu item name:
 * 1. Strips parenthetical text (e.g., "(6 pcs)", "(large)")
 * 2. Maps Bangla words to English tokens
 * 3. Removes size/portion/quantity/combo noise words
 * 4. Normalizes transliterations and phonetics
 * 5. Strips punctuation and collapses extra whitespace
 */
export function normalizeFoodName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName;

  // 1. Remove parenthetical expressions
  name = name.replace(/\([^)]*\)/g, ' ');
  name = name.replace(/\[[^\]]*\]/g, ' ');

  // 2. Replace Bangla tokens if present
  for (const [bangla, latin] of Object.entries(BENGALI_TOKEN_MAP)) {
    if (name.includes(bangla)) {
      name = name.split(bangla).join(` ${latin} `);
    }
  }

  // 3. Lowercase and normalize common punctuation
  name = name.toLowerCase();
  name = name.replace(/['’`]/g, ''); // e.g. chef's -> chefs
  name = name.replace(/[&]/g, ' and ');
  name = name.replace(/[-_/\\+]/g, ' ');

  // 4. Remove quantity patterns like "6pcs", "2 pc", "500gm", but keep dish numbers like "65" in Chicken 65
  name = name.replace(/\b\d+\s*(?:pcs?|pieces?|box|gm|kg|ml|l|ltr|pack)\b/gi, ' ');

  // 5. Remove size/portion/combo filler words
  name = name.replace(STRIP_WORDS_REGEX, ' ');

  // 6. Token-level transliteration normalization
  const rawTokens = name.split(/\s+/).filter(Boolean);
  const normalizedTokens = rawTokens.map((token) => TRANSLITERATION_MAP[token] || token);

  let result = normalizedTokens.join(' ');

  // Handle multi-word phrase replacements
  for (const [phrase, replacement] of Object.entries(TRANSLITERATION_MAP)) {
    if (phrase.includes(' ') && result.includes(phrase)) {
      result = result.split(phrase).join(replacement);
    }
  }

  // Final trim and whitespace collapse
  return result.replace(/\s+/g, ' ').trim();
}
