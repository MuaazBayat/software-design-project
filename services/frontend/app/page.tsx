import Image from "next/image";
export default function Home() {
  return (
    <>
    <main>
    <section className="min-h-screen w-full bg-black text-white relative overflow-hidden" role="banner" aria-label="Hero section">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0" aria-hidden="true">
        <Image
          src='/hero.png'
          alt=""
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black opacity-20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
        {/* Hero Section */}
        <header className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            Connecting Cultures,{" "}
            <span className="bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">One</span>
            <br />
            <span className="bg-gradient-to-r from-teal-400 to-yellow-200 bg-clip-text text-transparent">Letter at a Time</span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
            Discover the joy of cultural exchange with GlobeTalk - your global pen pal community where meaningful friendships begin.
          </p>

          <a href="/matchmaking" 
             className="group relative inline-flex h-[calc(56px+8px)] items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-rose-500 py-1 pl-8 pr-16 font-bold text-xl text-white mx-auto transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-300 focus:ring-opacity-50"
             aria-label="Find your pen pal match">
            <span className="z-10 pr-2">Find Your Match</span>
            <div className="absolute right-1 inline-flex h-14 w-14 items-center justify-end rounded-full bg-gradient-to-r from-pink-600 to-rose-600 transition-[width] group-hover:w-[calc(100%-8px)]">
              <div className="mr-3.5 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </a>
        </header>

        {/* Statistics Section */}
        <section className="flex flex-wrap justify-center items-center gap-12 md:gap-16" aria-label="Platform statistics">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2" aria-label="50 plus countries">50+</div>
            <div className="text-gray-300 text-xl">Countries</div>
          </div>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2" aria-label="1000 plus active users">1000+</div>
            <div className="text-gray-300 text-xl">Active Users</div>
          </div>

          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-white mb-2" aria-label="5000 plus letters sent">5000+</div>
            <div className="text-gray-300 text-xl">Letters Sent</div>
          </div>
        </section>
      </div>
    </section>

    {/* Transition Section with Stats */}
    <section className="bg-black py-16 px-6" aria-label="Global community statistics">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Join Our Growing <span className="bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">Global Family</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Every day, thousands of meaningful connections bloom across continents through heartfelt letters
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="text-center">
            <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center rounded-full">
              <Image src="/letter.png" alt="Illustration of letters being exchanged" width={256} height={256} className="w-64 h-64 object-contain rounded-full" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Letters Exchanged</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-teal-400 to-yellow-200 bg-clip-text text-transparent mb-2" aria-label="50,000 plus letters exchanged">50,000+</p>
            <p className="text-gray-400 text-lg">Heartfelt messages shared daily</p>
          </div>

          <div className="text-center">
            <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center">
              <Image src="/friends.png" alt="Illustration of people from different cultures becoming friends" width={256} height={256} className="w-64 h-64 object-contain rounded-full" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Friendships Formed</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-2" aria-label="25,000 plus friendships formed">25,000+</p>
            <p className="text-gray-400 text-lg">Lasting bonds across borders</p>
          </div>

          <div className="text-center">
            <div className="w-64 h-64 mx-auto mb-6 flex items-center justify-center">
              <Image src="/globe.png" alt="Illustration of a globe showing global connectivity" width={256} height={256} className="w-64 h-64 object-contain" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Countries Connected</h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent mb-2" aria-label="180 plus countries connected">180+</p>
            <p className="text-gray-400 text-lg">Cultures united through words</p>
          </div>
        </div>
      </div>
    </section>
        <section className="bg-black text-white py-20 px-6" aria-label="Why choose GlobeTalk features">
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
          Why Choose <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">GlobeTalk</span>?
        </h2>
        <p className="text-xl text-gray-200 mb-16 max-w-3xl mx-auto">
          Experience meaningful connections through our thoughtfully designed platform that prioritizes safety, culture, and authentic communication.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid gap-12 md:grid-cols-2 lg:grid-cols-4">
        <article className="text-center group">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-violet-200 to-pink-200 mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <span className="text-4xl" role="img" aria-label="Heart emoji">💕</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Smart Matching
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Connect with like-minded individuals worldwide through our intelligent compatibility system based on interests, values, and cultural curiosity.
          </p>
        </article>

        <article className="text-center group">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <span className="text-4xl" role="img" aria-label="Letter emoji">✉️</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Beautiful Letters
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Express yourself with stunning letter templates inspired by global traditions - from elegant calligraphy to modern minimalist designs.
          </p>
        </article>

        <article className="text-center group">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-teal-400 to-yellow-200 mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <span className="text-4xl" role="img" aria-label="Globe emoji">🌍</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Cultural Discovery
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Explore traditions, learn languages, and expand your worldview through interactive cultural exchanges and engaging activities.
          </p>
        </article>

        <article className="text-center group">
          <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-gradient-to-r from-violet-200 to-pink-200 mb-6 group-hover:scale-110 transition-transform duration-300" aria-hidden="true">
            <span className="text-4xl" role="img" aria-label="Lock emoji">🔒</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4">
            Safe & Secure
          </h3>
          <p className="text-gray-300 leading-relaxed">
            Your privacy matters. Enjoy end-to-end encryption, verified profiles, and comprehensive safety tools for worry-free connections.
          </p>
        </article>
      </div>
    </section>

    {/* Testimonials Section */}
    <section className="bg-black to-gray-900 py-20 px-6" aria-label="User testimonials">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Stories of <span className="bg-gradient-to-r from-teal-400 to-yellow-200 bg-clip-text text-transparent">Connection</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real people, real friendships, real cultural exchanges that changed lives
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <article className="group relative bg-white p-8 border border-gray-300 hover:border-pink-400 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
            {/* Quote icon */}
            <div className="absolute top-6 right-6 text-pink-400/50 text-4xl font-serif" aria-hidden="true">
              &ldquo;
            </div>

            <div className="flex items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-400 to-yellow-200 flex items-center justify-center" aria-hidden="true">
                <span className="text-3xl" role="img" aria-label="Canadian flag">🇨🇦</span>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-black font-bold text-lg">Sarah Chen</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">Canada</span>
                  <span className="text-pink-400" aria-hidden="true">→</span>
                  <span className="text-gray-700">Japan</span>
                </div>
              </div>
            </div>

            <blockquote className="text-gray-800 leading-relaxed mb-6 italic text-lg">
              &ldquo;Through GlobeTalk, I found my Japanese pen pal Yuki. Her letters taught me about tea ceremonies and origami, while I shared maple syrup recipes! We&rsquo;re planning to meet this summer.&rdquo;
            </blockquote>

            <div className="flex justify-end">
              <time className="text-xs text-gray-500" dateTime="2024-08">
                2 months ago
              </time>
            </div>
          </article>

          <article className="group relative bg-white p-8 border border-gray-300 hover:border-pink-400 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
            {/* Quote icon */}
            <div className="absolute top-6 right-6 text-pink-400/50 text-4xl font-serif" aria-hidden="true">
              &ldquo;
            </div>

            <div className="flex items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-400 to-yellow-200 flex items-center justify-center" aria-hidden="true">
                <span className="text-3xl" role="img" aria-label="German flag">🇩🇪</span>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-black font-bold text-lg">Marcus Weber</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">Germany</span>
                  <span className="text-pink-400" aria-hidden="true">→</span>
                  <span className="text-gray-700">Brazil</span>
                </div>
              </div>
            </div>

            <blockquote className="text-gray-800 leading-relaxed mb-6 italic text-lg">
              &ldquo;I started learning Portuguese through letters with Carlos from São Paulo. His stories about Carnival inspired me to visit Brazil. Now we&rsquo;re best friends across continents!&rdquo;
            </blockquote>

            <div className="flex justify-end">
              <time className="text-xs text-gray-500" dateTime="2024-05">
                5 months ago
              </time>
            </div>
          </article>

          <article className="group relative bg-white p-8 border border-gray-300 hover:border-pink-400 hover:shadow-xl transition-all duration-500 hover:-translate-y-2">
            {/* Quote icon */}
            <div className="absolute top-6 right-6 text-pink-400/50 text-4xl font-serif" aria-hidden="true">
              &ldquo;
            </div>

            <div className="flex items-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-400 to-yellow-200 flex items-center justify-center" aria-hidden="true">
                <span className="text-3xl" role="img" aria-label="Indian flag">🇮🇳</span>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-black font-bold text-lg">Priya Sharma</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700">India</span>
                  <span className="text-pink-400" aria-hidden="true">→</span>
                  <span className="text-gray-700">Morocco</span>
                </div>
              </div>
            </div>

            <blockquote className="text-gray-800 leading-relaxed mb-6 italic text-lg">
              &ldquo;Exchanging letters with Amina from Marrakech opened my eyes to beautiful Moroccan culture. She taught me Arabic calligraphy through her letters - pure magic!&rdquo;
            </blockquote>

            <div className="flex justify-end">
              <time className="text-xs text-gray-500" dateTime="2024-09">
                1 month ago
              </time>
            </div>
          </article>
        </div>


      </div>
    </section>

    <section className="w-full bg-black text-white py-20 px-6" aria-label="Call to action">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
          Ready to Connect the <span className="bg-gradient-to-r from-violet-200 to-pink-200 bg-clip-text text-transparent">World</span>?
        </h2>
        <p className="text-xl md:text-2xl text-gray-200 mb-12 leading-relaxed max-w-3xl mx-auto">
          Join thousands of people discovering friendship and culture through meaningful correspondence. Your global pen pal awaits!
        </p>
        <a href="/matchmaking" 
           className="group relative inline-flex h-[calc(60px+8px)] items-center justify-center rounded-full bg-gradient-to-r from-teal-400 to-yellow-200 py-1 pl-8 pr-16 font-bold text-xl text-black mx-auto transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-teal-300 focus:ring-opacity-50"
           aria-label="Start your journey to find a pen pal">
          <span className="z-10 pr-2">Start Your Journey</span>
          <div className="absolute right-1 inline-flex h-16 w-16 items-center justify-end rounded-full bg-gradient-to-r from-teal-500 to-yellow-300 transition-[width] group-hover:w-[calc(100%-8px)]">
            <div className="mr-3.5 flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </a>
      </div>
    </section>


    <footer className="bg-black border-t-2 border-transparent" style={{borderImage: 'linear-gradient(to right, rgb(221 214 254), rgb(236 72 153), rgb(45 212 191)) 1'}} role="contentinfo">
      <div className="mx-auto max-w-6xl px-6 py-5">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="text-5xl font-bold text-white tracking-tight mb-6">
            Globe<span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">Talk</span>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Connecting cultures, one letter at a time. Building bridges across borders through meaningful friendships.
          </p>
          
        </div>
        

        {/* Quick Links */}
        <nav className="text-center mb-12" aria-label="Footer navigation">
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Learn about GlobeTalk">About</a>
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Learn how GlobeTalk works">How It Works</a>
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Safety information">Safety</a>
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Support and help">Support</a>
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Privacy policy">Privacy</a>
            <a className="text-gray-300 hover:text-pink-400 transition-colors font-medium text-lg focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50 rounded" href="#" aria-label="Terms of service">Terms</a>
          </div>
        </nav>

        {/* Social Media */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-white mb-6">Follow Us</h3>
          <div className="flex justify-center gap-6 md:gap-8">
            <a
              href="#"
              rel="noreferrer"
              target="_blank"
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-pink-400 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50"
              aria-label="Follow us on Facebook"
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="#"
              rel="noreferrer"
              target="_blank"
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-pink-400 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50"
              aria-label="Follow us on Instagram"
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
            <a
              href="#"
              rel="noreferrer"
              target="_blank"
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-pink-400 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50"
              aria-label="Follow us on Twitter"
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"
                />
              </svg>
            </a>
            <a
              href="#"
              rel="noreferrer"
              target="_blank"
              className="w-12 h-12 rounded-full bg-gray-800 hover:bg-pink-400 flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:ring-opacity-50"
              aria-label="View our GitHub repository"
            >
              <svg className="size-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </a>
        </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8" style={{borderImage: 'linear-gradient(to right, rgb(45 212 191), rgb(236 72 153), rgb(221 214 254)) 1'}}>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 GlobeTalk. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Made with</span>
              <span className="text-pink-400 text-lg" role="img" aria-label="love">❤️</span>
              <span className="text-sm text-gray-400">in Johannesburg.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
    </main>

    </>
  );
}