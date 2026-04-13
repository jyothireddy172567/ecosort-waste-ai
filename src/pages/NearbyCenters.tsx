import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import logo from "@/assets/ecosort-logo.jpeg";
import { MapPin, Phone, Navigation, Loader2, LogOut, ArrowLeft, ExternalLink } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface WasteCenter {
  name: string;
  distance: string;
  address: string;
  phone: string;
  lat: number;
  lon: number;
}

const DEFAULT_INDIA_CENTERS: WasteCenter[] = [
  { name: "Chennai Waste Center", distance: "—", address: "Anna Salai, Chennai, Tamil Nadu", phone: "+91 9876543210", lat: 13.0827, lon: 80.2707 },
  { name: "Hyderabad Recycling Hub", distance: "—", address: "Banjara Hills, Hyderabad, Telangana", phone: "+91 9123456780", lat: 17.385, lon: 78.4867 },
  { name: "Bangalore Eco Center", distance: "—", address: "Koramangala, Bangalore, Karnataka", phone: "+91 9988776655", lat: 12.9352, lon: 77.6245 },
  { name: "Delhi Waste Management", distance: "—", address: "Connaught Place, New Delhi", phone: "+91 9012345678", lat: 28.6315, lon: 77.2167 },
  { name: "Mumbai Green Hub", distance: "—", address: "Andheri East, Mumbai, Maharashtra", phone: "+91 9090909090", lat: 19.1136, lon: 72.8697 },
];

const NearbyCenters = () => {
  const [centers, setCenters] = useState<WasteCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLon, setUserLon] = useState<number | null>(null);
  const { signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!navigator.geolocation) {
      setCenters(DEFAULT_INDIA_CENTERS);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLat(latitude);
        setUserLon(longitude);
        await fetchNearbyCenters(latitude, longitude);
      },
      () => {
        setCenters(DEFAULT_INDIA_CENTERS);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const fetchNearbyCenters = async (lat: number, lon: number) => {
    try {
      const radius = 10000; // 10km
      const query = `
        [out:json][timeout:25];
        (
          node["amenity"="recycling"](around:${radius},${lat},${lon});
          node["amenity"="waste_disposal"](around:${radius},${lat},${lon});
          node["landuse"="landfill"](around:${radius},${lat},${lon});
          node["recycling_type"](around:${radius},${lat},${lon});
          way["amenity"="recycling"](around:${radius},${lat},${lon});
          way["amenity"="waste_disposal"](around:${radius},${lat},${lon});
        );
        out center body;
      `;

      const response = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });

      if (!response.ok) throw new Error("Failed to fetch nearby centers");

      const data = await response.json();
      const results: WasteCenter[] = data.elements
        .map((el: any) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          if (!elLat || !elLon) return null;

          const dist = getDistance(lat, lon, elLat, elLon);
          const name = el.tags?.name || el.tags?.operator || "Waste/Recycling Center";
          const phone = el.tags?.phone || el.tags?.["contact:phone"] || "Not available";
          const addr = [el.tags?.["addr:street"], el.tags?.["addr:city"], el.tags?.["addr:state"]]
            .filter(Boolean)
            .join(", ") || "Address not listed";

          return { name, distance: `${dist.toFixed(1)} km`, address: addr, phone, lat: elLat, lon: elLon };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => parseFloat(a.distance) - parseFloat(b.distance))
        .slice(0, 15);

      setCenters(results.length > 0 ? results : DEFAULT_INDIA_CENTERS);
    } catch {
      setCenters(DEFAULT_INDIA_CENTERS);
    } finally {
      setLoading(false);
    }
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const openDirections = (center: WasteCenter) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLon}&destination=${center.lat},${center.lon}`;
    window.open(url, "_blank");
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
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
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                <ArrowLeft className="w-4 h-4" /> Dashboard
              </Button>
            </Link>
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="font-heading text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <MapPin className="w-8 h-8 text-primary" /> Nearby Waste Centers
        </h1>
        <p className="text-muted-foreground font-body mb-8">Find waste collection and recycling centers near you</p>

        {loading ? (
          <div className="eco-card flex flex-col items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-body">Detecting your location & finding nearby centers...</p>
          </div>
        ) : error ? (
          <div className="eco-card text-center py-12">
            <MapPin className="w-12 h-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-heading font-semibold mb-2">Location Error</p>
            <p className="text-muted-foreground font-body text-sm">{error}</p>
            <Button variant="hero" size="lg" className="mt-4" onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        ) : centers.length === 0 ? (
          <div className="eco-card text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-heading font-semibold mb-2">No Centers Found</p>
            <p className="text-muted-foreground font-body text-sm">No waste centers found within 10km of your location.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {centers.map((center, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="eco-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-foreground truncate">{center.name}</h3>
                    <p className="text-muted-foreground font-body text-sm mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" /> {center.address}
                    </p>
                    <p className="text-muted-foreground font-body text-sm mt-0.5 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 shrink-0" /> {center.phone}
                    </p>
                  </div>
                  <span className="text-primary font-heading font-bold text-sm whitespace-nowrap">{center.distance}</span>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button variant="hero" size="sm" className="gap-1.5" onClick={() => openDirections(center)}>
                    <Navigation className="w-3.5 h-3.5" /> Directions
                  </Button>
                  {center.phone !== "Not available" && (
                    <a href={`tel:${center.phone}`}>
                      <Button variant="hero-outline" size="sm" className="gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> Call
                      </Button>
                    </a>
                  )}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${center.lat}&mlon=${center.lon}#map=17/${center.lat}/${center.lon}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                      <ExternalLink className="w-3.5 h-3.5" /> Map
                    </Button>
                  </a>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default NearbyCenters;
