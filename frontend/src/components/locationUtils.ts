export interface DistrictData {
  district: string;
  areas: string[];
}

export const DISTRICT_DATA: DistrictData[] = [
  { district: "Bagerhat", areas: ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollarhat", "Mongla", "Morelganj", "Rampal", "Sarankhola"] },
  { district: "Bandarban", areas: ["Ali Kadam", "Bandarban Sadar", "Lama", "Nakhoyngchari", "Rawanchari", "Ruma", "Thanchi"] },
  { district: "Barguna", areas: ["Amtali", "Bamna", "Barguna Sadar", "Betagi", "Patharghata"] },
  { district: "Barishal", areas: ["Agailjhara", "Babuganj", "Bakerganj", "Banari Para", "Gaurnadi", "Hizla", "Mehonjuri", "Muladi", "Rajapur", "Sariakandi", "Swandip", "Wazirpur"] },
  { district: "Bhola", areas: ["Bhola Sadar", "Burhanuddin", "Charfasson", "Dasmina", "Haliman", "Lakshmipur", "Manpura", "Tazumuddin"] },
  { district: "Bogura", areas: ["Bogura Sadar", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Sonatala"] },
  { district: "Brahmanbaria", areas: ["Ashuganj", "Brahmanbaria Sadar", "Kasba", "Nabinagar", "Nasirnagar", "Sarail", "Shibpur", "Susangaj"] },
  { district: "Chandpur", areas: ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab North", "Matlab South", "Shahrasti"] },
  { district: "Chattogram", areas: ["Anwara", "Brahmanpara", "Chandanaish", "Fatikchari", "Hathazari", "Lohagara", "Mirsharai", "Patiya", "Ranguni", "Sandwip", "Satkania", "Sitakunda"] },
  { district: "Chuadanga", areas: ["Chuadanga Sadar", "Domanpara", "Jibannagar", "Kumarkhali"] },
  { district: "Cox's Bazar", areas: ["Cox's Bazar Sadar", "Kutubdia", "Maheshkhali", "Ramu", "St. Martin", "Teknaf", "Ukhiya"] },
  { district: "Cumilla", areas: ["Barura", "Brahmanpara", "Chandina", "Chauddagram", "Cumilla Sadar", "Daudkandi", "Dhundhir", "Homna", "Laksar", "Manowar", "Meghna", "Muradnagar", "Nangalkot", "Titas"] },
  { district: "Dhaka", areas: ["Bangsal", "Dhamrai", "Dohar", "Keraniganj", "Nawabganj", "Savar"] },
  { district: "Dinajpur", areas: ["Birganj", "Biral", "Birampur", "Boipur", "Chirirbandar", "Dinajpur Sadar", "Ghoraghat", "Hakimpur", "Kaharole", "Koch Para", "Lalpur", "Nawabganj", "Parbatipur"] },
  { district: "Faridpur", areas: ["Bhanga", "Boalmari", "Charbhadrasan", "Faridpur Sadar", "Madhukhali", "Nagarkanda", "Saltha", "Sadarpur"] },
  { district: "Feni", areas: ["Chhagolnagar", "Feni Sadar", "Fulgazi", "Praharshadanga", "Sonagazi"] },
  { district: "Gaibandha", areas: ["Gaibandha Sadar", "Gobindaganj", "Palashbari", "Phulchari", "Sadullapur", "Sughatta"] },
  { district: "Gopalganj", areas: ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"] },
  { district: "Habiganj", areas: ["Ajmiriganj", "Baniyachong", "Chunarughat", "Habiganj Sadar", "Lakhai", "Madhupur", "Nabigram", "Sayni"] },
  { district: "Joypurhat", areas: ["Akkelpur", "Joypurhat Sadar", "Khetlal", "Panchbibi"] },
  { district: "Khagrachari", areas: ["Dighinala", "Khagrachari Sadar", "Lakshmichhari", "Mahalchari", "Manikchari", "Matiranga", "Panchhari", "Ramgarh"] },
  { district: "Khulna", areas: ["Batiaghata", "Dacope", "Dumuria", "Koyra", "Khulna Sadar", "Paikgachha", "Rupsa", "Terokhada"] },
  { district: "Kishoreganj", areas: ["Austagram", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Kishoreganj Sadar", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"] },
  { district: "Kushtia", areas: ["Kushtia Sadar", "Kumarkhali", "Mirpur", "Sheikher Jany", "Vhur"] },
  { district: "Lakshmipur", areas: ["Lakshmipur Sadar", "Radhanagar", "Rupganj"] },
  { district: "Lalmonirhat", areas: ["Aditmari", "Golang人间", "Kaliganj", "Lalmonirhat Sadar", "Patgram"] },
  { district: "Madaripur", areas: ["Kalkini", "Madaripur Sadar", "Rajoir", "Shibchar"] },
  { district: "Manikganj", areas: ["Daulatpur", "Ghior", "Harirampur", "Manikganj Sadar", "Saturia", "Shivalaya"] },
  { district: "Meherpur", areas: ["Meherpur Sadar", "Mujibnagar", "Naugaon"] },
  { district: "Mymensingh", areas: ["Bhaluka", "Dhobaura", "Gafargaon", "Haluaghat", "Ishwarganj", "Mymensingh Sadar", "Nakla", "Nandail", "Phulpur", "Trishal"] },
  { district: "Naogaon", areas: ["Badalgachi", "Manda", "Naogaon Sadar", "Niamatpur", "Pangsha", "Patnitala", "Raninagar", "Shahzadpur"] },
  { district: "Narail", areas: ["Kalia", "Narail Sadar"] },
  { district: "Narayanganj", areas: ["Araihazar", "Bandar", "Narayanganj Sadar", "Sonargaon"] },
  { district: "Narsingdi", areas: ["Belabo", "Monohardi", "Narsingdi Sadar", "Palash", "Shibpur"] },
  { district: "Natore", areas: ["Baliakhola", "Gurdaspur", "Lalpur", "Natore Sadar"] },
  { district: "Netrakona", areas: ["Atpara", "Barhatta", "Dharmapara", "Khalpara", "Madan", "Mohanganj", "Netrakona Sadar", "Puranakundi", "Titli"] },
  { district: "Nilphamari", areas: ["Dimla", "Domar", "Jaldhaka", "Nilphamari Sadar", "Saidpur"] },
  { district: "Noakhali", areas: ["Begumganj", "Chandpur", "Noakhali Sadar"] },
  { district: "Pabna", areas: ["Attohora", "Bera", "Bhangura", "Chatmohar", "Ishwardi", "Pabna Sadar", "Santhia", "Sujapur"] },
  { district: "Panchagar", areas: ["Atwari", "Badda", "Panchagar Sadar", "Tetulia"] },
  { district: "Parbatipur", areas: ["Parbatipur Sadar"] },
  { district: "Patuakhali", areas: ["Bauphal", "Dashmina", "Galachipa", "Kalapara", "Patuakhali Sadar", "Rangabali"] },
  { district: "Pirojpur", areas: ["Bhandaria", "Kawkhali", "Pirojpur Sadar", "Ziang"] },
  { district: "Rajbari", areas: ["Balia", "Goaria", "Pangsha", "Rajbari Sadar", "Sthal"] },
  { district: "Rajshahi", areas: ["Bagha", "Boxirhat", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Naopara", "Paba", "Pthala"] },
  { district: "Rangpur", areas: ["Badargonj", "Gangachara", "Haripur", "Khatakhali", "Mithapukur", "Pirgacha", "Rangpur Sadar", "Taragonj"] },
  { district: "Satkhira", areas: ["Assasuni", "Debhata", "Kalaroa", "Satkhira Sadar", "Shyamnagar", "Tala"] },
  { district: "Shariatpur", areas: ["Bhedarganj", "Damudya", "Ghosair", "Janjira", "Naria", "Shariatpur Sadar"] },
  { district: "Sherpur", areas: ["Jhenaigati", "Nakla", "Sherpur Sadar", "Sreebari"] },
  { district: "Sirajganj", areas: ["Belkuchi", "Chouhali", "Kamarkhand", "Khoksha", "Sirajganj Sadar", "Tarash", "Ullapara"] },
  { district: "Sunamganj", areas: ["Bishwab", "Chhatak", "Derai", "Dharampasha", "Gowainghat", "Jagannathpur", "Jamalganj", "Sulla", "Sunamganj Sadar", "Tahirpur"] },
  { district: "Sylhet", areas: ["Beanibazar", "Bishwanath", "Companiganj", "Daram", "Fenchuganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Osmani Nagar", "Sylhet Sadar", "Zowra"] },
  { district: "Tangail", areas: ["Basail", "Delduar", "Dhanbari", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Tangail Sadar"] },
  { district: "Thakurgaon", areas: ["Pirganj", "Ranisankail", "Thakurgaon Sadar"] },
];

export const DISTRICT_OPTIONS = DISTRICT_DATA.map((d) => ({ value: d.district, label: d.district }));

export function getAreasByDistrict(district: string): { value: string; label: string }[] {
  const found = DISTRICT_DATA.find((d) => d.district === district);
  if (!found) return [];
  return found.areas.map((a) => ({ value: a, label: a }));
}

export interface ResolvedAddress {
  street?: string;
  district?: string;
  area?: string;
}

export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<ResolvedAddress> => {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = (await response.json()) as {
    address?: {
      house_number?: string;
      road?: string;
      pedestrian?: string;
      neighbourhood?: string;
      suburb?: string;
      city?: string;
      town?: string;
      village?: string;
      municipality?: string;
      county?: string;
      state?: string;
      country?: string;
      postcode?: string;
    };
  };

  const address = data.address ?? {};
  const street = [
    address.house_number,
    address.road ||
      address.pedestrian ||
      address.neighbourhood ||
      address.suburb,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    street: street || undefined,
    district: address.county || address.state || undefined,
    area: address.city || address.town || address.village || address.municipality || undefined,
  };
};