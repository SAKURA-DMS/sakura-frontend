import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import heroSakura from "@/assets/sakura_branch.png"; 

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 text-center overflow-hidden">
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center" 
        style={{ backgroundImage: `url(${heroSakura})` }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
      </div>

      <div className="relative z-10 space-y-4 max-w-md">
        <h1 className="text-9xl font-black text-white/90">404</h1>
        <h2 className="text-2xl font-bold text-white">Halaman Tidak Ditemukan</h2>
        <p className="text-white/70">
          Sepertinya halaman yang Anda cari telah dipindahkan atau tidak pernah ada. Silakan periksa kembali URL atau refresh halaman ini. Jika masalah berlanjut, hubungi administrator situs untuk bantuan lebih lanjut.
        </p>
        
        <div className="flex gap-3 justify-center pt-4">
          <Button variant="secondary" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft size={16} /> Kembali
          </Button>
          <Button onClick={() => navigate("/dashboard")} className="gap-2">
            <Home size={16} /> Ke Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}