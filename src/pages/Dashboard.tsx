import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/ecosort-logo.jpeg";
import { Upload, Droplets, Sun, TrendingUp, TrendingDown, ImageIcon, LogOut, Leaf } from "lucide-react";

interface PredictionResult {
  wet: number;
  dry: number;
  dominant: "wet" | "dry";
}

const mockHistory = [
  { date: "Today", wet: 58, dry: 42 },
  { date: "Yesterday", wet: 45, dry: 55 },
];

const Dashboard = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) handleFile(file);
  }, [handleFile]);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const analyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const wet = Math.floor(Math.random() * 40) + 30;
      setResult({ wet, dry: 100 - wet, dominant: wet > 50 ? "wet" : "dry" });
      setAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="EcoSort" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-heading font-bold text-lg text-foreground">
              Eco<span className="text-primary">Sort</span> AI
            </span>
          </div>
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Waste Detection</h1>
        <p className="text-muted-foreground font-body mb-8">Upload an image to classify waste and get insights</p>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload area */}
          <div className="eco-card">
            <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" /> Upload Image
            </h2>

            <div
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input id="file-input" type="file" accept="image/*" className="hidden" onChange={onFileSelect} />

              {preview ? (
                <img src={preview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
              ) : (
                <div className="py-8">
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-body">Drag & drop or click to upload</p>
                  <p className="text-muted-foreground/60 font-body text-xs mt-1">Supports JPG, PNG, WebP</p>
                </div>
              )}
            </div>

            {preview && (
              <Button
                variant="hero"
                size="lg"
                className="w-full mt-4"
                onClick={analyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Analyzing...
                  </span>
                ) : (
                  <>
                    <Leaf className="w-4 h-4" /> Analyze Waste
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Results area */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="eco-card"
                >
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-6">Analysis Results</h2>

                  {/* Dominant badge */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-heading font-semibold mb-6 ${
                    result.dominant === "wet"
                      ? "bg-eco-wet/15 text-eco-wet"
                      : "bg-eco-dry/15 text-eco-dry"
                  }`}>
                    {result.dominant === "wet" ? <Droplets className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Dominant: {result.dominant === "wet" ? "Wet" : "Dry"} Waste
                  </div>

                  {/* Wet bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-sm font-body text-foreground">
                        <Droplets className="w-4 h-4 text-eco-wet" /> Wet Waste
                      </span>
                      <span className="font-heading font-bold text-foreground">{result.wet}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.wet}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full eco-progress-wet"
                      />
                    </div>
                  </div>

                  {/* Dry bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-sm font-body text-foreground">
                        <Sun className="w-4 h-4 text-eco-dry" /> Dry Waste
                      </span>
                      <span className="font-heading font-bold text-foreground">{result.dry}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${result.dry}%` }}
                        transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                        className="h-full rounded-full eco-progress-dry"
                      />
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="eco-card flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Leaf className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-body">Upload an image and click analyze to see results</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Daily tracking */}
            <div className="eco-card">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Daily Tracking
              </h2>
              <div className="space-y-4">
                {mockHistory.map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                    <span className="font-heading font-medium text-sm text-foreground">{day.date}</span>
                    <div className="flex items-center gap-4 text-sm font-body">
                      <span className="flex items-center gap-1 text-eco-wet">
                        <Droplets className="w-3.5 h-3.5" /> {day.wet}%
                      </span>
                      <span className="flex items-center gap-1 text-eco-dry">
                        <Sun className="w-3.5 h-3.5" /> {day.dry}%
                      </span>
                      {day.wet > day.dry ? (
                        <TrendingUp className="w-4 h-4 text-eco-wet" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-eco-dry" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
