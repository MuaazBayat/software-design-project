// Centralized font imports using next/font to minimize layout shift (display: swap)
import { Inter, Lora, EB_Garamond, Patrick_Hand, Special_Elite, Caveat, Roboto_Mono, Merriweather, Open_Sans, Source_Sans_3, Kalam, Dancing_Script, Satisfy, Noto_Sans, Noto_Serif, Courier_Prime, Playfair_Display, Montserrat, Raleway, Poppins, Roboto, Cinzel, Amatic_SC, Indie_Flower, Shadows_Into_Light, 
  // Additional verified imports - Phase 1
  Oswald, Ubuntu, Nunito, Quicksand, Work_Sans, Heebo, Mulish, DM_Sans, Manrope, Inter_Tight, Figtree, Lexend, Outfit, Plus_Jakarta_Sans,
  Crimson_Text, Libre_Baskerville, Source_Serif_4, Vollkorn, Spectral, Old_Standard_TT, Cormorant, Cormorant_Garamond, Crimson_Pro,
  JetBrains_Mono, Fira_Code, Space_Mono, IBM_Plex_Mono, Source_Code_Pro, Anonymous_Pro, Overpass_Mono,
  Great_Vibes, Allura, Alex_Brush, Tangerine, Parisienne, Sacramento, Rochester, Yellowtail, Grand_Hotel, Kavoon,
  Bebas_Neue, Anton, Righteous, Bungee, Bungee_Shade, Bungee_Inline, Bungee_Outline, Orbitron, Audiowide, Russo_One,
  Pacifico, Comfortaa, Fredoka, Baloo_2, Chewy, Luckiest_Guy,   Bubblegum_Sans, Boogaloo,
  Architects_Daughter, Gloria_Hallelujah, Coming_Soon, Just_Another_Hand, Rancho, Covered_By_Your_Grace, Reenie_Beanie,
  Permanent_Marker, Rock_Salt, Calligraffitti, Homemade_Apple, Redressed, Gochi_Hand, Schoolbell, Crafty_Girls, The_Girl_Next_Door,
  Berkshire_Swash, La_Belle_Aurore, Meddon, Mr_De_Haviland, Norican, Stalemate, Swanky_and_Moo_Moo, Unkempt, Yesteryear,
  Abril_Fatface, Alike, Amarante, Amiri, Andada_Pro, Arvo, Asul, Atkinson_Hyperlegible, Averia_Sans_Libre,
  Bai_Jamjuree, Barlow, Barlow_Condensed, Barlow_Semi_Condensed, Baskervville, Be_Vietnam_Pro, Bellefair, Belleza,
  Bentham, Bitter, Bodoni_Moda, Bree_Serif, Caladea, Calistoga, Cambo, Cantarell, Cantata_One, Caprasimo,
  Cardo, Carrois_Gothic, Carrois_Gothic_SC, Catamaran, Chivo, Chonburi, Cinzel_Decorative, Cookie, Copse, Corben, Courgette, Crete_Round, Cuprum, Damion, David_Libre,
  Didact_Gothic, Domine, Dosis, Duru_Sans, Economica, El_Messiri, Encode_Sans,
  Encode_Sans_Condensed, Encode_Sans_Expanded, Encode_Sans_Semi_Condensed, Encode_Sans_Semi_Expanded, Englebert,
  Exo, Exo_2, Fanwood_Text, Fascinate, Faustina, Fjalla_One, Frank_Ruhl_Libre, Fraunces, Gabriela,
  Gentium_Book_Plus, Gentium_Plus, Gilda_Display, Goudy_Bookletter_1911, Graduate, Grandstander,
  Gruppo, Hammersmith_One, Hanuman, Happy_Monkey, Headland_One, Henny_Penny, Hind, IBM_Plex_Sans,
  IBM_Plex_Serif, Imbue, Inconsolata, Inknut_Antiqua, Italiana, Josefin_Sans, Josefin_Slab,
  Judson, Julee, Julius_Sans_One, Jura, Kameron, Karla, Khula,
  Klee_One, KoHo, Kosugi, Kosugi_Maru, Kreon, Laila, Lateef, Lato, League_Script, Lekton, Lexend_Deca,
  Lexend_Exa, Lexend_Giga, Lexend_Mega, Lexend_Peta, Lexend_Tera, Lexend_Zetta, Libre_Franklin, Lilita_One,
  Literata, Livvic, Lobster, Lobster_Two, Lustria, Macondo, Maitree, Major_Mono_Display, Mako, Mali,
  Marcellus, Marck_Script, Markazi_Text, Martel, Marvel, Mate, Mate_SC, Maven_Pro, MedievalSharp, Merienda,
  Metal, Metrophobic, Michroma, Milonga, Mirza, Mitr, Modak, Molengo, Monda, Montez,
  Montserrat_Alternates, Montserrat_Subrayada, Mouse_Memoirs, Mr_Bedfort, Mrs_Saint_Delafield, Mrs_Sheppards,
  Mukta, Nanum_Gothic, Nanum_Myeongjo, Nanum_Pen_Script, Neuton, News_Cycle,
  Newsreader, Niconne, Niramit, Nixie_One, Nobile, Noticia_Text, Noto_Color_Emoji, Noto_Emoji, Noto_Sans_Arabic,
  Noto_Sans_Display, Noto_Sans_Hebrew, Noto_Sans_JP, Noto_Sans_KR, Noto_Sans_SC, Noto_Sans_TC, Noto_Sans_Thai,
  Noto_Serif_Display, Noto_Serif_JP, Noto_Serif_KR, Noto_Serif_SC, Noto_Serif_TC, Noto_Serif_Thai, Nova_Cut,
  Nova_Flat, Nova_Mono, Nova_Oval, Nova_Round, Nova_Script, Nova_Slim, Nova_Square, Numans, Odibee_Sans,
  Odor_Mean_Chey, Offside, Oldenburg, Oleo_Script, Oleo_Script_Swash_Caps, Orbit, Orienta, Original_Surfer,
  Oxygen, PT_Mono, PT_Sans, PT_Sans_Caption, PT_Sans_Narrow,
  PT_Serif, PT_Serif_Caption, Padauk, Palanquin, Palanquin_Dark, Pangolin, Paprika,
  Passion_One, Pattaya, Paytone_One, Philosopher, Piedra, Pinyon_Script, Pirata_One, Plaster,
  Play, Playball, Playfair_Display_SC, Podkova, Poiret_One, Poller_One, Pompiere, Pontano_Sans, Prata,
  Preahvihear, Press_Start_2P, Pridi, Prosto_One, Puritan, Quantico, Quattrocento, Quattrocento_Sans,
  Questrial, Racing_Sans_One, Radley, Rajdhani,
  Ramabhadra, Ramaraja, Rambla, Rammetto_One, Ranchers, Ranga, Rasa, Rationale,
  Red_Hat_Display, Red_Hat_Text, Red_Rose, Reem_Kufi, Revalia, Rhodium_Libre,
  Ribeye, Ribeye_Marrow, Risque, Roboto_Condensed, Roboto_Slab, RocknRoll_One, Rokkitt, Romanesco, Ropa_Sans, Rosario, Rosarivo, Rouge_Script, Rowdies, Rye,
  STIX_Two_Text, Sahitya, Sail, Saira, Saira_Condensed, Saira_Extra_Condensed,
  Saira_Semi_Condensed, Saira_Stencil_One, Salsa, Sanchez, Sancreek, Sansita, Sarabun, Sarala,
  Sawarabi_Gothic, Sawarabi_Mincho, Scada, Scheherazade_New, Scope_One, Secular_One, Sedan, Sen, Sevillana, Seymour_One, Shanti, Share, Share_Tech, Share_Tech_Mono, Shippori_Antique, Shippori_Antique_B1, Shippori_Mincho,
  Shippori_Mincho_B1, Shojumaru, Short_Stack, Shrikhand, Sigmar_One, Signika, Signika_Negative, Simonetta,
  Single_Day, Sintony, Sirin_Stencil, Six_Caps, Slackey, Smokum, Smythe, Sniglet, Snippet, Snowburst_One,
  Sofadi_One, Solway, Song_Myung, Sono, Sora, Source_Sans_3 as Source_Sans_Pro,
  Source_Serif_4 as Source_Serif_Pro, Space_Grotesk, Spicy_Rice, Spinnaker, Squada_One, Sree_Krushnadevaraya, Sriracha,
  Staatliches, Stalinist_One, Stardos_Stencil, Stick, Stint_Ultra_Condensed, Stint_Ultra_Expanded,
  Stoke, Strait, Style_Script, Stylish, Sue_Ellen_Francisco, Suez_One, Sulphur_Point, Sumana, Sunflower,
  Sunshiney, Supermercado_One, Sura, Suranna, Suravaram, Syncopate, Tajawal, Taprom, Tauri, Teko, Telex, Tenali_Ramakrishna, Tenor_Sans,
  Text_Me_One, Thasadith, Tillana, Timmana, Tinos, Titan_One,
  Titillium_Web, Tomorrow, Trade_Winds, Trirong, Truculenta, Trykker, Tulpen_One, Ubuntu_Condensed, Ubuntu_Mono,
  Uncial_Antiqua, Underdog, Unica_One, UnifrakturCook, UnifrakturMaguntia, Unlock,
    Unna, Urbanist, Vampiro_One, Varela, Varela_Round, Varta, Vast_Shadow, Vujahday_Script, Wallpoet, Walter_Turncoat,
  Wellfleet, Wendy_One, Wire_One, Xanh_Mono, Yanone_Kaffeesatz, Yantramanav, Yatra_One, Yeseva_One, Yrsa, ZCOOL_KuaiLe,
  ZCOOL_QingKe_HuangYou, ZCOOL_XiaoWei, Zeyada, Zilla_Slab, Zilla_Slab_Highlight } from 'next/font/google'

