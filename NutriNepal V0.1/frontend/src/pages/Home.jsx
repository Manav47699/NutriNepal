import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import HowItWorks from '../components/HowItWorks';

function Home() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#181715] flex flex-col selection:bg-[#244234] selection:text-[#FAF8F5] overflow-x-hidden">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
      </main>
    </div>
  );
}

export default Home;