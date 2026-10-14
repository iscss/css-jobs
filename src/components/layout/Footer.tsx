import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-white">
      <div className="border-t-[3px] border-brand-gold" />
      <div className="mx-auto max-w-[1400px] px-7 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-sm text-brand-navy">ISCSS</span>
          <span className="text-border">|</span>
          <span className="text-[11px] text-[#888]">International Society for Computational Social Science</span>
        </div>

        <nav className="flex items-center gap-5 text-[11px] text-[#555]">
          <Link to="/jobs" className="hover:text-slate-800">Jobs</Link>
          <Link to="/about" className="hover:text-slate-800">About</Link>
          <a href="https://events.iscss.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">CSS Events</a>
          <a href="https://iscss.org" target="_blank" rel="noopener noreferrer" className="hover:text-slate-800">iscss.org</a>
        </nav>

        <p className="text-[11px] text-[#aaa]">
          &copy; {new Date().getFullYear()} ISCSS. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
