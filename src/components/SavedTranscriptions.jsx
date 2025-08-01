import React, { useEffect, useState } from 'react';
import axios from 'axios';

const SavedTranscriptions = () => {
  const [transcriptions, setTranscriptions] = useState([]);

  useEffect(() => {
    axios.get('https://speech-to-text-backend.onrender.com/transcriptions')

      .then((response) => setTranscriptions(response.data))
      .catch((error) => console.error('Error fetching transcriptions:', error));
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">📝 Saved Transcriptions</h1>

      {transcriptions.length === 0 ? (
        <p className="text-gray-600 text-center">No transcriptions found.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {transcriptions.map((t, index) => (
            <div
              key={index}
              className="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-300 border border-gray-200"
            >
              <h2 className="text-lg font-semibold mb-2">📁 {t.filename}</h2>
              <p className="text-gray-800 whitespace-pre-wrap mb-4">{t.transcription}</p>
              <div className="text-right text-sm text-gray-500">
                🕒 {new Date(t.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedTranscriptions;
 
