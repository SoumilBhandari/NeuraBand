import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { computeHRV } from '../utils/hrv';
import { computeTrend } from '../utils/trends';

const DataContext = createContext(null);

const HISTORY_SIZE = 60;
const IBI_BUFFER_SIZE = 60;

export function DataProvider({ children }) {
  const [latest, setLatest] = useState({
    hr: -1, sp: -1, gsr: 0, gait: 0, ibi: -1, rr: -1,
    tmp: -1, slp: -1, slps: 0, nri: 0, hum: -1, lux: -1, prs: -1, bt: -1,
  });
  const [hrv, setHrv] = useState({ sdnn: null, rmssd: null, status: 'collecting', count: 0 });
  const [trends, setTrends] = useState({ hr: 'stable', sp: 'stable', rr: 'stable', nri: 'stable' });
  const [connected, setConnected] = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const histories = useRef({
    hr: [], sp: [], rr: [], nri: [], gsr: [], gait: [],
  });
  const ibiBuffer = useRef([]);
  const dataLog = useRef([]);

  const pushHistory = (key, val) => {
    if (val < 0) return;
    const arr = histories.current[key];
    if (!arr) return;
    arr.push(val);
    if (arr.length > HISTORY_SIZE) arr.shift();
  };

  const processData = useCallback((data) => {
    // Update latest
    setLatest(prev => ({ ...prev, ...data }));

    // Push to histories
    if (data.hr > 0) pushHistory('hr', data.hr);
    if (data.sp > 0) pushHistory('sp', data.sp);
    if (data.rr > 0) pushHistory('rr', data.rr);
    if (data.nri >= 0) pushHistory('nri', data.nri);
    if (data.gsr > 0) pushHistory('gsr', data.gsr);
    if (data.gait >= 0) pushHistory('gait', data.gait);

    // IBI + HRV
    if (data.ibi > 0) {
      ibiBuffer.current.push(data.ibi);
      if (ibiBuffer.current.length > IBI_BUFFER_SIZE) ibiBuffer.current.shift();
      setHrv(computeHRV(ibiBuffer.current));
    }

    // Trends
    setTrends({
      hr: computeTrend(histories.current.hr),
      sp: computeTrend(histories.current.sp),
      rr: computeTrend(histories.current.rr),
      nri: computeTrend(histories.current.nri),
    });

    // Sync timestamp
    setLastSyncTime(Date.now());

    // Log for export
    dataLog.current.push({ ...data, _time: Date.now() });
    if (dataLog.current.length > 10000) dataLog.current.shift();
  }, []);

  return (
    <DataContext.Provider value={{
      latest, hrv, trends, connected, demoActive, histories, lastSyncTime,
      dataLog, processData, setConnected, setDemoActive,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