export const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
export const lora = Lora({ subsets: ['latin'], variable: '--font-lora', display: 'swap' })
export const ebGaramond = EB_Garamond({ subsets: ['latin'], variable: '--font-ebgaramond', display: 'swap' })
export const patrickHand = Patrick_Hand({ subsets: ['latin'], weight: '400', variable: '--font-patrick-hand', display: 'swap' })
export const specialElite = Special_Elite({ subsets: ['latin'], weight: '400', variable: '--font-special-elite', display: 'swap' })
export const caveat = Caveat({ subsets: ['latin'], variable: '--font-caveat', display: 'swap' })
export const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono', display: 'swap' })
export const merriweather = Merriweather({ subsets: ['latin'], weight: ['300','400','700'], variable: '--font-merriweather', display: 'swap' })
export const openSans = Open_Sans({ subsets: ['latin'], weight: ['300','400','600','700'], variable: '--font-open-sans', display: 'swap' })
export const sourceSans3 = Source_Sans_3({ subsets: ['latin'], weight: ['300','400','600','700'], variable: '--font-source-sans3', display: 'swap' })
export const kalam = Kalam({ subsets: ['latin'], weight: '400', variable: '--font-kalam', display: 'swap' })
export const dancingScript = Dancing_Script({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-dancing-script', display: 'swap' })
export const satisfy = Satisfy({ subsets: ['latin'], weight: '400', variable: '--font-satisfy', display: 'swap' })
export const notoSans = Noto_Sans({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-noto-sans', display: 'swap' })
export const notoSerif = Noto_Serif({ subsets: ['latin'], weight: ['400','600','700'], variable: '--font-noto-serif', display: 'swap' })
export const courierPrime = Courier_Prime({ subsets: ['latin'], weight: ['400','700'], variable: '--font-courier-prime', display: 'swap' })
export const playfairDisplay = Playfair_Display({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-playfair-display', display: 'swap' })
export const montserrat = Montserrat({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-montserrat', display: 'swap' })
export const raleway = Raleway({ subsets: ['latin'], weight: ['300','400','500','600','700','800','900'], variable: '--font-raleway', display: 'swap' })
export const poppins = Poppins({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-poppins', display: 'swap' })
export const roboto = Roboto({ subsets: ['latin'], weight: ['300','400','500','700','900'], variable: '--font-roboto', display: 'swap' })
export const cinzel = Cinzel({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-cinzel', display: 'swap' })
export const amaticSC = Amatic_SC({ subsets: ['latin'], weight: ['400','700'], variable: '--font-amatic-sc', display: 'swap' })
export const indieFlower = Indie_Flower({ subsets: ['latin'], weight: '400', variable: '--font-indie-flower', display: 'swap' })
export const shadowsIntoLight = Shadows_Into_Light({ subsets: ['latin'], weight: '400', variable: '--font-shadows-into-light', display: 'swap' })

// Additional font variable assignments
export const oswald = Oswald({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-oswald', display: 'swap' })
export const ubuntu = Ubuntu({ subsets: ['latin'], weight: ['300','400','500','700'], variable: '--font-ubuntu', display: 'swap' })
export const nunito = Nunito({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800','900'], variable: '--font-nunito', display: 'swap' })
export const quicksand = Quicksand({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-quicksand', display: 'swap' })
export const workSans = Work_Sans({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-work-sans', display: 'swap' })
export const heebo = Heebo({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-heebo', display: 'swap' })
export const mulish = Mulish({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800','900'], variable: '--font-mulish', display: 'swap' })
export const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400','500','700'], variable: '--font-dm-sans', display: 'swap' })
export const manrope = Manrope({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800'], variable: '--font-manrope', display: 'swap' })
export const interTight = Inter_Tight({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-inter-tight', display: 'swap' })
export const figtree = Figtree({ subsets: ['latin'], weight: ['300','400','500','600','700','800','900'], variable: '--font-figtree', display: 'swap' })
export const lexend = Lexend({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-lexend', display: 'swap' })
export const outfit = Outfit({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-outfit', display: 'swap' })
export const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800'], variable: '--font-plus-jakarta-sans', display: 'swap' })
export const barlow = Barlow({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-barlow', display: 'swap' })
export const beVietnamPro = Be_Vietnam_Pro({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-be-vietnam-pro', display: 'swap' })
export const chivo = Chivo({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-chivo', display: 'swap' })
export const encodeSans = Encode_Sans({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-encode-sans', display: 'swap' })
export const exo = Exo({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-exo', display: 'swap' })
export const josefinSans = Josefin_Sans({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700'], variable: '--font-josefin-sans', display: 'swap' })
export const karla = Karla({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800'], variable: '--font-karla', display: 'swap' })
export const lato = Lato({ subsets: ['latin'], weight: ['100','300','400','700','900'], variable: '--font-lato', display: 'swap' })
export const oxygen = Oxygen({ subsets: ['latin'], weight: ['300','400','700'], variable: '--font-oxygen', display: 'swap' })
export const ptSans = PT_Sans({ subsets: ['latin'], weight: ['400','700'], variable: '--font-pt-sans', display: 'swap' })
export const rajdhani = Rajdhani({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-rajdhani', display: 'swap' })
export const redHatDisplay = Red_Hat_Display({ subsets: ['latin'], weight: ['300','400','500','600','700','800','900'], variable: '--font-red-hat-display', display: 'swap' })
export const redHatText = Red_Hat_Text({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-red-hat-text', display: 'swap' })
export const robotoCondensed = Roboto_Condensed({ subsets: ['latin'], weight: ['300','400','700'], variable: '--font-roboto-condensed', display: 'swap' })
export const saira = Saira({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-saira', display: 'swap' })
export const signika = Signika({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-signika', display: 'swap' })
export const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-space-grotesk', display: 'swap' })
export const tenorSans = Tenor_Sans({ subsets: ['latin'], weight: '400', variable: '--font-tenor-sans', display: 'swap' })
export const titilliumWeb = Titillium_Web({ subsets: ['latin'], weight: ['200','300','400','600','700','900'], variable: '--font-titillium-web', display: 'swap' })
export const ubuntuCondensed = Ubuntu_Condensed({ subsets: ['latin'], weight: '400', variable: '--font-ubuntu-condensed', display: 'swap' })
export const yanoneKaffeesatz = Yanone_Kaffeesatz({ subsets: ['latin'], weight: ['200','300','400','500','600','700'], variable: '--font-yanone-kaffeesatz', display: 'swap' })
export const libreFranklin = Libre_Franklin({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800','900'], variable: '--font-libre-franklin', display: 'swap' })

// Serif fonts
export const crimsonText = Crimson_Text({ subsets: ['latin'], weight: ['400','600','700'], variable: '--font-crimson-text', display: 'swap' })
export const libreBaskerville = Libre_Baskerville({ subsets: ['latin'], weight: '400', variable: '--font-libre-baskerville', display: 'swap' })
export const sourceSerif4 = Source_Serif_4({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800','900'], variable: '--font-source-serif-4', display: 'swap' })
export const vollkorn = Vollkorn({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-vollkorn', display: 'swap' })
export const spectral = Spectral({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800'], variable: '--font-spectral', display: 'swap' })
export const oldStandardTT = Old_Standard_TT({ subsets: ['latin'], weight: '400', variable: '--font-old-standard-tt', display: 'swap' })
export const cormorant = Cormorant({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-cormorant', display: 'swap' })
export const cormorantGaramond = Cormorant_Garamond({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-cormorant-garamond', display: 'swap' })
export const crimsonPro = Crimson_Pro({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800','900'], variable: '--font-crimson-pro', display: 'swap' })
export const domine = Domine({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-domine', display: 'swap' })
export const literata = Literata({ subsets: ['latin'], weight: ['400','500','600','700'], variable: '--font-literata', display: 'swap' })
export const marcellus = Marcellus({ subsets: ['latin'], weight: '400', variable: '--font-marcellus', display: 'swap' })
export const prata = Prata({ subsets: ['latin'], weight: '400', variable: '--font-prata', display: 'swap' })
export const zillaSlab = Zilla_Slab({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-zilla-slab', display: 'swap' })

// Monospace fonts
export const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700','800'], variable: '--font-jetbrains-mono', display: 'swap' })
export const firaCode = Fira_Code({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-fira-code', display: 'swap' })
export const spaceMono = Space_Mono({ subsets: ['latin'], weight: ['400','700'], variable: '--font-space-mono', display: 'swap' })
export const ibmPlexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['100','200','300','400','500','600','700'], variable: '--font-ibm-plex-mono', display: 'swap' })
export const sourceCodePro = Source_Code_Pro({ subsets: ['latin'], weight: ['200','300','400','500','600','700','800','900'], variable: '--font-source-code-pro', display: 'swap' })
export const anonymousPro = Anonymous_Pro({ subsets: ['latin'], weight: ['400','700'], variable: '--font-anonymous-pro', display: 'swap' })
export const overpassMono = Overpass_Mono({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-overpass-mono', display: 'swap' })
export const ptMono = PT_Mono({ subsets: ['latin'], weight: '400', variable: '--font-pt-mono', display: 'swap' })
export const ubuntuMono = Ubuntu_Mono({ subsets: ['latin'], weight: ['400','700'], variable: '--font-ubuntu-mono', display: 'swap' })
export const shareTechMono = Share_Tech_Mono({ subsets: ['latin'], weight: '400', variable: '--font-share-tech-mono', display: 'swap' })

// Display fonts
export const bebasNeue = Bebas_Neue({ subsets: ['latin'], weight: '400', variable: '--font-bebas-neue', display: 'optional' })
export const anton = Anton({ subsets: ['latin'], weight: '400', variable: '--font-anton', display: 'optional' })
export const righteous = Righteous({ subsets: ['latin'], weight: '400', variable: '--font-righteous', display: 'optional' })
export const bungee = Bungee({ subsets: ['latin'], weight: '400', variable: '--font-bungee', display: 'optional' })
export const orbitron = Orbitron({ subsets: ['latin'], weight: ['400','500','600','700','800','900'], variable: '--font-orbitron', display: 'optional' })
export const audiowide = Audiowide({ subsets: ['latin'], weight: '400', variable: '--font-audiowide', display: 'optional' })
export const russoOne = Russo_One({ subsets: ['latin'], weight: '400', variable: '--font-russo-one', display: 'optional' })
export const fjallaOne = Fjalla_One({ subsets: ['latin'], weight: '400', variable: '--font-fjalla-one', display: 'optional' })
export const teko = Teko({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-teko', display: 'optional' })
export const staatliches = Staatliches({ subsets: ['latin'], weight: '400', variable: '--font-staatliches', display: 'optional' })
export const abrilFatface = Abril_Fatface({ subsets: ['latin'], weight: '400', variable: '--font-abril-fatface', display: 'optional' })
export const graduate = Graduate({ subsets: ['latin'], weight: '400', variable: '--font-graduate', display: 'optional' })
export const bellefair = Bellefair({ subsets: ['latin'], weight: '400', variable: '--font-bellefair', display: 'optional' })
export const caprasimo = Caprasimo({ subsets: ['latin'], weight: '400', variable: '--font-caprasimo', display: 'optional' })
export const courgette = Courgette({ subsets: ['latin'], weight: '400', variable: '--font-courgette', display: 'optional' })
export const pacifico = Pacifico({ subsets: ['latin'], weight: '400', variable: '--font-pacifico', display: 'optional' })
export const comfortaa = Comfortaa({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-comfortaa', display: 'optional' })
export const fredoka = Fredoka({ subsets: ['latin'], weight: ['300','400','500','600','700'], variable: '--font-fredoka', display: 'optional' })
export const chewy = Chewy({ subsets: ['latin'], weight: '400', variable: '--font-chewy', display: 'optional' })
export const luckiestGuy = Luckiest_Guy({ subsets: ['latin'], weight: '400', variable: '--font-luckiest-guy', display: 'optional' })
export const bubblegumSans = Bubblegum_Sans({ subsets: ['latin'], weight: '400', variable: '--font-bubblegum-sans', display: 'optional' })
export const boogaloo = Boogaloo({ subsets: ['latin'], weight: '400', variable: '--font-boogaloo', display: 'optional' })

// Handwritten fonts
export const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-great-vibes', display: 'optional' })
export const allura = Allura({ subsets: ['latin'], weight: '400', variable: '--font-allura', display: 'optional' })
export const alexBrush = Alex_Brush({ subsets: ['latin'], weight: '400', variable: '--font-alex-brush', display: 'optional' })
export const tangerine = Tangerine({ subsets: ['latin'], weight: ['400','700'], variable: '--font-tangerine', display: 'optional' })
export const parisienne = Parisienne({ subsets: ['latin'], weight: '400', variable: '--font-parisienne', display: 'optional' })
export const sacramento = Sacramento({ subsets: ['latin'], weight: '400', variable: '--font-sacramento', display: 'optional' })
export const rochester = Rochester({ subsets: ['latin'], weight: '400', variable: '--font-rochester', display: 'optional' })
export const yellowtail = Yellowtail({ subsets: ['latin'], weight: '400', variable: '--font-yellowtail', display: 'optional' })
export const grandHotel = Grand_Hotel({ subsets: ['latin'], weight: '400', variable: '--font-grand-hotel', display: 'optional' })
export const kavoon = Kavoon({ subsets: ['latin'], weight: '400', variable: '--font-kavoon', display: 'optional' })
export const architectsDaughter = Architects_Daughter({ subsets: ['latin'], weight: '400', variable: '--font-architects-daughter', display: 'optional' })
export const gloriaHallelujah = Gloria_Hallelujah({ subsets: ['latin'], weight: '400', variable: '--font-gloria-hallelujah', display: 'optional' })
export const comingSoon = Coming_Soon({ subsets: ['latin'], weight: '400', variable: '--font-coming-soon', display: 'optional' })
export const justAnotherHand = Just_Another_Hand({ subsets: ['latin'], weight: '400', variable: '--font-just-another-hand', display: 'optional' })
export const rancho = Rancho({ subsets: ['latin'], weight: '400', variable: '--font-rancho', display: 'optional' })
export const coveredByYourGrace = Covered_By_Your_Grace({ subsets: ['latin'], weight: '400', variable: '--font-covered-by-your-grace', display: 'optional' })
export const permanentMarker = Permanent_Marker({ subsets: ['latin'], weight: '400', variable: '--font-permanent-marker', display: 'optional' })
export const rockSalt = Rock_Salt({ subsets: ['latin'], weight: '400', variable: '--font-rock-salt', display: 'optional' })
export const homemadeApple = Homemade_Apple({ subsets: ['latin'], weight: '400', variable: '--font-homemade-apple', display: 'optional' })
export const schoolbell = Schoolbell({ subsets: ['latin'], weight: '400', variable: '--font-schoolbell', display: 'optional' })
export const craftyGirls = Crafty_Girls({ subsets: ['latin'], weight: '400', variable: '--font-crafty-girls', display: 'optional' })
export const theGirlNextDoor = The_Girl_Next_Door({ subsets: ['latin'], weight: '400', variable: '--font-the-girl-next-door', display: 'optional' })

// Friendly preset mapping consumed by the editor. Each entry may include
// optional recommended line-height & letter-spacing tweaks for visual balance.
export interface FontPresetMeta {
  id: string
  label: string
  className: string
  description: string
  letterSpacing?: string
  lineHeight?: string
  category: 'sans' | 'serif' | 'mono' | 'handwritten' | 'display'
  pairings?: string[] // Suggested font IDs that pair well
}

export const FONT_PRESETS: FontPresetMeta[] = [
  // Core Sans-Serif (highly distinctive choices)
  { id: 'modern', label: 'Modern (Inter)', className: inter.className, description: 'Clean, highly legible sans-serif font perfect for modern web interfaces and professional documents', lineHeight: '1.55', category: 'sans' },
  { id: 'montserrat', label: 'Montserrat', className: montserrat.className, description: 'Geometric sans-serif with modern appeal, great for headings and branding', lineHeight: '1.55', category: 'sans' },
  { id: 'oswald', label: 'Oswald', className: oswald.className, description: 'Condensed sans-serif with strong character, perfect for headlines and branding', lineHeight: '1.4', category: 'sans' },
  { id: 'ubuntu', label: 'Ubuntu', className: ubuntu.className, description: 'Humanist sans-serif with friendly curves, excellent for UI and body text', lineHeight: '1.55', category: 'sans' },
  { id: 'space-grotesk', label: 'Space Grotesk', className: spaceGrotesk.className, description: 'Geometric sans-serif inspired by space age design, great for tech brands', lineHeight: '1.55', category: 'sans' },
  { id: 'barlow', label: 'Barlow', className: barlow.className, description: 'Low-contrast sans-serif with humanist details, excellent for editorial design', lineHeight: '1.55', category: 'sans' },
  { id: 'be-vietnam-pro', label: 'Be Vietnam Pro', className: beVietnamPro.className, description: 'Contemporary sans-serif with Vietnamese influences, perfect for modern interfaces', lineHeight: '1.55', category: 'sans' },

  // Core Serif (highly distinctive choices)
  { id: 'classic', label: 'Classic (Lora)', className: lora.className, description: 'Elegant serif font with distinctive character, ideal for formal documents and publications', lineHeight: '1.6', category: 'serif' },
  { id: 'playfair', label: 'Playfair Display', className: playfairDisplay.className, description: 'Transitional serif with strong contrast, excellent for headlines and elegant text', lineHeight: '1.4', category: 'serif' },
  { id: 'cinzel', label: 'Cinzel', className: cinzel.className, description: 'Imperial Roman serif inspired by classical inscriptions, for formal and decorative use', lineHeight: '1.5', category: 'serif' },
  { id: 'crimson-text', label: 'Crimson Text', className: crimsonText.className, description: 'Classic serif with excellent readability, perfect for long-form content and books', lineHeight: '1.6', category: 'serif' },
  { id: 'domine', label: 'Domine', className: domine.className, description: 'Serif font inspired by classic book typography, excellent for editorial content', lineHeight: '1.5', category: 'serif' },
  { id: 'literata', label: 'Literata', className: literata.className, description: 'Serif font designed for comfortable reading on screens, perfect for digital publications', lineHeight: '1.6', category: 'serif' },

  // Core Handwritten (highly distinctive choices)
  { id: 'handwritten', label: 'Handwritten (Patrick Hand)', className: patrickHand.className, description: 'Warm, handwritten-style font that adds personality to casual communications', lineHeight: '1.4', letterSpacing: '0.4px', category: 'handwritten' },
  { id: 'dancing', label: 'Dancing Script', className: dancingScript.className, description: 'Elegant cursive script perfect for invitations, headings, and decorative text', lineHeight: '1.35', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'great-vibes', label: 'Great Vibes', className: greatVibes.className, description: 'Elegant script font perfect for formal invitations and decorative text', lineHeight: '1.3', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'permanent-marker', label: 'Permanent Marker', className: permanentMarker.className, description: 'Bold marker-style font that mimics handwritten text', lineHeight: '1.2', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'architects-daughter', label: 'Architects Daughter', className: architectsDaughter.className, description: 'Playful handwritten font with a casual, artistic feel', lineHeight: '1.4', letterSpacing: '0.3px', category: 'handwritten' },
  { id: 'gloria-hallelujah', label: 'Gloria Hallelujah', className: gloriaHallelujah.className, description: 'Whimsical handwritten font perfect for creative and casual designs', lineHeight: '1.4', letterSpacing: '0.3px', category: 'handwritten' },

  // Core Monospace (highly distinctive choices)
  { id: 'mono', label: 'Mono (Roboto Mono)', className: robotoMono.className, description: 'Clean monospace font designed for code editors and technical documentation', lineHeight: '1.55', category: 'mono' },
  { id: 'jetbrains-mono', label: 'JetBrains Mono', className: jetbrainsMono.className, description: 'Modern monospace font designed for developers, with excellent readability', lineHeight: '1.5', category: 'mono' },
  { id: 'fira-code', label: 'Fira Code', className: firaCode.className, description: 'Monospace font with programming ligatures, perfect for code editors', lineHeight: '1.5', category: 'mono' },
  { id: 'space-mono', label: 'Space Mono', className: spaceMono.className, description: 'Monospace font with character, designed for both code and display use', lineHeight: '1.5', category: 'mono' },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', className: ibmPlexMono.className, description: 'Humanist monospace font with excellent readability for technical content', lineHeight: '1.5', category: 'mono' },

  // Core Display (highly distinctive choices)
  { id: 'bebas-neue', label: 'Bebas Neue', className: bebasNeue.className, description: 'Ultra-bold condensed font perfect for headlines and posters', lineHeight: '1.2', category: 'display' },
  { id: 'anton', label: 'Anton', className: anton.className, description: 'Bold, condensed sans-serif ideal for strong headlines and branding', lineHeight: '1.2', category: 'display' },
  { id: 'pacifico', label: 'Pacifico', className: pacifico.className, description: 'Playful brush script font, ideal for logos and casual branding', lineHeight: '1.3', category: 'display' },
  { id: 'comfortaa', label: 'Comfortaa', className: comfortaa.className, description: 'Rounded sans-serif with a soft, friendly feel, great for modern branding', lineHeight: '1.4', category: 'display' },
  { id: 'abril-fatface', label: 'Abril Fatface', className: abrilFatface.className, description: 'Bold serif with strong contrast, perfect for elegant headlines', lineHeight: '1.1', category: 'display' },
  { id: 'fjalla-one', label: 'Fjalla One', className: fjallaOne.className, description: 'Geometric sans-serif with strong presence, excellent for headlines', lineHeight: '1.2', category: 'display' },
  { id: 'teko', label: 'Teko', className: teko.className, description: 'Condensed sans-serif with industrial character, perfect for modern branding', lineHeight: '1.2', category: 'display' }
]

export const DEFAULT_FONT_ID = 'modern'
