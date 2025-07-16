import React, { useState, useEffect } from "react";
import CalendarDatePicker from "../components/CalendarDatePicker";
import { db } from "../firebase/config";
import { ref, push, set, remove, get, update, onValue } from "firebase/database";

function DailyTasks(props) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [tasks, setTasks] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);

  useEffect(() => {
    const pendingRef = ref(db, "pendingCleaningApprovals");
    const dailyRef = ref(db, "dailyTasks");

    const unsub1 = onValue(pendingRef, (snap) => {
      const arr = [];
      if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([id, data]) => {
          arr.push({ id, ...data });
        });
      }
      setPendingApprovals(arr);
    });

    const unsub2 = onValue(dailyRef, (snap) => {
      const arr = [];
      if (snap.exists()) {
        const val = snap.val();
        Object.entries(val).forEach(([date, data]) => {
          arr.push({ date, ...data });
        });
      }
      setDailyReports(arr);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  return (
    <div>
      <h1>Daily Tasks</h1>
      <CalendarDatePicker value={selectedDate} onChange={setSelectedDate} />
      {/* Render tasks and reports */}
    </div>
  );
}

export default DailyTasks;
