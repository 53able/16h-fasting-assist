import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// Placeholder App component
const App = () => (
  <div className="min-h-screen bg-gray-50 p-8">
    <h1 className="text-4xl font-bold text-center mb-8">16時間空腹アシスト</h1>
    <p className="text-center text-gray-600">Phase 1 Core Implementation - Local Dev Server</p>
    <div className="mt-8 bg-white rounded-lg shadow p-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">実装完了:</h2>
      <ul className="space-y-2 text-sm">
        <li>✅ US-004: CountdownTimer + BodyStatus</li>
        <li>✅ US-005: SOS レスキュー機能</li>
        <li>✅ US-006: ワークアウトトラッキング</li>
        <li>✅ US-007: 健康指標ロギング</li>
        <li>✅ US-008: Dexie Repository</li>
        <li>✅ US-009: ローカル通知</li>
        <li>✅ US-010: マイルストーン通知</li>
      </ul>
    </div>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
