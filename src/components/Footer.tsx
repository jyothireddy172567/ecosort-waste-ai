import logo from "@/assets/ecosort-logo.jpeg";
import { Leaf } from "lucide-react";

const Footer = () => (
  <footer className="bg-foreground py-12">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <img src={logo} alt="EcoSort" className="h-8 w-8 rounded-lg object-cover" />
          <span className="font-heading font-bold text-lg text-background">
            EcoSort <span className="text-eco-lime">AI</span>
          </span>
        </div>
        <p className="text-background/60 font-body text-sm flex items-center gap-1">
          <Leaf className="w-3 h-3" /> Making waste management smarter, one image at a time.
        </p>
        <p className="text-background/40 font-body text-xs">© 2026 EcoSort AI. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
