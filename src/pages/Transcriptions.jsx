import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Transcriptions = () => {
  const [transcriptions, setTranscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('http://localhost:5000/transcriptions')
      .then((res) => {
        setTranscriptions(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching transcriptions:', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h2 className="text-2xl font-bold mb-4">📝 Saved Transcriptions</h2>
      {loading ? (
        <p>Loading...</p>
      ) : transcriptions.length === 0 ? (
        <p>No transcriptions found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {transcriptions.map((item, index) => (
            <div key={index} className="bg-white p-4 shadow rounded-lg">
              <p className="text-sm text-gray-600 mb-1">📁 {item.filename}</p>
              <pre className="text-gray-800 whitespace-pre-wrap">{item.transcription}</pre>
              <p className="text-xs text-gray-400 mt-2">
                🕒 {new Date(item.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transcriptions;
