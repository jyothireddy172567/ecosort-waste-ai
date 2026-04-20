import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import logo from "@/assets/ecosort-logo.jpeg";
import { Upload, Droplets, Sun, TrendingUp, TrendingDown, ImageIcon, Leaf, MapPin, Recycle, Trash2, Camera } from "lucide-react";
import CameraCapture from "@/components/CameraCapture";
import DailyTracking from "@/components/DailyTracking";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WasteType {
  name: string;
  category: "biodegradable" | "non-biodegradable";
  suggestion: "compost" | "animal_feed" | "recycling" | "landfill";
}

interface PredictionResult {
  wet_percent: number;
  dry_percent: number;
  dominant: string;
  waste_types: WasteType[];
}

const suggestionLabels: Record<string, { label: string; color: string }> = {
  compost: { label: "♻️ Compost", color: "text-green-600" },
  animal_feed: { label: "🐄 Animal Feed", color: "text-amber-600" },
  recycling: { label: "🔄 Recycling", color: "text-blue-600" },
  landfill: { label: "🗑️ Landfill", color: "text-gray-500" },
};

const Dashboard = () => {
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem("waste_scans_local");
    if (stored) {
      try { setHistory(JSON.parse(stored)); } catch { /* noop */ }
    }
  }, []);

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

  const analyze = async () => {
    if (!preview) return;
    setAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("classify-waste", {
        body: { imageBase64: preview },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const prediction: PredictionResult = data;
      setResult(prediction);

      // Save scan locally (no auth required)
      const newScan = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        wet_percent: prediction.wet_percent,
        dry_percent: prediction.dry_percent,
        dominant: prediction.dominant,
        waste_types: prediction.waste_types,
      };
      const updated = [newScan, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("waste_scans_local", JSON.stringify(updated));
    } catch (err: any) {
      console.error("Analysis error:", err);
      toast({ title: "Analysis failed", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return "Today";
    if (diff < 172800000) return "Yesterday";
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="EcoSort" className="h-9 w-9 rounded-lg object-cover" />
            <span className="font-heading font-bold text-lg text-foreground">
              Eco<span className="text-primary">Sort</span> AI
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/nearby-centers">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" /> Nearby Centers
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Waste Detection</h1>
        <p className="text-muted-foreground font-body mb-8">Upload an image to classify waste and get AI-powered insights</p>

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
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="gap-2 flex-1" onClick={(e) => { e.stopPropagation(); setShowCamera(true); }}>
                <Camera className="w-4 h-4" /> Camera
              </Button>
              <Button variant="outline" className="gap-2 flex-1" onClick={() => document.getElementById("file-input")?.click()}>
                <Upload className="w-4 h-4" /> Upload
              </Button>
            </div>
            {preview && (
              <Button variant="hero" size="lg" className="w-full mt-4" onClick={analyze} disabled={analyzing}>
                {analyzing ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Analyzing with AI...
                  </span>
                ) : (
                  <><Leaf className="w-4 h-4" /> Analyze Waste</>
                )}
              </Button>
            )}
          </div>

          {/* Results area */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="eco-card">
                  <h2 className="font-heading font-semibold text-lg text-foreground mb-6">AI Analysis Results</h2>

                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-heading font-semibold mb-6 ${
                    result.dominant === "Wet Waste" ? "bg-eco-wet/15 text-eco-wet" : "bg-eco-dry/15 text-eco-dry"
                  }`}>
                    {result.dominant === "Wet Waste" ? <Droplets className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Dominant: {result.dominant}
                  </div>

                  {/* Wet bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-sm font-body text-foreground">
                        <Droplets className="w-4 h-4 text-eco-wet" /> Wet Waste
                      </span>
                      <span className="font-heading font-bold text-foreground">{result.wet_percent}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${result.wet_percent}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full rounded-full eco-progress-wet" />
                    </div>
                  </div>

                  {/* Dry bar */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-1.5 text-sm font-body text-foreground">
                        <Sun className="w-4 h-4 text-eco-dry" /> Dry Waste
                      </span>
                      <span className="font-heading font-bold text-foreground">{result.dry_percent}%</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${result.dry_percent}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.2 }} className="h-full rounded-full eco-progress-dry" />
                    </div>
                  </div>

                  {/* Waste types */}
                  {result.waste_types && result.waste_types.length > 0 && (
                    <div>
                      <h3 className="font-heading font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <Recycle className="w-4 h-4 text-primary" /> Detected Waste Types
                      </h3>
                      <div className="space-y-2">
                        {result.waste_types.map((wt, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/60 text-sm">
                            <div className="flex items-center gap-2">
                              {wt.category === "biodegradable" ? (
                                <Leaf className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                              )}
                              <span className="font-body text-foreground">{wt.name}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                wt.category === "biodegradable" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                              }`}>
                                {wt.category}
                              </span>
                            </div>
                            <span className={`text-xs font-medium ${suggestionLabels[wt.suggestion]?.color || ""}`}>
                              {suggestionLabels[wt.suggestion]?.label || wt.suggestion}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="eco-card flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Leaf className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-body">Upload an image and click analyze to see AI results</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* History */}
            <div className="eco-card">
              <h2 className="font-heading font-semibold text-lg text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Recent Scans
              </h2>
              {history.length === 0 ? (
                <p className="text-muted-foreground font-body text-sm text-center py-4">No scans yet. Upload an image to get started!</p>
              ) : (
                <div className="space-y-3">
                  {history.map((scan) => (
                    <div key={scan.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/60">
                      <span className="font-heading font-medium text-sm text-foreground">{formatDate(scan.created_at)}</span>
                      <div className="flex items-center gap-4 text-sm font-body">
                        <span className="flex items-center gap-1 text-eco-wet">
                          <Droplets className="w-3.5 h-3.5" /> {Math.round(scan.wet_percent)}%
                        </span>
                        <span className="flex items-center gap-1 text-eco-dry">
                          <Sun className="w-3.5 h-3.5" /> {Math.round(scan.dry_percent)}%
                        </span>
                        {scan.wet_percent > scan.dry_percent ? (
                          <TrendingUp className="w-4 h-4 text-eco-wet" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-eco-dry" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily Tracking */}
            <DailyTracking history={history} />
          </div>
        </div>
      </main>

      {showCamera && (
        <CameraCapture
          onCapture={(dataUrl) => { setPreview(dataUrl); setResult(null); setShowCamera(false); }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
