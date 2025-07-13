
import React from "react";
import Profile from "../components/Profile";


// Profil Sayfası bileşeni
const ProfilSayfasi = ({ kullanici, guncelle }) => {
  return (
    <div style={{ padding: 24, maxWidth: 600, margin: "0 auto" }}>
      {/* Profil bileşenini Türkçe prop isimleriyle kullanıyoruz */}
      <Profile user={kullanici} onUpdate={guncelle} />
    </div>
  );
};

export default ProfilSayfasi;
