import { Link } from 'react-router-dom';

export default function Hero() {
  const scrollToWorkflow = (e) => {
    e.preventDefault();
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-[#E5E1D8]">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        
        {/* Academic context marker */}
        <div className="inline-flex items-center gap-2 mb-8 text-[#85837C]">
          <span className="font-code text-xs font-medium uppercase tracking-widest px-2.5 py-1 bg-[#F3F0EA] border border-[#E5E1D8] rounded-xs">
            Academic Advisory System
          </span>
          <span className="font-code text-xs hidden sm:inline-block text-[#85837C]">
            • Nepali Dietary Context
          </span>
        </div>

        {/* Hero Main Heading */}
        <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-[5rem] text-[#181715] font-normal tracking-tight leading-[1.08] max-w-4xl mb-8">
          Your food.<br />
          Your lifestyle.<br />
          <span className="italic font-normal text-[#244234]">Your guidance.</span>
        </h1>

        {/* Supporting description */}
        <p className="font-ui text-lg sm:text-xl text-[#57554F] leading-relaxed max-w-2xl font-normal mb-10">
          A lifestyle-based diet and fitness advisory system that helps you understand your meals and receive personalized guidance based on your goals and daily habits.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 pt-2">
          <Link
            to="/register"
            className="inline-flex items-center justify-center font-ui text-base font-medium bg-[#181715] hover:bg-[#244234] text-[#FAF8F5] px-7 py-3.5 rounded-xs transition-all duration-150 shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#244234]"
          >
            Get Started
            <svg 
              className="ml-2.5 w-4 h-4 text-[#FAF8F5]/80 transition-transform group-hover:translate-x-0.5" 
              viewBox="0 0 16 16" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          <a
            href="#how-it-works"
            onClick={scrollToWorkflow}
            className="inline-flex items-center justify-center font-ui text-base font-medium text-[#181715] hover:text-[#244234] border border-[#C8C3B7] hover:border-[#181715] bg-transparent hover:bg-[#F3F0EA] px-6 py-3.5 rounded-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#244234]"
          >
            Learn how it works
          </a>
        </div>

        {/* Subtle metadata footnote */}
        <div className="mt-16 pt-6 border-t border-[#E5E1D8]/70 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-code text-[#85837C]">
          <div>
            <span className="text-[#181715] font-medium block">LOCAL NUTRITION</span>
            Standardized for Nepali meal compositions
          </div>
          <div>
            <span className="text-[#181715] font-medium block">PERSONALIZED ADAPTATION</span>
            Grounded in individual activity &amp; goals
          </div>
          <div>
            <span className="text-[#181715] font-medium block">STRUCTURED GUIDANCE</span>
            Actionable dietary &amp; fitness feedback
          </div>
        </div>

      </div>
    </section>
  );
}
