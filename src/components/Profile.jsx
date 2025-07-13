import React, { useState, useEffect } from "react";
import { Card, Button, Form } from "react-bootstrap";

const defaultProfile = {
  name: "",
  email: "",
  photoURL: "",
};

const Profile = ({ user, onUpdate }) => {
  const [profile, setProfile] = useState(defaultProfile);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    setEditing(false);
    if (onUpdate) onUpdate(profile);
  };

  return (
    <Card style={{ maxWidth: 400, margin: "0 auto" }}>
      <Card.Body>
        <Card.Title>Profilim</Card.Title>
        {profile.photoURL && (
          <img
            src={profile.photoURL}
            alt="Profil Fotoğrafı"
            style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", marginBottom: 16 }}
          />
        )}
        {editing ? (
          <Form>
            <Form.Group className="mb-2">
              <Form.Label>Ad Soyad</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={profile.name}
                onChange={handleChange}
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={profile.email}
                onChange={handleChange}
                disabled
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>Profil Fotoğrafı URL</Form.Label>
              <Form.Control
                type="text"
                name="photoURL"
                value={profile.photoURL}
                onChange={handleChange}
              />
            </Form.Group>
            <Button variant="success" onClick={handleSave} className="me-2">
              Kaydet
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)}>
              İptal
            </Button>
          </Form>
        ) : (
          <>
            <p><b>Ad Soyad:</b> {profile.name || "-"}</p>
            <p><b>Email:</b> {profile.email || "-"}</p>
            <Button variant="primary" onClick={() => setEditing(true)}>
              Profili Düzenle
            </Button>
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default Profile;
