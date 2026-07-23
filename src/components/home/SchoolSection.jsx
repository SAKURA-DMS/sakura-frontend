import { motion } from "framer-motion";
import {
  MapPin,
  Award,
  Users,
  Calendar,
  Navigation,
} from "lucide-react";

const schoolImages = import.meta.glob(
  "/src/assets/school_*.(jpg|jpeg|png|webp)",
  { eager: true, as: "url" }
);

const photos = [
  {
    label: "SMP Negeri 4 Cikarang Barat",
    file: "school_plang.jpg",
    span: "md:col-span-2 md:row-span-2",
  },
  {
    label: "Gedung Sekolah",
    file: "school_building2.jpg",
    span: "",
  },
  {
    label: "Gedung Sekolah",
    file: "school_kelas.jpg",
    span: "",
  },
  {
    label: "Gedung Sekolah",
    file: "school_building.jpg",
    span: "",
  },
  {
    label: "Lapangan",
    file: "school_students.jpg",
    span: "",
  },
];

const getPhotoUrl = (file) => {
  const key = `/src/assets/${file}`;
  return schoolImages[key] ?? null;
};

const infos = [
  {
    icon: MapPin,
    text: "Kp. Kali Jeruk, Cikarang Barat, Kab. Bekasi",
  },
  {
    icon: Calendar,
    text: "NPSN: 20218452",
  },
  {
    icon: Users,
    text: "600+ Siswa Aktif",
  },
  {
    icon: Award,
    text: "Akreditasi A",
  },
];

export default function SchoolSection() {
  const schoolLatitude = "-6.2629";
  const schoolLongitude = "107.1305";

  const mapsEmbedUrl = `https://www.google.com/maps?q=${schoolLatitude},${schoolLongitude}&z=16&output=embed`;

  const mapsDirectionUrl = `https://www.google.com/maps/search/?api=1&query=${schoolLatitude},${schoolLongitude}`;

  return (
    <motion.div
      id="section-school"
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{
        duration: 0.7,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      className="space-y-10"
    >
      {/* SCHOOL HEADER */}
      <div className="text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          SMP Negeri 4 Cikarang Barat
        </h3>

        <p className="text-muted-foreground">
          Selamat datang di sekolah kami
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {infos.map((info) => (
          <div
            key={info.text}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <info.icon
              size={16}
              style={{ color: "#C23A57" }}
            />

            <span>{info.text}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[140px] md:auto-rows-[160px]">
        {photos.map((photo, i) => {
          const src = getPhotoUrl(photo.file);

          return (
            <motion.div
              key={`${photo.file}-${i}`}
              initial={{
                opacity: 0,
                scale: 0.9,
              }}
              whileInView={{
                opacity: 1,
                scale: 1,
              }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
              }}
              className={`group relative rounded-2xl overflow-hidden cursor-default ${photo.span}`}
            >
              {src ? (
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url(${src})`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-rose-200 to-pink-300 transition-transform duration-500 group-hover:scale-105" />
              )}

              <div className="absolute inset-0 bg-black/25" />

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-white text-xs font-medium">
                  {photo.label}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 25,
        }}
        whileInView={{
          opacity: 1,
          y: 0,
        }}
        viewport={{
          once: true,
          margin: "-80px",
        }}
        transition={{
          duration: 0.6,
        }}
        className="overflow-hidden rounded-2xl border border-border bg-background shadow-sm"
      >
        {/* MAP HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 md:px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#C23A57]/10 flex items-center justify-center shrink-0">
              <MapPin
                size={19}
                style={{ color: "#C23A57" }}
              />
            </div>

            <div>
              <h4 className="text-sm md:text-base font-bold text-foreground">
                Lokasi Sekolah
              </h4>

              <p className="text-xs text-muted-foreground mt-0.5">
                Kalijaya, Cikarang Barat, Kabupaten Bekasi
              </p>
            </div>
          </div>

          <a
            href={mapsDirectionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#A92542] hover:bg-[#8f1f38] text-white text-xs font-semibold transition-colors shrink-0"
          >
            <Navigation size={14} />

            Buka di Google Maps
          </a>
        </div>

        {/* GOOGLE MAP */}
        <div className="relative w-full h-[280px] md:h-[360px] bg-muted">
          <iframe
            title="Lokasi SMP Negeri 4 Cikarang Barat"
            src={mapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 w-full h-full"
          />
        </div>

        {/* MAP FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-5 md:px-6 py-3 border-t border-border bg-background">
          <p className="text-[11px] text-muted-foreground">
            Koordinat lokasi berdasarkan data referensi sekolah
          </p>

          <p className="text-[11px] font-medium text-foreground">
            {schoolLatitude}, {schoolLongitude}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}