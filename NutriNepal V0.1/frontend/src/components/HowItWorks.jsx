const steps = [
  {
    step: '01',
    title: 'Create your profile',
    description: 'Set your health metrics, daily physical activity levels, dietary preferences, and target goals.'
  },
  {
    step: '02',
    title: 'Share your meal',
    description: 'Provide an image of your plate or describe your meal in natural, everyday language.'
  },
  {
    step: '03',
    title: 'Understand your nutrition',
    description: 'View the estimated macro and micronutrient breakdown evaluated against your daily targets.'
  },
  {
    step: '04',
    title: 'Receive personalized guidance',
    description: 'Get actionable suggestions for meal adjustments and fitness routines tailored to your lifestyle.'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-24 border-b border-[#E5E1D8] scroll-mt-12">
      <div className="max-w-6xl mx-auto px-6 sm:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-12 pb-4 border-b border-[#E5E1D8]/60">
          <div>
            <span className="font-code text-xs uppercase tracking-widest text-[#85837C] block mb-2">
              Workflow
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl text-[#181715] font-normal tracking-tight">
              How it works
            </h2>
          </div>
          <span className="font-code text-xs text-[#85837C] mt-2 sm:mt-0">
            Four-Step Advisory Process
          </span>
        </div>

        {/* Step Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
          {steps.map((item, index) => (
            <div 
              key={item.step} 
              className="flex flex-col justify-between p-6 bg-[#FAF8F5] border border-[#E5E1D8] rounded-xs relative group hover:border-[#C8C3B7] transition-colors"
            >
              <div>
                {/* Step indicator and arrow */}
                <div className="flex items-center justify-between mb-6">
                  <span className="font-code text-xs font-semibold px-2 py-0.5 bg-[#F3F0EA] border border-[#E5E1D8] text-[#244234] rounded-xs">
                    Step {item.step}
                  </span>
                  {index < steps.length - 1 && (
                    <span className="hidden lg:inline-block font-code text-xs text-[#85837C]" aria-hidden="true">
                      →
                    </span>
                  )}
                </div>

                {/* Step Content */}
                <h3 className="font-ui text-base sm:text-lg text-[#181715] font-semibold mb-2 leading-snug">
                  {item.title}
                </h3>
                
                <p className="font-ui text-sm text-[#57554F] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E5E1D8]/50">
                <span className="font-code text-[11px] text-[#85837C] uppercase tracking-wider">
                  Phase {index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
