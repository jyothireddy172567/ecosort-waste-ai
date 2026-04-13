import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw } from "lucide-react";

interface CameraCaptureProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

const CameraCapture = ({ onCapture, onClose }: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setError(null);
    } catch {
      setError("Camera access denied. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  const capture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    onCapture(dataUrl);
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl max-w-lg w-full overflow-hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground">Camera Capture</h3>
          <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onClose(); }}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {error ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {!streaming && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-12 h-12 text-muted-foreground animate-pulse" />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 justify-center">
            {!streaming ? (
              <Button variant="hero" className="gap-2" onClick={() => startCamera(facingMode)}>
                <Camera className="w-4 h-4" /> Start Camera
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="icon" onClick={flipCamera}>
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="hero" size="lg" className="gap-2 px-8" onClick={capture}>
                  <Camera className="w-4 h-4" /> Capture
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
