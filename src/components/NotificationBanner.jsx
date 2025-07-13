// src/components/NotificationBanner.jsx

import React from "react";
import { Alert } from "react-bootstrap";

const NotificationBanner = ({ notifications }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="mb-3">
      {notifications.map((note, idx) => (
        <Alert key={idx} variant={note.variant || "info"} className="shadow-sm">
          <strong>{note.title}</strong> — {note.message}
        </Alert>
      ))}
    </div>
  );
};

export default NotificationBanner;